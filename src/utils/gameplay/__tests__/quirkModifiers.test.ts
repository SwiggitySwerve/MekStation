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

describe('Physical Quirks', () => {
  it('Battle Fists LA: -1 left punch to-hit', () => {
    expect(
      getBattleFistPunchToHitModifier([UNIT_QUIRK_IDS.BATTLE_FISTS_LA], 'left'),
    ).toBe(-1);
  });

  it('Battle Fists RA: -1 right punch to-hit', () => {
    expect(
      getBattleFistPunchToHitModifier(
        [UNIT_QUIRK_IDS.BATTLE_FISTS_RA],
        'right',
      ),
    ).toBe(-1);
  });

  it('Battle Fists LA: no bonus for right arm', () => {
    expect(
      getBattleFistPunchToHitModifier(
        [UNIT_QUIRK_IDS.BATTLE_FISTS_LA],
        'right',
      ),
    ).toBe(0);
  });

  it('Battle Fists both: -1 each matching arm', () => {
    const quirks = [
      UNIT_QUIRK_IDS.BATTLE_FISTS_LA,
      UNIT_QUIRK_IDS.BATTLE_FISTS_RA,
    ];
    expect(getBattleFistPunchToHitModifier(quirks, 'left')).toBe(-1);
    expect(getBattleFistPunchToHitModifier(quirks, 'right')).toBe(-1);
  });

  it('No Arms: prevents punching', () => {
    expect(hasNoArms([UNIT_QUIRK_IDS.NO_ARMS])).toBe(true);
    expect(hasNoArms([])).toBe(false);
  });

  it('Low Arms: stays no-op until a source-backed combat resolver exists', () => {
    expect(isLowArmsRestricted([UNIT_QUIRK_IDS.LOW_ARMS], 1)).toBe(false);
    expect(isLowArmsRestricted([UNIT_QUIRK_IDS.LOW_ARMS], 0)).toBe(false);
    expect(isLowArmsRestricted([UNIT_QUIRK_IDS.LOW_ARMS], -1)).toBe(false);
  });

  it('Low Arms: no restriction without quirk', () => {
    expect(isLowArmsRestricted([], 1)).toBe(false);
  });
});

// =============================================================================
// Initiative Quirks (Task 12.7)
// =============================================================================

describe('Initiative Quirks', () => {
  it('Command Mech: +1 initiative', () => {
    const mod = calculateInitiativeQuirkModifier([
      [UNIT_QUIRK_IDS.COMMAND_MECH],
      [],
    ]);
    expect(mod).toBe(1);
  });

  it('Battle Computer: +2 initiative', () => {
    const mod = calculateInitiativeQuirkModifier([
      [UNIT_QUIRK_IDS.BATTLE_COMPUTER],
      [],
    ]);
    expect(mod).toBe(2);
  });

  it('Battle Computer + Command Mech: only +2 (not cumulative)', () => {
    const mod = calculateInitiativeQuirkModifier([
      [UNIT_QUIRK_IDS.BATTLE_COMPUTER],
      [UNIT_QUIRK_IDS.COMMAND_MECH],
    ]);
    expect(mod).toBe(2);
  });

  it('no initiative quirks: 0', () => {
    const mod = calculateInitiativeQuirkModifier([[], []]);
    expect(mod).toBe(0);
  });
});

// =============================================================================
// Combat Quirks (Task 12.8)
// =============================================================================

