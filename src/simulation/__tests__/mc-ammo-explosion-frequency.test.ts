/**
 * Phase 6c (Monte Carlo distribution tests, Task 6.17) — empirical
 * heat-induced ammo-explosion frequency convergence.
 *
 * Spec setup: a synthetic Atlas with one explosive AC/20 ammo bin in
 * the right torso runs through `runHeatPhase` 10000 times. Each
 * iteration starts at `previousHeat = 29` so the post-dissipation
 * `newHeat = max(0, 29 + 0 - 10) = 19` lands exactly on the
 * canonical 19-22 heat band where `getAmmoExplosionTN` returns 4.
 *
 * The phase rolls 2d6 per loaded explosive bin and triggers when
 * `roll < TN` (Total Warfare canonical rule). Analytic frequency is
 * therefore P(2d6 < 4) = P(roll ∈ {2, 3}) = (1 + 2)/36 = 3/36 ≈ 0.08333.
 *
 * Per-turn the phase consumes 2 rolls for the heat 19 shutdown check
 * (TN = 6, avoidable) and 2 rolls for the ammo bin. The ammo trigger
 * remains a Bernoulli(3/36) — the shutdown rolls are independent
 * draws and don't condition the ammo result.
 *
 * Tolerance: ±3σ Bernoulli proportion margin. 3σ ≈ 0.00828 at p=3/36,
 * n=10000 — observed must land in [0.07505, 0.09161]. 3σ chosen per
 * project MEMORY anti-flake rule (2σ flakes ~3e-5 per CI run).
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/ammo-explosion-system/spec.md
 *     - "Heat-Triggered Ammo Explosion" (TN by heat band).
 *   openspec/changes/add-combat-fidelity-suite/specs/simulation-system/spec.md
 *     - "Deterministic D6 Roller Adapter for Test Pyramid".
 */

import { SeededRandom } from '@/simulation/core/SeededRandom';
import { runHeatPhase } from '@/simulation/runner/phases/postCombat';
import { DEFAULT_COMPONENT_DAMAGE } from '@/simulation/runner/SimulationRunnerConstants';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IAmmoExplosionPayload,
  IAmmoSlotState,
  IGameEvent,
  IGameState,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';

// =============================================================================
// Constants
// =============================================================================

const ITERATIONS = 10000;
// Analytic P(heat-19 ammo cookoff) per turn = P(2d6 < 4) = 3/36.
const ANALYTIC_EXPLOSION_RATE = 3 / 36;

/**
 * 3-sigma Bernoulli proportion margin.
 * 3σ = 3 * sqrt(p (1 - p) / n) ≈ 0.00828 at p=0.08333, n=10000.
 */
function threeSigmaMargin(p: number, n: number): number {
  return 3 * Math.sqrt((p * (1 - p)) / n);
}

// =============================================================================
// Fixture builder — synthetic Atlas at heat 29 with one explosive AC/20 bin
// =============================================================================

/**
 * Build a minimal Atlas-shaped unit fixture seeded for the heat-19 ammo
 * explosion test. `previousHeat = 29` yields `newHeat = 19` after the
 * 10-base-heatsink dissipation in the heat phase (per
 * `BASE_HEAT_SINKS` and `runHeatPhase`'s `newHeat = max(0, prev - dissipation)`
 * formula at zero generated heat).
 */
function buildAtlasAtHeat29(): IUnitGameState {
  const ammoState: Record<string, IAmmoSlotState> = {
    'ac-20-bin-0': {
      binId: 'ac-20-bin-0',
      weaponType: 'ac-20',
      location: 'right_torso',
      // Single round so the explosion damage payload is small (we
      // assert on event presence, not magnitude). `isExplosive: true`
      // is the gating predicate inside `runHeatPhase`'s loaded-bins
      // filter.
      remainingRounds: 5,
      maxRounds: 5,
      isExplosive: true,
    },
  };

  return {
    id: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.South,
    heat: 29, // pre-dissipation; post = 19 → ammo TN 4
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
      left_torso: 32,
      left_torso_rear: 10,
      right_torso: 32,
      right_torso_rear: 10,
      left_arm: 34,
      right_arm: 34,
      left_leg: 41,
      right_leg: 41,
    },
    structure: {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    ammoState,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
  };
}

