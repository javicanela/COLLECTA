import { describe, expect, it } from 'vitest';
import { runChallenge } from './challenge';
import type { MappingCandidate } from './types';

describe('challenge pass', () => {
  it('changes to a simpler alternative region when it has fewer assumptions and stronger evidence', () => {
    const result = runChallenge({
      initialRegion: {
        regionId: 'weak',
        confidence: 0.52,
        mappedFieldCount: 2,
        assumptionCount: 3,
        reasonCodes: ['region:title_row_risk'],
      },
      alternativeRegions: [
        {
          regionId: 'strong',
          confidence: 0.84,
          mappedFieldCount: 5,
          assumptionCount: 1,
          reasonCodes: ['region:canonical_fields'],
        },
      ],
      mappings: [],
    });

    expect(result.status).toBe('changed');
    expect(result.selectedRegionId).toBe('strong');
    expect(result.findings).toContain('challenge:alternative_region_stronger');
  });

  it('confirms the initial region when alternatives are weaker', () => {
    const result = runChallenge({
      initialRegion: {
        regionId: 'initial',
        confidence: 0.88,
        mappedFieldCount: 6,
        assumptionCount: 1,
        reasonCodes: ['region:canonical_fields'],
      },
      alternativeRegions: [
        {
          regionId: 'weak',
          confidence: 0.49,
          mappedFieldCount: 2,
          assumptionCount: 3,
          reasonCodes: ['region:sparse'],
        },
      ],
      mappings: [],
    });

    expect(result.status).toBe('confirmed');
    expect(result.selectedRegionId).toBe('initial');
  });

  it('downgrades confidence when tipo and descripcion evidence conflicts', () => {
    const mappings: MappingCandidate[] = [
      {
        columnIndex: 4,
        sourceHeader: 'Tipo / descripcion',
        field: 'operation.tipo',
        confidence: 0.58,
        reasonCodes: ['header:alias:tipo', 'values:long_text'],
        assumptions: ['Long descriptions may not be operation type values'],
        alternatives: [{ field: 'operation.descripcion', confidence: 0.56, reasonCodes: ['values:long_text'] }],
      },
    ];

    const result = runChallenge({
      initialRegion: {
        regionId: 'initial',
        confidence: 0.74,
        mappedFieldCount: 5,
        assumptionCount: 1,
        reasonCodes: ['region:canonical_fields'],
      },
      alternativeRegions: [],
      mappings,
    });

    expect(result.status).toBe('downgraded');
    expect(result.warnings).toContain('conflict:tipo_vs_descripcion');
  });
});
