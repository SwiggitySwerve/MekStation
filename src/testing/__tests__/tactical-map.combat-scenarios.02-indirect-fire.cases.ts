import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps Forward Observer indirect-fire cancellation aligned between browser projection and committed attack', () => {
    expect(
      combatScenario.tacticalMapForwardObserverIndirectFireCombatProjection,
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
      indirectFireForwardObserver: true,
      indirectFirePenaltyCancelled: 1,
      indirectFireReason:
        'Indirect fire via spotter indirect-spotter (+1); Forward Observer cancels walked spotter penalty',
    });
    expect(
      combatScenario.tacticalMapForwardObserverIndirectFireCombatProjection
        .toHitModifiers,
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
      combatScenario.tacticalMapForwardObserverIndirectFireCommitInput(),
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
      combatScenario.tacticalMapForwardObserverIndirectFireCombatProjection
        .toHitNumber,
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
        expect.objectContaining({
          type: combatScenario.GameEventType.IndirectFireForwardObserver,
          payload: expect.objectContaining({
            attackerId: 'attacker',
            targetHex: { q: 3, r: 0 },
            weaponId: 'minimum-lrm',
            spotterId: 'indirect-spotter',
            basis: 'los',
            toHitPenalty: 1,
            penaltyCancelled: 1,
          }),
        }),
      ]),
    );
  });

  it('keeps NARC beacon indirect fire aligned between browser projection and committed attack', () => {
    expect(
      combatScenario.tacticalMapNarcBeaconIndirectFireCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: null,
      indirectFireBasis: 'narc',
      indirectFireToHitPenalty: 1,
      indirectFireReason: 'Indirect fire via NARC beacon (+1)',
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapNarcBeaconIndirectFireCommitInput(),
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
      combatScenario.tacticalMapNarcBeaconIndirectFireCombatProjection
        .toHitNumber,
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
    expect(
      result.events.some(
        (event) =>
          event.type ===
          combatScenario.GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(false);
    const override = result.events.find(
      (event) =>
        event.type === combatScenario.GameEventType.IndirectFireNarcOverride,
    );
    expect(override).toBeDefined();
    expect(
      override!.payload as combatScenario.IIndirectFireNarcOverridePayload,
    ).toMatchObject({
      attackerId: 'attacker',
      targetHex: { q: 3, r: 0 },
      weaponId: 'minimum-lrm',
      spotterId: null,
      basis: 'narc',
      toHitPenalty:
        combatScenario.tacticalMapNarcBeaconIndirectFireCombatProjection
          .indirectFireToHitPenalty,
    });
  });

  it('keeps iNarc beacon indirect fire aligned between browser projection and committed attack', () => {
    expect(
      combatScenario.tacticalMapINarcBeaconIndirectFireCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: null,
      indirectFireBasis: 'inarc',
      indirectFireToHitPenalty: 1,
      indirectFireReason: 'Indirect fire via INARC beacon (+1)',
    });

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapINarcBeaconIndirectFireCommitInput(),
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
      combatScenario.tacticalMapINarcBeaconIndirectFireCombatProjection
        .toHitNumber,
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
    expect(
      result.events.some(
        (event) =>
          event.type ===
          combatScenario.GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(false);
    const override = result.events.find(
      (event) =>
        event.type === combatScenario.GameEventType.IndirectFireNarcOverride,
    );
    expect(override).toBeDefined();
    expect(
      override!.payload as combatScenario.IIndirectFireNarcOverridePayload,
    ).toMatchObject({
      attackerId: 'attacker',
      targetHex: { q: 3, r: 0 },
      weaponId: 'minimum-lrm',
      spotterId: null,
      basis: 'inarc',
      toHitPenalty:
        combatScenario.tacticalMapINarcBeaconIndirectFireCombatProjection
          .indirectFireToHitPenalty,
    });
  });

  it('keeps semi-guided TAG indirect fire aligned between browser projection and committed attack', () => {
    expect(
      combatScenario.tacticalMapSemiGuidedTagIndirectFireCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['semi-guided-lrm-15'],
      indirectFireAvailable: true,
      indirectFireSpotterId: null,
      indirectFireBasis: 'semi-guided-tag',
      indirectFireToHitPenalty: 0,
      indirectFireReason:
        'Semi-guided indirect fire via TAG (no indirect penalty)',
    });
    expect(
      combatScenario.tacticalMapSemiGuidedTagIndirectFireCombatProjection
        .toHitModifiers,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Indirect fire' }),
      ]),
    );

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapSemiGuidedTagIndirectFireCommitInput(),
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
      combatScenario.tacticalMapSemiGuidedTagIndirectFireCombatProjection
        .toHitNumber,
    );
    expect(payload.modifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Indirect fire' }),
      ]),
    );
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
  });
});
