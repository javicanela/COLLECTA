import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import {
  detectPaymentFromEvidence,
  PAYMENT_DETECTION_LOG_TYPE,
  type PaymentDetectionResult,
} from '../services/paymentDetection';

const router = Router();

const paymentEvidenceSchema = z.object({
  rfc: z.string().optional().nullable(),
  monto: z.union([z.number(), z.string()]).optional().nullable(),
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  referencia: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  fechaPago: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  receiptId: z.string().optional().nullable(),
  sourceMessageId: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  rawText: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
});

const manualConfirmSchema = z.object({
  operationId: z.string().min(1),
  paymentDate: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  receiptId: z.string().optional().nullable(),
});

function toPaymentResponse(result: PaymentDetectionResult) {
  const matched = result.status === 'ACCEPTED' || result.status === 'DUPLICATE';
  const reviewRequired = result.status === 'REVIEW_REQUIRED';

  return {
    matched,
    reviewRequired,
    status: result.status,
    message: result.reasons.join(', '),
    reasons: result.reasons,
    operationId: result.operationId || null,
    clientId: null,
    candidates: [],
  };
}

function normalizePaymentEvidence(
  body: z.infer<typeof paymentEvidenceSchema>,
  defaultSource: string,
) {
  const amountValue = body.amount ?? body.monto;
  const amount = typeof amountValue === 'string' ? Number(amountValue) : amountValue;

  if (!body.rfc || amount == null || Number.isNaN(amount)) {
    return null;
  }

  return {
    rfc: body.rfc,
    amount,
    paymentDate: body.paymentDate ?? body.fechaPago ?? undefined,
    reference: body.reference ?? body.referencia ?? undefined,
    receiptId: body.receiptId ?? undefined,
    sourceMessageId: body.sourceMessageId ?? undefined,
    provider: body.provider ?? undefined,
    source: body.source ?? defaultSource,
    rawText: body.rawText ?? undefined,
    mediaUrl: body.mediaUrl ?? undefined,
  };
}

function parseDetectionPayload(message?: string | null) {
  if (!message) return {};
  try {
    return JSON.parse(message);
  } catch {
    return { rawMessage: message };
  }
}

/**
 * GET /api/n8n/daily-report
 * Endpoint enriquecido para el workflow n8n de reporte diario.
 * Devuelve stats completas + top deudores + operaciones críticas + desglose por asesor.
 */
