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
  it('marks blocked enemy targets without treating empty range hexes as blocked targets', () => {
    const blockedTarget = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      combat: combat({
        attackable: false,
        attackInvalidReason: 'NoLineOfSight',
        attackInvalidDetails: 'LOS blocked by heavy woods at 0,0',
        blockedReason: 'Line of sight blocked',
      }),
      movement: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });
    const emptyRange = buildTacticalMapHexProjection({
      hex: { q: 2, r: 0 },
      terrain: terrain(),
      combat: combat({
        hex: { q: 2, r: 0 },
        distance: 2,
        hasTarget: false,
        targetVisibilityState: 'none',
        visibleTargetUnitIds: [],
        attackable: false,
        targetUnitIds: [],
        validTargetUnitIds: [],
      }),
      movement: undefined,
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(blockedTarget).toMatchObject({
      intent: 'combat',
      status: 'blocked',
      movementStatus: 'none',
      combatStatus: 'blocked',
    });
    expect(blockedTarget.blockedReasons).toEqual([
      'LOS blocked by heavy woods at 0,0',
      'Line of sight blocked',
      'NoLineOfSight',
    ]);
    expect(emptyRange).toMatchObject({
      intent: 'combat',
      status: 'legal',
      movementStatus: 'none',
      combatStatus: 'range-only',
      blockedReasons: [],
    });
  });

  it('preserves top-level legal status while marking mixed visible and obscured combat channels', () => {
    const projection = buildTacticalMapHexProjection({
      hex: { q: 1, r: 0 },
      terrain: terrain(),
      movement: undefined,
      combat: combat({
        targetUnitIds: ['visible-enemy', 'fog-contact'],
        visibleTargetUnitIds: ['visible-enemy'],
        obscuredTargetUnitIds: ['fog-contact'],
        validTargetUnitIds: ['visible-enemy'],
        targetVisibilityState: 'mixed',
        visibilityBlockedReason:
          'Some contacts are hidden or last-known and cannot be targeted',
        attackable: true,
      }),
      isSelected: false,
      isHovered: false,
      pathIndex: undefined,
      inLegacyAttackRange: false,
    });

    expect(projection).toMatchObject({
      intent: 'combat',
      status: 'legal',
      movementStatus: 'none',
      combatStatus: 'mixed',
    });
    expect(projection.explanation).toContain('combat status mixed');
    expect(projection.explanation).toContain('visibility mixed');
  });

  it('builds a lookup with default clear terrain and legacy attack-range fallback', () => {
    const projectionLookup = buildTacticalMapHexProjectionLookup({
      hexes: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      terrainLookup: new Map(),
      movementRangeLookup: new Map(),
      combatRangeLookup: new Map(),
      selectedHex: { q: 0, r: 0 },
      hoveredHex: { q: 1, r: 0 },
      highlightPathIndexLookup: new Map([['1,0', 1]]),
      legacyAttackRangeLookup: new Set(['1,0']),
    });

    expect(projectionLookup.get('0,0')).toMatchObject({
      intent: 'selected',
      status: 'neutral',
      isSelected: true,
      terrain: {
        elevation: 0,
        features: [{ type: TerrainType.Clear, level: 0 }],
      },
    });
    expect(projectionLookup.get('1,0')).toMatchObject({
      intent: 'path',
      status: 'neutral',
      combatStatus: 'range-only',
      isHovered: true,
      pathIndex: 1,
      inAttackRange: true,
      sourceReferences: expect.arrayContaining([
        expect.objectContaining({
          channel: 'legacy-attack-range',
          kind: 'mekstation',
          label: 'Legacy attackRange fallback',
          detail: 'caller-provided range envelope',
          ruleReferences: [
            'MekStation caller-provided compatibility range; not a rules-backed attack option',
          ],
        }),
      ]),
    });
    expect(
      formatTacticalProjectionRuleReferences(
        projectionLookup.get('1,0')?.sourceReferences ?? [],
      ),
    ).toContain(
      'legacy-attack-range:mekstation:MekStation caller-provided compatibility range; not a rules-backed attack option',
    );
  });

  it('lets weapon-backed combat projection override stale legacy attack range', () => {
    const projectionLookup = buildTacticalMapHexProjectionLookup({
      hexes: [{ q: 1, r: 0 }],
      terrainLookup: new Map(),
      movementRangeLookup: new Map(),
      combatRangeLookup: new Map([
        [
          '1,0',
          combat({
            hasTarget: false,
            distance: 8,
            rangeBracket: RangeBracket.OutOfRange,
            inRange: false,
            attackable: false,
            weaponIdsInRange: [],
            weaponIdsAvailable: [],
            targetUnitIds: [],
            validTargetUnitIds: [],
            weaponRangeOptions: [
              {
                weaponId: 'medium-laser',
                weaponName: 'Medium Laser',
                heat: 3,
                damage: 5,
                ammoConsumed: 0,
                rangeBracket: RangeBracket.OutOfRange,
                inRange: false,
                inArc: true,
                environmentLegal: true,
                available: false,
                blockedReason: 'out of range',
              },
            ],
            availableWeaponImpacts: [],
            availableWeaponHeat: 0,
            availableWeaponDamage: 0,
          }),
        ],
      ]),
      legacyAttackRangeLookup: new Set(['1,0']),
    });

    const projection = projectionLookup.get('1,0');

    expect(projection).toMatchObject({
      intent: 'terrain',
      status: 'neutral',
      combatStatus: 'none',
      inAttackRange: false,
    });
    expect(
      formatTacticalProjectionSourceReferences(
        projection?.sourceReferences ?? [],
      ),
    ).toContain(
      'combat:megamek:MegaMek weapon range projection:range envelope out_of_range 8 hexes LOS clear',
    );
    expect(
      formatTacticalProjectionSourceReferences(
        projection?.sourceReferences ?? [],
      ),
    ).not.toContain('legacy-attack-range');
    expect(projection?.explanation).not.toContain(
      'legacy attackRange fallback only',
    );
  });
});
