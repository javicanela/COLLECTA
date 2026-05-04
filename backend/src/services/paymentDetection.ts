import type { PrismaClient } from '@prisma/client';

export const PAYMENT_DETECTION_LOG_TYPE = 'PAYMENT_DETECTION';

type PaymentEvidence = {
  rfc: string;
  amount: number;
  paymentDate?: string;
  reference?: string;
  receiptId?: string;
  sourceMessageId?: string;
  provider?: string;
  source?: string;
  rawText?: string;
  mediaUrl?: string;
};

type DetectionStatus = 'ACCEPTED' | 'REVIEW_REQUIRED' | 'DUPLICATE';

type DetectionResult = {
  status: DetectionStatus;
  operationId?: string;
  reasons: string[];
  confidence: number;
};

export type PaymentDetectionResult = DetectionResult;

const AMOUNT_TOLERANCE = 0.5;

function paymentDateFromEvidence(paymentDate?: string): Date {
  if (!paymentDate) return new Date();
  return new Date(`${paymentDate}T00:00:00.000Z`);
}

function fingerprint(evidence: PaymentEvidence): string {
  return evidence.receiptId || evidence.reference || `${evidence.rfc}:${evidence.amount}:${evidence.paymentDate || ''}`;
}

async function writeDetectionLog(
  prisma: PrismaClient,
  clientId: string | null,
  resultado: DetectionStatus,
  reasons: string[],
  evidence: PaymentEvidence,
  operationId?: string,
) {
  const parts = [
    `fingerprint=${fingerprint(evidence)}`,
    `confidence_source=${evidence.source || 'unknown'}`,
    `confidence_reasons=${reasons.join(',')}`,
    operationId ? `operationId=${operationId}` : '',
  ].filter(Boolean);

  await prisma.logEntry.create({
    data: {
      clientId,
      tipo: PAYMENT_DETECTION_LOG_TYPE,
      variante: evidence.source || 'manual',
      resultado,
      mensaje: parts.join(' | '),
      modo: 'PRODUCCION',
    },
  });
}

export async function detectPaymentFromEvidence(
  prisma: PrismaClient,
  evidence: PaymentEvidence,
): Promise<DetectionResult> {
  const normalizedRfc = evidence.rfc.toUpperCase();
  const normalizedEvidence = { ...evidence, rfc: normalizedRfc };
  const idempotencyKey = fingerprint(normalizedEvidence);

  const previousAccepted = await prisma.logEntry.findFirst({
    where: {
      tipo: PAYMENT_DETECTION_LOG_TYPE,
      resultado: 'ACCEPTED',
      mensaje: { contains: `fingerprint=${idempotencyKey}` },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (previousAccepted) {
    const previousOperationId = previousAccepted.mensaje?.match(/operationId=([^|\s]+)/)?.[1];
    await writeDetectionLog(
      prisma,
      previousAccepted.clientId,
      'DUPLICATE',
      ['duplicate_receipt'],
      normalizedEvidence,
      previousOperationId,
    );
    return {
      status: 'DUPLICATE',
      operationId: previousOperationId,
      reasons: ['duplicate_receipt'],
      confidence: 1,
    };
  }

  const client = await prisma.client.findUnique({
    where: { rfc: normalizedRfc },
  });

  if (!client) {
    await writeDetectionLog(prisma, null, 'REVIEW_REQUIRED', ['client_not_found'], normalizedEvidence);
    return {
      status: 'REVIEW_REQUIRED',
      reasons: ['client_not_found'],
      confidence: 0,
    };
  }

  const pendingOps = await prisma.operation.findMany({
    where: {
      clientId: client.id,
      fechaPago: null,
      estatus: { not: 'PAGADO' },
      excluir: false,
      archived: false,
    },
    orderBy: { fechaVence: 'asc' },
  });

  const matchedOp = pendingOps.find(op => Math.abs(op.monto - evidence.amount) <= AMOUNT_TOLERANCE);

  if (!matchedOp) {
    await writeDetectionLog(
      prisma,
      client.id,
      'REVIEW_REQUIRED',
      ['no_safe_operation_match'],
      normalizedEvidence,
    );
    return {
      status: 'REVIEW_REQUIRED',
      reasons: ['no_safe_operation_match'],
      confidence: 0.35,
    };
  }

  const reasons = Math.abs(matchedOp.monto - evidence.amount) === 0
    ? ['amount_exact']
    : ['amount_within_tolerance'];

  const updated = await prisma.operation.update({
    where: { id: matchedOp.id },
    data: {
      estatus: 'PAGADO',
      fechaPago: paymentDateFromEvidence(evidence.paymentDate),
    },
  });

  await writeDetectionLog(
    prisma,
    client.id,
    'ACCEPTED',
    reasons,
    normalizedEvidence,
    updated.id,
  );

  return {
    status: 'ACCEPTED',
    operationId: updated.id,
    reasons,
    confidence: reasons.includes('amount_exact') ? 0.95 : 0.85,
  };
}
