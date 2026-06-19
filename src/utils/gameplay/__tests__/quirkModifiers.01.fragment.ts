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

describe('Targeting Quirks', () => {
  it('Improved Targeting Short: -1 at short range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT],
      RangeBracket.Short,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(-1);
    expect(mod!.source).toBe('quirk');
  });

  it('Improved Targeting Medium: -1 at medium range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.IMPROVED_TARGETING_MEDIUM],
      RangeBracket.Medium,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(-1);
  });

  it('Improved Targeting Long: -1 at long range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.IMPROVED_TARGETING_LONG],
      RangeBracket.Long,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(-1);
  });

  it('Improved Targeting Short: no effect at medium range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT],
      RangeBracket.Medium,
    );
    expect(mod).toBeNull();
  });

  it('Poor Targeting Short: +1 at short range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.POOR_TARGETING_SHORT],
      RangeBracket.Short,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  it('Poor Targeting Medium: +1 at medium range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.POOR_TARGETING_MEDIUM],
      RangeBracket.Medium,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  it('Poor Targeting Long: +1 at long range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.POOR_TARGETING_LONG],
      RangeBracket.Long,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  it('Poor Targeting Long: no effect at short range', () => {
    const mod = calculateTargetingQuirkModifier(
      [UNIT_QUIRK_IDS.POOR_TARGETING_LONG],
      RangeBracket.Short,
    );
    expect(mod).toBeNull();
  });

  it('no targeting quirks: returns null', () => {
    const mod = calculateTargetingQuirkModifier([], RangeBracket.Short);
    expect(mod).toBeNull();
  });
});

// =============================================================================
// Defensive Quirks (Task 12.4)
// =============================================================================

describe('Defensive Quirks', () => {
  it('Distracting: +1 to enemy attacks', () => {
    const mod = calculateDistractingModifier([UNIT_QUIRK_IDS.DISTRACTING]);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
    expect(mod!.source).toBe('quirk');
  });

  it('Distracting: no effect without quirk', () => {
    const mod = calculateDistractingModifier([]);
    expect(mod).toBeNull();
  });

  it('Low Profile: returns true when unit has quirk', () => {
    expect(hasLowProfile([UNIT_QUIRK_IDS.LOW_PROFILE])).toBe(true);
  });

  it('Low Profile: returns false without quirk', () => {
    expect(hasLowProfile([])).toBe(false);
  });

  it('Low Profile modifier: +1 when no partial cover', () => {
    const mod = calculateLowProfileModifier(
      [UNIT_QUIRK_IDS.LOW_PROFILE],
      false,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  it('Low Profile modifier: null when already in partial cover', () => {
    const mod = calculateLowProfileModifier([UNIT_QUIRK_IDS.LOW_PROFILE], true);
    expect(mod).toBeNull();
  });
});

// =============================================================================
// Piloting Quirks (Task 12.5)
// =============================================================================

describe('Piloting Quirks', () => {
  it('Stable: -1 to kick and push PSRs only', () => {
    const kickMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.STABLE],
      false,
      PSRTrigger.Kicked,
    );
    const pushMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.STABLE],
      false,
      PSRTrigger.Pushed,
    );
    const damageMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.STABLE],
      false,
      PSRTrigger.PhaseDamage20Plus,
    );
    const unspecifiedMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.STABLE],
      false,
    );

    expect(kickMod).toBe(-1);
    expect(pushMod).toBe(-1);
    expect(damageMod).toBe(0);
    expect(unspecifiedMod).toBe(0);
  });

  it('Hard to Pilot: +1 to all PSRs', () => {
    const mod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.HARD_TO_PILOT],
      false,
    );
    expect(mod).toBe(1);
  });

  it('Cramped Cockpit: +1 to all piloting rolls unless pilot has Small Pilot', () => {
    const mod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
      false,
    );
    expect(mod).toBe(1);

    const smallPilotMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
      false,
      PSRTrigger.PhaseDamage20Plus,
      5,
      ['small_pilot'],
    );
    expect(smallPilotMod).toBe(0);
  });

  it('Easy to Pilot: -1 for terrain and 20+ damage PSRs only when piloting is worse than 3', () => {
    const terrainMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      true,
      PSRTrigger.EnteringRubble,
      4,
    );
    expect(terrainMod).toBe(-1);

    const damageMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      false,
      PSRTrigger.PhaseDamage20Plus,
      5,
    );
    expect(damageMod).toBe(-1);

    const skilledPilotMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      true,
      PSRTrigger.EnteringRubble,
      3,
    );
    expect(skilledPilotMod).toBe(0);

    const legDamageMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      false,
      PSRTrigger.LegDamage,
      5,
    );
    expect(legDamageMod).toBe(0);

    const missingSkillMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      true,
      PSRTrigger.EnteringRubble,
    );
    expect(missingSkillMod).toBe(0);
  });

  it('Unbalanced: +1 for terrain PSR only', () => {
    const terrainMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.UNBALANCED],
      true,
    );
    expect(terrainMod).toBe(1);

    const nonTerrainMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.UNBALANCED],
      false,
    );
    expect(nonTerrainMod).toBe(0);
  });

  it('Stable + Cramped Cockpit stack: net 0', () => {
    const mod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.STABLE, UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
      false,
      PSRTrigger.Kicked,
    );
    expect(mod).toBe(0);
  });

  it('no piloting quirks: 0', () => {
    const mod = calculatePilotingQuirkPSRModifier([], false);
    expect(mod).toBe(0);
  });

  it('No Arms: +2 only to stand-up PSRs', () => {
    const standUpMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.NO_ARMS],
      false,
      PSRTrigger.StandingUp,
    );
    const damageMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.NO_ARMS],
      false,
      PSRTrigger.PhaseDamage20Plus,
    );

    expect(standUpMod).toBe(2);
    expect(damageMod).toBe(0);
  });
});

// =============================================================================
// Physical Quirks (Task 12.6)
// =============================================================================
