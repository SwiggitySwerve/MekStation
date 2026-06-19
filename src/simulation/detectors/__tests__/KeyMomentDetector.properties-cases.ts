import {
  GamePhase,
  createStandardBattleState,
  unitDestroyedEvent,
  heatEffectEvent,
  type KeyMomentDetectorTestContext,
} from './KeyMomentDetector.test-helpers';

export function runKeyMomentPropertiesTests({
  getDetector,
}: KeyMomentDetectorTestContext): void {
  describe('Moment Properties', () => {
    it('includes turn number from event', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas', { turn: 7 })];

      const moments = getDetector().detect(events, state);

      expect(moments[0].turn).toBe(7);
    });

    it('includes phase from event', () => {
      const state = createStandardBattleState();
      const events = [
        heatEffectEvent('atlas', 'shutdown', 35, { phase: GamePhase.Heat }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments[0].phase).toBe(GamePhase.Heat);
    });

    it('includes non-empty description', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas')];

      const moments = getDetector().detect(events, state);

      expect(moments[0].description.length).toBeGreaterThan(0);
    });

    it('includes non-empty relatedUnitIds', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas')];

      const moments = getDetector().detect(events, state);

      expect(moments[0].relatedUnitIds.length).toBeGreaterThan(0);
    });

    it('includes numeric timestamp', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas')];

      const moments = getDetector().detect(events, state);

      expect(typeof moments[0].timestamp).toBe('number');
      expect(moments[0].timestamp).toBeGreaterThan(0);
    });
  });
}
