export const ENGINE_DESTRUCTION_THRESHOLD = 3;
export const ENGINE_HEAT_PER_HIT = 5;
/**
 * Per `fix-combat-rule-accuracy` and Total Warfare p. 43: two life-support
 * critical hits disable life support. Once disabled, the pilot suffers
 * heat-damage on every subsequent heat phase. Canonical OpenSpec change:
 * integrate-damage-pipeline / task 10.5.
 */
export const LIFE_SUPPORT_DESTRUCTION_THRESHOLD = 2;
export const GYRO_PSR_MODIFIER_PER_HIT = 3;
export const GYRO_CANNOT_STAND_THRESHOLD = 2;
export const CANNOT_STAND_PENALTY = 999;
export const LETHAL_PILOT_WOUNDS = 6;
export const SHOULDER_TO_HIT_MODIFIER = 4;
export const HIP_PSR_MODIFIER = 2;
export const LEG_ACTUATOR_PSR_MODIFIER = 1;
export const FOOT_PSR_MODIFIER = 1;
export const UPPER_ARM_TO_HIT_MODIFIER = 1;
export const LOWER_ARM_TO_HIT_MODIFIER = 1;
export const HAND_TO_HIT_MODIFIER = 1;
export const UPPER_LEG_TO_HIT_MODIFIER = 2;
export const LOWER_LEG_TO_HIT_MODIFIER = 2;
export const FOOT_TO_HIT_MODIFIER = 1;
