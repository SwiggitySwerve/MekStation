import type {
  ICombatRangeHex,
  IHexTerrain,
  IMovementRangeHex,
} from '@/types/gameplay';

import { Facing, TerrainType } from '@/types/gameplay';

import type {
  ITacticalMapCombatLosBlockerReference,
  ITacticalMapProjectionSourceReference,
} from './tacticalMapProjection.types';

import {
  formatMovementOption,
  movementHasReachableOption,
  movementOptionsForProjection,
} from './tacticalMapProjection.movementFormatting';
import {
  COMBAT_RULE_REFERENCES,
  LEGACY_ATTACK_RANGE_RULE_REFERENCES,
  LOS_BLOCKER_RULE_REFERENCES,
  MOVEMENT_RULE_REFERENCES,
  REPRESENTED_MINEFIELD_MOVEMENT_RULE_REFERENCES,
  REPRESENTED_WATER_ENVIRONMENT_RULE_REFERENCES,
  STAND_UP_MOVEMENT_RULE_REFERENCES,
  TERRAIN_ELEVATION_RULE_REFERENCES,
} from './tacticalMapProjection.ruleReferences';
import { formatTacticalProjectionSourceReference } from './tacticalMapProjection.sourceReferenceFormatting';
import { getFacingAbbreviation } from './unitPosition';

export function collectProjectionSourceReferences({
  terrain,
  movement,
  combat,
  combatLosBlockerFor,
  inLegacyAttackRange,
}: {
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
  readonly inLegacyAttackRange: boolean;
}): readonly ITacticalMapProjectionSourceReference[] {
  const references: ITacticalMapProjectionSourceReference[] = [
    {
      channel: 'terrain-elevation',
      kind: 'mekstation',
      label: 'Rendered map terrain/elevation grid',
      detail: formatTerrainSourceDetail(terrain),
      ruleReferences: TERRAIN_ELEVATION_RULE_REFERENCES,
    },
  ];

  if (movement) {
    references.push({
      channel: 'movement',
      kind: 'megamek',
      label: 'MegaMek movement rules projection',
      detail: formatMovementSourceDetail(movement),
      ruleReferences: MOVEMENT_RULE_REFERENCES,
    });

    if (movementHasStandUpContext(movement)) {
      references.push({
        channel: 'movement',
        kind: 'megamek',
        label: 'MegaMek stand-up movement rules projection',
        detail: formatStandUpMovementSourceDetail(movement),
        ruleReferences: STAND_UP_MOVEMENT_RULE_REFERENCES,
      });
    }
  }

  if (isRepresentedMinefieldTerrain(terrain)) {
    references.push({
      channel: 'movement',
      kind: 'mekstation',
      label: 'Represented minefield movement hazard projection',
      detail: formatRepresentedMinefieldSourceDetail({ terrain, movement }),
      ruleReferences: REPRESENTED_MINEFIELD_MOVEMENT_RULE_REFERENCES,
    });
  }

  if (combat) {
    references.push({
      channel: 'combat',
      kind: 'megamek',
      label: combat.hasTarget
        ? 'MegaMek combat target projection'
        : 'MegaMek weapon range projection',
      detail: formatCombatSourceDetail(combat),
      ruleReferences: COMBAT_RULE_REFERENCES,
    });

    if (combatHasEnvironmentRestrictions(combat)) {
      references.push({
        channel: 'combat',
        kind: 'megamek',
        label: 'MegaMek water weapon environment projection',
        detail: formatCombatEnvironmentSourceDetail(combat),
        ruleReferences: REPRESENTED_WATER_ENVIRONMENT_RULE_REFERENCES,
      });
    }
  }

  const losBlockerReferences = collectCombatLosBlockerReferences({
    combat,
    combatLosBlockerFor,
  });

  if (losBlockerReferences.length > 0) {
    references.push({
      channel: 'los-blocker',
      kind: 'megamek',
      label: 'MegaMek LOS blocker projection',
      detail: formatLosBlockerSourceDetail(losBlockerReferences),
      ruleReferences: LOS_BLOCKER_RULE_REFERENCES,
    });
  }

  if (inLegacyAttackRange) {
    references.push({
      channel: 'legacy-attack-range',
      kind: 'mekstation',
      label: 'Legacy attackRange fallback',
      detail: 'caller-provided range envelope',
      ruleReferences: LEGACY_ATTACK_RANGE_RULE_REFERENCES,
    });
  }

  return dedupeProjectionSourceReferences(references);
}

