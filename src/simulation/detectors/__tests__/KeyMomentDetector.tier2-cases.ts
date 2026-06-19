import {
  GameSide,
  createBattleUnit,
  createStandardBattleState,
  damageAppliedEvent,
  attackResolvedEvent,
  criticalHitEvent,
  ammoExplosionEvent,
  pilotHitEvent,
  type BattleState,
  type KeyMomentDetectorTestContext,
} from './KeyMomentDetector.test-helpers';

export function runKeyMomentTier2Tests({
  getDetector,
}: KeyMomentDetectorTestContext): void {
  describe('Tier 2 - Significant Tactical Events', () => {
    describe('head-shot', () => {
      it('detects damage to head location', () => {
        const state = createStandardBattleState();
        const events = [
          damageAppliedEvent({
            unitId: 'timberwolf',
            location: 'head',
            damage: 10,
            armorRemaining: 0,
            structureRemaining: 2,
            options: {
              sourceUnitId: 'atlas',
            },
          }),
        ];

        const moments = getDetector().detect(events, state);

        const headShot = moments.find((m) => m.type === 'head-shot');
        expect(headShot).toBeDefined();
        expect(headShot!.tier).toBe(2);
        expect(headShot!.relatedUnitIds).toContain('atlas');
        expect(headShot!.relatedUnitIds).toContain('timberwolf');
      });

      it('allows multiple head shots', () => {
        const state = createStandardBattleState();
        const events = [
          damageAppliedEvent({
            unitId: 'timberwolf',
            location: 'head',
            damage: 5,
            armorRemaining: 4,
            structureRemaining: 3,
            options: {
              sourceUnitId: 'atlas',
            },
          }),
          damageAppliedEvent({
            unitId: 'madcat',
            location: 'head',
            damage: 8,
            armorRemaining: 1,
            structureRemaining: 3,
            options: {
              sourceUnitId: 'marauder',
            },
          }),
        ];

        const moments = getDetector().detect(events, state);

        const headShots = moments.filter((m) => m.type === 'head-shot');
        expect(headShots).toHaveLength(2);
      });

      it('ignores damage to non-head locations', () => {
        const state = createStandardBattleState();
        const events = [
          damageAppliedEvent({
            unitId: 'timberwolf',
            location: 'ct',
            damage: 20,
            armorRemaining: 5,
            structureRemaining: 16,
            options: {
              sourceUnitId: 'atlas',
            },
          }),
        ];

        const moments = getDetector().detect(events, state);

        const headShot = moments.find((m) => m.type === 'head-shot');
        expect(headShot).toBeUndefined();
      });
    });

    describe('ammo-explosion', () => {
      it('detects ammo explosion event', () => {
        const state = createStandardBattleState();
        const events = [ammoExplosionEvent('timberwolf', 'lt', 20)];

        const moments = getDetector().detect(events, state);

        const ammoExp = moments.find((m) => m.type === 'ammo-explosion');
        expect(ammoExp).toBeDefined();
        expect(ammoExp!.tier).toBe(2);
        expect(ammoExp!.relatedUnitIds).toContain('timberwolf');
      });

      it('includes location and damage metadata', () => {
        const state = createStandardBattleState();
        const events = [ammoExplosionEvent('timberwolf', 'rt', 30)];

        const moments = getDetector().detect(events, state);

        const ammoExp = moments.find((m) => m.type === 'ammo-explosion');
        expect(ammoExp!.metadata?.location).toBe('rt');
        expect(ammoExp!.metadata?.damage).toBe(30);
      });
    });

    describe('pilot-kill', () => {
      it('detects consciousness check failure', () => {
        const state = createStandardBattleState();
        const events = [pilotHitEvent('timberwolf', false)];

        const moments = getDetector().detect(events, state);

        const pilotKill = moments.find((m) => m.type === 'pilot-kill');
        expect(pilotKill).toBeDefined();
        expect(pilotKill!.tier).toBe(2);
      });

      it('ignores successful consciousness checks', () => {
        const state = createStandardBattleState();
        const events = [pilotHitEvent('timberwolf', true)];

        const moments = getDetector().detect(events, state);

        const pilotKill = moments.find((m) => m.type === 'pilot-kill');
        expect(pilotKill).toBeUndefined();
      });

      it('ignores hits without consciousness check result', () => {
        const state = createStandardBattleState();
        const events = [pilotHitEvent('timberwolf', undefined)];

        const moments = getDetector().detect(events, state);

        const pilotKill = moments.find((m) => m.type === 'pilot-kill');
        expect(pilotKill).toBeUndefined();
      });
    });

    describe('critical-engine', () => {
      it('detects engine critical hit', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent('timberwolf', 'ct', 'engine', 'atlas'),
        ];

        const moments = getDetector().detect(events, state);

        const engineCrit = moments.find((m) => m.type === 'critical-engine');
        expect(engineCrit).toBeDefined();
        expect(engineCrit!.tier).toBe(2);
        expect(engineCrit!.relatedUnitIds).toContain('atlas');
        expect(engineCrit!.relatedUnitIds).toContain('timberwolf');
      });

      it('ignores non-engine criticals', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent('timberwolf', 'ct', 'heat_sink', 'atlas'),
        ];

        const moments = getDetector().detect(events, state);

        const engineCrit = moments.find((m) => m.type === 'critical-engine');
        expect(engineCrit).toBeUndefined();
      });
    });

    describe('critical-gyro', () => {
      it('detects gyro critical hit', () => {
        const state = createStandardBattleState();
        const events = [criticalHitEvent('timberwolf', 'ct', 'gyro', 'atlas')];

        const moments = getDetector().detect(events, state);

        const gyroCrit = moments.find((m) => m.type === 'critical-gyro');
        expect(gyroCrit).toBeDefined();
        expect(gyroCrit!.tier).toBe(2);
      });
    });

    describe('alpha-strike', () => {
      it('detects when unit fires all weapons in one turn', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'alpha',
              name: 'Alpha Mech',
              side: GameSide.Player,
              weaponIds: ['ac20', 'ml1', 'ml2'],
            }),
            createBattleUnit({ id: 'target', side: GameSide.Opponent }),
          ],
        };
        const events = [
          attackResolvedEvent('alpha', 'target', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml1', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml2', true, { turn: 1 }),
        ];

        const moments = getDetector().detect(events, state);

        const alphaStrike = moments.find((m) => m.type === 'alpha-strike');
        expect(alphaStrike).toBeDefined();
        expect(alphaStrike!.tier).toBe(2);
        expect(alphaStrike!.description).toContain('3 weapons');
      });

      it('does not trigger with partial weapon fire', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'alpha',
              side: GameSide.Player,
              weaponIds: ['ac20', 'ml1', 'ml2'],
            }),
            createBattleUnit({ id: 'target', side: GameSide.Opponent }),
          ],
        };
        const events = [
          attackResolvedEvent('alpha', 'target', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml1', true, { turn: 1 }),
        ];

        const moments = getDetector().detect(events, state);

        const alphaStrike = moments.find((m) => m.type === 'alpha-strike');
        expect(alphaStrike).toBeUndefined();
      });

      it('tracks weapons per turn independently', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'alpha',
              side: GameSide.Player,
              weaponIds: ['ac20', 'ml1'],
            }),
            createBattleUnit({ id: 'target', side: GameSide.Opponent }),
          ],
        };
        const events = [
          attackResolvedEvent('alpha', 'target', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml1', true, { turn: 2 }),
        ];

        const moments = getDetector().detect(events, state);

        const alphaStrike = moments.find((m) => m.type === 'alpha-strike');
        expect(alphaStrike).toBeUndefined();
      });
    });

    describe('focus-fire', () => {
      it('detects 3+ attackers on same target in one turn', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, {
            turn: 1,
          }),
          attackResolvedEvent('hunchback', 'timberwolf', 'ac20', true, {
            turn: 1,
          }),
        ];

        const moments = getDetector().detect(events, state);

        const focusFire = moments.find((m) => m.type === 'focus-fire');
        expect(focusFire).toBeDefined();
        expect(focusFire!.tier).toBe(2);
        expect(focusFire!.relatedUnitIds).toContain('timberwolf');
      });

      it('does not trigger with fewer than 3 attackers', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, {
            turn: 1,
          }),
        ];

        const moments = getDetector().detect(events, state);

        const focusFire = moments.find((m) => m.type === 'focus-fire');
        expect(focusFire).toBeUndefined();
      });

      it('only triggers once per target per turn', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, {
            turn: 1,
          }),
          attackResolvedEvent('hunchback', 'timberwolf', 'ac20', true, {
            turn: 1,
          }),
          attackResolvedEvent('atlas', 'timberwolf', 'ml1', true, { turn: 1 }),
        ];

        const moments = getDetector().detect(events, state);

        const focusFires = moments.filter((m) => m.type === 'focus-fire');
        expect(focusFires).toHaveLength(1);
      });

      it('tracks targets per turn independently', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, {
            turn: 1,
          }),
          attackResolvedEvent('hunchback', 'timberwolf', 'ac20', true, {
            turn: 2,
          }),
        ];

        const moments = getDetector().detect(events, state);

        const focusFire = moments.find((m) => m.type === 'focus-fire');
        expect(focusFire).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // Tier 3 - Notable Routine Events
  // ===========================================================================
}
