/**
 * jsdom has no GPU or compositor, so these tests measure React/SVG work as
 * relaxed order-of-magnitude regression checks only. A future Playwright
 * tracing pass can add real-FPS gates for browser-composited animation.
 */
import { act, render } from '@testing-library/react';
import { performance } from 'node:perf_hooks';

import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { AttackEffectsLayer } from '@/components/gameplay/effects/AttackEffectsLayer';
import { PersistentEffectsLayer } from '@/components/gameplay/effects/PersistentEffectsLayer';
import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay';
import { FiringArcOverlay } from '@/components/gameplay/overlays/FiringArcOverlay';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';

const FRAME_BUDGET_MS = 40;
const perfResults = new Map<string, number>();

function measureFrameTime(work: () => void, frameCount = 60): number {
  const samples: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    const start = performance.now();
    work();
    samples.push(performance.now() - start);
  }
  // Trim warmup (first 5 frames) to reduce GC noise
  const trimmed = samples.slice(5);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

function expectBudget(name: string, avgFrameTime: number): void {
  perfResults.set(name, avgFrameTime);
  expect(avgFrameTime).toBeLessThan(FRAME_BUDGET_MS);
}

function token(
  unitId: string,
  position: IUnitToken['position'],
  overrides: Partial<IUnitToken> = {},
): IUnitToken {
  // Default to the Mech variant — discriminated union narrowing is preserved
  // when overrides supply a different unitType (cast at the boundary because
  // TS can't statically verify the merged literal matches a single variant).
  return {
    unitId,
    name: unitId,
    side: GameSide.Player,
    position,
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: unitId.toUpperCase(),
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function event(
  id: string,
  type: GameEventType,
  payload: IGameEvent['payload'],
  sequence: number,
): IGameEvent {
  return {
    id,
    gameId: 'perf-budget',
    sequence,
    timestamp: `2026-04-30T00:00:${String(sequence).padStart(2, '0')}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
  };
}

function attackEvent(index: number): IGameEvent {
  const from = { q: -14 + (index % 10), r: -10 + Math.floor(index / 10) };
  return event(
    `attack-${index}`,
    GameEventType.AttackResolved,
    {
      attackerId: `attacker-${index}`,
      targetId: `target-${index}`,
      weaponId: `medium-laser-${index}`,
      roll: 9,
      toHitNumber: 7,
      hit: true,
      from,
      to: { q: from.q + 1, r: from.r },
    } as IGameEvent['payload'],
    index + 1,
  );
}

function persistentLayer(
  tokens: readonly IUnitToken[],
  events: readonly IGameEvent[],
) {
  return (
    <svg>
      <PersistentEffectsLayer
        tokens={tokens}
        events={events}
        prefersReducedMotion={false}
      />
    </svg>
  );
}

function attackLayer(events: readonly IGameEvent[]) {
  return (
    <svg>
      <AttackEffectsLayer mapId="perf-map" events={events} tokens={[]} />
    </svg>
  );
}

function rectangularHexes(size: number) {
  return Array.from({ length: size * size }, (_, index) => ({
    q: index % size,
    r: Math.floor(index / size),
  }));
}

function firingArcLayer(hexes: readonly { q: number; r: number }[]) {
  return (
    <svg>
      <FiringArcOverlay
        unit={{
          unitId: 'arc-budget-unit',
          coord: { q: 15, r: 15 },
          facing: Facing.North,
        }}
        hexes={hexes}
        maxRange={30}
      />
    </svg>
  );
}

afterAll(() => {
  if (process.env.PRINT_PERF_BUDGETS !== '1') return;
  perfResults.forEach((avgFrameTime, name) => {
    process.stdout.write(`${name}: ${avgFrameTime.toFixed(2)}ms\n`);
  });
});

describe('Phase 7 gameplay perf budgets', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
    jest.useRealTimers();
  });

  it('keeps 4 simultaneous movement tweens under the jsdom frame budget', () => {
    const starts = Array.from({ length: 4 }, (_, index) => ({
      q: -14,
      r: -5 + index * 5,
    }));
    const tokens = starts.map((start, index) => token(`mover-${index}`, start));

    act(() => {
      starts.forEach((start, index) => {
        useAnimationQueue.getState().enqueue({
          id: `move-${index}`,
          mapId: 'perf-map',
          unitId: `mover-${index}`,
          kind: 'movement',
          path: Array.from({ length: 6 }, (_, step) => ({
            q: start.q + step,
            r: start.r,
          })),
          mode: MovementType.Walk,
        });
      });
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="perf-map"
        radius={15}
        tokens={tokens}
        selectedHex={null}
      />,
    );
    const avgFrameTime = measureFrameTime(() => {
      act(() => {
        jest.advanceTimersByTime(16);
      });
    });

    unmount();
    expectBudget('movement', avgFrameTime);
  });

  it('keeps 20 persistent damage effects under the jsdom frame budget', () => {
    const tokens = Array.from({ length: 20 }, (_, index) =>
      token(`damage-${index}`, { q: -5 + index, r: index % 2 }),
    );
    const events = tokens.map((unitToken, index) =>
      event(
        `location-destroyed-${index}`,
        GameEventType.LocationDestroyed,
        {
          unitId: unitToken.unitId,
          location: index % 2 === 0 ? 'left_arm' : 'right_leg',
        },
        index + 1,
      ),
    );
    const { rerender, unmount } = render(persistentLayer(tokens, events));
    const avgFrameTime = measureFrameTime(() => {
      act(() => {
        rerender(persistentLayer([...tokens], [...events]));
      });
    });

    unmount();
    expectBudget('damage', avgFrameTime);
  });

  it('keeps 30 attack effects under the jsdom frame budget', () => {
    const events = Array.from({ length: 30 }, (_, index) => attackEvent(index));
    const { rerender, unmount } = render(attackLayer(events));
    const avgFrameTime = measureFrameTime(() => {
      act(() => {
        rerender(attackLayer([...events]));
      });
    });

    unmount();
    expectBudget('attack', avgFrameTime);
  });

  it('keeps firing arc overlay work on a 30x30 map under the jsdom frame budget', () => {
    const hexes = rectangularHexes(30);
    const { rerender, unmount } = render(firingArcLayer(hexes));
    const avgFrameTime = measureFrameTime(() => {
      act(() => {
        rerender(firingArcLayer([...hexes]));
      });
    });

    unmount();
    expectBudget('firing-arc-30x30', avgFrameTime);
  });
});
