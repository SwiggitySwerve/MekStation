import {
  Facing,
  GameEventType,
  GameSide,
  PSRTrigger,
  UnitType,
  STANDARD_ARMOR,
  STANDARD_STRUCTURE,
  physicalPhaseSession,
  scriptedDice,
  physicalContext,
  adjacentPhysicalGrid,
  withUnitState,
  withPhysicalPositions,
  declareAdjacentPhysicalAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IDamageAppliedPayload,
  type IPilotHitPayload,
  type IPhysicalAttackResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitFellPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('emits event-sourced DFA hit displacement with attacker follow-through', () => {
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
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const attackerPsr = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'attacker',
    );
    const targetPsr = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'target',
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const psrPayload = attackerPsr?.payload as IPSRTriggeredPayload | undefined;
    const targetPsrPayload = targetPsr?.payload as
      | IPSRTriggeredPayload
      | undefined;

    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'dfa',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
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
    expect(psrPayload).toMatchObject({
      unitId: 'attacker',
      reason: 'Executed DFA',
      additionalModifier: 4,
      triggerSource: 'dfa_attacker_hit',
      reasonCode: PSRTrigger.DFATarget,
    });
    expect(targetPsrPayload).toMatchObject({
      unitId: 'target',
      reason: 'Hit by DFA',
      additionalModifier: 2,
      triggerSource: PSRTrigger.DFATarget,
      reasonCode: PSRTrigger.DFATarget,
    });
  });

  it('hydrates grounded DropShip source context for event-sourced DFA hit displacement', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const positioned = withPhysicalPositions(
      physicalPhaseSession([
        {
          id: 'grounded-dropship',
          name: 'Grounded DropShip',
          side: GameSide.Opponent,
          unitRef: 'grounded-dropship-ref',
          pilotRef: 'grounded-dropship-pilot',
          gunnery: 4,
          piloting: 5,
        },
      ]),
      {
        facing: Facing.South,
        armor: STANDARD_ARMOR,
        structure: STANDARD_STRUCTURE,
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
    declared = withUnitState(declared, 'grounded-dropship', {
      position: { q: 1, r: 0 },
      unitType: UnitType.DROPSHIP,
      isAirborne: false,
      pilotConscious: false,
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
      attackType: 'dfa',
      hit: true,
    });
    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 2 },
        reason: 'dfa',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 2,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced DFA miss displacement for target and attacker', () => {
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
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const fell = resolved.events.find(
      (entry) => entry.type === GameEventType.UnitFell,
    );
    const pilotHit = resolved.events.find(
      (entry) => entry.type === GameEventType.PilotHit,
    );
    const psrEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.PSRTriggered,
    );
    const fallDamage = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload)
      .filter((entry) => entry.unitId === 'attacker');
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const fallPayload = fell?.payload as IUnitFellPayload | undefined;
    const pilotHitPayload = pilotHit?.payload as IPilotHitPayload | undefined;

    expect(payload).toMatchObject({
      attackType: 'dfa',
      hit: false,
    });
    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
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
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    expect(fallDamage.reduce((sum, entry) => sum + entry.damage, 0)).toBe(24);
    expect(fallPayload).toMatchObject({
      unitId: 'attacker',
      fallDamage: 24,
      newFacing: Facing.North,
      pilotDamage: 1,
      location: 'dfa_miss',
      reason: 'Missed DFA',
      reasonCode: PSRTrigger.DFAMiss,
    });
    expect(pilotHitPayload).toMatchObject({
      unitId: 'attacker',
      wounds: 1,
      totalWounds: 1,
      source: 'fall',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: false,
    });
    expect(resolved.currentState.units.attacker).toMatchObject({
      prone: true,
      facing: Facing.North,
      pendingPSRs: [],
      pilotWounds: 1,
      pilotConscious: false,
    });
    expect(psrEvents).toHaveLength(0);
  });
});
