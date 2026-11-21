import type { IUnitGameState } from '@/types/gameplay/GameSessionStateTypes';

/** R10 approved field table rev 2, Appendix A after.unit BLOCKED rows. */
export const GM_RELOAD_CARRIER_GAPS = [
  'grappledUnitId', 'isGrappleAttacker', 'grappledThisRound', 'grappleSide',
  'isChainWhipGrappled', 'isSpotting', 'spotTargetId', 'partialWingJumpBonus',
  'leftLegHasTalons', 'rightLegHasTalons', 'leftArmHasTalons', 'rightArmHasTalons',
  'leftArmHasClaw', 'rightArmHasClaw', 'carriedGroundObjectIds', 'hasStealthArmor',
  'startingInternalStructure', 'pilotWounds', 'pilotConscious', 'isBracing',
  'empInterferenceTurns', 'empShutdownTurns', 'pendingPSRs', 'weaponsFiredThisTurn',
  'neuralInterfaceMode', 'isDodging', 'narcedBy', 'iNarcPods', 'tagDesignated',
  'isIlluminated', 'unitHeight', 'infantryMounted', 'infantryMountHeight',
  'combatState', 'rescued',
] as const satisfies readonly (keyof IUnitGameState | 'rescued')[];

export const GM_CORRECTION_UNREPRESENTED_LEAVES = [
  'rescued', 'activationIndex', 'initiativeOrder', 'activeUnitId', 'pendingAction',
] as const;

export const GM_UNIT_RELOAD_UNSUPPORTED_REASON = 'gm-correction-unit-reload-unsupported';
