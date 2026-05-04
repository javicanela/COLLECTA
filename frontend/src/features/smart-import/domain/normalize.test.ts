import { describe, expect, it } from 'vitest';
import { normalizeHeaderKey, normalizeText, tokenizeHeader } from './normalize';

describe('normalize', () => {
  it('normalizes accents, punctuation, casing, and repeated whitespace', () => {
    expect(normalizeText('  R.F.C. / Razon Social  ')).toBe('rfc razon social');
    expect(normalizeText('Fecha limite de pago')).toBe('fecha limite de pago');
  });

  it('creates compact keys for alias lookup', () => {
    expect(normalizeHeaderKey(' R.F.C. Cliente ')).toBe('rfccliente');
    expect(normalizeHeaderKey('Correo electronico')).toBe('correoelectronico');
  });

  it('tokenizes normalized headers without empty tokens', () => {
    expect(tokenizeHeader('Cliente - Razon Social / RFC')).toEqual(['cliente', 'razon', 'social', 'rfc']);
  });
});
