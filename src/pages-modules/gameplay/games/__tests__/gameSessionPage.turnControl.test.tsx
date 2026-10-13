import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serialize, deserialize } from 'node:v8';

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { GameplayLayout } from '@/components/gameplay/GameplayLayout';
import savedWarhammer from '@/engine/__tests__/fixtures/warhammer-night-watch.json';
import {
  adaptUnit,
  adaptUnitFromData,
} from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import {
  matchLogStorage,
  flushMatchLogWrites,
} from '@/lib/p2p/matchLogStorage';
import GameSessionPage from '@/pages/gameplay/games/[id]';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { InteractivePhase } from '@/stores/useGameplayStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GamePhase, GameSide, LockState } from '@/types/gameplay';

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T,>(value: T): T => deserialize(serialize(value)),
    configurable: true,
  });
}

const mockRouter = {
  query: { id: 'turn-control-session' },
  asPath: '/gameplay/games/turn-control-session',
  push: jest.fn(),
  replace: jest.fn(),
};
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock(
  '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle',
  () => ({
    ...jest.requireActual(
      '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle',
    ),
    useGameSessionLifecycle: jest.fn(),
  }),
);
jest.mock('@/hooks/useP2PCommandGate', () => ({
  useP2PCommandGate: () => undefined,
}));

function canonical(id: string) {
  const index = JSON.parse(
    readFileSync(resolve('public/data/units/battlemechs/index.json'), 'utf8'),
  );
  const entry = index.units.find((unit: { id: string }) => unit.id === id);
  return JSON.parse(
    readFileSync(resolve('public/data/units/battlemechs', entry.path), 'utf8'),
  ) as IFullUnit;
}

async function createBattle() {
  const customId = 'custom-26f25bc8-3b24-479b-9afe-37ac493c82bb';
  const adapted = await adaptUnit(
    customId,
    { side: GameSide.Player },
    async (id) => ({ ...savedWarhammer, id }),
  );
  if (!adapted) throw new Error('Saved Warhammer did not adapt');
  expect(adapted.customUnitDefinition?.id).toBe(customId);
  const player = { ...adapted, id: 'warhammer', side: GameSide.Player };
  const opponents = ['stinger-stg-3r', 'shadow-hawk-shd-2h'].map((id) => ({
    ...adaptUnitFromData(canonical(id), { side: GameSide.Opponent }),
    id,
    side: GameSide.Opponent,
  }));
  const units = [player, ...opponents].map((unit) => ({
    id: unit.id,
    name: unit.id,
    unitRef: unit.side === GameSide.Player ? customId : unit.id,
    side: unit.side,
    pilotRef: 'regular',
    gunnery: 4,
    piloting: 5,
  }));
  const battle = new GameEngine({
    seed: 2,
    turnLimit: 0,
    mapRadius: 7,
  }).createInteractiveSession([player], opponents, units);
  battle.advancePhase();
  expect(battle.getState().phase).toBe(GamePhase.Movement);
  expect(battle.getState().firstMover).toBe(GameSide.Opponent);
  expect(player.walkMP).toBe(4);
  expect(
    Object.values(player.armor).reduce((total, amount) => total + amount, 0),
  ).toBe(176);
  return battle;
}

beforeEach(() => {
  matchLogStorage.close();
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    configurable: true,
    writable: true,
  });
});

afterEach(async () => {
  cleanup();
  await flushMatchLogWrites();
  useGameplayStore.getState().reset();
  useAnimationQueue.getState().reset();
  matchLogStorage.close();
});

