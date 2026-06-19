import {
  GameEventType,
  PSRTrigger,
  scriptedDice,
  physicalContext,
  declareAdjacentPhysicalAttack,
  resolveAllPhysicalAttacks,
  resolvePendingPSRs,
  type IPilotHitPayload,
  type IPSRTriggeredPayload,
} from './battlemechPhysicalCombat.behavior.test-helpers';

describe('BattleMech physical combat behavior validation lane', () => {
  it('turns a missed kick PSR into a fall and clears targetability state', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const withMissPsr = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', physicalContext()]]),
      scriptedDice([1, 1]),
    );

    const psrEvent = withMissPsr.events.find(
      (entry) => entry.type === GameEventType.PSRTriggered,
    );
    const psrPayload = psrEvent?.payload as IPSRTriggeredPayload;
    expect(psrPayload.reasonCode).toBe(PSRTrigger.KickMiss);
    expect(withMissPsr.currentState.units.attacker.pendingPSRs).toHaveLength(1);

    const afterFailedPSR = resolvePendingPSRs(
      withMissPsr,
      scriptedDice([1, 1, 1]),
    );

    expect(afterFailedPSR.currentState.units.attacker.prone).toBe(true);
    expect(afterFailedPSR.currentState.units.attacker.pendingPSRs).toEqual([]);
    expect(
      afterFailedPSR.events.some(
        (entry) => entry.type === GameEventType.UnitFell,
      ),
    ).toBe(true);
    expect(
      afterFailedPSR.events.some(
        (entry) => entry.type === GameEventType.PilotHit,
      ),
    ).toBe(true);
    const pilotHit = afterFailedPSR.events.find(
      (entry) => entry.type === GameEventType.PilotHit,
    );
    expect((pilotHit?.payload as IPilotHitPayload).source).toBe('fall');
  });
});
