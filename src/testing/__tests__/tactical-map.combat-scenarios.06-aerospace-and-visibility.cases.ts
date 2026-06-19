import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps stacked smoke and woods LOS projection aligned with attack commit validation', () => {
    expect(combatScenario.tacticalMapStackedLosCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: [combatScenario.tacticalMapStackedLosTargetId],
      validTargetUnitIds: [],
      weaponIdsAvailable: ['medium-laser'],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by heavy woods and smoke at (1, 0)',
      blockedReason: 'Blocked by heavy woods and smoke at (1, 0)',
      lineOfSightBlockerReason: 'Blocked by heavy woods and smoke at (1, 0)',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'terrain',
        terrain: 'smoke',
        reason: 'Blocked by heavy woods and smoke at (1, 0)',
      },
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapStackedLosCommitInput(),
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
      targetId: combatScenario.tacticalMapStackedLosTargetId,
      weaponId: 'medium-laser',
      reason:
        combatScenario.tacticalMapStackedLosCombatProjection
          .attackInvalidReason,
      details:
        combatScenario.tacticalMapStackedLosCombatProjection
          .attackInvalidDetails,
    });
  });

  it('keeps elevation partial-cover browser projection aligned with committed attacks', () => {
    expect(
      combatScenario.tacticalMapElevationCoverCombatProjection,
    ).toMatchObject({
      hex: { q: 2, r: -2 },
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'clear',
      attackable: true,
      targetUnitIds: [combatScenario.tacticalMapElevationCoverTargetId],
      validTargetUnitIds: [combatScenario.tacticalMapElevationCoverTargetId],
      weaponIdsAvailable: ['medium-laser'],
      targetPartialCover: true,
      targetCoverModifier: 1,
      targetCoverReason:
        'Target behind elevation +1 partial cover at (1, -1) (+1)',
    });
    expect(
      combatScenario.tacticalMapElevationCoverCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Partial Cover',
          value: 1,
          source: 'terrain',
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapElevationCoverCommitInput(),
    );

    expect(
      result.events.some(
        (event) => event.type === combatScenario.GameEventType.AttackInvalid,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === combatScenario.GameEventType.AttackLocked,
      ),
    ).toBe(true);

    const declared = result.events.find(
      (event) => event.type === combatScenario.GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as combatScenario.IAttackDeclaredPayload;
    expect(payload.targetId).toBe(
      combatScenario.tacticalMapElevationCoverTargetId,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapElevationCoverCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Partial Cover',
          value: 1,
          source: 'terrain',
        }),
      ]),
    );
  });

  it('keeps airborne aerospace targets exempt from ground-only minimum range', () => {
    expect(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCombatProjection,
    ).toMatchObject({
      hex: { q: 0, r: 0 },
      distance: 1,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
    });
    expect(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCombatProjection
        .minimumRangePenalty,
    ).toBeUndefined();
    expect(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCombatProjection
        .minimumRangeReason,
    ).toBeUndefined();
    expect(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCombatProjection
        .toHitModifiers,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
        }),
      ]),
    );
    expect(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCombatProjection
        .toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Ground-to-air altitude',
          value: 1,
          source: 'other',
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCommitInput(),
    );

    expect(
      result.events.some(
        (event) => event.type === combatScenario.GameEventType.AttackInvalid,
      ),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === combatScenario.GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as combatScenario.IAttackDeclaredPayload;
    expect(payload.weapons).toEqual(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCombatProjection
        .weaponIdsAvailable,
    );
    expect(payload.modifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
        }),
      ]),
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Ground-to-air altitude',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapAirborneAerospaceMinimumRangeCombatProjection
        .toHitNumber,
    );
  });

  it('rejects indirect fire against airborne aerospace targets', () => {
    expect(
      combatScenario.tacticalMapAirborneAerospaceIndirectCombatProjection,
    ).toMatchObject({
      hex: { q: 0, r: 0 },
      distance: 1,
      rangeBracket: 'short',
      attackable: false,
      weaponIdsAvailable: [],
      attackInvalidReason: 'InvalidTarget',
      attackInvalidDetails:
        combatScenario.INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
      blockedReason: combatScenario.INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
      weaponRangeOptions: [
        expect.objectContaining({
          weaponId: 'minimum-lrm',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          environmentLegal: true,
          available: false,
          blockedReason: combatScenario.INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
        }),
      ],
    });
    expect(
      combatScenario.tacticalMapAirborneAerospaceIndirectCombatProjection
        .toHitNumber,
    ).toBeUndefined();
    expect(
      combatScenario.tacticalMapAirborneAerospaceIndirectCombatProjection
        .indirectFireAvailable,
    ).toBeUndefined();

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapAirborneAerospaceIndirectCommitInput(),
    );

    const invalid = result.events.find(
      (event) => event.type === combatScenario.GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    expect(
      invalid!.payload as combatScenario.IAttackInvalidPayload,
    ).toMatchObject({
      attackerId: 'attacker',
      targetId: 'airborne-aero-target',
      weaponId: 'minimum-lrm',
      reason: 'InvalidTarget',
      details: combatScenario.INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
    });
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
  });
});
