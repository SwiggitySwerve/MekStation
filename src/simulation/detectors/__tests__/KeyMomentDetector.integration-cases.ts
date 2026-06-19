import {
  GameSide,
  createBattleUnit,
  unitDestroyedEvent,
  damageAppliedEvent,
  attackResolvedEvent,
  criticalHitEvent,
  type BattleState,
  type KeyMomentDetectorTestContext,
} from './KeyMomentDetector.test-helpers';

export function runKeyMomentIntegrationTests({
  getDetector,
}: KeyMomentDetectorTestContext): void {
  describe('Integration Scenarios', () => {
    it('detects multiple tier 1 moments in sequence', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({
            id: 'ace',
            name: 'Ace',
            side: GameSide.Player,
            bv: 2000,
          }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 800 }),
          createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 800 }),
          createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 800 }),
        ],
      };

      const events = [
        unitDestroyedEvent('o1', 'ace', { turn: 2 }),
        unitDestroyedEvent('o2', 'ace', { turn: 4 }),
        unitDestroyedEvent('o3', 'ace', { turn: 6 }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments.find((m) => m.type === 'first-blood')).toBeDefined();
      expect(moments.find((m) => m.type === 'ace-kill')).toBeDefined();
      expect(moments.find((m) => m.type === 'wipe')).toBeDefined();
    });

    it('detects tier 2 events alongside tier 1', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1500 }),
          createBattleUnit({
            id: 'o1',
            side: GameSide.Opponent,
            bv: 1500,
            weaponIds: ['ppc'],
          }),
        ],
      };

      const events = [
        criticalHitEvent('o1', 'ct', 'engine', 'p1', { turn: 3 }),
        damageAppliedEvent({
          unitId: 'o1',
          location: 'head',
          damage: 10,
          armorRemaining: 0,
          structureRemaining: 0,
          options: { sourceUnitId: 'p1' },
          overrides: { turn: 3 },
        }),
        unitDestroyedEvent('o1', 'p1', { turn: 3 }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments.find((m) => m.type === 'critical-engine')).toBeDefined();
      expect(moments.find((m) => m.type === 'head-shot')).toBeDefined();
      expect(moments.find((m) => m.type === 'first-blood')).toBeDefined();
    });

    it('handles a full battle scenario', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({
            id: 'p1',
            name: 'Atlas',
            side: GameSide.Player,
            bv: 1800,
            weaponIds: ['ac20', 'ml1', 'ml2'],
          }),
          createBattleUnit({
            id: 'p2',
            name: 'Marauder',
            side: GameSide.Player,
            bv: 1200,
            weaponIds: ['ppc1', 'ppc2'],
          }),
          createBattleUnit({
            id: 'o1',
            name: 'Timber Wolf',
            side: GameSide.Opponent,
            bv: 2000,
            weaponIds: ['lrm20', 'erl1'],
          }),
          createBattleUnit({
            id: 'o2',
            name: 'Mad Cat',
            side: GameSide.Opponent,
            bv: 1500,
            weaponIds: ['lrm10', 'erl2'],
          }),
        ],
      };

      const events = [
        // Turn 1: Normal combat
        attackResolvedEvent('p1', 'o1', 'ac20', true, { turn: 1 }),
        damageAppliedEvent({
          unitId: 'o1',
          location: 'ct',
          damage: 20,
          armorRemaining: 5,
          structureRemaining: 16,
          options: { sourceUnitId: 'p1' },
          overrides: { turn: 1 },
        }),

        // Turn 2: Head shot + alpha strike
        attackResolvedEvent('p1', 'o1', 'ac20', true, { turn: 2 }),
        attackResolvedEvent('p1', 'o1', 'ml1', true, { turn: 2 }),
        attackResolvedEvent('p1', 'o1', 'ml2', true, { turn: 2 }),
        damageAppliedEvent({
          unitId: 'o1',
          location: 'head',
          damage: 5,
          armorRemaining: 4,
          structureRemaining: 3,
          options: { sourceUnitId: 'p1' },
          overrides: { turn: 2 },
        }),

        // Turn 3: Focus fire + destruction
        attackResolvedEvent('p1', 'o2', 'ac20', true, { turn: 3 }),
        attackResolvedEvent('p2', 'o2', 'ppc1', true, { turn: 3 }),
        attackResolvedEvent('p2', 'o2', 'ppc2', true, { turn: 3 }),
        unitDestroyedEvent('o1', 'p1', { turn: 3 }),

        // Turn 4: Wipe
        unitDestroyedEvent('o2', 'p1', { turn: 4 }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments.find((m) => m.type === 'head-shot')).toBeDefined();
      expect(moments.find((m) => m.type === 'alpha-strike')).toBeDefined();
      expect(moments.find((m) => m.type === 'first-blood')).toBeDefined();
      expect(moments.find((m) => m.type === 'wipe')).toBeDefined();
      expect(moments.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ===========================================================================
  // Moment Properties
  // ===========================================================================
}