router.get('/daily-report', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-MX', { 
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' 
    });

    // All active (non-archived) operations
    const allOps = await prisma.operation.findMany({
      where: { archived: false },
      include: { client: true },
      orderBy: { fechaVence: 'asc' },
    });

    // Classify operations
    const vencidas: typeof allOps = [];
    const hoyVence: typeof allOps = [];
    const porVencer: typeof allOps = [];
    const alCorriente: typeof allOps = [];
    const pagadas: typeof allOps = [];
    const excluidas: typeof allOps = [];

    let montoPendienteTotal = 0;
    let montoPagadoTotal = 0;

    for (const op of allOps) {
      if (op.fechaPago) {
        pagadas.push(op);
        montoPagadoTotal += op.monto;
        continue;
      }
      if (op.excluir) {
        excluidas.push(op);
        continue;
      }
      const diff = Math.ceil(
        (new Date(op.fechaVence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff < 0) {
        vencidas.push(op);
        montoPendienteTotal += op.monto;
      } else if (diff === 0) {
        hoyVence.push(op);
        montoPendienteTotal += op.monto;
      } else if (diff <= 5) {
        porVencer.push(op);
        montoPendienteTotal += op.monto;
      } else {
        alCorriente.push(op);
        montoPendienteTotal += op.monto;
      }
    }

    // Top 10 deudores (por monto total pendiente)
    const deudaByClient = new Map<string, { nombre: string; rfc: string; telefono: string; totalDeuda: number; opsVencidas: number }>();
    for (const op of [...vencidas, ...hoyVence, ...porVencer]) {
      const clientId = op.clientId;
      const existing = deudaByClient.get(clientId);
      if (existing) {
        existing.totalDeuda += op.monto;
        if (vencidas.includes(op)) existing.opsVencidas++;
      } else {
        deudaByClient.set(clientId, {
          nombre: op.client?.nombre || 'Sin nombre',
          rfc: op.client?.rfc || '',
          telefono: (op.client as any)?.telefono || '',
          totalDeuda: op.monto,
          opsVencidas: vencidas.includes(op) ? 1 : 0,
        });
      }
    }
    const topDeudores = [...deudaByClient.values()]
      .sort((a, b) => b.totalDeuda - a.totalDeuda)
      .slice(0, 10);

    // Desglose por asesor
    const byAsesor = new Map<string, { pendientes: number; vencidas: number; montoPendiente: number; pagadas: number }>();
    for (const op of allOps) {
      const asesor = op.asesor || 'Sin asignar';
      const entry = byAsesor.get(asesor) || { pendientes: 0, vencidas: 0, montoPendiente: 0, pagadas: 0 };
      if (op.fechaPago) {
        entry.pagadas++;
      } else if (!op.excluir) {
        entry.pendientes++;
        entry.montoPendiente += op.monto;
        const diff = Math.ceil(
          (new Date(op.fechaVence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff < 0) entry.vencidas++;
      }
      byAsesor.set(asesor, entry);
    }

    // Operaciones que vencieron hoy o están a punto de vencer (urgentes)
    const urgentes = [...hoyVence, ...vencidas.slice(0, 10)].map(op => ({
      id: op.id,
      cliente: op.client?.nombre || '',
      rfc: op.client?.rfc || '',
      tipo: op.tipo,
      monto: op.monto,
      fechaVence: op.fechaVence,
      diasVencido: Math.abs(Math.ceil(
        (new Date(op.fechaVence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )),
    }));

    // Config for the report header
    const configRows = await prisma.config.findMany();
    const cfg: Record<string, string> = {};
    for (const row of configRows) {
      cfg[row.key] = row.value;
    }

    const fmx = (n: number) =>
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    // Build human-readable summary text (for WhatsApp/Telegram)
    const summaryLines = [
      `📊 *REPORTE DIARIO DE CARTERA*`,
      `📅 ${todayStr}`,
      `🏢 ${cfg['nombre_despacho'] || 'Collecta'}`,
      ``,
      `━━━ RESUMEN ━━━`,
      `🔴 Vencidas: ${vencidas.length} ops — ${fmx(vencidas.reduce((s, o) => s + o.monto, 0))}`,
      `🟠 Vencen hoy: ${hoyVence.length} ops — ${fmx(hoyVence.reduce((s, o) => s + o.monto, 0))}`,
      `🟡 Por vencer (5 días): ${porVencer.length} ops — ${fmx(porVencer.reduce((s, o) => s + o.monto, 0))}`,
      `🟢 Al corriente: ${alCorriente.length} ops`,
      `✅ Pagadas: ${pagadas.length} ops — ${fmx(montoPagadoTotal)}`,
      ``,
      `💰 *Total pendiente: ${fmx(montoPendienteTotal)}*`,
    ];

    if (topDeudores.length > 0) {
      summaryLines.push(``, `━━━ TOP DEUDORES ━━━`);
      topDeudores.slice(0, 5).forEach((d, i) => {
        summaryLines.push(`${i + 1}. ${d.nombre} — ${fmx(d.totalDeuda)} (${d.opsVencidas} vencidas)`);
      });
    }

    if (urgentes.length > 0) {
      summaryLines.push(``, `━━━ REQUIEREN ACCIÓN HOY ━━━`);
      urgentes.slice(0, 5).forEach(u => {
        summaryLines.push(`⚠️ ${u.cliente} — ${fmx(u.monto)} — ${u.tipo} (${u.diasVencido}d)`);
      });
    }

    res.json({
      fecha: todayStr,
      despacho: cfg['nombre_despacho'] || 'Collecta',
      summary: {
        vencidas: vencidas.length,
        hoyVence: hoyVence.length,
        porVencer: porVencer.length,
        alCorriente: alCorriente.length,
        pagadas: pagadas.length,
        excluidas: excluidas.length,
        montoPendienteTotal,
        montoPagadoTotal,
      },
      topDeudores,
      urgentes,
      byAsesor: Object.fromEntries(byAsesor),
      // Pre-formatted message ready for WhatsApp/Telegram
      mensajeFormateado: summaryLines.join('\n'),
      // Config useful for n8n templates
      config: {
        tel: cfg['tel'] || '',
        email: cfg['email'] || '',
        modo: cfg['modo'] || 'PRUEBA',
        telPrueba: cfg['telPrueba'] || '',
      },
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ error: 'Error generating daily report' });
  }
});

/**
 * POST /api/n8n/webhook/payment-confirmed
 * n8n envía aquí cuando detecta un pago (vía Gemini Vision, extracto bancario, etc.)
 * Body: { rfc: string, monto: number, referencia?: string, fechaPago?: string }
 */
router.post('/webhook/payment-confirmed', async (req: Request, res: Response) => {
  try {
    const parsed = paymentEvidenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const body = parsed.data;
    const evidence = normalizePaymentEvidence(body, 'n8n:webhook/payment-confirmed');
    if (!evidence) {
      return res.status(400).json({ error: 'rfc y monto son requeridos' });
    }

    const result = await detectPaymentFromEvidence(prisma, evidence);

    res.json(toPaymentResponse(result));
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    res.status(500).json({ error: 'Error processing payment webhook' });
  }
});

/**
 * POST /api/n8n/payment-detections
 * Provider-agnostic entrypoint for OCR/vision/message extractors.
 */
router.post('/payment-detections', async (req: Request, res: Response) => {
  try {
    const parsed = paymentEvidenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const body = parsed.data;
    const evidence = normalizePaymentEvidence(body, 'n8n:payment-detections');
    if (!evidence) {
      return res.status(400).json({ error: 'rfc y monto son requeridos' });
    }

    const result = await detectPaymentFromEvidence(prisma, evidence);

    res.json(toPaymentResponse(result));
  } catch (error) {
    console.error('Error detecting payment:', error);
    res.status(500).json({ error: 'Error detecting payment' });
  }
});

/**
 * GET /api/n8n/payment-review
 * Report for detections that require manual confirmation.
 */
router.get('/payment-review', async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.logEntry.findMany({
      where: {
        tipo: PAYMENT_DETECTION_LOG_TYPE,
        resultado: 'REVIEW_REQUIRED',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, nombre: true, rfc: true, telefono: true },
        },
      },
      take: 100,
    });

    const pending = await Promise.all(logs.map(async log => {
      const payload = parseDetectionPayload(log.mensaje) as any;
      const clientId = payload.clientId || log.clientId;
      const candidates = clientId
        ? await prisma.operation.findMany({
          where: {
            clientId,
            fechaPago: null,
            excluir: false,
            archived: false,
            estatus: { not: 'PAGADO' },
          },
          include: { client: true },
          orderBy: { fechaVence: 'asc' },
          take: 10,
        })
        : [];

      return {
        id: log.id,
        createdAt: log.createdAt,
        client: log.client,
        payload,
        candidates: candidates.map(op => ({
          id: op.id,
          tipo: op.tipo,
          descripcion: op.descripcion,
          monto: op.monto,
          fechaVence: op.fechaVence,
          estatus: op.estatus,
          client: op.client ? { nombre: op.client.nombre, rfc: op.client.rfc } : null,
        })),
      };
    }));

    res.json({
      total: logs.length,
      pending,
    });
  } catch (error) {
    console.error('Error fetching payment review report:', error);
    res.status(500).json({ error: 'Error fetching payment review report' });
  }
});

