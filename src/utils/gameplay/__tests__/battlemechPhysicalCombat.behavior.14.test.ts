import {
  Facing,
  GameEventType,
  UnitType,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  adjacentPhysicalGrid,
  sameHexPhysicalGrid,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IDamageAppliedPayload,
  type IPhysicalAttackResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitGameState,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('emits event-sourced push displacement with attacker follow-through', () => {
    const context = physicalContext({ pushDestinationValid: true });
    const declared = declareAdjacentPhysicalAttack('push', context, {
      facing: Facing.Southeast,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        reason: 'push',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'push',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 2,
      r: 0,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced optional TacOps trip as zero damage with a target PSR', () => {
    const context = physicalContext({
      optionalRules: ['tacops_trip_attack'],
    });
    const declared = declareAdjacentPhysicalAttack('trip', context, {
      facing: Facing.Southeast,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.DamageApplied,
    );
    const psrPayload = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'target',
    )?.payload as IPSRTriggeredPayload | undefined;

    expect(payload).toMatchObject({
      attackType: 'trip',
      toHitNumber: 4,
      hit: true,
      damage: 0,
    });
    expect(payload.location).toBeUndefined();
    expect(payload.displacements).toBeUndefined();
    expect(damageEvents).toHaveLength(0);
    expect(psrPayload).toMatchObject({
      unitId: 'target',
      reason: 'Tripped',
      additionalModifier: 0,
      triggerSource: 'trip',
    });
    expect(psrPayload?.reasonCode).toBeUndefined();
  });

  it('emits event-sourced thrash as automatic same-hex infantry damage with attacker PSR', () => {
    const context = physicalContext();
    const session = withPhysicalPositions(
      physicalPhaseSession(),
      { prone: true },
      { position: { q: 0, r: 0 }, unitType: UnitType.INFANTRY },
    );
    const declared = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'thrash',
      context,
    );
    const positioned = withPhysicalPositions(
      declared,
      { prone: true },
      { position: { q: 0, r: 0 }, unitType: UnitType.INFANTRY },
    );

    const resolved = resolveAllPhysicalAttacks(
      positioned,
      new Map([['attacker', context]]),
      scriptedDice([3, 3]),
      sameHexPhysicalGrid(),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.DamageApplied,
    );
    const psrPayload = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'attacker',
    )?.payload as IPSRTriggeredPayload | undefined;

    expect(payload).toMatchObject({
      attackType: 'thrash',
      toHitNumber: 0,
      roll: 0,
      hit: true,
      damage: 27,
      automaticHit: true,
      automaticHitReason: 'Thrash attacks always hit.',
    });
    expect(damageEvents).toHaveLength(1);
    expect(psrPayload).toMatchObject({
      unitId: 'attacker',
      reason: 'Thrashing attack',
      additionalModifier: 0,
      triggerSource: 'thrash_attacker_hit',
    });
  });

  it('emits event-sourced brush-off as swarming-infantry damage and dislodgement on hit', () => {
    const context = physicalContext({ pilotingSkill: 1 });
    const declared = declareAdjacentPhysicalAttack(
      'brush-off',
      context,
      {},
      { isSwarming: true, unitType: UnitType.INFANTRY },
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damage = resolved.events.find(
      (entry) => entry.type === GameEventType.DamageApplied,
    )?.payload as IDamageAppliedPayload;

    expect(payload).toMatchObject({
      attackType: 'brush-off',
      roll: 12,
      toHitNumber: 5,
      hit: true,
      damage: 8,
    });
    expect(damage).toMatchObject({
      unitId: 'target',
    });
    expect(resolved.currentState.units.target.isSwarming).toBe(false);
  });

  it('emits event-sourced brush-off miss self-damage without dislodging the swarmer', () => {
    const context = physicalContext();
    const declared = declareAdjacentPhysicalAttack(
      'brush-off',
      context,
      {},
      { isSwarming: true, unitType: UnitType.INFANTRY },
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload);

    expect(payload).toMatchObject({
      attackType: 'brush-off',
      roll: 2,
      toHitNumber: 9,
      hit: false,
    });
    expect(damageEvents).toEqual([
      expect.objectContaining({
        unitId: 'attacker',
        damage: 8,
      }),
    ]);
    expect(damageEvents.some((entry) => entry.unitId === 'target')).toBe(false);
  });

  it('emits event-sourced grapple state and attacker relocation on hit', () => {
    const context = physicalContext({
      pilotingSkill: 1,
      optionalRules: ['tacops_grappling'],
    });
    const declared = declareAdjacentPhysicalAttack('grapple', context, {
      facing: Facing.Southeast,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'grapple',
      roll: 12,
      toHitNumber: 1,
      hit: true,
      damage: 0,
    });
    const grappleTargetPosition = resolved.currentState.units.target.position;
    expect(resolved.currentState.units.attacker).toMatchObject({
      grappledUnitId: 'target',
      isGrappleAttacker: true,
      grappledThisRound: true,
      grappleSide: 'both',
      position: grappleTargetPosition,
    });
    const oppositeAttackerFacing = ((resolved.currentState.units.attacker
      .facing +
      3) %
      6) as IUnitGameState['facing'];
    expect(resolved.currentState.units.target).toMatchObject({
      grappledUnitId: 'attacker',
      isGrappleAttacker: false,
      grappledThisRound: true,
      grappleSide: 'both',
      facing: oppositeAttackerFacing,
    });
  });
});
