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
