import type { ChallengeInput, ChallengeResult, MappingCandidate } from './types';

function hasTipoDescripcionConflict(mapping: MappingCandidate): boolean {
  if (mapping.field !== 'operation.tipo') return false;
  const descriptionAlternative = mapping.alternatives.find((alternative) => alternative.field === 'operation.descripcion');
  if (!descriptionAlternative) return false;
  const closeConfidence = Math.abs(mapping.confidence - descriptionAlternative.confidence) <= 0.15;
  return closeConfidence && mapping.reasonCodes.includes('values:long_text');
}

export function runChallenge(input: ChallengeInput): ChallengeResult {
  const findings: string[] = [];
  const warnings: string[] = [];
  const initial = input.initialRegion;
  const bestAlternative = [...input.alternativeRegions].sort((a, b) => b.confidence - a.confidence)[0];

  let selectedRegionId = initial.regionId;
  let selectedConfidence = initial.confidence;
  let status: ChallengeResult['status'] = 'confirmed';

  if (
    bestAlternative &&
    bestAlternative.confidence >= initial.confidence + 0.08 &&
    bestAlternative.mappedFieldCount >= initial.mappedFieldCount &&
    bestAlternative.assumptionCount <= initial.assumptionCount
  ) {
    status = 'changed';
    selectedRegionId = bestAlternative.regionId;
    selectedConfidence = bestAlternative.confidence;
    findings.push('challenge:alternative_region_stronger');
  }

  for (const mapping of input.mappings) {
    if (hasTipoDescripcionConflict(mapping)) {
      warnings.push('conflict:tipo_vs_descripcion');
      findings.push('challenge:mapping_conflict_detected');
    }
  }

  if (warnings.length > 0 && status === 'confirmed') {
    status = 'downgraded';
    selectedConfidence = Math.max(0, selectedConfidence - 0.08);
  }

  if (findings.length === 0) {
    findings.push('challenge:initial_region_confirmed');
  }

  return {
    status,
    initialRegionId: initial.regionId,
    selectedRegionId,
    confidenceDelta: Number((selectedConfidence - initial.confidence).toFixed(3)),
    findings,
    warnings,
  };
}