describe('Combat Quirks', () => {
  it('Sensor Ghosts: +1 to own attacks', () => {
    const mod = calculateSensorGhostsModifier([UNIT_QUIRK_IDS.SENSOR_GHOSTS]);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  it('Sensor Ghosts: no effect without quirk', () => {
    expect(calculateSensorGhostsModifier([])).toBeNull();
  });

  it('Multi-Trac: eliminates front-arc secondary penalty', () => {
    const mod = calculateMultiTracModifier(
      [UNIT_QUIRK_IDS.MULTI_TRAC],
      true,
      true,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(-1);
  });

  it('Multi-Trac: no effect on non-front-arc secondary', () => {
    const mod = calculateMultiTracModifier(
      [UNIT_QUIRK_IDS.MULTI_TRAC],
      true,
      false,
    );
    expect(mod).toBeNull();
  });

  it('Multi-Trac: no effect on primary target', () => {
    const mod = calculateMultiTracModifier(
      [UNIT_QUIRK_IDS.MULTI_TRAC],
      false,
      true,
    );
    expect(mod).toBeNull();
  });
});

// =============================================================================
// Campaign and Anti-Mek Quirks (Task 12.9)
// =============================================================================

describe('Campaign and Anti-Mek Quirks', () => {
  it('Rugged 1: doubles the maintenance cycle', () => {
    expect(getRuggedMaintenanceMultiplier([UNIT_QUIRK_IDS.RUGGED_1])).toBe(2);
  });

  it('Rugged 2: triples the maintenance cycle', () => {
    expect(getRuggedMaintenanceMultiplier([UNIT_QUIRK_IDS.RUGGED_2])).toBe(3);
  });

  it('no Rugged: normal maintenance cycle', () => {
    expect(getRuggedMaintenanceMultiplier([])).toBe(1);
  });

  it('Protected Actuators: +1 anti-Mek attack target modifier', () => {
    expect(
      getAntiMekActuatorTargetModifier([UNIT_QUIRK_IDS.PROTECTED_ACTUATORS]),
    ).toBe(1);
  });

  it('Exposed Actuators: -1 anti-Mek attack target modifier', () => {
    expect(
      getAntiMekActuatorTargetModifier([UNIT_QUIRK_IDS.EXPOSED_ACTUATORS]),
    ).toBe(-1);
  });

  it('no actuator quirk: 0 anti-Mek attack target modifier', () => {
    expect(getAntiMekActuatorTargetModifier([])).toBe(0);
  });
});

// =============================================================================
// Weapon Quirks (Task 12.10)
// =============================================================================

describe('Weapon Quirks', () => {
  it('Accurate: -1 to-hit', () => {
    const mod = calculateAccurateWeaponModifier([WEAPON_QUIRK_IDS.ACCURATE]);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(-1);
    expect(mod!.source).toBe('quirk');
  });

  it('Inaccurate: +1 to-hit', () => {
    const mod = calculateInaccurateWeaponModifier([
      WEAPON_QUIRK_IDS.INACCURATE,
    ]);
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(1);
  });

  it('Stable Weapon: -1 running penalty', () => {
    const mod = calculateStableWeaponModifier(
      [WEAPON_QUIRK_IDS.STABLE_WEAPON],
      MovementType.Run,
    );
    expect(mod).not.toBeNull();
    expect(mod!.value).toBe(-1);
  });

  it('Stable Weapon: no effect when not running', () => {
    expect(
      calculateStableWeaponModifier(
        [WEAPON_QUIRK_IDS.STABLE_WEAPON],
        MovementType.Walk,
      ),
    ).toBeNull();
    expect(
      calculateStableWeaponModifier(
        [WEAPON_QUIRK_IDS.STABLE_WEAPON],
        MovementType.Stationary,
      ),
    ).toBeNull();
  });

  it('Improved Cooling: -1 heat', () => {
    expect(
      getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.IMPROVED_COOLING], 5),
    ).toBe(-1);
  });

  it('Improved Cooling: final heat floors at 1', () => {
    expect(
      getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.IMPROVED_COOLING], 1),
    ).toBe(0);
  });

  it('Poor Cooling: +1 heat', () => {
    expect(
      getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.POOR_COOLING], 5),
    ).toBe(1);
  });

  it('No Cooling: +2 heat', () => {
    expect(getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.NO_COOLING], 5)).toBe(
      2,
    );
    expect(
      getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.NO_COOLING], 12),
    ).toBe(2);
  });

  it('no cooling quirk: 0', () => {
    expect(getWeaponCoolingHeatModifier([], 5)).toBe(0);
  });
});

// =============================================================================
// getWeaponQuirks Helper
// =============================================================================

describe('getWeaponQuirks', () => {
  it('returns quirks for a known weapon', () => {
    const wpnQuirks = {
      'Medium Laser': ['accurate'],
      PPC: ['inaccurate'],
    };
    expect(getWeaponQuirks(wpnQuirks, 'Medium Laser')).toEqual(['accurate']);
  });

  it('returns empty array for unknown weapon', () => {
    expect(getWeaponQuirks({ PPC: ['accurate'] }, 'SRM 6')).toEqual([]);
  });

  it('returns empty array when weaponQuirks is undefined', () => {
    expect(getWeaponQuirks(undefined, 'PPC')).toEqual([]);
  });
});

