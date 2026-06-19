import { MovementType, type IMovementCapability } from '@/types/gameplay';
import {
  getHeatMovementPenalty,
  isTSMActive,
} from '@/types/validation/HeatManagement';

/**
 * Calculate running MP from walking MP.
 * Run MP = ceil(walk MP * 1.5)
 */
export function calculateRunMP(walkMP: number): number {
  return Math.ceil(walkMP * 1.5);
}

/**
 * Calculate TacOps Sprint MP from walking MP.
 * Base Sprint MP = walk MP * 2.
 */
export function calculateSprintMP(walkMP: number): number {
  return walkMP * 2;
}

export function getSprintMPForCapability(
  capability: IMovementCapability,
): number {
  return capability.sprintMP ?? calculateSprintMP(capability.walkMP);
}

/**
 * Create movement capability from base values.
 */
export function createMovementCapability(
  walkMP: number,
  jumpMP: number = 0,
): IMovementCapability {
  return {
    walkMP,
    runMP: calculateRunMP(walkMP),
    jumpMP,
  };
}

function normalizePartialWingJumpBonus(
  partialWingJumpBonus: number | undefined,
): number {
  if (
    typeof partialWingJumpBonus !== 'number' ||
    !Number.isFinite(partialWingJumpBonus)
  ) {
    return 0;
  }
  return Math.max(0, Math.floor(partialWingJumpBonus));
}

/**
 * Apply an explicit Partial Wing jump bonus to a movement capability. MegaMek
 * only applies the wing bonus when the Mek already has positive jump MP.
 */
export function applyPartialWingJumpBonus(
  capability: IMovementCapability,
  partialWingJumpBonus: number | undefined,
): IMovementCapability {
  const bonus = normalizePartialWingJumpBonus(partialWingJumpBonus);
  if (bonus <= 0 || capability.jumpMP <= 0) {
    return capability;
  }

  return {
    ...capability,
    jumpMP: capability.jumpMP + bonus,
    partialWingJumpBonus: bonus,
  };
}

/**
 * Apply destroyed jump jets before optional jump enhancers. A jump-jet critical
 * removes one point of base jump MP; once all base jump capability is gone,
 * effects like Partial Wing cannot create a jump move on their own.
 */
export function applyJumpJetCriticalDamage(
  capability: IMovementCapability,
  jumpJetsDestroyed: number | undefined,
): IMovementCapability {
  if (
    typeof jumpJetsDestroyed !== 'number' ||
    !Number.isFinite(jumpJetsDestroyed) ||
    jumpJetsDestroyed <= 0
  ) {
    return capability;
  }

  return {
    ...capability,
    jumpMP: Math.max(0, capability.jumpMP - Math.floor(jumpJetsDestroyed)),
  };
}

/**
 * Apply explicit active MASC/Supercharger run and sprint MP. MegaMek derives
 * boosted MP from the already-effective walk MP: one active booster doubles
 * run MP and raises sprint MP to ceil(walk MP * 2.5); both active boosters
 * produce ceil(walk MP * 2.5) run MP and walk MP * 3 sprint MP.
 */
export function applyActiveMPBoosters(
  capability: IMovementCapability,
  activeMASC: boolean | undefined,
  activeSupercharger: boolean | undefined,
): IMovementCapability {
  const hasMASC = activeMASC === true;
  const hasSupercharger = activeSupercharger === true;
  if (!hasMASC && !hasSupercharger) {
    return capability;
  }

  const runMP =
    hasMASC && hasSupercharger
      ? Math.ceil(capability.walkMP * 2.5)
      : capability.walkMP * 2;
  const sprintMP =
    hasMASC && hasSupercharger
      ? capability.walkMP * 3
      : Math.ceil(capability.walkMP * 2.5);

  return {
    ...capability,
    runMP,
    sprintMP,
  };
}

/**
 * Re-derive run MP from a heat-adjusted walk MP, preserving the run/walk
 * formula family the capability encodes.
 */
function deriveRunMPFromAdjustedWalk(
  capability: IMovementCapability,
  adjustedWalkMP: number,
): number {
  const { walkMP, runMP } = capability;
  if (runMP === calculateRunMP(walkMP)) return calculateRunMP(adjustedWalkMP);
  if (runMP === walkMP * 2) return adjustedWalkMP * 2;
  if (runMP === Math.ceil(walkMP * 2.5)) {
    return Math.ceil(adjustedWalkMP * 2.5);
  }
  if (runMP === walkMP) return adjustedWalkMP;
  return Math.max(
    0,
    calculateRunMP(adjustedWalkMP) + (runMP - calculateRunMP(walkMP)),
  );
}

/**
 * Re-derive sprint MP from a heat-adjusted walk MP, preserving the
 * sprint/walk formula family the capability encodes.
 */
function deriveSprintMPFromAdjustedWalk(
  capability: IMovementCapability,
  adjustedWalkMP: number,
): number {
  const { walkMP } = capability;
  const sprintMP = getSprintMPForCapability(capability);
  if (sprintMP === calculateSprintMP(walkMP)) {
    return calculateSprintMP(adjustedWalkMP);
  }
  if (sprintMP === Math.ceil(walkMP * 2.5)) {
    return Math.ceil(adjustedWalkMP * 2.5);
  }
  if (sprintMP === walkMP * 3) return adjustedWalkMP * 3;
  return Math.max(
    0,
    calculateSprintMP(adjustedWalkMP) + (sprintMP - calculateSprintMP(walkMP)),
  );
}

/**
 * Get the maximum MP available for a movement type.
 */
export function getMaxMP(
  capability: IMovementCapability,
  movementType: MovementType,
  heatPenalty: number = 0,
): number {
  if (heatPenalty <= 0) return getRawMaxMP(capability, movementType);

  const adjustedWalkMP = Math.max(0, capability.walkMP - heatPenalty);
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return adjustedWalkMP;
    case MovementType.Run:
    case MovementType.Evade:
      return Math.max(
        0,
        deriveRunMPFromAdjustedWalk(capability, adjustedWalkMP),
      );
    case MovementType.Sprint:
      return Math.max(
        0,
        deriveSprintMPFromAdjustedWalk(capability, adjustedWalkMP),
      );
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

function getRawMaxMP(
  capability: IMovementCapability,
  movementType: MovementType,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
    case MovementType.Evade:
      return capability.runMP;
    case MovementType.Sprint:
      return getSprintMPForCapability(capability);
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

/**
 * Compute the effective walk MP for a unit given its base walk MP, current
 * heat, and TSM equipment status.
 */
export function getEffectiveWalkMP(
  baseWalkMP: number,
  currentHeat: number,
  hasTSM: boolean,
): number {
  const tsmBonus = hasTSM && isTSMActive(currentHeat) ? 2 : 0;
  const heatPenalty = getHeatMovementPenalty(currentHeat);
  return Math.max(0, baseWalkMP + tsmBonus - heatPenalty);
}

/**
 * Build the movement capability a BattleMech should validate against when TSM
 * and heat are both known at runner time.
 */
export function getHeatAdjustedMovementCapability(
  capability: IMovementCapability,
  currentHeat: number,
  hasTSM: boolean,
): IMovementCapability {
  const walkMP = getEffectiveWalkMP(capability.walkMP, currentHeat, hasTSM);

  return {
    ...capability,
    walkMP,
    runMP: Math.max(0, deriveRunMPFromAdjustedWalk(capability, walkMP)),
    ...(capability.sprintMP !== undefined
      ? {
          sprintMP: Math.max(
            0,
            deriveSprintMPFromAdjustedWalk(capability, walkMP),
          ),
        }
      : {}),
  };
}
