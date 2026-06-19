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
