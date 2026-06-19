import {
  Facing,
  GameEventType,
  GameSide,
  PSRTrigger,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  adjacentPhysicalGrid,
  breakGrapplePhysicalGrid,
  dominoChargeDisplacementGrid,
  withUnitState,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackResolvedPayload,
  type IPSRTriggeredPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('emits event-sourced break-grapple state clearing and displacement on hit', () => {
    const context = physicalContext({
      optionalRules: ['tacops_grappling'],
      attackerGrappledTargetId: 'target',
      targetGrappledTargetId: 'attacker',
      attackerIsGrappleAttacker: true,
      targetIsGrappleAttacker: false,
    });
    const grappleState = {
      position: { q: 0, r: 0 },
      grappledThisRound: true,
      grappleSide: 'both' as const,
    };
    let session = withUnitState(physicalPhaseSession(), 'attacker', {
      ...grappleState,
      facing: Facing.North,
      grappledUnitId: 'target',
      isGrappleAttacker: true,
    });
    session = withUnitState(session, 'target', {
      ...grappleState,
      facing: Facing.North,
      grappledUnitId: 'attacker',
      isGrappleAttacker: false,
    });
    let declared = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'break-grapple',
      context,
    );
    declared = withUnitState(
      declared,
      'attacker',
      session.currentState.units.attacker,
    );
    declared = withUnitState(
      declared,
      'target',
      session.currentState.units.target,
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6]),
      breakGrapplePhysicalGrid(),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'break-grapple',
      roll: 0,
      toHitNumber: 0,
      hit: true,
      damage: 0,
      automaticHit: true,
      automaticHitReason: 'original attacker',
      displacements: [
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 0, r: -1 },
          reason: 'break-grapple',
        },
      ],
    });
    expect(resolved.currentState.units.attacker).toMatchObject({
      position: { q: 0, r: -1 },
      grappledUnitId: undefined,
      isGrappleAttacker: undefined,
      grappledThisRound: false,
      grappleSide: undefined,
    });
    expect(resolved.currentState.units.target).toMatchObject({
      grappledUnitId: undefined,
      isGrappleAttacker: undefined,
      grappledThisRound: false,
      grappleSide: undefined,
    });
  });

  it('emits event-sourced charge displacement with attacker follow-through', () => {
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
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: true,
    });
    expect(payload.displacements).toEqual([
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
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced charge domino displacement when the destination is occupied', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
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
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 1, r: 2 },
        reason: 'domino',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(resolved.currentState.units['domino-blocker'].position).toEqual({
      q: 1,
      r: 2,
    });
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    const dominoPsr = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'domino-blocker',
    )?.payload as IPSRTriggeredPayload | undefined;
    expect(dominoPsr).toMatchObject({
      unitId: 'domino-blocker',
      reason: 'Domino effect',
      reasonCode: PSRTrigger.DominoEffect,
      additionalModifier: 0,
      basePilotingSkill: 5,
    });
    expect(
      resolved.currentState.units['domino-blocker'].pendingPSRs,
    ).toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
    );
  });
});
