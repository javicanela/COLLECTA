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
const ACCEPTED_PAYMENT_PHRASES = [
  'ya pague',
  'pagado',
  'transferido',
  'te mande comprobante',
  'envie comprobante',
  'liquidado',
];
const REJECTED_PAYMENT_PHRASES = [
  'pago manana',
  'luego pago',
  'no puedo pagar',
  'cuanto debo',
  'manda factura',
];

function paymentDateFromEvidence(paymentDate?: string): Date {
  if (!paymentDate) return new Date();
  return new Date(`${paymentDate}T00:00:00.000Z`);
}

function fingerprint(evidence: PaymentEvidence): string {
  return evidence.receiptId || evidence.reference || `${evidence.rfc}:${evidence.amount}:${evidence.paymentDate || ''}`;
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function last10Digits(value: string): string {
  return normalizeDigits(value).slice(-10);
}

function normalizeMessageText(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasPaymentConfirmationLanguage(text: string): boolean {
  return ACCEPTED_PAYMENT_PHRASES.some(phrase => text.includes(phrase));
}

function hasRejectedPaymentLanguage(text: string): boolean {
  return REJECTED_PAYMENT_PHRASES.some(phrase => text.includes(phrase));
}

function parseAmountFromText(rawText: string): number | null {
  const datePattern = /^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$/;
  const tokens = rawText.split(/\s+/);

  let currencyPrefixed: number | null = null;
  const amounts: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token || datePattern.test(token)) continue;

    const isCurrencyPrefix = /^[$]$/i.test(token) || /^(mxn|m\.n\.)$/i.test(token);

    let rawNum: string;
    if (isCurrencyPrefix && i + 1 < tokens.length) {
      rawNum = tokens[i + 1];
    } else {
      rawNum = token;
    }

    const cleaned = rawNum.replace(/[$,\s]/g, '');
    const num = Number(cleaned);

    if (!Number.isFinite(num) || num < 10) continue;

    if (isCurrencyPrefix || /^\$/.test(token) || /^(mxn|m\.n\.)/i.test(token)) {
      currencyPrefixed = num;
    } else {
      amounts.push(num);
    }
  }

  if (currencyPrefixed !== null) return currencyPrefixed;
  if (amounts.length > 0) return Math.max(...amounts);
  return null;
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

async function writeIncomingCorrelationLog(
  prisma: PrismaClient,
  params: {
    clientId?: string | null;
    phone: string;
    resultado: DetectionStatus;
    reasons: string[];
    confidence: number;
    operationId?: string | null;
    amount?: number | null;
    sourceMessageId?: string | null;
    rawText?: string | null;
  },
) {
  const payload = {
    event: 'whatsapp_payment_confirmation_correlation',
    phoneLast4: last10Digits(params.phone).slice(-4),
    sourceMessageId: params.sourceMessageId || null,
    operationId: params.operationId || null,
    amount: params.amount ?? null,
    reasons: params.reasons,
    confidence: params.confidence,
    incomingMessageId: params.sourceMessageId || null,
    textSample: params.rawText ? params.rawText.substring(0, 120) : null,
  };

  await prisma.logEntry.create({
    data: {
      clientId: params.clientId || null,
      tipo: PAYMENT_DETECTION_LOG_TYPE,
      variante: 'WHATSAPP_REPLY',
      resultado: params.resultado,
      mensaje: JSON.stringify(payload),
      telefono: params.phone,
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

export async function correlateIncomingWhatsAppPaymentConfirmation(
  prisma: PrismaClient,
  input: {
    phone: string;
    text?: string | null;
    sourceMessageId?: string | null;
  },
): Promise<DetectionResult> {
  const normalizedText = normalizeMessageText(input.text);
  const phoneLast10 = last10Digits(input.phone);
  const amount = parseAmountFromText(input.text || '');
  const duplicateNeedle = input.sourceMessageId
    ? `"incomingMessageId":"${input.sourceMessageId}"`
    : `"incomingFingerprint":"${phoneLast10}:${normalizedText}:${amount ?? ''}"`;

  const previousAccepted = await prisma.logEntry.findFirst({
    where: {
      tipo: PAYMENT_DETECTION_LOG_TYPE,
      resultado: 'ACCEPTED',
      mensaje: { contains: duplicateNeedle },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (previousAccepted) {
    const previousOperationId = previousAccepted.mensaje?.match(/"operationId":"([^"]+)"/)?.[1];
    const reasons = ['duplicate_incoming_message'];
    await writeIncomingCorrelationLog(prisma, {
      clientId: previousAccepted.clientId,
      phone: input.phone,
      resultado: 'DUPLICATE',
      reasons,
      confidence: 1,
      operationId: previousOperationId,
      amount,
      sourceMessageId: input.sourceMessageId,
      rawText: input.text,
    });
    return {
      status: 'DUPLICATE',
      operationId: previousOperationId,
      reasons,
      confidence: 1,
    };
  }

  const client = phoneLast10
    ? await prisma.client.findFirst({
      where: {
        telefono: { contains: phoneLast10 },
      },
    })
    : null;

  if (!client) {
    const reasons = ['client_not_found'];
    await writeIncomingCorrelationLog(prisma, {
      phone: input.phone,
      resultado: 'REVIEW_REQUIRED',
      reasons,
      confidence: 0,
      amount,
      sourceMessageId: input.sourceMessageId,
      rawText: input.text,
    });
    return { status: 'REVIEW_REQUIRED', reasons, confidence: 0 };
  }

  const baseLog = {
    clientId: client.id,
    phone: input.phone,
    amount,
    sourceMessageId: input.sourceMessageId,
    rawText: input.text,
  };

  if (hasRejectedPaymentLanguage(normalizedText) || !hasPaymentConfirmationLanguage(normalizedText)) {
    const reasons = ['non_payment_language'];
    await writeIncomingCorrelationLog(prisma, {
      ...baseLog,
      resultado: 'REVIEW_REQUIRED',
      reasons,
      confidence: 0.15,
    });
    return { status: 'REVIEW_REQUIRED', reasons, confidence: 0.15 };
  }

  const PREVIOUS_OUTBOUND_WINDOW_DAYS = Number(
    process.env.PAYMENT_OUTBOUND_WINDOW_DAYS || 60
  );
  const cutoff = new Date(Date.now() - PREVIOUS_OUTBOUND_WINDOW_DAYS * 86400000);

  const previousOutbound = await prisma.whatsAppMessage.findFirst({
    where: {
      clientId: client.id,
      direction: 'OUTGOING',
      phone: { contains: phoneLast10 },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!previousOutbound) {
    const reasons = ['no_previous_outbound_whatsapp'];
    await writeIncomingCorrelationLog(prisma, {
      ...baseLog,
      resultado: 'REVIEW_REQUIRED',
      reasons,
      confidence: 0.2,
    });
    return { status: 'REVIEW_REQUIRED', reasons, confidence: 0.2 };
  }

  const openOperations = await prisma.operation.findMany({
    where: {
      clientId: client.id,
      fechaPago: null,
      estatus: { not: 'PAGADO' },
      excluir: false,
      archived: false,
    },
    orderBy: { fechaVence: 'asc' },
  });

  let selectedOperation = null as typeof openOperations[number] | null;
  let reasons = ['previous_outbound_whatsapp'];
  if (amount != null) {
    const amountMatches = openOperations.filter(op => Math.abs(op.monto - amount) <= AMOUNT_TOLERANCE);
    if (amountMatches.length !== 1) {
      reasons = ['no_safe_operation_match', 'previous_outbound_whatsapp'];
      await writeIncomingCorrelationLog(prisma, {
        ...baseLog,
        resultado: 'REVIEW_REQUIRED',
        reasons,
        confidence: 0.35,
      });
      return { status: 'REVIEW_REQUIRED', reasons, confidence: 0.35 };
    }

    selectedOperation = amountMatches[0];
    reasons = [
      Math.abs(selectedOperation.monto - amount) === 0 ? 'amount_exact' : 'amount_within_tolerance',
      ...reasons,
    ];
  } else if (openOperations.length === 1) {
    selectedOperation = openOperations[0];
    reasons = ['single_open_operation', ...reasons];
  } else {
    reasons = ['multiple_open_operations_without_amount', 'previous_outbound_whatsapp'];
    await writeIncomingCorrelationLog(prisma, {
      ...baseLog,
      resultado: 'REVIEW_REQUIRED',
      reasons,
      confidence: 0.4,
    });
    return { status: 'REVIEW_REQUIRED', reasons, confidence: 0.4 };
  }

  const updated = await prisma.operation.update({
    where: { id: selectedOperation.id },
    data: {
      estatus: 'PAGADO',
      fechaPago: new Date(),
    },
  });

  const confidence = amount != null ? 0.95 : 0.86;
  await writeIncomingCorrelationLog(prisma, {
    ...baseLog,
    resultado: 'ACCEPTED',
    reasons,
    confidence,
    operationId: updated.id,
  });

  return {
    status: 'ACCEPTED',
    operationId: updated.id,
    reasons,
    confidence,
  };
}
