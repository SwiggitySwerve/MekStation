import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps jumped attacker and target movement to-hit modifiers aligned between browser projection and commit', () => {
    expect(combatScenario.tacticalMapJumpCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 11,
    });
    expect(
      combatScenario.tacticalMapJumpCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Movement',
          value: 3,
          source: 'attacker_movement',
          description: 'Attacker jump: +3',
        }),
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 4,
          source: 'target_movement',
          description: 'Target moved 7 hexes (jumped): +4',
        }),
      ]),
    );
    expect(
      combatScenario.tacticalMapJumpCombatProjection.toHitReason,
    ).toContain('Attacker Movement +3');
    expect(
      combatScenario.tacticalMapJumpCombatProjection.toHitReason,
    ).toContain('Target Movement (TMM) +4');

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapJumpCombatCommitInput(),
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
      combatScenario.tacticalMapJumpCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      combatScenario.tacticalMapJumpCombatProjection.toHitModifiers,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapJumpCombatProjection.toHitNumber,
    );
  });

  it('keeps LOS-blocked browser projection aligned with attack commit validation', () => {
    expect(combatScenario.tacticalMapBlockedLosCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 3,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: ['blocked-target'],
      validTargetUnitIds: [],
      weaponIdsAvailable: [
        'medium-laser',
        'small-laser',
        'minimum-lrm',
        'extreme-lrm',
      ],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by building at (1, 0)',
      blockedReason: 'Blocked by building at (1, 0)',
      lineOfSightBlockerReason: 'Blocked by building at (1, 0)',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'terrain',
        terrain: 'building',
        reason: 'Blocked by building at (1, 0)',
      },
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapBlockedLosCommitInput(),
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
      targetId: 'blocked-target',
      weaponId: 'medium-laser',
      reason:
        combatScenario.tacticalMapBlockedLosCombatProjection
          .attackInvalidReason,
      details:
        combatScenario.tacticalMapBlockedLosCombatProjection
          .attackInvalidDetails,
    });
  });

  it('keeps elevation LOS browser projection aligned with attack commit validation', () => {
    expect(
      combatScenario.tacticalMapElevationLosCombatProjection,
    ).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: [combatScenario.tacticalMapElevationLosTargetId],
      validTargetUnitIds: [],
      weaponIdsAvailable: ['medium-laser'],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by elevation +2 at (1, 0)',
      blockedReason: 'Blocked by elevation +2 at (1, 0)',
      lineOfSightBlockerReason: 'Blocked by elevation +2 at (1, 0)',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'elevation',
        reason: 'Blocked by elevation +2 at (1, 0)',
      },
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapElevationLosCommitInput(),
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
      targetId: combatScenario.tacticalMapElevationLosTargetId,
      weaponId: 'medium-laser',
      reason:
        combatScenario.tacticalMapElevationLosCombatProjection
          .attackInvalidReason,
      details:
        combatScenario.tacticalMapElevationLosCombatProjection
          .attackInvalidDetails,
    });
  });

  it('keeps cumulative woods LOS browser projection aligned with attack commit validation', () => {
    expect(combatScenario.tacticalMapWoodsLosCombatProjection).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: [combatScenario.tacticalMapWoodsLosTargetId],
      validTargetUnitIds: [],
      weaponIdsAvailable: ['medium-laser'],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by heavy woods at (2, 0)',
      blockedReason: 'Blocked by heavy woods at (2, 0)',
      lineOfSightBlockerReason: 'Blocked by heavy woods at (2, 0)',
      lineOfSightBlocker: {
        hex: { q: 2, r: 0 },
        kind: 'terrain',
        terrain: 'heavy_woods',
        reason: 'Blocked by heavy woods at (2, 0)',
      },
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapWoodsLosCommitInput(),
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
      targetId: combatScenario.tacticalMapWoodsLosTargetId,
      weaponId: 'medium-laser',
      reason:
        combatScenario.tacticalMapWoodsLosCombatProjection.attackInvalidReason,
      details:
        combatScenario.tacticalMapWoodsLosCombatProjection.attackInvalidDetails,
    });
  });
});