function collectCombatLosBlockerReferences({
  combat,
  combatLosBlockerFor,
}: {
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): readonly ITacticalMapCombatLosBlockerReference[] {
  const references = [...combatLosBlockerFor];

  if (
    combat?.hasTarget &&
    combat.lineOfSightBlocker &&
    combat.losState !== 'clear'
  ) {
    references.push({
      targetHex: combat.hex,
      targetUnitIds: combat.targetUnitIds,
      losState: combat.losState,
      blocker: combat.lineOfSightBlocker,
    });
  }

  return references;
}

function dedupeProjectionSourceReferences(
  references: readonly ITacticalMapProjectionSourceReference[],
): readonly ITacticalMapProjectionSourceReference[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = formatTacticalProjectionSourceReference(reference);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatTerrainSourceDetail(terrain: IHexTerrain): string {
  const terrainTypes =
    terrain.features.length === 0
      ? TerrainType.Clear
      : terrain.features.map(formatTerrainFeatureSourceDetail).join(',');
  return `${terrainTypes} elevation ${terrain.elevation}`;
}

export function formatTerrainFeatureSourceDetail(
  feature: IHexTerrain['features'][number],
): string {
  const parts: string[] = [feature.type];
  const levelDetail = formatTerrainFeatureLevelSourceDetail(feature);
  if (levelDetail) {
    parts.push(levelDetail);
  }
  if (feature.buildingId) {
    parts.push(`id ${feature.buildingId}`);
  }
  if (feature.constructionFactor !== undefined) {
    parts.push(`CF ${feature.constructionFactor}`);
  }
  const cliffExits = Array.from(
    new Set(feature.cliffTopExits?.filter(isFacing) ?? []),
  ).sort((a, b) => a - b);
  if (cliffExits.length > 0) {
    parts.push(
      `cliff edges ${cliffExits.map(getFacingAbbreviation).join('/')}`,
    );
  }
  return parts.join(' ');
}

function isFacing(value: number): value is Facing {
  return (
    Number.isInteger(value) &&
    value >= Facing.North &&
    value <= Facing.Northwest
  );
}

function formatTerrainFeatureLevelSourceDetail(
  feature: IHexTerrain['features'][number],
): string | null {
  if (feature.type === TerrainType.Clear && feature.level === 0) {
    return null;
  }
  if (feature.type === TerrainType.Water) {
    return `depth ${feature.level}`;
  }
  if (feature.type === TerrainType.Fire || feature.type === TerrainType.Smoke) {
    return `intensity ${feature.level}`;
  }
  return `level ${feature.level}`;
}

function formatRepresentedMinefieldSourceDetail({
  terrain,
  movement,
}: {
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
}): string {
  const mineLevels = terrain.features
    .filter(isRepresentedMinefieldFeature)
    .map((feature) => feature.level);
  const levelDetail =
    mineLevels.length > 0 ? ` levels ${mineLevels.join(',')}` : '';
  const movementDetail = movementHasReachableOption(movement)
    ? 'reachable entry can apply 10 damage to each leg and queue PSRs'
    : 'BattleMech entry can apply 10 damage to each leg and queue PSRs';
  return `represented mines${levelDetail}; ${movementDetail}`;
}

export function isRepresentedMinefieldTerrain(terrain: IHexTerrain): boolean {
  return terrain.features.some(isRepresentedMinefieldFeature);
}

function isRepresentedMinefieldFeature(
  feature: IHexTerrain['features'][number],
): boolean {
  return feature.type === TerrainType.Mines && feature.level > 0;
}

function formatMovementSourceDetail(movement: IMovementRangeHex): string {
  const options = movementOptionsForProjection(movement);
  const modes = Array.from(
    new Set(
      options.map((option) =>
        option.movementMode && option.movementMode !== option.movementType
          ? `${option.movementType}/${option.movementMode}`
          : option.movementType,
      ),
    ),
  );
  return `${modes.join(',')} projection: ${options
    .map(formatMovementOption)
    .join(', ')}`;
}

function movementHasStandUpContext(movement: IMovementRangeHex): boolean {
  return Boolean(
    movement.standUpRequired ||
    movement.standUpPsrRequired ||
    movement.standUpPsrAutomaticSuccessReason ||
    movement.standUpPsrModifierDetails?.length,
  );
}

function formatStandUpMovementSourceDetail(
  movement: IMovementRangeHex,
): string {
  const mode = movement.standUpMode ?? 'normal';
  const cost =
    movement.standUpCost === undefined ? 'unknown' : `${movement.standUpCost}`;
  const psr = movement.standUpPsrRequired ? 'PSR projected' : 'no PSR';
  const impossible = movement.standUpPsrImpossibleReason ? ' impossible' : '';
  return `${mode} stand-up ${cost} MP ${psr}${impossible}`;
}

function formatCombatSourceDetail(combat: ICombatRangeHex): string {
  const targetState = combat.hasTarget ? 'target' : 'range envelope';
  return `${targetState} ${combat.rangeBracket} ${combat.distance} hexes LOS ${combat.losState}`;
}

function combatHasEnvironmentRestrictions(combat: ICombatRangeHex): boolean {
  return combat.weaponRangeOptions.some((option) => !option.environmentLegal);
}

function formatCombatEnvironmentSourceDetail(combat: ICombatRangeHex): string {
  const blockedOptions = combat.weaponRangeOptions
    .filter((option) => !option.environmentLegal)
    .map((option) => {
      const reason = option.blockedReason ?? 'environment blocked';
      return `${option.weaponId}: ${reason}`;
    });

  return `environment restrictions ${blockedOptions.join('; ')}`;
}

function formatLosBlockerSourceDetail(
  refs: readonly ITacticalMapCombatLosBlockerReference[],
): string {
  const blockerKinds = Array.from(new Set(refs.map((ref) => ref.blocker.kind)));
  const targetDetails = refs.map(
    (ref) => `${ref.targetHex.q},${ref.targetHex.r} ${ref.blocker.reason}`,
  );
  return `${blockerKinds.join(',')} for ${targetDetails.join('; ')}`;
}
