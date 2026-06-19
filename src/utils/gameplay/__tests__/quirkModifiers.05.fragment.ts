import { RangeBracket, MovementType, PSRTrigger } from '@/types/gameplay';
import { IAttackerState, ITargetState } from '@/types/gameplay';

import {
  UNIT_QUIRK_IDS,
  WEAPON_QUIRK_IDS,
  calculateTargetingQuirkModifier,
  calculateDistractingModifier,
  hasLowProfile,
  calculateLowProfileModifier,
  calculatePilotingQuirkPSRModifier,
  getBattleFistPunchToHitModifier,
  hasNoArms,
  isLowArmsRestricted,
  calculateInitiativeQuirkModifier,
  calculateSensorGhostsModifier,
  calculateMultiTracModifier,
  getRuggedMaintenanceMultiplier,
  getAntiMekActuatorTargetModifier,
  calculateAccurateWeaponModifier,
  calculateInaccurateWeaponModifier,
  calculateStableWeaponModifier,
  getWeaponCoolingHeatModifier,
  getWeaponQuirks,
  parseWeaponQuirksFromMTF,
  parseWeaponQuirksFromBLK,
  calculateAttackerQuirkModifiers,
  getQuirkCatalogSize,
  getQuirksForPipeline,
  getQuirksByCategory,
  hasQuirk,
  QUIRK_CATALOG,
} from '../quirkModifiers';
import { calculateToHit } from '../toHit';

// =============================================================================
// Targeting Quirks (Task 12.3)
// =============================================================================

describe('hasQuirk', () => {
  it('returns true when quirk is present', () => {
    expect(hasQuirk(['command_mech', 'stable'], 'stable')).toBe(true);
  });

  it('returns false when quirk is absent', () => {
    expect(hasQuirk(['command_mech'], 'stable')).toBe(false);
  });

  it('returns false for empty quirks', () => {
    expect(hasQuirk([], 'stable')).toBe(false);
  });
});
