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
  createUpperLegActuatorPSR,
  createLowerLegActuatorPSR,
  createFootActuatorPSR,
} from './damageFactories';

export {
  createKickedPSR,
  createChargedPSR,
  createDFATargetPSR,
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
  createBuildingCollapsePSR,
} from './environmentFactories';

export {
  createRunningDamagedHipPSR,
  createRunningDamagedGyroPSR,
  createMASCFailurePSR,
  createSuperchargerFailurePSR,
} from './systemFactories';

// Phase checks
export {
  checkPhaseDamagePSR,
  createStandUpAttempt,
  isGyroDestroyed,
} from './phaseChecks';
