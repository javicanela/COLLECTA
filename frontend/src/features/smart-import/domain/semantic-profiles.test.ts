import { describe, expect, it } from 'vitest';
import { weirdHeadersCsvRows } from '../__fixtures__/sample-workbooks';
import { profileColumns, scoreMappings } from './semantic-profiles';
import { detectTableRegions } from './table-detection';

describe('semantic profiles', () => {
  it('profiles column evidence from headers and sampled values', () => {
    const region = detectTableRegions('weird-csv', weirdHeadersCsvRows)[0];
    const profiles = profileColumns(weirdHeadersCsvRows, region);

    expect(profiles[0].detectors.rfc.matches).toBe(3);
    expect(profiles[2].detectors.email.matches).toBe(3);
    expect(profiles[4].detectors.money.matches).toBe(3);
    expect(profiles[5].detectors.date.matches).toBe(3);
  });

  it('scores canonical field mappings with confidence and reason codes', () => {
    const region = detectTableRegions('weird-csv', weirdHeadersCsvRows)[0];
    const profiles = profileColumns(weirdHeadersCsvRows, region);
    const candidates = scoreMappings(profiles);

    expect(candidates).toContainEqual(expect.objectContaining({
      columnIndex: 0,
      field: 'client.rfc',
      reasonCodes: expect.arrayContaining(['header:alias:rfc', 'values:rfc']),
    }));
    expect(candidates).toContainEqual(expect.objectContaining({
      columnIndex: 4,
      field: 'operation.monto',
      reasonCodes: expect.arrayContaining(['header:alias:monto', 'values:money']),
    }));
    expect(candidates.every((candidate) => candidate.confidence > 0 && candidate.confidence <= 1)).toBe(true);
  });
});
