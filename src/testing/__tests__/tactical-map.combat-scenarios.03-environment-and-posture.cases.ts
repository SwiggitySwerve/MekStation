import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps ECM-nullified semi-guided TAG aligned between browser projection and committed rejection', () => {
    expect(
      combatScenario.tacticalMapEcmNullifiedTagIndirectFireCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      attackable: false,
      targetUnitIds: ['indirect-target'],
      validTargetUnitIds: [],
      weaponIdsAvailable: ['semi-guided-lrm-15'],
      attackInvalidReason: 'NoLineOfSight',
      indirectFireUnavailableReason:
        combatScenario.ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON,
    });
    expect(
      combatScenario.tacticalMapEcmNullifiedTagIndirectFireCombatProjection
        .indirectFireAvailable,
    ).toBeUndefined();
    expect(
      combatScenario.tacticalMapEcmNullifiedTagIndirectFireCombatProjection
        .indirectFireBasis,
    ).toBeUndefined();
    expect(
      combatScenario.tacticalMapEcmNullifiedTagIndirectFireCombatProjection
        .attackInvalidDetails,
    ).toEqual(
      expect.stringContaining(
        combatScenario.ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON,
      ),
    );
    expect(
      combatScenario.tacticalMapEcmNullifiedTagIndirectFireCombatProjection
        .blockedReason,
    ).toEqual(
      expect.stringContaining(
        combatScenario.ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON,
      ),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapEcmNullifiedTagIndirectFireCommitInput(),
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
    expect(
      result.events.some(
        (event) =>
          event.type ===
          combatScenario.GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(false);
    expect(
      result.events.some(
        (event) =>
          event.type === combatScenario.GameEventType.IndirectFireNarcOverride,
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
      targetId: 'indirect-target',
      weaponId: 'semi-guided-lrm-15',
      reason:
        combatScenario.tacticalMapEcmNullifiedTagIndirectFireCombatProjection
          .attackInvalidReason,
      details:
        combatScenario.tacticalMapEcmNullifiedTagIndirectFireCombatProjection
          .attackInvalidDetails,
    });
  });

  it('keeps the minimum-range browser projection aligned with committed to-hit modifiers', () => {
    expect(
      combatScenario.tacticalMapMinimumRangeCombatProjection,
    ).toMatchObject({
      hex: { q: 0, r: 0 },
      distance: 1,
      rangeBracket: 'short',
      attackable: true,
      minimumRangePenalty: 2,
      minimumRangeWeaponIds: ['minimum-lrm'],
      minimumRangeReason: 'Minimum range penalty +2 (minimum-lrm)',
    });
    expect(
      combatScenario.tacticalMapMinimumRangeCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
          value: 2,
          source: 'range',
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapMinimumRangeCommitInput(),
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
    const minimumRangeModifier = payload.modifiers.find(
      (modifier) => modifier.name === 'Minimum Range',
    );
    expect(minimumRangeModifier).toMatchObject({
      value:
        combatScenario.tacticalMapMinimumRangeCombatProjection
          .minimumRangePenalty,
      source: 'range',
    });
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapMinimumRangeCombatProjection.toHitNumber,
    );
  });

  it('keeps target-hex terrain modifiers aligned between browser projection and commit', () => {
    expect(
      combatScenario.tacticalMapTargetTerrainModifierCombatProjection,
    ).toMatchObject({
      hex: { q: 0, r: 1 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      targetCoverModifier: 0,
      targetPartialCover: false,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 5,
    });
    expect(
      combatScenario.tacticalMapTargetTerrainModifierCombatProjection
        .toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Terrain',
          value: 1,
          source: 'terrain',
          description: 'Target in light woods: +1',
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapTargetTerrainModifierCommitInput(),
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
      combatScenario.tacticalMapTargetTerrainModifierCombatProjection
        .weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Terrain',
          value: 1,
          source: 'terrain',
          description: 'Target in light woods: +1',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapTargetTerrainModifierCombatProjection
        .toHitNumber,
    );
  });

  it('keeps prone attacker and target modifiers aligned between browser projection and commit', () => {
    expect(combatScenario.tacticalMapProneCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 7,
    });
    expect(
      combatScenario.tacticalMapProneCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Prone',
          value: 2,
          source: 'other',
        }),
        expect.objectContaining({
          name: 'Target Prone',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(
      combatScenario.tacticalMapProneCombatProjection.toHitReason,
    ).toContain('Attacker Prone +2');
    expect(
      combatScenario.tacticalMapProneCombatProjection.toHitReason,
    ).toContain('Target Prone +1');

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapProneCombatCommitInput(),
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
      combatScenario.tacticalMapProneCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Prone',
          value: 2,
          source: 'other',
        }),
        expect.objectContaining({
          name: 'Target Prone',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapProneCombatProjection.toHitNumber,
    );
  });
});