it('enables the saved Warhammer after one opponent activates in an opponent-first 1v2 battle', async () => {
  const battle = await createBattle();
  useGameplayStore.getState().setInteractiveSession(battle);
  useGameplayStore.getState().selectUnit('warhammer');
  render(<GameSessionPage />);

  await waitFor(() => expect(battle.getState().activationIndex).toBe(1));
  expect(battle.getState().firstMover).toBe(GameSide.Opponent);
  expect(battle.getState().units['stinger-stg-3r'].lockState).toBe(
    LockState.Locked,
  );
  expect(battle.getState().units['shadow-hawk-shd-2h'].lockState).toBe(
    LockState.Pending,
  );
  expect(screen.getByTestId('rail-unit-warhammer')).toHaveAttribute(
    'aria-current',
    'true',
  );
  expect(screen.queryAllByText('Not your turn.')).toHaveLength(0);
  fireEvent.click(screen.getByTestId('hex--2-4'));
  fireEvent.click(screen.getByTestId('budget-option-walk'));
  expect(screen.getByTestId('budget-option-walk')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByTestId('movement-lock-in-btn')).toBeEnabled();
  fireEvent.click(screen.getByTestId('movement-lock-in-btn'));
  await waitFor(() => expect(battle.getState().activationIndex).toBe(3));
  expect(battle.getState().units.warhammer.position).toEqual({ q: -2, r: 4 });
  expect(battle.getState().units['shadow-hawk-shd-2h'].lockState).not.toBe(
    LockState.Pending,
  );
  expect(battle.getState().firstMover).toBe(GameSide.Opponent);
  expect(screen.queryAllByText('Not your turn.')).toHaveLength(0);
  expect(screen.getByTestId('sp-advance-phase-button')).toBeEnabled();
});

it.each([GamePhase.Heat, GamePhase.End])(
  'retains local phase controls during %s after an opponent-first initiative',
  async (targetPhase) => {
    const battle = await createBattle();
    for (
      let index = 0;
      index < 4 && battle.getState().phase !== targetPhase;
      index++
    ) {
      battle.advancePhase();
    }
    expect(battle.getState().phase).toBe(targetPhase);
    expect(battle.getState().firstMover).toBe(GameSide.Opponent);
    useGameplayStore.getState().setInteractiveSession(battle);
    useGameplayStore.getState().selectUnit('warhammer');
    render(<GameSessionPage />);
    expect(screen.queryAllByText('Not your turn.')).toHaveLength(0);
    expect(screen.getByTestId('sp-advance-phase-button')).toBeEnabled();
  },
);

it('advances a completed physical activation queue to Heat after confirmation', async () => {
  const battle = await createBattle();
  battle.advancePhase();
  battle.advancePhase();
  expect(battle.getState().phase).toBe(GamePhase.PhysicalAttack);
  useGameplayStore.getState().setInteractiveSession(battle);
  useGameplayStore.getState().selectUnit('warhammer');
  render(<GameSessionPage />);
  await waitFor(() => expect(battle.getState().activationIndex).toBe(1));
  expect(screen.getByTestId('sp-advance-phase-button')).toBeDisabled();
  fireEvent.click(screen.getByTestId('physical-attack-skip-button'));
  await waitFor(() => expect(battle.getState().activationIndex).toBe(3));
  expect(screen.getByTestId('sp-advance-phase-button')).toBeEnabled();
  fireEvent.click(screen.getByTestId('sp-advance-phase-button'));
  expect(screen.getByRole('dialog', { name: 'End Phase?' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm End Phase' }));
  expect(battle.getState().phase).toBe(GamePhase.Heat);
  expect(screen.queryByTestId('physical-attack-panel')).not.toBeInTheDocument();
});

it('uses the composer forecast without a separate placeholder hit-chance card', async () => {
  const battle = await createBattle();
  battle.advancePhase();
  useGameplayStore.getState().setInteractiveSession(battle);
  useGameplayStore.getState().selectUnit('warhammer');
  render(<GameSessionPage />);
  act(() => useGameplayStore.getState().selectAttackTarget('stinger-stg-3r'));
  expect(screen.queryByTestId('hit-chance-panel')).not.toBeInTheDocument();
});

it('retains the legacy hit-chance card using the authoritative target projection', async () => {
  const battle = await createBattle();
  battle.advancePhase();
  useGameplayStore.getState().setInteractiveSession(battle);
  useGameplayStore.getState().selectUnit('warhammer');
  useGameplayStore.getState().selectAttackTarget('stinger-stg-3r');
  const store = useGameplayStore.getState();
  render(
    <GameplayLayout
      session={battle.getSession()}
      selectedUnitId="warhammer"
      onUnitSelect={() => {}}
      onAction={() => {}}
      isPlayerTurn={false}
      unitWeapons={store.unitWeapons}
      interactiveSession={battle}
      interactivePhase={InteractivePhase.SelectWeapons}
      hitChance={58}
    />,
  );
  expect(screen.getByTestId('hit-chance-panel')).toHaveTextContent('72%');
});
