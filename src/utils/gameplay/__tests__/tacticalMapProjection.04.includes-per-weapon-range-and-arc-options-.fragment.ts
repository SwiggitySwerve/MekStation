import { describe, expect, it } from '@jest/globals';

import {
  COMBAT_RULE_REFERENCES,
  CoverLevel,
  LOS_BLOCKER_RULE_REFERENCES,
  MOVEMENT_RULE_REFERENCES,
  MovementType,
  REPRESENTED_MINEFIELD_RULE_REFERENCES,
  RangeBracket,
  TERRAIN_RULE_REFERENCES,
  TerrainType,
  WATER_ENVIRONMENT_RULE_REFERENCES,
  buildTacticalMapHexProjection,
  buildTacticalMapHexProjectionLookup,
  combat,
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
  movement,
  terrain,
} from './tacticalMapProjection.test-helpers';

describe('tacticalMapProjection', () => {
  it('includes per-weapon range and arc options in the shared projection explanation', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: undefined,
      combat: combat({
        weaponIdsInRange: ['front-laser', 'rear-laser'],
        weaponIdsInArc: ['front-laser', 'small-laser'],
        weaponIdsAvailable: ['front-laser'],
        weaponRangeOptions: [
          {
            weaponId: 'front-laser',
            weaponName: 'Front Laser',
            heat: 3,
            damage: 5,
            ammoConsumed: 0,
            rangeBracket: RangeBracket.Short,
            inRange: true,
            inArc: true,
            environmentLegal: true,
            available: true,
          },
          {
            weaponId: 'rear-laser',
            weaponName: 'Rear Laser',
            heat: 3,
            damage: 5,
            ammoConsumed: 0,
            rangeBracket: RangeBracket.Short,
            inRange: true,
            inArc: false,
            environmentLegal: true,
            available: false,
            blockedReason: 'out of front arc',
          },
          {
            weaponId: 'small-laser',
            weaponName: 'Small Laser',
            heat: 1,
            damage: 3,
            ammoConsumed: 0,
            rangeBracket: RangeBracket.OutOfRange,
            inRange: false,
            inArc: true,
            environmentLegal: true,
            available: false,
            blockedReason: 'out of range',
          },
        ],
        availableWeaponImpacts: [
          {
            weaponId: 'front-laser',
            weaponName: 'Front Laser',
            heat: 3,
            damage: 5,
            ammoConsumed: 0,
          },
        ],
        availableWeaponHeat: 3,
        availableWeaponDamage: 5,
      }),
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection.explanation).toContain(
      'weapon options front-laser short range in arc available, rear-laser short range out of arc blocked: out of front arc, small-laser out_of_range range in arc blocked: out of range',
    );
  });

  it('keeps mixed underwater weapon legality attackable while preserving environment source refs', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: {
        coordinate: { q: 1, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 2 }],
      },
      movement: undefined,
      combat: combat({
        weaponIdsInRange: ['medium-laser', 'lrt-15'],
        weaponIdsInArc: ['medium-laser', 'lrt-15'],
        weaponIdsAvailable: ['lrt-15'],
        weaponRangeOptions: [
          {
            weaponId: 'medium-laser',
            weaponName: 'Medium Laser',
            heat: 3,
            damage: 5,
            ammoConsumed: 0,
            rangeBracket: RangeBracket.Short,
            inRange: true,
            inArc: true,
            environmentLegal: false,
            available: false,
            blockedReason: 'Target underwater, but not weapon.',
          },
          {
            weaponId: 'lrt-15',
            weaponName: 'LR Torpedo 15',
            heat: 5,
            damage: 9,
            ammoConsumed: 1,
            rangeBracket: RangeBracket.Short,
            inRange: true,
            inArc: true,
            environmentLegal: true,
            available: true,
          },
        ],
        availableWeaponImpacts: [
          {
            weaponId: 'lrt-15',
            weaponName: 'LR Torpedo 15',
            heat: 5,
            damage: 9,
            ammoConsumed: 1,
          },
        ],
        availableWeaponHeat: 5,
        availableWeaponDamage: 9,
        expectedDamage: 4.2,
      }),
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection).toMatchObject({
      status: 'legal',
      combatStatus: 'attackable',
      blockedReasons: [],
      combat: {
        attackable: true,
        weaponIdsAvailable: ['lrt-15'],
      },
      sourceReferences: expect.arrayContaining([
        expect.objectContaining({
          channel: 'combat',
          kind: 'megamek',
          label: 'MegaMek water weapon environment projection',
          detail:
            'environment restrictions medium-laser: Target underwater, but not weapon.',
          ruleReferences: WATER_ENVIRONMENT_RULE_REFERENCES,
        }),
      ]),
    });
    expect(projection.explanation).toContain('weapons lrt-15');
    expect(projection.explanation).toContain(
      'medium-laser short range in arc environment blocked blocked: Target underwater, but not weapon.',
    );
    expect(
      formatTacticalProjectionSourceReferences(projection.sourceReferences),
    ).toContain(
      'combat:megamek:MegaMek water weapon environment projection:environment restrictions medium-laser: Target underwater, but not weapon.',
    );
    expect(
      formatTacticalProjectionRuleReferences(projection.sourceReferences),
    ).toContain(
      'combat:megamek:MegaMek client/ui/clientGUI/boardview/spriteHandler/FiringArcSpriteHandler.java:570-575 water-only ranges display as underwater weapons',
    );
  });
});