/**
 * POST /api/n8n/payment-review/confirm
 * Manual confirmation path for ambiguous receipts.
 */
router.post('/payment-review/confirm', async (req: Request, res: Response) => {
  try {
    const parsed = manualConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const operation = await prisma.operation.findUnique({
      where: { id: parsed.data.operationId },
      include: { client: true },
    });

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    if (operation.fechaPago || operation.estatus === 'PAGADO') {
      return res.status(409).json({ error: 'Operation already paid' });
    }

    const paymentDate = parsed.data.paymentDate
      ? new Date(`${parsed.data.paymentDate}T00:00:00.000Z`)
      : new Date();

    const updated = await prisma.operation.update({
      where: { id: operation.id },
      data: { fechaPago: paymentDate, estatus: 'PAGADO' },
      include: { client: true },
    });

    await prisma.logEntry.create({
      data: {
        clientId: operation.clientId,
        tipo: PAYMENT_DETECTION_LOG_TYPE,
        variante: 'MANUAL_REVIEW',
        resultado: 'MANUALLY_CONFIRMED',
        mensaje: JSON.stringify({
          event: 'payment_detection_manual_confirmation',
          operationId: operation.id,
          receiptId: parsed.data.receiptId || null,
          reference: parsed.data.reference || null,
          paymentDate: paymentDate.toISOString().slice(0, 10),
          reasons: ['manual_confirmation'],
        }),
        telefono: operation.client?.telefono || null,
        modo: 'PRODUCCION',
      },
    });

    res.json({
      matched: true,
      reviewRequired: false,
      status: 'MANUALLY_CONFIRMED',
      operation: {
        id: updated.id,
        tipo: updated.tipo,
        monto: updated.monto,
        fechaPago: updated.fechaPago,
        estatus: updated.estatus,
      },
    });
  } catch (error) {
    console.error('Error confirming payment review:', error);
    res.status(500).json({ error: 'Error confirming payment review' });
  }
});

