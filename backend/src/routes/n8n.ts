import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

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
    const { rfc, monto, referencia, fechaPago } = req.body;

    if (!rfc || monto === undefined) {
      return res.status(400).json({ error: 'rfc y monto son requeridos' });
    }

    // Find client by RFC
    const client = await prisma.client.findUnique({
      where: { rfc: rfc.toUpperCase() },
    });

    if (!client) {
      return res.status(404).json({ error: `Cliente con RFC ${rfc} no encontrado`, matched: false });
    }

    // Find pending operations that match the amount (±$0.50 tolerance)
    const pendingOps = await prisma.operation.findMany({
      where: {
        clientId: client.id,
        fechaPago: null,
        excluir: false,
        archived: false,
      },
      orderBy: { fechaVence: 'asc' },
    });

    const tolerance = 0.50;
    const matchedOp = pendingOps.find(op => Math.abs(op.monto - monto) <= tolerance);

    if (!matchedOp) {
      return res.json({
        matched: false,
        message: `No se encontró operación pendiente para ${client.nombre} (RFC: ${rfc}) con monto ~${monto}`,
        pendingOps: pendingOps.map(op => ({
          id: op.id,
          tipo: op.tipo,
          monto: op.monto,
          fechaVence: op.fechaVence,
        })),
      });
    }

    // Mark as paid
    const pagoDate = fechaPago ? new Date(fechaPago) : new Date();
    const updated = await prisma.operation.update({
      where: { id: matchedOp.id },
      data: { fechaPago: pagoDate, estatus: 'PAGADO' },
      include: { client: true },
    });

    // Create log entry
    await prisma.logEntry.create({
      data: {
        clientId: client.id,
        tipo: 'PAGO_AUTOMATICO',
        variante: 'N8N_WEBHOOK',
        resultado: 'CONFIRMADO',
        mensaje: `Pago detectado automáticamente. Monto: $${monto}, Ref: ${referencia || 'N/A'}`,
        telefono: (client as any).telefono || '',
        modo: 'PRODUCCIÓN',
      },
    });

    res.json({
      matched: true,
      message: `Pago registrado para ${client.nombre}: ${matchedOp.tipo} — $${monto}`,
      operation: {
        id: updated.id,
        tipo: updated.tipo,
        monto: updated.monto,
        fechaPago: updated.fechaPago,
      },
    });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    res.status(500).json({ error: 'Error processing payment webhook' });
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
