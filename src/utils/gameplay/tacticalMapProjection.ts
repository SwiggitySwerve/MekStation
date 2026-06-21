import type {
  ICombatRangeHex,
  IHexCoordinate,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import type {
  BuildTacticalMapHexProjectionLookupInput,
  ITacticalMapCombatLosBlockerReference,
  ITacticalMapHexProjection,
} from './tacticalMapProjection.types';

import { coordToKey } from './hexMath';
import { formatProjectionExplanation } from './tacticalMapProjection.explanation';
import { collectProjectionSourceReferences } from './tacticalMapProjection.sourceReferences';
import {
  collectBlockedReasons,
  deriveCombatProjectionStatus,
  deriveMovementCostProjectionReasons,
  deriveMovementCostProjectionStatus,
  deriveMovementHazardProjectionReasons,
  deriveMovementHazardProjectionStatus,
  deriveMovementProjectionStatus,
  deriveProjectionIntent,
  deriveProjectionStatus,
} from './tacticalMapProjection.status';

export {
  formatTacticalProjectionRuleReferenceLabels,
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceLabels,
  formatTacticalProjectionSourceReferences,
} from './tacticalMapProjection.sourceReferenceFormatting';
export type {
  BuildTacticalMapHexProjectionLookupInput,
  ITacticalMapCombatLosBlockerReference,
  ITacticalMapHexProjection,
  ITacticalMapProjectionSourceReference,
  TacticalMapCombatProjectionStatus,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
  TacticalMapMovementCostProjectionStatus,
  TacticalMapMovementHazardProjectionStatus,
  TacticalMapMovementProjectionStatus,
  TacticalMapProjectionSourceChannel,
  TacticalMapProjectionSourceKind,
} from './tacticalMapProjection.types';

interface BuildTacticalMapHexProjectionInput {
  readonly hex: IHexCoordinate;
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor?: readonly ITacticalMapCombatLosBlockerReference[];
  readonly pathIndex?: number;
  readonly inLegacyAttackRange: boolean;
}

export function buildTacticalMapHexProjectionLookup({
  hexes,
  terrainLookup,
  movementRangeLookup,
  combatRangeLookup,
  highlightPathIndexLookup = new Map(),
  legacyAttackRangeLookup = new Set(),
}: BuildTacticalMapHexProjectionLookupInput): ReadonlyMap<
  string,
  ITacticalMapHexProjection
> {
  const projections = new Map<string, ITacticalMapHexProjection>();
  const combatLosBlockerRefsByKey =
    buildCombatLosBlockerReferenceLookup(combatRangeLookup);

  for (const hex of hexes) {
    const key = coordToKey(hex);
    projections.set(
      key,
      buildTacticalMapHexProjection({
        hex,
        terrain: terrainLookup.get(key) ?? defaultHexTerrain(hex),
        movement: movementRangeLookup.get(key),
        combat: combatRangeLookup.get(key),
        combatLosBlockerFor: combatLosBlockerRefsByKey.get(key) ?? [],
        pathIndex: highlightPathIndexLookup.get(key),
        inLegacyAttackRange: legacyAttackRangeLookup.has(key),
      }),
    );
  }

  return projections;
}

export function buildTacticalMapHexProjection({
  hex,
  terrain,
  movement,
  combat,
  combatLosBlockerFor = [],
  pathIndex,
  inLegacyAttackRange,
}: BuildTacticalMapHexProjectionInput): ITacticalMapHexProjection {
  const useLegacyAttackRange = inLegacyAttackRange && !combat;
  const inAttackRange = useLegacyAttackRange || Boolean(combat?.inRange);
  const blockedReasons = collectBlockedReasons({
    movement,
    combat,
    combatLosBlockerFor,
  });
  const movementStatus = deriveMovementProjectionStatus(movement);
  const movementCostReasons = deriveMovementCostProjectionReasons(movement);
  const movementCostStatus = deriveMovementCostProjectionStatus({
    movement,
    movementCostReasons,
  });
  const movementHazardReasons = deriveMovementHazardProjectionReasons({
    terrain,
    movement,
  });
  const movementHazardStatus = deriveMovementHazardProjectionStatus(
    movementHazardReasons,
  );
  const combatStatus = deriveCombatProjectionStatus({
    combat,
    inAttackRange,
    combatLosBlockerFor,
  });
  const intent = deriveProjectionIntent({
    pathIndex,
    movement,
    combat,
    inAttackRange,
    combatLosBlockerFor,
  });
  const status = deriveProjectionStatus({
    movement,
    combat,
    combatLosBlockerFor,
  });
  const sourceReferences = collectProjectionSourceReferences({
    terrain,
    movement,
    combat,
    combatLosBlockerFor,
    inLegacyAttackRange: useLegacyAttackRange,
  });

  return {
    hex,
    key: coordToKey(hex),
    terrain,
    movement,
    combat,
    combatLosBlockerFor,
    pathIndex,
    inAttackRange,
    intent,
    status,
    movementStatus,
    movementCostStatus,
    movementCostReasons,
    movementHazardStatus,
    movementHazardReasons,
    combatStatus,
    blockedReasons,
    sourceReferences,
    explanation: formatProjectionExplanation({
      hex,
      terrain,
      movement,
      combat,
      combatLosBlockerFor,
      intent,
      status,
      movementStatus,
      movementCostStatus,
      movementCostReasons,
      movementHazardStatus,
      movementHazardReasons,
      combatStatus,
      blockedReasons,
      sourceReferences,
      legacyAttackRangeOnly: useLegacyAttackRange,
    }),
  };
}

function defaultHexTerrain(hex: IHexCoordinate): IHexTerrain {
  return {
    coordinate: hex,
    elevation: 0,
    features: [{ type: TerrainType.Clear, level: 0 }],
  };
}

function buildCombatLosBlockerReferenceLookup(
  combatRangeLookup: ReadonlyMap<string, ICombatRangeHex>,
): ReadonlyMap<string, readonly ITacticalMapCombatLosBlockerReference[]> {
  const refsByKey = new Map<string, ITacticalMapCombatLosBlockerReference[]>();

  combatRangeLookup.forEach((combat) => {
    if (
      !combat.hasTarget ||
      !combat.lineOfSightBlocker ||
      combat.losState === 'clear'
    ) {
      return;
    }

    const key = coordToKey(combat.lineOfSightBlocker.hex);
    const refs = refsByKey.get(key) ?? [];
    refs.push({
      targetHex: combat.hex,
      targetUnitIds: combat.targetUnitIds,
      losState: combat.losState,
      blocker: combat.lineOfSightBlocker,
    });
    refsByKey.set(key, refs);
  });

  return refsByKey;
}
