import {
  GameEventType,
  GameSide,
  createEvent,
  createBattleUnit,
  createStandardBattleState,
  unitDestroyedEvent,
  damageAppliedEvent,
  attackResolvedEvent,
  criticalHitEvent,
  ammoExplosionEvent,
  heatEffectEvent,
  type BattleState,
  type KeyMomentDetectorTestContext,
} from './KeyMomentDetector.test-helpers';

export function runKeyMomentEdgeTests({
  getDetector,
}: KeyMomentDetectorTestContext): void {
  describe('Edge Cases', () => {
    it('handles empty event stream', () => {
      const state = createStandardBattleState();

      const moments = getDetector().detect([], state);

      expect(moments).toEqual([]);
    });

    it('handles empty battle state', () => {
      const state: BattleState = { units: [] };
      const events = [createEvent(GameEventType.TurnStarted, {}, { turn: 1 })];

      const moments = getDetector().detect(events, state);

      expect(moments).toEqual([]);
    });

    it('handles multiple moments in same turn', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
        ],
      };
      const events = [
        ammoExplosionEvent('o1', 'lt', 20, { turn: 5 }),
        unitDestroyedEvent('o1', 'p1', { turn: 5 }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments.length).toBeGreaterThan(1);
      const turn5Moments = moments.filter((m) => m.turn === 5);
      expect(turn5Moments.length).toBeGreaterThan(1);
    });

    it('deduplicates identical moments', () => {
      const state = createStandardBattleState();
      // Two head shots on same unit in same turn by same attacker produce distinct events
      const events = [
        damageAppliedEvent({
          unitId: 'timberwolf',
          location: 'head',
          damage: 5,
          armorRemaining: 4,
          structureRemaining: 3,
          options: { sourceUnitId: 'atlas' },
          overrides: { turn: 1 },
        }),
        damageAppliedEvent({
          unitId: 'timberwolf',
          location: 'head',
          damage: 5,
          armorRemaining: 0,
          structureRemaining: 2,
          options: { sourceUnitId: 'atlas' },
          overrides: { turn: 1 },
        }),
      ];

      const moments = getDetector().detect(events, state);

      const headShots = moments.filter((m) => m.type === 'head-shot');
      // Same type, same turn, same related units → deduplicated to 1
      expect(headShots).toHaveLength(1);
    });

    it('generates unique moment IDs', () => {
      const state = createStandardBattleState();
      const events = [
        damageAppliedEvent({
          unitId: 'timberwolf',
          location: 'head',
          damage: 5,
          armorRemaining: 4,
          structureRemaining: 3,
          options: { sourceUnitId: 'atlas' },
          overrides: { turn: 1 },
        }),
        ammoExplosionEvent('madcat', 'lt', 20, { turn: 1 }),
        unitDestroyedEvent('stormcrow', 'marauder', { turn: 2 }),
      ];

      const moments = getDetector().detect(events, state);

      const ids = moments.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('assigns correct tier to each moment type', () => {
      const tier1Types = new Set([
        'first-blood',
        'bv-swing-major',
        'comeback',
        'wipe',
        'last-stand',
        'ace-kill',
      ]);
      const tier2Types = new Set([
        'head-shot',
        'ammo-explosion',
        'pilot-kill',
        'critical-engine',
        'critical-gyro',
        'alpha-strike',
        'focus-fire',
      ]);
      const tier3Types = new Set([
        'heat-crisis',
        'mobility-kill',
        'weapons-kill',
        'rear-arc-hit',
        'overkill',
      ]);

      const state: BattleState = {
        units: [
          createBattleUnit({
            id: 'p1',
            side: GameSide.Player,
            bv: 1000,
            weaponIds: ['ac20'],
          }),
          createBattleUnit({
            id: 'o1',
            side: GameSide.Opponent,
            bv: 1000,
            weaponIds: ['ppc'],
          }),
        ],
      };

      const events = [
        damageAppliedEvent({
          unitId: 'o1',
          location: 'head',
          damage: 5,
          armorRemaining: 4,
          structureRemaining: 3,
          options: { sourceUnitId: 'p1' },
        }),
        ammoExplosionEvent('o1', 'lt', 20),
        criticalHitEvent('o1', 'ct', 'engine', 'p1'),
        criticalHitEvent('o1', 'ct', 'gyro', 'p1'),
        criticalHitEvent('o1', 'left_leg', 'hip', 'p1'),
        criticalHitEvent('o1', 'ra', 'ppc', 'p1'),
        heatEffectEvent('p1', 'shutdown', 35),
        unitDestroyedEvent('o1', 'p1'),
      ];

      const moments = getDetector().detect(events, state);

      for (const moment of moments) {
        if (tier1Types.has(moment.type)) {
          expect(moment.tier).toBe(1);
        } else if (tier2Types.has(moment.type)) {
          expect(moment.tier).toBe(2);
        } else if (tier3Types.has(moment.type)) {
          expect(moment.tier).toBe(3);
        }
      }
    });

    it('ignores unrecognized event types', () => {
      const state = createStandardBattleState();
      const events = [
        createEvent(GameEventType.TurnStarted, {}, { turn: 1 }),
        createEvent(GameEventType.PhaseChanged, {
          fromPhase: 'initiative',
          toPhase: 'movement',
        }),
        createEvent(GameEventType.MovementDeclared, {
          unitId: 'atlas',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          facing: 0,
          movementType: 'walk',
          mpUsed: 3,
          heatGenerated: 0,
        }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments).toEqual([]);
    });

    it('handles events from units not in battle state', () => {
      const state: BattleState = {
        units: [createBattleUnit({ id: 'p1', side: GameSide.Player })],
      };
      const events = [
        damageAppliedEvent({
          unitId: 'unknown_unit',
          location: 'head',
          damage: 10,
          armorRemaining: 0,
          structureRemaining: 0,
          options: {
            sourceUnitId: 'p1',
          },
        }),
      ];

      // Should not throw
      const moments = getDetector().detect(events, state);
      expect(moments).toBeDefined();
    });

    it('processes events in sequence order', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 2000 }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 500 }),
          createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 500 }),
          createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 500 }),
        ],
      };
      const events = [
        unitDestroyedEvent('o1', 'p1', { turn: 1 }),
        unitDestroyedEvent('o2', 'p1', { turn: 2 }),
        unitDestroyedEvent('o3', 'p1', { turn: 3 }),
      ];

      const moments = getDetector().detect(events, state);

      const firstBlood = moments.find((m) => m.type === 'first-blood');
      const aceKill = moments.find((m) => m.type === 'ace-kill');
      expect(firstBlood!.turn).toBe(1);
      expect(aceKill!.turn).toBe(3);
    });

    it('handles misses in attack resolution', () => {
      const state = createStandardBattleState();
      const events = [
        attackResolvedEvent('atlas', 'timberwolf', 'ac20', false, { turn: 1 }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments).toEqual([]);
    });

    it('handles no detectable moments in normal combat', () => {
      const state = createStandardBattleState();
      const events = [
        createEvent(GameEventType.TurnStarted, {}, { turn: 1 }),
        damageAppliedEvent({
          unitId: 'timberwolf',
          location: 'ct',
          damage: 10,
          armorRemaining: 15,
          structureRemaining: 16,
          options: {
            sourceUnitId: 'atlas',
          },
        }),
        damageAppliedEvent({
          unitId: 'atlas',
          location: 'la',
          damage: 5,
          armorRemaining: 10,
          structureRemaining: 8,
          options: {
            sourceUnitId: 'timberwolf',
          },
        }),
        createEvent(GameEventType.TurnEnded, {}, { turn: 1 }),
      ];

      const moments = getDetector().detect(events, state);

      expect(moments).toEqual([]);
    });
  });

  // ===========================================================================
  // Integration Scenarios
  // ===========================================================================
}
