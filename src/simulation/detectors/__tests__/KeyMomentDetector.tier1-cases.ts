import {
  GameSide,
  createBattleUnit,
  createStandardBattleState,
  unitDestroyedEvent,
  type BattleState,
  type KeyMomentDetectorTestContext,
} from './KeyMomentDetector.test-helpers';

export function runKeyMomentTier1Tests({
  getDetector,
}: KeyMomentDetectorTestContext): void {
  describe('Tier 1 - Game-Changing Events', () => {
    describe('first-blood', () => {
      it('detects first unit destroyed', () => {
        const state = createStandardBattleState();
        const events = [unitDestroyedEvent('timberwolf', 'atlas')];

        const moments = getDetector().detect(events, state);

        const firstBlood = moments.find((m) => m.type === 'first-blood');
        expect(firstBlood).toBeDefined();
        expect(firstBlood!.tier).toBe(1);
        expect(firstBlood!.type).toBe('first-blood');
      });

      it('ignores subsequent destructions for first-blood', () => {
        const state = createStandardBattleState();
        const events = [
          unitDestroyedEvent('timberwolf', 'atlas'),
          unitDestroyedEvent('madcat', 'marauder'),
        ];

        const moments = getDetector().detect(events, state);

        const firstBloods = moments.filter((m) => m.type === 'first-blood');
        expect(firstBloods).toHaveLength(1);
      });

      it('includes correct related units', () => {
        const state = createStandardBattleState();
        const events = [unitDestroyedEvent('timberwolf', 'atlas')];

        const moments = getDetector().detect(events, state);

        const firstBlood = moments.find((m) => m.type === 'first-blood');
        expect(firstBlood!.relatedUnitIds).toContain('atlas');
        expect(firstBlood!.relatedUnitIds).toContain('timberwolf');
      });

      it('handles first-blood without killer', () => {
        const state = createStandardBattleState();
        const events = [unitDestroyedEvent('timberwolf')];

        const moments = getDetector().detect(events, state);

        const firstBlood = moments.find((m) => m.type === 'first-blood');
        expect(firstBlood).toBeDefined();
        expect(firstBlood!.relatedUnitIds).toContain('timberwolf');
      });
    });

    describe('bv-swing-major', () => {
      it('detects >30% BV swing after unit destruction', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // Initial advantage: 0%. After o1 destroyed: (2000-1000)/3000 = 33% swing
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = getDetector().detect(events, state);

        const swing = moments.find((m) => m.type === 'bv-swing-major');
        expect(swing).toBeDefined();
        expect(swing!.tier).toBe(1);
      });

      it('ignores swings under 30%', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p3', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p4', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // Initial: 0%. After o1 destroyed: (4000-3000)/7000 = ~14% swing
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = getDetector().detect(events, state);

        const swing = moments.find((m) => m.type === 'bv-swing-major');
        expect(swing).toBeUndefined();
      });

      it('includes BV metadata', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = getDetector().detect(events, state);

        const swing = moments.find((m) => m.type === 'bv-swing-major');
        expect(swing).toBeDefined();
        expect(swing!.metadata).toBeDefined();
        expect(swing!.metadata!.swingPercent).toBeDefined();
      });
    });

    describe('comeback', () => {
      it('detects comeback from 2:1 BV disadvantage', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 500 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 500 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1500 }),
          ],
        };
        // Player ratio starts at 1000/2500 = 0.4 (<0.5)
        // After destroying o2: 1000/1000 = 1.0 (not > 1.0)
        // After destroying o1: 1000/0 = Infinity (> 1.0)
        const events = [
          unitDestroyedEvent('o2', 'p1'),
          unitDestroyedEvent('o1', 'p2'),
        ];

        const moments = getDetector().detect(events, state);

        const comeback = moments.find((m) => m.type === 'comeback');
        expect(comeback).toBeDefined();
        expect(comeback!.tier).toBe(1);
      });

      it('does not detect comeback without prior disadvantage', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 2000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // Player ratio starts at 2.0, never drops below 0.5
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = getDetector().detect(events, state);

        const comeback = moments.find((m) => m.type === 'comeback');
        expect(comeback).toBeUndefined();
      });
    });

    describe('wipe', () => {
      it('detects team elimination', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'p1'),
          unitDestroyedEvent('o2', 'p1'),
        ];

        const moments = getDetector().detect(events, state);

        const wipe = moments.find((m) => m.type === 'wipe');
        expect(wipe).toBeDefined();
        expect(wipe!.tier).toBe(1);
        expect(wipe!.relatedUnitIds).toContain('o1');
        expect(wipe!.relatedUnitIds).toContain('o2');
      });

      it('does not trigger until all team units destroyed', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = getDetector().detect(events, state);

        const wipe = moments.find((m) => m.type === 'wipe');
        expect(wipe).toBeUndefined();
      });
    });

    describe('last-stand', () => {
      it('detects single unit vs 3+ enemies', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p3', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [
          unitDestroyedEvent('p1', 'o1'),
          unitDestroyedEvent('p2', 'o2'),
        ];

        const moments = getDetector().detect(events, state);

        const lastStand = moments.find((m) => m.type === 'last-stand');
        expect(lastStand).toBeDefined();
        expect(lastStand!.tier).toBe(1);
        expect(lastStand!.relatedUnitIds).toContain('p3');
      });

      it('does not trigger for 1 vs 2', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [unitDestroyedEvent('p1', 'o1')];

        const moments = getDetector().detect(events, state);

        const lastStand = moments.find((m) => m.type === 'last-stand');
        expect(lastStand).toBeUndefined();
      });

      it('only triggers once per unit', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // p1 destroyed: p2 alone vs 4 → last stand
        // o1 destroyed: p2 alone vs 3 → same unit, should not trigger again
        const events = [
          unitDestroyedEvent('p1', 'o1'),
          unitDestroyedEvent('o1', 'p2'),
        ];

        const moments = getDetector().detect(events, state);

        const lastStands = moments.filter((m) => m.type === 'last-stand');
        expect(lastStands).toHaveLength(1);
      });
    });

    describe('ace-kill', () => {
      it('detects unit with 3+ kills', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'ace',
              name: 'Ace Mech',
              side: GameSide.Player,
              bv: 2000,
            }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 500 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 500 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 500 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'ace'),
          unitDestroyedEvent('o2', 'ace'),
          unitDestroyedEvent('o3', 'ace'),
        ];

        const moments = getDetector().detect(events, state);

        const aceKill = moments.find((m) => m.type === 'ace-kill');
        expect(aceKill).toBeDefined();
        expect(aceKill!.tier).toBe(1);
        expect(aceKill!.description).toContain('Ace Mech');
        expect(aceKill!.metadata?.kills).toBe(3);
      });

      it('does not trigger with only 2 kills', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'ace', side: GameSide.Player, bv: 2000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 500 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 500 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'ace'),
          unitDestroyedEvent('o2', 'ace'),
        ];

        const moments = getDetector().detect(events, state);

        const aceKill = moments.find((m) => m.type === 'ace-kill');
        expect(aceKill).toBeUndefined();
      });

      it('only triggers once per ace', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'ace', side: GameSide.Player, bv: 2000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 300 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 300 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 300 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 300 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'ace'),
          unitDestroyedEvent('o2', 'ace'),
          unitDestroyedEvent('o3', 'ace'),
          unitDestroyedEvent('o4', 'ace'),
        ];

        const moments = getDetector().detect(events, state);

        const aceKills = moments.filter((m) => m.type === 'ace-kill');
        expect(aceKills).toHaveLength(1);
      });
    });
  });

  // ===========================================================================
  // Tier 2 - Significant Tactical Events
  // ===========================================================================
}
