import {
  Facing,
  GameEventType,
  GameSide,
  PSRTrigger,
  STANDARD_ARMOR,
  STANDARD_STRUCTURE,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  adjacentPhysicalGrid,
  blockedDfaDisplacementGrid,
  friendlyDfaMissDisplacementGrid,
  withUnitState,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
  type IUnitDestroyedPayload,
  type IUnitFellPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('avoids friendly occupied DFA miss displacement destinations before falling in', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const positioned = withPhysicalPositions(
      physicalPhaseSession([
        {
          id: 'target-friend',
          name: 'Target Friend',
          side: GameSide.Opponent,
          unitRef: 'target-friend-ref',
          pilotRef: 'target-friend-pilot',
          gunnery: 4,
          piloting: 5,
        },
      ]),
      {
        facing: Facing.South,
      },
    );
    let declared = declarePhysicalAttack(
      positioned,
      'attacker',
      'target',
      'dfa',
      context,
    );
    declared = withUnitState(declared, 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.South,
    });
    declared = withUnitState(declared, 'target', {
      position: { q: 1, r: 0 },
    });
    declared = withUnitState(declared, 'target-friend', {
      position: { q: 1, r: 1 },
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1]),
      friendlyDfaMissDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 0, r: 1 },
        reason: 'dfa_miss',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa_miss',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 0,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('passes missed-DFA fall pilot-damage avoidance without a PilotHit', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
      armor: STANDARD_ARMOR,
      structure: STANDARD_STRUCTURE,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 6]),
      adjacentPhysicalGrid(),
    );
    const fell = resolved.events.find(
      (entry) => entry.type === GameEventType.UnitFell,
    );
    const pilotHit = resolved.events.find(
      (entry) => entry.type === GameEventType.PilotHit,
    );
    const fallPayload = fell?.payload as IUnitFellPayload | undefined;

    expect(fallPayload).toMatchObject({
      unitId: 'attacker',
      fallDamage: 24,
      newFacing: Facing.North,
      pilotDamage: 0,
      location: 'dfa_miss',
      reason: 'Missed DFA',
      reasonCode: PSRTrigger.DFAMiss,
    });
    expect(pilotHit).toBeUndefined();
    expect(resolved.currentState.units.attacker).toMatchObject({
      prone: true,
      facing: Facing.North,
      pilotWounds: 0,
      pilotConscious: true,
    });
  });

  it('emits event-sourced DFA target destruction on impossible hit displacement', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      blockedDfaDisplacementGrid(),
    );
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).unitId === 'target',
    );
    const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'target',
      cause: 'impossible_displacement',
      killerUnitId: 'attacker',
    });
    expect(resolved.currentState.units.target.destroyed).toBe(true);
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced DFA attacker destruction on impossible miss displacement', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1]),
      blockedDfaDisplacementGrid(),
    );
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).unitId === 'attacker',
    );
    const psrEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.PSRTriggered,
    );
    const resolvedAttack = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const resolvedPayload = resolvedAttack?.payload as
      | IPhysicalAttackResolvedPayload
      | undefined;
    const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'attacker',
      cause: 'impossible_displacement',
    });
    expect(payload?.killerUnitId).toBeUndefined();
    expect(resolvedPayload?.displacements).toBeUndefined();
    expect(psrEvents).toHaveLength(0);
    expect(resolved.currentState.units.attacker.destroyed).toBe(true);
  });

  it('threads active TSM through session physical resolution', () => {
    const context = physicalContext({ hasTSM: true });
    const declared = declareAdjacentPhysicalAttack('kick', context, {
      heat: 9,
      hasTSM: true,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'kick',
      roll: 12,
      toHitNumber: 3,
      hit: true,
      damage: 32,
    });
  });

  it('threads underwater state through session physical resolution', () => {
    const context = physicalContext({ isUnderwater: true });
    const declared = declareAdjacentPhysicalAttack('kick', context);

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'kick',
      roll: 12,
      toHitNumber: 3,
      hit: true,
      damage: 8,
    });
  });

  it('threads Frogman attacker water depth through session physical resolution', () => {
    const context = physicalContext({
      pilotAbilities: ['tm_frogman'],
      attackerWaterDepth: 2,
    });
    const declared = declareAdjacentPhysicalAttack('kick', context);

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'kick',
      roll: 12,
      toHitNumber: 2,
      hit: true,
    });
  });

  it('threads explicit two-handed Zweihander declaration through session punch resolution', () => {
    const context = physicalContext({
      pilotAbilities: ['zweihander'],
      twoHandedZweihander: true,
    });
    const declared = declareAdjacentPhysicalAttack('punch', context);
    const declaredPayload = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload;

    expect(declaredPayload.twoHandedZweihander).toBe(true);

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'punch',
      hit: true,
      damage: 16,
    });
  });
});
