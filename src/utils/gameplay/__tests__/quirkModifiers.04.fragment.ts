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
