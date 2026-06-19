import * as combatScenario from './tactical-map.combat-scenarios.test-context';

describe('tactical map combat scenarios', () => {
  it('keeps shutdown target immobile modifiers aligned between browser projection and commit', () => {
    expect(combatScenario.tacticalMapImmobileCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 0,
    });
    expect(
      combatScenario.tacticalMapImmobileCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Immobile',
          value: -4,
          source: 'other',
        }),
      ]),
    );
    expect(
      combatScenario.tacticalMapImmobileCombatProjection.toHitReason,
    ).toContain('Target Immobile -4');

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapImmobileCombatCommitInput(),
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
      combatScenario.tacticalMapImmobileCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Immobile',
          value: -4,
          source: 'other',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapImmobileCombatProjection.toHitNumber,
    );
  });

  it('keeps hot attacker to-hit modifiers aligned between browser projection and commit', () => {
    expect(combatScenario.tacticalMapHeatCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 6,
    });
    expect(
      combatScenario.tacticalMapHeatCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Heat',
          value: 2,
          source: 'heat',
          description: 'Heat 13: +2',
        }),
      ]),
    );
    expect(
      combatScenario.tacticalMapHeatCombatProjection.toHitReason,
    ).toContain('Heat +2');

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapHeatCombatCommitInput(),
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
      combatScenario.tacticalMapHeatCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Heat',
          value: 2,
          source: 'heat',
          description: 'Heat 13: +2',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapHeatCombatProjection.toHitNumber,
    );
  });

  it('keeps attacker and target movement to-hit modifiers aligned between browser projection and commit', () => {
    expect(combatScenario.tacticalMapMovementCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 8,
    });
    expect(
      combatScenario.tacticalMapMovementCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Movement',
          value: 2,
          source: 'attacker_movement',
          description: 'Attacker run: +2',
        }),
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 2,
          source: 'target_movement',
          description: 'Target moved 5 hexes: +2',
        }),
      ]),
    );
    expect(
      combatScenario.tacticalMapMovementCombatProjection.toHitReason,
    ).toContain('Attacker Movement +2');
    expect(
      combatScenario.tacticalMapMovementCombatProjection.toHitReason,
    ).toContain('Target Movement (TMM) +2');

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapMovementCombatCommitInput(),
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
      combatScenario.tacticalMapMovementCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      combatScenario.tacticalMapMovementCombatProjection.toHitModifiers,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapMovementCombatProjection.toHitNumber,
    );
  });

  it('keeps walked attacker and target movement to-hit modifiers aligned between browser projection and commit', () => {
    expect(combatScenario.tacticalMapWalkCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 6,
    });
    expect(
      combatScenario.tacticalMapWalkCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Movement',
          value: 1,
          source: 'attacker_movement',
          description: 'Attacker walk: +1',
        }),
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 1,
          source: 'target_movement',
          description: 'Target moved 3 hexes: +1',
        }),
      ]),
    );
    expect(
      combatScenario.tacticalMapWalkCombatProjection.toHitReason,
    ).toContain('Attacker Movement +1');
    expect(
      combatScenario.tacticalMapWalkCombatProjection.toHitReason,
    ).toContain('Target Movement (TMM) +1');

    const result = combatScenario.applyInteractiveSessionAttack(
      combatScenario.tacticalMapWalkCombatCommitInput(),
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
      combatScenario.tacticalMapWalkCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      combatScenario.tacticalMapWalkCombatProjection.toHitModifiers,
    );
    expect(payload.toHitNumber).toBe(
      combatScenario.tacticalMapWalkCombatProjection.toHitNumber,
    );
  });
});
