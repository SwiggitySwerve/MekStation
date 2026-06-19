import { TerrainType } from '@/types/gameplay';

import type { ProjectionExplanationInput } from './tacticalMapProjection.types';

import {
  appendCombatLosBlockerProjectionExplanation,
  appendCombatProjectionExplanation,
} from './tacticalMapProjection.combatExplanation';
import { appendMovementProjectionExplanation } from './tacticalMapProjection.movementExplanation';
import { formatTacticalProjectionSourceLabels } from './tacticalMapProjection.sourceReferenceFormatting';
import { formatTerrainFeatureSourceDetail } from './tacticalMapProjection.sourceReferences';

export function formatProjectionExplanation(
  input: ProjectionExplanationInput,
): string {
  const {
    hex,
    terrain,
    intent,
    status,
    movementStatus,
    movementCostStatus,
    movementHazardStatus,
    movementHazardReasons,
    combatStatus,
    blockedReasons,
    sourceReferences,
    legacyAttackRangeOnly,
  } = input;
  const terrainTypes =
    terrain.features.length === 0
      ? TerrainType.Clear
      : terrain.features.map(formatTerrainFeatureSourceDetail).join(',');
  const parts = [
    `Hex ${hex.q},${hex.r}`,
    `intent ${intent}`,
    `status ${status}`,
    `movement status ${movementStatus}`,
    `movement cost status ${movementCostStatus}`,
    `movement hazard status ${movementHazardStatus}`,
    `combat status ${combatStatus}`,
    `terrain ${terrainTypes}`,
    `elevation ${terrain.elevation}`,
  ];

  appendMovementProjectionExplanation(parts, input);
  if (movementHazardReasons.length > 0) {
    parts.push(`movement hazards ${movementHazardReasons.join('; ')}`);
  }
  appendCombatProjectionExplanation(parts, input);
  appendCombatLosBlockerProjectionExplanation(parts, input.combatLosBlockerFor);
  if (legacyAttackRangeOnly) {
    parts.push('legacy attackRange fallback only; not weapon-backed');
  }
  if (blockedReasons.length > 0) {
    parts.push(`blocked ${blockedReasons.join('; ')}`);
  }
  if (sourceReferences.length > 0) {
    parts.push(
      `sources ${formatTacticalProjectionSourceLabels(sourceReferences)}`,
    );
  }

  return parts.join('; ');
}
