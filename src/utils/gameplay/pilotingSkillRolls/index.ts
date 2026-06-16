/**
 * Piloting Skill Rolls (PSR) - Barrel Export
 * Exports all PSR types, resolution logic, and factory functions.
 */

// Types
export * from './types';

// Resolution logic
export {
  resolvePSR,
  resolveAllPSRs,
  calculatePSRModifiers,
} from './resolution';

// Factory functions
export {
  createDamagePSR,
  createLegDamagePSR,
  createHipActuatorPSR,
  createGyroPSR,
  createEngineHitPSR,
  createUpperLegActuatorPSR,
  createLowerLegActuatorPSR,
  createFootActuatorPSR,
} from './damageFactories';

export {
  createKickedPSR,
  createChargedPSR,
  createDFAAttackerPSR,
  createDFATargetPSR,
  createDominoEffectPSR,
  createPushedPSR,
  createKickMissPSR,
  createChargeMissPSR,
  createDFAMissPSR,
} from './combatFactories';

export {
  createShutdownPSR,
  createStandingUpPSR,
  createRubblePSR,
  createRunningRoughTerrainPSR,
  createIcePSR,
  createEnteringWaterPSR,
  createExitingWaterPSR,
  createSkiddingPSR,
  createSwampBogDownPSR,
  createAirMekLandingPSR,
  createBuildingCollapsePSR,
} from './environmentFactories';

export {
  MASC_SUPERCHARGER_FAILURE_TARGET_NUMBERS,
  createRunningDamagedHipPSR,
  createRunningDamagedGyroPSR,
  createControlledSideslipPSR,
  createFlankingAndTurningPSR,
  createOutOfControlPSR,
  createMASCFailurePSR,
  createSuperchargerFailurePSR,
  getMASCOrSuperchargerFailureTargetNumber,
} from './systemFactories';

// Phase checks
export {
  checkPhaseDamagePSR,
  createStandUpAttempt,
  isGyroDestroyed,
} from './phaseChecks';
