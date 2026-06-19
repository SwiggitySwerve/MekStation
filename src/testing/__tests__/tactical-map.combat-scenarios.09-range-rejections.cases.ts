import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps same-hex weapon-attack browser projection aligned with attack commit validation', () => {
    expect(combatScenario.tacticalMapSameHexCombatProjection).toMatchObject({
      hex: { q: 0, r: 0 },
      distance: 0,
      rangeBracket: 'short',
      attackable: false,
      targetUnitIds: ['same-hex-target'],
      validTargetUnitIds: [],
      weaponIdsAvailable: [],
      attackInvalidReason: 'SameHex',
      attackInvalidDetails: 'Attacker and target occupy the same hex',
      blockedReason: 'Attacker and target occupy the same hex',
      weaponRangeOptions: [
        {
          weaponId: 'medium-laser',
          rangeBracket: 'short',
          available: false,
        },
      ],
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapSameHexCommitInput(),
    );

    expect(
      result.events.some(
        (event) => event.type === combatScenario.GameEventType.AttackDeclared,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === combatScenario.GameEventType.AttackLocked,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === combatScenario.GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    expect(
      invalid!.payload as combatScenario.IAttackInvalidPayload,
    ).toMatchObject({
      attackerId: 'attacker',
      targetId: 'same-hex-target',
      weaponId: 'medium-laser',
      reason:
        combatScenario.tacticalMapSameHexCombatProjection.attackInvalidReason,
      details:
        combatScenario.tacticalMapSameHexCombatProjection.attackInvalidDetails,
    });
  });

  it('keeps the all-selected-weapons-out-of-range browser projection aligned with attack commit validation', () => {
    expect(combatScenario.tacticalMapOutOfRangeCombatProjection).toMatchObject({
      hex: { q: 1, r: 2 },
      distance: 4,
      rangeBracket: 'out_of_range',
      inRange: false,
      attackable: false,
      weaponIdsInRange: [],
      weaponIdsAvailable: [],
      attackInvalidReason: 'OutOfRange',
      attackInvalidDetails:
        "Target at 4 hexes is outside the selected weapons' range",
      blockedReason: 'Out of weapon range',
      weaponRangeOptions: [
        {
          weaponId: 'small-laser',
          rangeBracket: 'out_of_range',
          available: false,
          blockedReason: 'out of range',
        },
        {
          weaponId: 'minimum-lrm',
          rangeBracket: 'out_of_range',
          available: false,
          blockedReason: 'out of range',
        },
      ],
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapOutOfRangeCommitInput(),
    );

    expect(
      result.events.some(
        (event) => event.type === combatScenario.GameEventType.AttackDeclared,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === combatScenario.GameEventType.AttackLocked,
      ),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === combatScenario.GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    expect(
      invalid!.payload as combatScenario.IAttackInvalidPayload,
    ).toMatchObject({
      attackerId: 'attacker',
      targetId: 'medium-target',
      weaponId: 'small-laser',
      reason:
        combatScenario.tacticalMapOutOfRangeCombatProjection
          .attackInvalidReason,
      details:
        combatScenario.tacticalMapOutOfRangeCombatProjection
          .attackInvalidDetails,
    });
  });
});
