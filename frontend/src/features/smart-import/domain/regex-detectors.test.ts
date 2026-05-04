import { describe, expect, it } from 'vitest';
import { detectDateLike, detectEmail, detectMoney, detectPhone, detectRfc, detectSatTerm } from './regex-detectors';

describe('regex detectors', () => {
  it('detects and normalizes Mexican RFC values', () => {
    expect(detectRfc(' abc010101abc ')).toEqual({ matched: true, normalized: 'ABC010101ABC' });
    expect(detectRfc('not-an-rfc')).toEqual({ matched: false });
  });

  it('detects email and phone values without leaking formatting noise', () => {
    expect(detectEmail(' Cobranza@Acme.MX ')).toEqual({ matched: true, normalized: 'cobranza@acme.mx' });
    expect(detectPhone('+52 (664) 123-4567')).toEqual({ matched: true, normalized: '6641234567' });
  });

  it('detects money and date-like values used in accounting exports', () => {
    expect(detectMoney('$12,450.50 MXN')).toEqual({ matched: true, value: 12450.5 });
    expect(detectMoney('Honorarios mensuales')).toEqual({ matched: false });
    expect(detectDateLike('15 abr 2026')).toMatchObject({ matched: true });
    expect(detectDateLike(46025)).toMatchObject({ matched: true });
  });

  it('detects SAT-like fiscal terms', () => {
    expect(detectSatTerm('626 RESICO')).toEqual({ matched: true, reason: 'sat:regimen' });
    expect(detectSatTerm('Uso CFDI G03')).toEqual({ matched: true, reason: 'sat:cfdi' });
  });
});
