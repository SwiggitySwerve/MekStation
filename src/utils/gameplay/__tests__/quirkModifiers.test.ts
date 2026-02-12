import { RangeBracket, MovementType } from '@/types/gameplay';
import { IAttackerState, ITargetState } from '@/types/gameplay';

import {
  UNIT_QUIRK_IDS,
  WEAPON_QUIRK_IDS,
  calculateTargetingQuirkModifier,
  calculateDistractingModifier,
  hasLowProfile,
  calculateLowProfileModifier,
  calculatePilotingQuirkPSRModifier,
  getBattleFistDamageBonus,
  hasNoArms,
  isLowArmsRestricted,
  calculateInitiativeQuirkModifier,
  calculateSensorGhostsModifier,
  calculateMultiTracModifier,
  getRuggedCritNegations,
  getActuatorCritModifier,
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
  it('Stable: -1 to all PSRs', () => {
    const mod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.STABLE],
      false,
    );
    expect(mod).toBe(-1);
  });

  it('Hard to Pilot: +1 to all PSRs', () => {
    const mod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.HARD_TO_PILOT],
      false,
    );
    expect(mod).toBe(1);
  });

  it('Cramped Cockpit: +1 to all piloting rolls', () => {
    const mod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.CRAMPED_COCKPIT],
      false,
    );
    expect(mod).toBe(1);
  });

  it('Easy to Pilot: -1 for terrain PSR only', () => {
    const terrainMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      true,
    );
    expect(terrainMod).toBe(-1);

    const nonTerrainMod = calculatePilotingQuirkPSRModifier(
      [UNIT_QUIRK_IDS.EASY_TO_PILOT],
      false,
    );
    expect(nonTerrainMod).toBe(0);
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
    );
    expect(mod).toBe(0);
  });

  it('no piloting quirks: 0', () => {
    const mod = calculatePilotingQuirkPSRModifier([], false);
    expect(mod).toBe(0);
  });
});

// =============================================================================
// Physical Quirks (Task 12.6)
// =============================================================================

describe('Physical Quirks', () => {
  it('Battle Fists LA: +1 left punch damage', () => {
    expect(
      getBattleFistDamageBonus([UNIT_QUIRK_IDS.BATTLE_FISTS_LA], 'left'),
    ).toBe(1);
  });

  it('Battle Fists RA: +1 right punch damage', () => {
    expect(
      getBattleFistDamageBonus([UNIT_QUIRK_IDS.BATTLE_FISTS_RA], 'right'),
    ).toBe(1);
  });

  it('Battle Fists LA: no bonus for right arm', () => {
    expect(
      getBattleFistDamageBonus([UNIT_QUIRK_IDS.BATTLE_FISTS_LA], 'right'),
    ).toBe(0);
  });

  it('Battle Fists both: +1 each arm', () => {
    const quirks = [
      UNIT_QUIRK_IDS.BATTLE_FISTS_LA,
      UNIT_QUIRK_IDS.BATTLE_FISTS_RA,
    ];
    expect(getBattleFistDamageBonus(quirks, 'left')).toBe(1);
    expect(getBattleFistDamageBonus(quirks, 'right')).toBe(1);
  });

  it('No Arms: prevents punching', () => {
    expect(hasNoArms([UNIT_QUIRK_IDS.NO_ARMS])).toBe(true);
    expect(hasNoArms([])).toBe(false);
  });

  it('Low Arms: restricts punch at higher elevation', () => {
    expect(isLowArmsRestricted([UNIT_QUIRK_IDS.LOW_ARMS], 1)).toBe(true);
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
// Crit Quirks (Task 12.9)
// =============================================================================

describe('Crit Quirks', () => {
  it('Rugged 1: 1 crit negation', () => {
    expect(getRuggedCritNegations([UNIT_QUIRK_IDS.RUGGED_1])).toBe(1);
  });

  it('Rugged 2: 2 crit negations', () => {
    expect(getRuggedCritNegations([UNIT_QUIRK_IDS.RUGGED_2])).toBe(2);
  });

  it('no Rugged: 0 crit negations', () => {
    expect(getRuggedCritNegations([])).toBe(0);
  });

  it('Protected Actuators: +1 crit roll modifier', () => {
    expect(getActuatorCritModifier([UNIT_QUIRK_IDS.PROTECTED_ACTUATORS])).toBe(
      1,
    );
  });

  it('Exposed Actuators: -1 crit roll modifier', () => {
    expect(getActuatorCritModifier([UNIT_QUIRK_IDS.EXPOSED_ACTUATORS])).toBe(
      -1,
    );
  });

  it('no crit quirks: 0', () => {
    expect(getActuatorCritModifier([])).toBe(0);
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

  it('Poor Cooling: +1 heat', () => {
    expect(
      getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.POOR_COOLING], 5),
    ).toBe(1);
  });

  it('No Cooling: doubles heat', () => {
    expect(getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.NO_COOLING], 5)).toBe(
      5,
    );
    expect(
      getWeaponCoolingHeatModifier([WEAPON_QUIRK_IDS.NO_COOLING], 12),
    ).toBe(12);
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
