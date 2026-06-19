import {
  Facing,
  GameEventType,
  GameSide,
  MovementType,
  PSRTrigger,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  adjacentPhysicalGrid,
  blockedChargeDisplacementGrid,
  dominoChargeDisplacementGrid,
  elevatedChargeDisplacementGrid,
  withUnitState,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IDamageAppliedPayload,
  type IPhysicalAttackResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitDestroyedPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('applies event-sourced domino step-out CFR decisions without forced DominoEffect PSRs', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
      blockerStepOutDecision: {
        blockerUnitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        response: 'move',
        psrPassed: true,
        context: {
          sideEntered: true,
          blockerJumped: false,
          legalStepOptions: [
            { kind: 'forward', to: { q: 2, r: 0 } },
            { kind: 'backward', to: { q: 0, r: 2 } },
          ],
        },
        path: [{ q: 2, r: 0 }],
      },
    });
    const positioned = withPhysicalPositions(
      physicalPhaseSession([
        {
          id: 'domino-blocker',
          name: 'Domino Blocker',
          side: GameSide.Opponent,
          unitRef: 'domino-blocker-ref',
          pilotRef: 'domino-blocker-pilot',
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
      'charge',
      context,
    );
    declared = withUnitState(declared, 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.South,
    });
    declared = withUnitState(declared, 'target', {
      position: { q: 1, r: 0 },
    });
    declared = withUnitState(declared, 'domino-blocker', {
      position: { q: 1, r: 1 },
      facing: Facing.Northeast,
      movementThisTurn: MovementType.Walk,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      dominoChargeDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.displacements).toEqual([
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 2, r: 0 },
        reason: 'domino_step_out',
      },
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(resolved.currentState.units['domino-blocker'].position).toEqual({
      q: 2,
      r: 0,
    });
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    expect(
      resolved.currentState.units['domino-blocker'].pendingPSRs,
    ).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
    );
    expect(
      resolved.events.some(
        (entry) =>
          entry.type === GameEventType.PSRTriggered &&
          (entry.payload as IPSRTriggeredPayload).unitId === 'domino-blocker' &&
          (entry.payload as IPSRTriggeredPayload).reasonCode ===
            PSRTrigger.DominoEffect,
      ),
    ).toBe(false);
  });

  it('emits event-sourced charge damage without displacement when blocked', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      blockedChargeDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload);
    const chargedPsrs = resolved.events
      .filter((entry) => entry.type === GameEventType.PSRTriggered)
      .map((entry) => entry.payload as IPSRTriggeredPayload)
      .filter((entry) => entry.reasonCode === PSRTrigger.Charged);
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).cause ===
          'impossible_displacement',
    );

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: true,
    });
    expect(payload.damage).toBeGreaterThan(0);
    expect(payload.displacements).toBeUndefined();
    expect(
      damageEvents.filter((entry) => entry.unitId === 'target'),
    ).toHaveLength(Math.ceil((payload.damage ?? 0) / 5));
    expect(
      damageEvents.filter((entry) => entry.unitId === 'attacker').length,
    ).toBeGreaterThan(0);
    expect(chargedPsrs).toHaveLength(0);
    expect(destroyed).toBeUndefined();
  });

  it('emits event-sourced charge damage without displacement when the target climb is too high', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      elevatedChargeDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload);
    const chargedPsrs = resolved.events
      .filter((entry) => entry.type === GameEventType.PSRTriggered)
      .map((entry) => entry.payload as IPSRTriggeredPayload)
      .filter((entry) => entry.reasonCode === PSRTrigger.Charged);
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).cause ===
          'impossible_displacement',
    );

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: true,
    });
    expect(payload.damage).toBeGreaterThan(0);
    expect(payload.displacements).toBeUndefined();
    expect(
      damageEvents.filter((entry) => entry.unitId === 'target'),
    ).toHaveLength(Math.ceil((payload.damage ?? 0) / 5));
    expect(chargedPsrs).toHaveLength(0);
    expect(destroyed).toBeUndefined();
  });

  it('emits event-sourced charge-miss domino displacement from an occupied side hex', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: false,
    });
    expect(payload.displacements).toEqual([
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge_miss',
      },
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        reason: 'domino',
      },
    ]);
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    expect(resolved.currentState.units.target.position).toEqual({
      q: 2,
      r: 0,
    });
  });
});
