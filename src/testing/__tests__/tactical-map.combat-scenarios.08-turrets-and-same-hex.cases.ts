import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps right vehicle sponson projection aligned with attack commit validation', () => {
    expect(
      combatScenario.tacticalMapRightSponsonArcCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: -2 },
      distance: 3,
      rangeBracket: 'short',
      firingArc: 'right-side',
      inRange: true,
      inArc: true,
      attackable: true,
      targetUnitIds: ['right-arc-target'],
      validTargetUnitIds: ['right-arc-target'],
      weaponIdsInRange: ['right-sponson-laser'],
      weaponIdsInArc: ['right-sponson-laser'],
      weaponIdsAvailable: ['right-sponson-laser'],
      weaponRangeOptions: [
        {
          weaponId: 'right-sponson-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          available: true,
        },
      ],
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapRightSponsonArcCommitInput(),
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
      combatScenario.tacticalMapRightSponsonArcCombatProjection
        .weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      combatScenario.tacticalMapRightSponsonArcCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapRightSponsonArcCombatProjection.toHitNumber,
    );
  });

  it('keeps chin turret pivot projection aligned with attack commit to-hit', () => {
    expect(
      combatScenario.tacticalMapChinTurretPivotCombatProjection,
    ).toMatchObject({
      hex: { q: -2, r: 2 },
      distance: 2,
      rangeBracket: 'short',
      firingArc: 'left-side',
      inRange: true,
      inArc: true,
      attackable: true,
      targetUnitIds: ['chin-turret-target'],
      validTargetUnitIds: ['chin-turret-target'],
      weaponIdsInRange: ['chin-turret-laser'],
      weaponIdsInArc: ['chin-turret-laser'],
      weaponIdsAvailable: ['chin-turret-laser'],
      toHitNumber: 5,
      weaponRangeOptions: [
        {
          weaponId: 'chin-turret-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          available: true,
        },
      ],
    });
    expect(
      combatScenario.tacticalMapChinTurretPivotCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Chin Turret Pivot',
          value: 1,
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapChinTurretPivotCommitInput(),
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
      combatScenario.tacticalMapChinTurretPivotCombatProjection
        .weaponIdsAvailable,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapChinTurretPivotCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Chin Turret Pivot',
          value: 1,
        }),
      ]),
    );
  });

  it('keeps mixed chin turret and body weapon target numbers per weapon', () => {
    expect(
      combatScenario.tacticalMapMixedChinTurretPivotCombatProjection,
    ).toMatchObject({
      hex: { q: -2, r: 2 },
      distance: 2,
      rangeBracket: 'short',
      firingArc: 'left-side',
      inRange: true,
      inArc: true,
      attackable: true,
      targetUnitIds: ['mixed-chin-body-target'],
      validTargetUnitIds: ['mixed-chin-body-target'],
      weaponIdsAvailable: ['mixed-chin-turret-laser', 'left-body-laser'],
      toHitNumber: 4,
      weaponRangeOptions: [
        expect.objectContaining({
          weaponId: 'mixed-chin-turret-laser',
          toHitNumber: 5,
        }),
        expect.objectContaining({
          weaponId: 'left-body-laser',
          toHitNumber: 4,
        }),
      ],
    });
    const chinOption =
      combatScenario.tacticalMapMixedChinTurretPivotCombatProjection.weaponRangeOptions.find(
        (option) => option.weaponId === 'mixed-chin-turret-laser',
      );
    const bodyOption =
      combatScenario.tacticalMapMixedChinTurretPivotCombatProjection.weaponRangeOptions.find(
        (option) => option.weaponId === 'left-body-laser',
      );
    expect(chinOption?.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Chin Turret Pivot',
          value: 1,
        }),
      ]),
    );
    expect(
      bodyOption?.toHitModifiers?.some(
        (modifier) => modifier.name === 'Chin Turret Pivot',
      ) ?? false,
    ).toBe(false);

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapMixedChinTurretPivotCommitInput(),
    );
    const declared = result.events.find(
      (event) => event.type === combatScenario.GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as combatScenario.IAttackDeclaredPayload;
    expect(payload.weapons).toEqual(
      combatScenario.tacticalMapMixedChinTurretPivotCombatProjection
        .weaponIdsAvailable,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapMixedChinTurretPivotCombatProjection
        .toHitNumber,
    );
    expect(payload.weaponAttacks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weaponId: 'mixed-chin-turret-laser',
          toHitNumber: 5,
          modifiers: expect.arrayContaining([
            expect.objectContaining({
              name: 'Chin Turret Pivot',
              value: 1,
            }),
          ]),
        }),
        expect.objectContaining({
          weaponId: 'left-body-laser',
          toHitNumber: 4,
        }),
      ]),
    );

    const resolved = combatScenario.resolveAttack(result, declared!, () => ({
      dice: [2, 2],
      total: 4,
      isSnakeEyes: false,
      isBoxcars: false,
    }));
    const resolvedPayloads = resolved.events
      .filter(
        (event) => event.type === combatScenario.GameEventType.AttackResolved,
      )
      .map((event) => event.payload as combatScenario.IAttackResolvedPayload);
    expect(resolvedPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weaponId: 'mixed-chin-turret-laser',
          roll: 4,
          toHitNumber: 5,
          hit: false,
        }),
        expect.objectContaining({
          weaponId: 'left-body-laser',
          roll: 4,
          toHitNumber: 4,
          hit: true,
        }),
      ]),
    );
  });

  it('keeps locked vehicle turret side targets blocked between projection and commit validation', () => {
    expect(
      combatScenario.tacticalMapLockedTurretCombatProjection,
    ).toMatchObject({
      hex: { q: -2, r: 2 },
      distance: 2,
      rangeBracket: 'short',
      firingArc: 'left-side',
      inRange: true,
      inArc: false,
      attackable: false,
      targetUnitIds: ['locked-turret-side-target'],
      validTargetUnitIds: [],
      weaponIdsInRange: ['locked-turret-ppc'],
      weaponIdsInArc: [],
      weaponIdsAvailable: [],
      attackInvalidReason: 'OutOfArc',
      attackInvalidDetails:
        'No selected weapons can fire into the left-side arc',
      blockedReason: 'No weapons cover left-side arc',
      weaponRangeOptions: [
        {
          weaponId: 'locked-turret-ppc',
          rangeBracket: 'short',
          inRange: true,
          inArc: false,
          available: false,
          blockedReason: 'out of left-side arc',
        },
      ],
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapLockedTurretCommitInput(),
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
      targetId: 'locked-turret-side-target',
      weaponId: 'locked-turret-ppc',
      reason:
        combatScenario.tacticalMapLockedTurretCombatProjection
          .attackInvalidReason,
      details:
        combatScenario.tacticalMapLockedTurretCombatProjection
          .attackInvalidDetails,
    });
  });
});
