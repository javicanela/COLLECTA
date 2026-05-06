import { Router, Request, Response } from 'express';
import path from 'path';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { generateEstadoCuenta, renderEstadoCuentaPdf } from '../services/pdfGenerator';
import { sendStatementToClient, StatementDeliveryError } from '../services/statementDeliveryService';
import { getTemporaryPdf } from '../services/tempFileStorage';

const router = Router();
export const cobranzaPublicRouter = Router();

const sendStatementSchema = z.object({
  channelPreference: z.enum(['WHATSAPP', 'EMAIL', 'AUTO']).optional().default('AUTO'),
});

function getRequestedBy(req: Request) {
  const user = (req as any).user;
  return user?.userId || user?.email || 'unknown';
}

function toRouteError(error: unknown) {
  const err = error as Partial<StatementDeliveryError>;
  if (err.code === 'CLIENT_NOT_FOUND') {
    return { status: 404, body: { error: 'client_not_found' } };
  }
  if (err.code === 'OPERATION_NOT_FOUND') {
    return { status: 404, body: { error: 'operation_not_found' } };
  }
  if (err.code === 'CLIENT_SUSPENDED') {
    return { status: 409, body: { error: 'client_suspended' } };
  }
  return { status: 500, body: { error: 'statement_delivery_failed' } };
}

cobranzaPublicRouter.get('/media/:token', async (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const lookup = await getTemporaryPdf(token);

  if (lookup.status === 'not_found') {
    res.status(404).json({ error: 'temporary_file_not_found' });
    return;
  }

  if (lookup.status === 'expired') {
    res.status(410).json({ error: 'temporary_file_expired' });
    return;
  }

  res.setHeader('Content-Type', lookup.file.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(lookup.file.fileName)}"`);
  res.sendFile(lookup.file.filePath);
});

router.get('/cliente/:rfc/pdf', async (req: Request, res: Response) => {
  try {
    const rfc = Array.isArray(req.params.rfc) ? req.params.rfc[0] : req.params.rfc;
    const data = await generateEstadoCuenta(rfc);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="estado_cuenta_${rfc}.pdf"`);

    doc.pipe(res);
    renderEstadoCuentaPdf(doc, data);
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error generating PDF', details: (error as Error).message });
  }
});

router.post('/cliente/:rfc/send-statement', async (req: Request, res: Response) => {
  const parsed = sendStatementSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_failed',
      details: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  try {
    const rfc = Array.isArray(req.params.rfc) ? req.params.rfc[0] : req.params.rfc;
    const result = await sendStatementToClient({
      rfc,
      channelPreference: parsed.data.channelPreference,
      requestedBy: getRequestedBy(req),
    });
    res.json(result);
  } catch (error) {
    const routeError = toRouteError(error);
    res.status(routeError.status).json(routeError.body);
  }
});

router.post('/operation/:operationId/send-statement', async (req: Request, res: Response) => {
  const parsed = sendStatementSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'validation_failed',
      details: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  try {
    const operationId = Array.isArray(req.params.operationId) ? req.params.operationId[0] : req.params.operationId;
    const result = await sendStatementToClient({
      operationId,
      channelPreference: parsed.data.channelPreference,
      requestedBy: getRequestedBy(req),
    });
    res.json(result);
  } catch (error) {
    const routeError = toRouteError(error);
    res.status(routeError.status).json(routeError.body);
  }
});

export default router;