function buildState(unit: IUnitGameState): IGameState {
  return {
    gameId: 'mc-ammo-explosion-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Heat,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Monte Carlo — heat-induced ammo explosion frequency (Task 6.17)', () => {
  it('heat-19 (TN 4) explosion rate converges to 3/36 within ±3σ over 10K turns', () => {
    let explosions = 0;

    // Each iteration uses a fresh `SeededRandom` with a unique
    // per-trial seed so individual trials are independent draws. The
    // base seed (10000) keeps the suite deterministic (run-to-run
    // stable), and per-trial seeding avoids bias from a single PRNG
    // walk hitting a long auto-correlated streak.
    for (let i = 0; i < ITERATIONS; i++) {
      const unit = buildAtlasAtHeat29();
      const state = buildState(unit);
      const events: IGameEvent[] = [];
      const random = new SeededRandom(10000 + i);

      runHeatPhase({ state, events, gameId: state.gameId, random });

      const explosion = events.find(
        (e) => e.type === GameEventType.AmmoExplosion,
      );
      if (explosion) {
        const payload = explosion.payload as IAmmoExplosionPayload;
        // `'HeatInduced'` is the PascalCase canonical source value
        // documented in the P4 notepad — the spec scenarios cite
        // `'heat_overflow'` as a narrative-language form. We assert
        // on the actual payload union per the type contract.
        expect(payload.source).toBe('HeatInduced');
        explosions += 1;
      }
    }

    const observed = explosions / ITERATIONS;
    const margin = threeSigmaMargin(ANALYTIC_EXPLOSION_RATE, ITERATIONS);

    expect(Math.abs(observed - ANALYTIC_EXPLOSION_RATE)).toBeLessThan(margin);
    // Sanity bounds: heat 19 with TN 4 is a low-probability event.
    // Floor at 1% catches catastrophic regressions where the rule
    // got wired to "always explode" or "never explode"; ceiling at
    // 20% catches the inverted-comparator regression (`> TN` vs
    // `< TN`) that would push the rate up to ~92%.
    expect(observed).toBeGreaterThan(0.01);
    expect(observed).toBeLessThan(0.2);
  });

  it('reproduces identical explosion counts when reseeded with the same base seed', () => {
    // Determinism contract: same seed-stream ⇒ same explosion count.
    const runOnce = (): number => {
      let count = 0;
      for (let i = 0; i < 1000; i++) {
        const unit = buildAtlasAtHeat29();
        const state = buildState(unit);
        const events: IGameEvent[] = [];
        const random = new SeededRandom(20000 + i);
        runHeatPhase({ state, events, gameId: state.gameId, random });
        if (events.some((e) => e.type === GameEventType.AmmoExplosion)) {
          count += 1;
        }
      }
      return count;
    };
    expect(runOnce()).toBe(runOnce());
  });

  it('does NOT emit AmmoExplosion when heat falls below the 19 threshold', () => {
    // Cross-check: at `previousHeat = 28` (post-dissipation = 18),
    // `getAmmoExplosionTN(18)` returns 0 → the ammo loop never enters
    // the per-bin trigger branch. Asserts the threshold gate works.
    const unit: IUnitGameState = { ...buildAtlasAtHeat29(), heat: 28 };
    const state = buildState(unit);
    const events: IGameEvent[] = [];
    const random = new SeededRandom(99999);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const explosion = events.find(
      (e) => e.type === GameEventType.AmmoExplosion,
    );
    expect(explosion).toBeUndefined();
  });
});