/**
 * GET /api/n8n/pending-collections
 * Returns operations that need collection action today.
 * Used by n8n to trigger WhatsApp/Email sends.
 */
router.get('/pending-collections', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const ops = await prisma.operation.findMany({
      where: {
        archived: false,
        fechaPago: null,
        excluir: false,
      },
      include: { client: true },
      orderBy: { fechaVence: 'asc' },
    });

    // Config for message templates
    const configRows = await prisma.config.findMany();
    const cfg: Record<string, string> = {};
    for (const row of configRows) {
      cfg[row.key] = row.value;
    }

    const collections = ops.map(op => {
      const diff = Math.ceil(
        (new Date(op.fechaVence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      let status: string;
      let template: string;

      if (diff < 0) {
        status = 'VENCIDO';
        template = cfg['plantilla_vencido'] || '';
      } else if (diff === 0) {
        status = 'HOY_VENCE';
        template = cfg['plantilla_hoy'] || '';
      } else if (diff <= 5) {
        status = 'POR_VENCER';
        template = cfg['plantilla_recordatorio'] || '';
      } else {
        status = 'AL_CORRIENTE';
        template = '';
      }

      // Only return operations that need action (vencidas, hoy, por vencer)
      if (status === 'AL_CORRIENTE') return null;

      const client = op.client as any;
      const fmx = (n: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
      const ffd = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
      };
      const dias = Math.abs(diff);

      // Replace template variables
      let mensaje = template
        .replace(/{NOMBRE_DESPACHO}/g, cfg['nombre_despacho'] || 'Collecta')
        .replace(/{CLIENTE}/g, client?.nombre || '')
        .replace(/{MONTO}/g, fmx(op.monto))
        .replace(/{CONCEPTO}/g, op.descripcion || '')
        .replace(/{FECHA}/g, ffd(op.fechaVence.toISOString()))
        .replace(/{DIAS}/g, String(dias))
        .replace(/{BENEFICIARIO}/g, cfg['beneficiario'] || '')
        .replace(/{BANCO}/g, cfg['banco'] || '')
        .replace(/{CLABE}/g, cfg['clabe'] || '')
        .replace(/{DEPTO}/g, cfg['depto'] || '')
        .replace(/{TEL_DESPACHO}/g, cfg['tel'] || '')
        .replace(/{EMAIL_DESPACHO}/g, cfg['email'] || '');

      return {
        operationId: op.id,
        clientId: op.clientId,
        clienteNombre: client?.nombre || '',
        clienteRfc: client?.rfc || '',
        clienteTelefono: client?.telefono || '',
        clienteEmail: client?.email || '',
        tipo: op.tipo,
        descripcion: op.descripcion || '',
        monto: op.monto,
        montoFormateado: fmx(op.monto),
        fechaVence: op.fechaVence,
        diasVencidos: dias,
        status,
        asesor: op.asesor || '',
        mensajeWhatsApp: mensaje,
        waUrl: client?.telefono
          ? `https://wa.me/${client.telefono.replace(/\D/g, '').replace(/^(?!52)/, '52')}?text=${encodeURIComponent(mensaje)}`
          : null,
      };
    }).filter(Boolean);

    res.json({
      fecha: today.toISOString(),
      modo: cfg['modo'] || 'PRUEBA',
      telPrueba: cfg['telPrueba'] || '',
      total: collections.length,
      collections,
    });
  } catch (error) {
    console.error('Error fetching pending collections:', error);
    res.status(500).json({ error: 'Error fetching pending collections' });
  }
});

export default router;
