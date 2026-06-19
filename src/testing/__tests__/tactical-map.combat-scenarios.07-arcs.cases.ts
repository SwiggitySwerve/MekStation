import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps mixed same-hex visibility attackable through the visible target', () => {
    expect(
      combatScenario.tacticalMapMixedVisibilityCombatProjection,
    ).toMatchObject({
      hex: { q: 1, r: 2 },
      distance: 4,
      rangeBracket: 'medium',
      attackable: true,
      targetVisibilityState: 'mixed',
      targetUnitIds: [
        'medium-target',
        'same-hex-hidden-contact',
        'same-hex-last-known-contact',
      ],
      visibleTargetUnitIds: ['medium-target'],
      obscuredTargetUnitIds: [
        'same-hex-hidden-contact',
        'same-hex-last-known-contact',
      ],
      validTargetUnitIds: ['medium-target'],
      weaponIdsAvailable: ['medium-laser', 'extreme-lrm'],
    });
    expect(
      combatScenario.tacticalMapMixedVisibilityCombatProjection
        .attackInvalidReason,
    ).toBeUndefined();
    expect(
      combatScenario.tacticalMapMixedVisibilityCombatProjection
        .visibilityBlockedReason,
    ).toBeUndefined();

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapMixedVisibilityCommitInput(),
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
    expect(payload.targetId).toBe('medium-target');
    expect(payload.weapons).toEqual(
      combatScenario.tacticalMapMixedVisibilityCombatProjection
        .weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      combatScenario.tacticalMapMixedVisibilityCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapMixedVisibilityCombatProjection.toHitNumber,
    );
  });

  it('keeps grid-derived fog LOS visibility aligned with attack commit validation', () => {
    const visibleTarget = combatScenario.tacticalMapFogLosVisibleTokens.find(
      (token) => token.unitId === combatScenario.tacticalMapFogLosTargetId,
    );
    expect(visibleTarget).toMatchObject({
      isValidTarget: true,
      isActiveTarget: true,
    });
    expect(visibleTarget?.fogStatus).toBeUndefined();

    const blockedTarget = combatScenario.tacticalMapFogLosTokens.find(
      (token) => token.unitId === combatScenario.tacticalMapFogLosTargetId,
    );
    expect(blockedTarget).toMatchObject({
      fogStatus: 'lastKnown',
      isValidTarget: false,
      isActiveTarget: false,
      lastKnownPosition: { q: 3, r: 0 },
    });

    expect(combatScenario.tacticalMapFogLosCombatProjection).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      rangeBracket: 'short',
      losState: 'blocked',
      attackable: false,
      targetVisibilityState: 'lastKnown',
      targetUnitIds: [combatScenario.tacticalMapFogLosTargetId],
      visibleTargetUnitIds: [],
      obscuredTargetUnitIds: [combatScenario.tacticalMapFogLosTargetId],
      validTargetUnitIds: [],
      attackInvalidReason: 'TargetNotVisible',
      attackInvalidDetails: 'Last known contact is not currently visible',
      visibilityBlockedReason: 'Last known contact is not currently visible',
      lineOfSightBlockerReason: 'Blocked by light woods at (2, 0)',
      lineOfSightBlocker: {
        hex: { q: 2, r: 0 },
        kind: 'terrain',
        terrain: 'light_woods',
        reason: 'Blocked by light woods at (2, 0)',
      },
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapFogLosCommitInput(),
    );

    const invalid = result.events.find(
      (event) => event.type === combatScenario.GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    const payload = invalid!.payload as combatScenario.IAttackInvalidPayload;
    expect(payload.targetId).toBe(combatScenario.tacticalMapFogLosTargetId);
    expect(payload.reason).toBe('TargetNotVisible');
    expect(payload.details).toBe(
      `Target ${combatScenario.tacticalMapFogLosTargetId} is not currently visible to player`,
    );
  });

  it('keeps selected-weapon out-of-arc browser projection aligned with attack commit validation', () => {
    expect(combatScenario.tacticalMapOutOfArcCombatProjection).toMatchObject({
      hex: { q: 0, r: 1 },
      distance: 1,
      rangeBracket: 'short',
      firingArc: 'rear',
      inRange: true,
      inArc: false,
      attackable: false,
      targetUnitIds: ['rear-arc-target'],
      validTargetUnitIds: [],
      weaponIdsInRange: ['front-arc-laser'],
      weaponIdsInArc: [],
      weaponIdsAvailable: [],
      attackInvalidReason: 'OutOfArc',
      attackInvalidDetails: 'No selected weapons can fire into the rear arc',
      blockedReason: 'No weapons cover rear arc',
      weaponRangeOptions: [
        {
          weaponId: 'front-arc-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: false,
          available: false,
          blockedReason: 'out of rear arc',
        },
      ],
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapOutOfArcCommitInput(),
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
      targetId: 'rear-arc-target',
      weaponId: 'front-arc-laser',
      reason:
        combatScenario.tacticalMapOutOfArcCombatProjection.attackInvalidReason,
      details:
        combatScenario.tacticalMapOutOfArcCombatProjection.attackInvalidDetails,
    });
  });

  it('keeps vehicle sponson multi-arc projection aligned with attack commit validation', () => {
    expect(combatScenario.tacticalMapSponsonArcCombatProjection).toMatchObject({
      hex: { q: -2, r: 2 },
      distance: 2,
      rangeBracket: 'short',
      firingArc: 'left-side',
      inRange: true,
      inArc: true,
      attackable: true,
      targetUnitIds: ['left-arc-target'],
      validTargetUnitIds: ['left-arc-target'],
      weaponIdsInRange: ['left-sponson-laser'],
      weaponIdsInArc: ['left-sponson-laser'],
      weaponIdsAvailable: ['left-sponson-laser'],
      weaponRangeOptions: [
        {
          weaponId: 'left-sponson-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          available: true,
        },
      ],
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapSponsonArcCommitInput(),
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
    expect(payload.weapons).toEqual(
      combatScenario.tacticalMapSponsonArcCombatProjection.weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      combatScenario.tacticalMapSponsonArcCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapSponsonArcCombatProjection.toHitNumber,
    );
  });
});
