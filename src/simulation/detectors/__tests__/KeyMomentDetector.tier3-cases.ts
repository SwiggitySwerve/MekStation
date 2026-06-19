import {
  GameSide,
  createBattleUnit,
  createStandardBattleState,
  damageAppliedEvent,
  attackResolvedEvent,
  criticalHitEvent,
  heatEffectEvent,
  type BattleState,
  type KeyMomentDetectorTestContext,
} from './KeyMomentDetector.test-helpers';

export function runKeyMomentTier3Tests({
  getDetector,
}: KeyMomentDetectorTestContext): void {
  describe('Tier 3 - Notable Routine Events', () => {
    describe('heat-crisis', () => {
      it('detects heat shutdown', () => {
        const state = createStandardBattleState();
        const events = [heatEffectEvent('atlas', 'shutdown', 35)];

        const moments = getDetector().detect(events, state);

        const heatCrisis = moments.find((m) => m.type === 'heat-crisis');
        expect(heatCrisis).toBeDefined();
        expect(heatCrisis!.tier).toBe(3);
        expect(heatCrisis!.metadata?.heat).toBe(35);
      });

      it('ignores non-shutdown heat effects', () => {
        const state = createStandardBattleState();
        const events = [heatEffectEvent('atlas', 'attack_penalty', 20)];

        const moments = getDetector().detect(events, state);

        const heatCrisis = moments.find((m) => m.type === 'heat-crisis');
        expect(heatCrisis).toBeUndefined();
      });
    });

    describe('mobility-kill', () => {
      it('detects leg actuator critical hit', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent('timberwolf', 'left_leg', 'hip', 'atlas'),
        ];

        const moments = getDetector().detect(events, state);

        const mobilityKill = moments.find((m) => m.type === 'mobility-kill');
        expect(mobilityKill).toBeDefined();
        expect(mobilityKill!.tier).toBe(3);
      });

      it('detects various leg actuator types', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent(
            'timberwolf',
            'right_leg',
            'upper_leg_actuator',
            'atlas',
          ),
        ];

        const moments = getDetector().detect(events, state);

        const mobilityKill = moments.find((m) => m.type === 'mobility-kill');
        expect(mobilityKill).toBeDefined();
      });

      it('only triggers once per unit', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent('timberwolf', 'left_leg', 'hip', 'atlas'),
          criticalHitEvent(
            'timberwolf',
            'right_leg',
            'lower_leg_actuator',
            'atlas',
          ),
        ];

        const moments = getDetector().detect(events, state);

        const mobilityKills = moments.filter((m) => m.type === 'mobility-kill');
        expect(mobilityKills).toHaveLength(1);
      });

      it('ignores non-leg actuator crits', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent('timberwolf', 'ct', 'heat_sink', 'atlas'),
        ];

        const moments = getDetector().detect(events, state);

        const mobilityKill = moments.find((m) => m.type === 'mobility-kill');
        expect(mobilityKill).toBeUndefined();
      });
    });

    describe('weapons-kill', () => {
      it('detects all weapons destroyed', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              name: 'Disarmed Mech',
              side: GameSide.Opponent,
              weaponIds: ['ac20', 'ml1'],
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        const events = [
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
          criticalHitEvent('target', 'la', 'ml1', 'attacker'),
        ];

        const moments = getDetector().detect(events, state);

        const weaponsKill = moments.find((m) => m.type === 'weapons-kill');
        expect(weaponsKill).toBeDefined();
        expect(weaponsKill!.tier).toBe(3);
        expect(weaponsKill!.description).toContain('Disarmed Mech');
      });

      it('does not trigger until all weapons destroyed', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              weaponIds: ['ac20', 'ml1', 'ml2'],
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        const events = [
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
          criticalHitEvent('target', 'la', 'ml1', 'attacker'),
        ];

        const moments = getDetector().detect(events, state);

        const weaponsKill = moments.find((m) => m.type === 'weapons-kill');
        expect(weaponsKill).toBeUndefined();
      });

      it('only triggers once per unit', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              weaponIds: ['ac20'],
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        const events = [
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
        ];

        const moments = getDetector().detect(events, state);

        const weaponsKills = moments.filter((m) => m.type === 'weapons-kill');
        expect(weaponsKills).toHaveLength(1);
      });
    });

    describe('rear-arc-hit', () => {
      it('detects attack from rear arc', () => {
        const state = createStandardBattleState();
        const events = [
          // Real emitters set `attackerArc` (see IAttackResolvedPayload /
          // wire-firing-arc-resolution); the detector must read that field.
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, undefined, {
            attackerArc: 'rear',
          }),
        ];

        const moments = getDetector().detect(events, state);

        const rearArc = moments.find((m) => m.type === 'rear-arc-hit');
        expect(rearArc).toBeDefined();
        expect(rearArc!.tier).toBe(3);
      });

      it('ignores front arc attacks', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, undefined, {
            attackerArc: 'front',
          }),
        ];

        const moments = getDetector().detect(events, state);

        const rearArc = moments.find((m) => m.type === 'rear-arc-hit');
        expect(rearArc).toBeUndefined();
      });

      it('ignores attacks without facing info', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true),
        ];

        const moments = getDetector().detect(events, state);

        const rearArc = moments.find((m) => m.type === 'rear-arc-hit');
        expect(rearArc).toBeUndefined();
      });
    });

    describe('overkill', () => {
      it('detects damage exceeding 2x remaining structure', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              initialArmor: { ct: 0 },
              initialStructure: { ct: 5 },
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        // Armor is 0, structure is 5, damage is 20 → 20 > 2*5 = 10 → overkill
        const events = [
          damageAppliedEvent({
            unitId: 'target',
            location: 'ct',
            damage: 20,
            armorRemaining: 0,
            structureRemaining: 0,
            options: {
              sourceUnitId: 'attacker',
              locationDestroyed: true,
            },
          }),
        ];

        const moments = getDetector().detect(events, state);

        const overkill = moments.find((m) => m.type === 'overkill');
        expect(overkill).toBeDefined();
        expect(overkill!.tier).toBe(3);
      });

      it('does not trigger for normal damage', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              initialArmor: { ct: 20 },
              initialStructure: { ct: 16 },
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        // Armor is 20, structure is 16. Damage is 10. damageToStructure = max(0, 10-20) = 0
        const events = [
          damageAppliedEvent({
            unitId: 'target',
            location: 'ct',
            damage: 10,
            armorRemaining: 10,
            structureRemaining: 16,
            options: {
              sourceUnitId: 'attacker',
            },
          }),
        ];

        const moments = getDetector().detect(events, state);

        const overkill = moments.find((m) => m.type === 'overkill');
        expect(overkill).toBeUndefined();
      });

      it('accounts for armor when calculating overkill', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              initialArmor: { ct: 5 },
              initialStructure: { ct: 10 },
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        // Armor is 5, structure is 10. Damage is 15. damageToStructure = 15-5 = 10. 10 > 2*10 = 20? No
        const events = [
          damageAppliedEvent({
            unitId: 'target',
            location: 'ct',
            damage: 15,
            armorRemaining: 0,
            structureRemaining: 0,
            options: {
              sourceUnitId: 'attacker',
              locationDestroyed: true,
            },
          }),
        ];

        const moments = getDetector().detect(events, state);

        const overkill = moments.find((m) => m.type === 'overkill');
        expect(overkill).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================
}