// =============================================================================
// Weapon Quirk Parsing (Task 12.11)
// =============================================================================

describe('Weapon Quirk Parsing — MTF', () => {
  it('parses weapon_quirk lines', () => {
    const lines = [
      'chassis:Atlas',
      'weapon_quirk:accurate:Medium Laser:RA',
      'weapon_quirk:inaccurate:PPC:RT',
      'quirk:command_mech',
    ];
    const result = parseWeaponQuirksFromMTF(lines);
    expect(result['Medium Laser']).toEqual(['accurate']);
    expect(result['PPC']).toEqual(['inaccurate']);
  });

  it('groups multiple quirks for same weapon', () => {
    const lines = [
      'weapon_quirk:accurate:Large Laser:RA',
      'weapon_quirk:stable_weapon:Large Laser:RA',
    ];
    const result = parseWeaponQuirksFromMTF(lines);
    expect(result['Large Laser']).toEqual(['accurate', 'stable_weapon']);
  });

  it('skips malformed lines', () => {
    const lines = ['weapon_quirk:', 'weapon_quirk:accurate', 'not_a_quirk'];
    const result = parseWeaponQuirksFromMTF(lines);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns empty object for no weapon quirks', () => {
    const lines = ['quirk:command_mech'];
    const result = parseWeaponQuirksFromMTF(lines);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('Weapon Quirk Parsing — BLK', () => {
  it('parses quirk_name:weapon_name entries', () => {
    const entries = ['accurate:Medium Laser', 'inaccurate:PPC'];
    const result = parseWeaponQuirksFromBLK(entries);
    expect(result['Medium Laser']).toEqual(['accurate']);
    expect(result['PPC']).toEqual(['inaccurate']);
  });

  it('groups multiple quirks for same weapon', () => {
    const entries = ['accurate:Large Laser', 'stable_weapon:Large Laser'];
    const result = parseWeaponQuirksFromBLK(entries);
    expect(result['Large Laser']).toEqual(['accurate', 'stable_weapon']);
  });

  it('skips entries without colon', () => {
    const entries = ['nocolon', ''];
    const result = parseWeaponQuirksFromBLK(entries);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// =============================================================================
// Aggregation — calculateAttackerQuirkModifiers
// =============================================================================

describe('calculateAttackerQuirkModifiers', () => {
  const baseAttacker: IAttackerState = {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
  };

  const baseTarget: ITargetState = {
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    prone: false,
    immobile: false,
    partialCover: false,
  };

  it('returns empty for no quirks', () => {
    const mods = calculateAttackerQuirkModifiers(
      baseAttacker,
      baseTarget,
      RangeBracket.Short,
    );
    expect(mods).toHaveLength(0);
  });

  it('returns targeting quirk modifier', () => {
    const attacker: IAttackerState = {
      ...baseAttacker,
      unitQuirks: [UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT],
    };
    const mods = calculateAttackerQuirkModifiers(
      attacker,
      baseTarget,
      RangeBracket.Short,
    );
    expect(mods.some((m) => m.name === 'Improved Targeting')).toBe(true);
  });

  it('returns Sensor Ghosts penalty', () => {
    const attacker: IAttackerState = {
      ...baseAttacker,
      unitQuirks: [UNIT_QUIRK_IDS.SENSOR_GHOSTS],
    };
    const mods = calculateAttackerQuirkModifiers(
      attacker,
      baseTarget,
      RangeBracket.Short,
    );
    expect(mods.some((m) => m.name === 'Sensor Ghosts')).toBe(true);
  });

  it('returns Distracting modifier from target', () => {
    const target: ITargetState = {
      ...baseTarget,
      unitQuirks: [UNIT_QUIRK_IDS.DISTRACTING],
    };
    const mods = calculateAttackerQuirkModifiers(
      baseAttacker,
      target,
      RangeBracket.Short,
    );
    expect(mods.some((m) => m.name === 'Distracting')).toBe(true);
  });

  it('returns weapon quirk modifiers when weaponId provided', () => {
    const attacker: IAttackerState = {
      ...baseAttacker,
      weaponQuirks: { 'wpn-1': ['accurate'] },
    };
    const mods = calculateAttackerQuirkModifiers(
      attacker,
      baseTarget,
      RangeBracket.Short,
      'wpn-1',
    );
    expect(mods.some((m) => m.name === 'Accurate Weapon')).toBe(true);
  });

  it('returns Multi-Trac modifier for front-arc secondary', () => {
    const attacker: IAttackerState = {
      ...baseAttacker,
      unitQuirks: [UNIT_QUIRK_IDS.MULTI_TRAC],
      secondaryTarget: { isSecondary: true, inFrontArc: true },
    };
    const mods = calculateAttackerQuirkModifiers(
      attacker,
      baseTarget,
      RangeBracket.Short,
    );
    expect(mods.some((m) => m.name === 'Multi-Trac')).toBe(true);
  });
});

// =============================================================================
// Integration — calculateToHit with quirks
// =============================================================================

describe('calculateToHit integration with quirks', () => {
  const baseAttacker: IAttackerState = {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
  };

  const baseTarget: ITargetState = {
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    prone: false,
    immobile: false,
    partialCover: false,
  };

  const integratedToHitQuirkCases: readonly {
    readonly id: string;
    readonly modifierName: string;
    readonly attacker: IAttackerState;
    readonly target: ITargetState;
    readonly rangeBracket: RangeBracket;
    readonly range: number;
    readonly expectedFinalToHit: number;
  }[] = [
    {
      id: UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT,
      modifierName: 'Improved Targeting',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT],
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Short,
      range: 3,
      expectedFinalToHit: 3,
    },
    {
      id: UNIT_QUIRK_IDS.IMPROVED_TARGETING_MEDIUM,
      modifierName: 'Improved Targeting',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.IMPROVED_TARGETING_MEDIUM],
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Medium,
      range: 6,
      expectedFinalToHit: 5,
    },
    {
      id: UNIT_QUIRK_IDS.IMPROVED_TARGETING_LONG,
      modifierName: 'Improved Targeting',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.IMPROVED_TARGETING_LONG],
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Long,
      range: 9,
      expectedFinalToHit: 7,
    },
    {
      id: UNIT_QUIRK_IDS.POOR_TARGETING_SHORT,
      modifierName: 'Poor Targeting',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.POOR_TARGETING_SHORT],
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Short,
      range: 3,
      expectedFinalToHit: 5,
    },
    {
      id: UNIT_QUIRK_IDS.POOR_TARGETING_MEDIUM,
      modifierName: 'Poor Targeting',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.POOR_TARGETING_MEDIUM],
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Medium,
      range: 6,
      expectedFinalToHit: 7,
    },
    {
      id: UNIT_QUIRK_IDS.POOR_TARGETING_LONG,
      modifierName: 'Poor Targeting',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.POOR_TARGETING_LONG],
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Long,
      range: 9,
      expectedFinalToHit: 9,
    },
    {
      id: UNIT_QUIRK_IDS.SENSOR_GHOSTS,
      modifierName: 'Sensor Ghosts',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.SENSOR_GHOSTS],
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Short,
      range: 3,
      expectedFinalToHit: 5,
    },
    {
      id: UNIT_QUIRK_IDS.MULTI_TRAC,
      modifierName: 'Multi-Trac',
      attacker: {
        ...baseAttacker,
        unitQuirks: [UNIT_QUIRK_IDS.MULTI_TRAC],
        secondaryTarget: { isSecondary: true, inFrontArc: true },
      },
      target: baseTarget,
      rangeBracket: RangeBracket.Short,
      range: 3,
      expectedFinalToHit: 4,
    },
    {
      id: UNIT_QUIRK_IDS.DISTRACTING,
      modifierName: 'Distracting',
      attacker: baseAttacker,
      target: {
        ...baseTarget,
        unitQuirks: [UNIT_QUIRK_IDS.DISTRACTING],
      },
      rangeBracket: RangeBracket.Short,
      range: 3,
      expectedFinalToHit: 5,
    },
    {
      id: UNIT_QUIRK_IDS.LOW_PROFILE,
      modifierName: 'Low Profile',
      attacker: baseAttacker,
      target: {
        ...baseTarget,
        unitQuirks: [UNIT_QUIRK_IDS.LOW_PROFILE],
      },
      rangeBracket: RangeBracket.Short,
      range: 3,
      expectedFinalToHit: 5,
    },
  ];

  it.each(integratedToHitQuirkCases)(
    'applies catalog to-hit quirk $id through full calculateToHit',
    ({
      id,
      modifierName,
      attacker,
      target,
      rangeBracket,
      range,
      expectedFinalToHit,
    }) => {
      expect(QUIRK_CATALOG[id].pipelines).toContain('to-hit');

      const result = calculateToHit(attacker, target, rangeBracket, range);

      expect(result.finalToHit).toBe(expectedFinalToHit);
      expect(result.modifiers.map((modifier) => modifier.name)).toContain(
        modifierName,
      );
    },
  );

  it('Improved Targeting Short reduces to-hit at short range', () => {
    const attacker: IAttackerState = {
      ...baseAttacker,
      unitQuirks: [UNIT_QUIRK_IDS.IMPROVED_TARGETING_SHORT],
    };
    const withQuirk = calculateToHit(
      attacker,
      baseTarget,
      RangeBracket.Short,
      3,
    );
    const without = calculateToHit(
      baseAttacker,
      baseTarget,
      RangeBracket.Short,
      3,
    );
    expect(withQuirk.finalToHit).toBe(without.finalToHit - 1);
  });

  it('Distracting target increases to-hit', () => {
    const target: ITargetState = {
      ...baseTarget,
      unitQuirks: [UNIT_QUIRK_IDS.DISTRACTING],
    };
    const withQuirk = calculateToHit(
      baseAttacker,
      target,
      RangeBracket.Short,
      3,
    );
    const without = calculateToHit(
      baseAttacker,
      baseTarget,
      RangeBracket.Short,
      3,
    );
    expect(withQuirk.finalToHit).toBe(without.finalToHit + 1);
  });

  it('Sensor Ghosts increases own to-hit', () => {
    const attacker: IAttackerState = {
      ...baseAttacker,
      unitQuirks: [UNIT_QUIRK_IDS.SENSOR_GHOSTS],
    };
    const withQuirk = calculateToHit(
      attacker,
      baseTarget,
      RangeBracket.Short,
      3,
    );
    const without = calculateToHit(
      baseAttacker,
      baseTarget,
      RangeBracket.Short,
      3,
    );
    expect(withQuirk.finalToHit).toBe(without.finalToHit + 1);
  });

  it('Low Profile provides partial cover when target has no cover', () => {
    const target: ITargetState = {
      ...baseTarget,
      unitQuirks: [UNIT_QUIRK_IDS.LOW_PROFILE],
    };
    const withQuirk = calculateToHit(
      baseAttacker,
      target,
      RangeBracket.Short,
      3,
    );
    const without = calculateToHit(
      baseAttacker,
      baseTarget,
      RangeBracket.Short,
      3,
    );
    expect(withQuirk.finalToHit).toBe(without.finalToHit + 1);
  });

  it('Low Profile does not stack with existing partial cover', () => {
    const targetWithCover: ITargetState = {
      ...baseTarget,
      partialCover: true,
      unitQuirks: [UNIT_QUIRK_IDS.LOW_PROFILE],
    };
    const targetCoverOnly: ITargetState = {
      ...baseTarget,
      partialCover: true,
    };
    const withBoth = calculateToHit(
      baseAttacker,
      targetWithCover,
      RangeBracket.Short,
      3,
    );
    const coverOnly = calculateToHit(
      baseAttacker,
      targetCoverOnly,
      RangeBracket.Short,
      3,
    );
    expect(withBoth.finalToHit).toBe(coverOnly.finalToHit);
  });
});

// =============================================================================
// Quirk Catalog
// =============================================================================

describe('Quirk Catalog', () => {
  it('has all unit and weapon quirks', () => {
    const size = getQuirkCatalogSize();
    expect(size).toBeGreaterThanOrEqual(30);
  });

  it('can filter by pipeline', () => {
    const toHitQuirks = getQuirksForPipeline('to-hit');
    expect(toHitQuirks.length).toBeGreaterThan(5);
    toHitQuirks.forEach((q) => expect(q.pipelines).toContain('to-hit'));
  });

  it('can filter by category', () => {
    const targeting = getQuirksByCategory('targeting');
    expect(targeting.length).toBe(6);
    targeting.forEach((q) => expect(q.category).toBe('targeting'));
  });

  it('all catalog entries have required fields', () => {
    Object.values(QUIRK_CATALOG).forEach((entry) => {
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.pipelines.length).toBeGreaterThan(0);
      expect(entry.combatEffect).toBeTruthy();
      expect(typeof entry.isPositive).toBe('boolean');
    });
  });
});

// =============================================================================
// hasQuirk Utility
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
