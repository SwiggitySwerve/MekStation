import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps the mixed legal browser projection aligned with committed attack declaration', () => {
    expect(combatScenario.tacticalMapMediumRangeCombatProjection).toMatchObject(
      {
        hex: { q: 1, r: 2 },
        distance: 4,
        rangeBracket: 'medium',
        attackable: true,
        weaponIdsAvailable: ['medium-laser', 'extreme-lrm'],
        weaponRangeOptions: [
          {
            weaponId: 'medium-laser',
            rangeBracket: 'medium',
            available: true,
            toHitNumber: 6,
            expectedDamage: 3.6,
          },
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
          {
            weaponId: 'extreme-lrm',
            rangeBracket: 'extreme',
            available: true,
            toHitNumber: 10,
            expectedDamage: 0.85,
          },
        ],
      },
    );
    expect(
      combatScenario.tacticalMapMediumRangeCombatProjection.toHitNumber,
    ).toBe(6);
    expect(
      combatScenario.tacticalMapMediumRangeCombatProjection.expectedDamage,
    ).toBeCloseTo(4.45, 4);

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapMediumRangeCommitInput(),
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
      combatScenario.tacticalMapMediumRangeCombatProjection.weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      combatScenario.tacticalMapMediumRangeCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapMediumRangeCombatProjection.toHitNumber,
    );
    expect(payload.weaponAttacks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weaponId: 'medium-laser',
          toHitNumber: 6,
          modifiers: expect.arrayContaining([
            expect.objectContaining({
              name: 'Range (medium)',
              value: 2,
            }),
          ]),
        }),
        expect.objectContaining({
          weaponId: 'extreme-lrm',
          toHitNumber: 10,
          modifiers: expect.arrayContaining([
            expect.objectContaining({
              name: 'Range (extreme)',
              value: 6,
            }),
          ]),
        }),
      ]),
    );
  });

  it('keeps C3 range benefit aligned between browser projection and committed attack', () => {
    expect(
      combatScenario.tacticalMapC3RangeBenefitCombatProjection,
    ).toMatchObject({
      hex: { q: 1, r: 2 },
      distance: 4,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      c3BenefitApplied: true,
      c3SpotterId: 'c3-spotter',
      c3SpotterRange: 1,
    });
    expect(
      combatScenario.tacticalMapC3RangeBenefitCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'C3 Network',
          value: 0,
          source: 'equipment',
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapC3RangeBenefitCommitInput(),
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
      combatScenario.tacticalMapC3RangeBenefitCombatProjection
        .weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      combatScenario.tacticalMapC3RangeBenefitCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapC3RangeBenefitCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'C3 Network',
          value: 0,
          source: 'equipment',
        }),
      ]),
    );
  });

  it('keeps LOS-spotter indirect fire aligned between browser projection and committed attack', () => {
    expect(
      combatScenario.tacticalMapIndirectFireCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: 'indirect-spotter',
      indirectFireBasis: 'los',
      indirectFireToHitPenalty: 1,
      indirectFireReason: 'Indirect fire via spotter indirect-spotter (+1)',
    });
    expect(
      combatScenario.tacticalMapIndirectFireCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapIndirectFireCommitInput(),
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
      combatScenario.tacticalMapIndirectFireCombatProjection.weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      combatScenario.tacticalMapIndirectFireCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapIndirectFireCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: combatScenario.GameEventType.IndirectFireSpotterSelected,
          payload: expect.objectContaining({
            attackerId: 'attacker',
            targetHex: { q: 3, r: 0 },
            weaponId: 'minimum-lrm',
            spotterId: 'indirect-spotter',
            basis: 'los',
            toHitPenalty: 1,
          }),
        }),
      ]),
    );
  });

  // Audit C-5: this agreement scenario formerly pinned the artillery-only
  // spotter-gunnery modifier; it now pins the corrected +1 spotter-attacking
  // modifier (MegaMek ComputeToHit.java L1540-1544).
  it('keeps spotter-attacked indirect fire aligned between browser projection and committed attack', () => {
    expect(
      combatScenario.tacticalMapSpotterSkillIndirectFireCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: 'indirect-spotter',
      indirectFireBasis: 'los',
      indirectFireToHitPenalty: 2,
      indirectFireSpotterAttacked: true,
      indirectFireReason:
        'Indirect fire via spotter indirect-spotter (+2); spotter attacked this turn adds +1',
    });
    expect(
      combatScenario.tacticalMapSpotterSkillIndirectFireCombatProjection
        .toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 2,
          source: 'other',
        }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapSpotterSkillIndirectFireCommitInput(),
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
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapSpotterSkillIndirectFireCombatProjection
        .toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 2,
          source: 'other',
        }),
      ]),
    );
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: combatScenario.GameEventType.IndirectFireSpotterSelected,
          payload: expect.objectContaining({
            attackerId: 'attacker',
            targetHex: { q: 3, r: 0 },
            weaponId: 'minimum-lrm',
            spotterId: 'indirect-spotter',
            basis: 'los',
            toHitPenalty: 2,
            spotterAttackedThisTurn: true,
          }),
        }),
      ]),
    );
  });
});
