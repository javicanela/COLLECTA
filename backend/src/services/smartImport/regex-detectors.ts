function normalizeText(value: unknown): string {
  const raw = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return raw;
}

export function detectRfc(value: unknown): { matched: boolean; normalized: string } {
  const raw = String(value ?? '').trim().toUpperCase().replace(/[\s.\-_/]/g, '');
  const regex = /^[A-Z\u00d1&]{3,4}\d{6}[A-Z0-9]{2,3}$/;
  if (regex.test(raw)) return { matched: true, normalized: raw };
  return { matched: false, normalized: raw };
}

export function detectEmail(value: unknown): { matched: boolean; normalized: string } {
  const raw = String(value ?? '').trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return { matched: true, normalized: raw };
  return { matched: false, normalized: raw };
}

export function detectPhone(value: unknown): { matched: boolean; normalized: string } {
  const raw = String(value ?? '').replace(/\D/g, '');
  const digits = raw.replace(/^52/, '');
  if (digits.length === 10) return { matched: true, normalized: `52${digits}` };
  if (raw.length === 10) return { matched: true, normalized: `52${raw}` };
  if (raw.length >= 10) return { matched: true, normalized: `52${raw.slice(-10)}` };
  return { matched: false, normalized: raw };
}

export function detectMoney(value: unknown): { matched: boolean; value: number } {
  if (typeof value === 'number' && Number.isFinite(value)) return { matched: true, value };
  const raw = String(value ?? '').replace(/\b(mxn|usd|m\.n\.)\b/gi, '').replace(/[,$\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return { matched: false, value: 0 };
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return { matched: true, value: parsed };
  return { matched: false, value: 0 };
}

export function detectDateLike(value: unknown): { matched: boolean; normalized: string } {
  const raw = String(value ?? '').trim();
  if (/^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$/.test(raw)) return { matched: true, normalized: raw };
  if (/^\d{4}[/\-]\d{1,2}[/\-]\d{1,2}$/.test(raw)) return { matched: true, normalized: raw };
  const num = Number(raw);
  if (Number.isInteger(num) && num > 40000 && num < 200000) return { matched: true, normalized: raw };
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) return { matched: true, normalized: raw };
  return { matched: false, normalized: raw };
}

export function detectBoolean(value: unknown): { matched: boolean; value: boolean } {
  if (typeof value === 'boolean') return { matched: true, value };
  const raw = normalizeText(value);
  if (['si', 's', 'true', '1', 'yes'].includes(raw)) return { matched: true, value: true };
  if (['no', 'n', 'false', '0', ''].includes(raw)) return { matched: true, value: false };
  return { matched: false, value: false };
}

export function detectSatTerm(value: unknown): { matched: boolean; normalized: string } {
  const raw = String(value ?? '').trim().toUpperCase();
  const terms = ['601', '603', '605', '606', '607', '608', '609', '610', '611', '612', '613', '614',
    '615', '616', '617', '618', '619', '620', '621', '622', '623', '624', '625', '626',
    'GENERAL', 'PERSONA FISICA', 'PERSONA MORAL', 'SIN OBLIGACIONES',
    'RESICO', 'RIF', 'INCORPORACION', 'ASIMILADOS', 'ENAJENACION', 'DONATIVOS'];
  const upper = raw.replace(/[\s\-_]/g, '').toUpperCase();
  if (terms.some(t => upper.includes(t) || t.includes(upper))) return { matched: true, normalized: raw };
  return { matched: false, normalized: raw };
}
