import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import type React from 'react';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';

import type { IAdaptedUnit } from '@/engine/types';
import type { IWeapon } from '@/simulation/ai/types';

jest.mock('@/engine/adapters/CompendiumAdapter', () => {
  const mockAdaptUnit = jest.fn();
  return {
    adaptUnit: mockAdaptUnit,
    __mockAdaptUnit: mockAdaptUnit,
  };
});

import { ConcedeButton } from '@/components/gameplay/ConcedeButton';
import { GameplayLayout } from '@/components/gameplay/GameplayLayout';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  flushMatchLogWrites,
  matchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import { useGameSessionCallbacks } from '@/pages-modules/gameplay/games/gameSessionPage.helpers';
import { useGmTacticalInterventionSurface } from '@/pages-modules/gameplay/games/gmTacticalInterventionSurface';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  useGameplaySelector,
  useGameplayStore,
} from '@/stores/useGameplayStore';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { derivePostBattleReport } from '@/utils/gameplay/postBattleReport';

const adapterModule = jest.requireMock(
  '@/engine/adapters/CompendiumAdapter',
) as {
  __mockAdaptUnit: jest.Mock;
};
const mockAdaptUnit = adapterModule.__mockAdaptUnit;

const MAP_RADIUS = 7;

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: -2, r: 5 } : { q: 2, r: -5 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: 20,
    heatSinkType: 'single',
    armor: { center_torso: 31 },
    structure: { center_torso: 21 },
    startingInternalStructure: { center_torso: 21 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    tonnage: 65,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function makeGameUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'atlas-as7-d',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'marauder-mad-3r',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeInteractiveSession(): InteractiveSession {
  return new InteractiveSession(
    MAP_RADIUS,
    30,
    new SeededRandom(42),
    createMinimalGrid(MAP_RADIUS),
    [makeAdaptedUnit('atlas-as7-d', GameSide.Player)],
    [makeAdaptedUnit('marauder-mad-3r', GameSide.Opponent)],
    makeGameUnits(),
  );
}

function installFreshIndexedDB(): void {
  matchLogStorage.close();
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
}

async function persistSessionLog(session: IGameSession): Promise<void> {
  const writes = session.events.map((event) =>
    matchLogStorage.appendEvent(session.id, event),
  );
  await flushMatchLogWrites();
  await Promise.all(writes);
}

function StoreBackedGameplayLayout({
  shellMode = 'combat',
}: {
  readonly shellMode?: 'combat' | 'gm';
}): React.ReactElement | null {
  const session = useGameplaySelector((state) => state.session);
  const selectedUnitId = useGameplaySelector(
    (state) => state.ui.selectedUnitId,
  );
  const selectUnit = useGameplaySelector((state) => state.selectUnit);
  const setSession = useGameplaySelector((state) => state.setSession);
  const interactiveSession = useGameplaySelector(
    (state) => state.interactiveSession,
  );
  const interactivePhase = useGameplaySelector(
    (state) => state.interactivePhase,
  );
  const unitWeapons = useGameplaySelector((state) => state.unitWeapons);
  const maxArmor = useGameplaySelector((state) => state.maxArmor);
  const maxStructure = useGameplaySelector((state) => state.maxStructure);
  const pilotNames = useGameplaySelector((state) => state.pilotNames);
  const heatSinks = useGameplaySelector((state) => state.heatSinks);
  const unitSpas = useGameplaySelector((state) => state.unitSpas);
  const gmIntervention = useGmTacticalInterventionSurface({
    enabled: shellMode === 'gm',
    session,
    interactiveSession,
    setSession,
  });
  const { handleInteractiveAction } = useGameSessionCallbacks({
    ...useGameplayStore.getState(),
    routeId: session?.id ?? null,
    isInteractive: Boolean(interactiveSession),
    phase: session?.currentState.phase,
    selectedUnitId,
    session,
  });

  if (!session) return null;

  return (
    <GameplayLayout
      session={session}
      selectedUnitId={selectedUnitId}
      onUnitSelect={selectUnit}
      onAction={handleInteractiveAction}
      isPlayerTurn={true}
      unitWeapons={unitWeapons}
      maxArmor={maxArmor}
      maxStructure={maxStructure}
      pilotNames={pilotNames}
      heatSinks={heatSinks}
      unitSpas={unitSpas}
      interactivePhase={interactivePhase}
      interactiveSession={interactiveSession ?? undefined}
      playerSide={GameSide.Player}
      shellMode={shellMode}
      gmIntervention={gmIntervention}
    />
  );
}

function renderAdoptedSession(
  interactiveSession: InteractiveSession,
  shellMode: 'combat' | 'gm' = 'combat',
): ReturnType<typeof render> {
  useGameplayStore.getState().setInteractiveSession(interactiveSession);
  return render(<StoreBackedGameplayLayout shellMode={shellMode} />);
}

function clickSinglePlayerAdvance(): void {
  fireEvent.click(screen.getByTestId('sp-advance-phase-button'));
}

describe('fix-battle-phase-progression Task Group 2', () => {
  beforeEach(() => {
    mockAdaptUnit.mockImplementation(
      (unitRef: string, options: { side?: GameSide } = {}) =>
        makeAdaptedUnit(unitRef, options.side ?? GameSide.Player),
    );
    installFreshIndexedDB();
    useGameplayStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    useGameplayStore.getState().reset();
    matchLogStorage.close();
    jest.restoreAllMocks();
  });

  it.each([
    [GameSide.Player, GameSide.Opponent],
    [GameSide.Opponent, GameSide.Player],
  ])(
    'adopts the terminal concession before navigation for %s',
    async (side, winner) => {
      const nativeConfirm = jest.spyOn(window, 'confirm');
      const battle = makeInteractiveSession();
      useGameplayStore.getState().setInteractiveSession(battle);
      const before = battle.getSession();
      await persistSessionLog(before);
      const navigationSnapshots: IGameSession[] = [];
      const navigate = jest.fn(() => {
        const snapshot = useGameplayStore.getState().session;
        if (snapshot) navigationSnapshots.push(snapshot);
      });
      render(
        <ConcedeButton
          interactiveSession={battle}
          sessionId={before.id}
          playerSide={side}
          onNavigate={navigate}
        />,
      );

      fireEvent.click(screen.getByTestId('concede-button'));
      fireEvent.click(screen.getByTestId('concede-cancel'));
      expect(battle.getSession()).toBe(before);
      expect(useGameplayStore.getState().session).toBe(before);
      expect(navigationSnapshots).toHaveLength(0);

      fireEvent.click(screen.getByTestId('concede-button'));
      fireEvent.click(screen.getByTestId('concede-confirm'));

      expect(navigationSnapshots).toHaveLength(1);
      const completed = navigationSnapshots[0];
      if (!completed)
        throw new Error('expected the navigated session snapshot');
      expect(completed.currentState.status).toBe(GameStatus.Completed);
      expect(completed.currentState.result).toEqual({
        winner,
        reason: 'concede',
      });
      expect(completed.events.slice(0, before.events.length)).toEqual(
        before.events,
      );
      expect(
        completed.events.filter(
          (event) => event.type === GameEventType.GameEnded,
        ),
      ).toHaveLength(1);
      expect(derivePostBattleReport(completed)).toMatchObject({
        winner,
        reason: 'concede',
      });
      expect(navigate).toHaveBeenCalledWith(
        `/gameplay/games/${before.id}/victory`,
      );

      await flushMatchLogWrites();
      const persisted = await matchLogStorage.getEventsForMatch(before.id);
      const recovered = hydrateGameSessionFromEvents(before.id, persisted);
      expect(recovered.currentState.result).toEqual({
        winner,
        reason: 'concede',
      });
      expect(recovered.events).toEqual(completed.events);
      expect(nativeConfirm).not.toHaveBeenCalled();
    },
  );

  it('adopts polled completion before navigation through the same store owner', () => {
    const pendingFrames: FrameRequestCallback[] = [];
    const frames = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        pendingFrames.push(callback);
        return pendingFrames.length;
      });
    const battle = makeInteractiveSession();
    useGameplayStore.getState().setInteractiveSession(battle);
    const navigationSnapshots: IGameSession[] = [];
    render(
      <ConcedeButton
        interactiveSession={battle}
        sessionId={battle.getSession().id}
        playerSide={GameSide.Player}
        onNavigate={() => {
          const snapshot = useGameplayStore.getState().session;
          if (snapshot) navigationSnapshots.push(snapshot);
        }}
      />,
    );
    const before = battle.getSession();
    act(() => {
      battle.concede(GameSide.Opponent);
      for (const callback of [...pendingFrames]) callback(0);
    });
    expect(navigationSnapshots).toHaveLength(1);
    expect(navigationSnapshots[0]?.currentState.result).toEqual({
      winner: GameSide.Player,
      reason: 'concede',
    });
    expect(
      navigationSnapshots[0]?.events.slice(0, before.events.length),
    ).toEqual(before.events);
    frames.mockRestore();
  });

  it('refuses a stale concession component after another match owns the store', () => {
    const battle = makeInteractiveSession();
    useGameplayStore.getState().setInteractiveSession(battle);
    const navigate = jest.fn();
    render(
      <ConcedeButton
        interactiveSession={battle}
        sessionId={battle.getSession().id}
        playerSide={GameSide.Player}
        onNavigate={navigate}
      />,
    );
    fireEvent.click(screen.getByTestId('concede-button'));
    const other = makeInteractiveSession();
    act(() => useGameplayStore.getState().setInteractiveSession(other));
    const owned = useGameplayStore.getState().session;
    const before = battle.getSession();
    fireEvent.click(screen.getByTestId('concede-confirm'));
    expect(useGameplayStore.getState().session).toBe(owned);
    expect(battle.getSession()).toBe(before);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('advances a fresh Initiative session to Movement through the rail control', () => {
    const interactiveSession = makeInteractiveSession();
    renderAdoptedSession(interactiveSession);

    const advance = screen.getByTestId('sp-advance-phase-button');
    expect(screen.getByTestId('phase-name')).toHaveTextContent('Initiative');
    expect(advance).toBeEnabled();
    expect(advance).toHaveTextContent('Roll Initiative & Begin');

    clickSinglePlayerAdvance();

    const advanced = useGameplayStore.getState().session;
    expect(advanced?.currentState.phase).toBe(GamePhase.Movement);
    expect(advanced?.currentState.initiativeWinner).toBeDefined();
    expect(advanced?.currentState.firstMover).toBeDefined();
    expect(screen.getByTestId('phase-name')).toHaveTextContent('Movement');
    expect(screen.getByTestId('tactical-turn-rail')).toHaveClass(
      'bg-green-700',
    );
    expect(screen.getByTestId('rail-unit-atlas-as7-d')).toBeInTheDocument();
    expect(screen.getByTestId('rail-unit-marauder-mad-3r')).toBeInTheDocument();
    const movementAdvance = screen.getByTestId('sp-advance-phase-button');
    expect(movementAdvance).toBeDisabled();
    expect(movementAdvance).toHaveTextContent('End Phase');
    expect(
      screen.getByTestId('sp-advance-phase-button-reasons'),
    ).toHaveTextContent('movement');

    expect(() =>
      interactiveSession.applyMovement(
        'atlas-as7-d',
        { q: -2, r: 4 },
        Facing.North,
        MovementType.Walk,
        [
          { q: -2, r: 5 },
          { q: -2, r: 4 },
        ],
      ),
    ).not.toThrow();
  });

  it('advances completed movement into the weapon phase after rail confirmation', () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const interactiveSession = makeInteractiveSession();
    renderAdoptedSession(interactiveSession);
    clickSinglePlayerAdvance();

    act(() => {
      interactiveSession.runAITurn(GameSide.Opponent);
      interactiveSession.applyMovement(
        'atlas-as7-d',
        { q: -2, r: 4 },
        Facing.North,
        MovementType.Walk,
        [
          { q: -2, r: 5 },
          { q: -2, r: 4 },
        ],
      );
      useGameplayStore.getState().setSession(interactiveSession.getSession());
    });
    expect(screen.getByTestId('sp-advance-phase-button')).toBeEnabled();

    clickSinglePlayerAdvance();

    expect(screen.getByRole('dialog', { name: 'End Phase?' })).toBeVisible();
    expect(interactiveSession.getState().phase).toBe(GamePhase.Movement);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'End Phase?' })).getByRole(
        'button',
        { name: 'Cancel' },
      ),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(interactiveSession.getState().phase).toBe(GamePhase.Movement);

    clickSinglePlayerAdvance();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm End Phase' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(interactiveSession.getState().phase).toBe(GamePhase.WeaponAttack);
    expect(screen.getByTestId('phase-name')).toHaveTextContent('Weapon');
    confirm.mockRestore();
  });

  it('preserves Movement phase after reload through the recovery path', async () => {
    const interactiveSession = makeInteractiveSession();
    renderAdoptedSession(interactiveSession);

    clickSinglePlayerAdvance();

    const advancedSession = useGameplayStore.getState().session;
    expect(advancedSession?.currentState.phase).toBe(GamePhase.Movement);
    if (!advancedSession) throw new Error('expected an advanced session');
    await persistSessionLog(advancedSession);

    cleanup();
    useGameplayStore.getState().reset();
    await useGameplayStore.getState().loadSession(advancedSession.id);

    const recovered = useGameplayStore.getState();
    expect(recovered.error).toBeNull();
    expect(recovered.session?.currentState.phase).toBe(GamePhase.Movement);
    expect(recovered.interactiveSession?.getState().phase).toBe(
      GamePhase.Movement,
    );
  });

  it('approves GM phase advance into the live engine before player movement', () => {
    const interactiveSession = makeInteractiveSession();
    renderAdoptedSession(interactiveSession, 'gm');

    expect(interactiveSession.getState().phase).toBe(GamePhase.Initiative);
    fireEvent.click(screen.getByTestId('command-btn-gm.advance-phase'));

    expect(screen.getByTestId('gm-intervention-confirmation')).toBeVisible();
    fireEvent.click(screen.getByTestId('gm-intervention-approve'));

    expect(
      screen.queryByTestId('gm-intervention-confirmation'),
    ).not.toBeInTheDocument();
    expect(interactiveSession.getState().phase).toBe(GamePhase.Movement);
    expect(useGameplayStore.getState().session?.currentState.phase).toBe(
      GamePhase.Movement,
    );
    expect(screen.getByTestId('phase-name')).toHaveTextContent('Movement');

    const phaseChanges = interactiveSession
      .getSession()
      .events.filter((event) => event.type === GameEventType.PhaseChanged);
    expect(phaseChanges).toHaveLength(1);
    expect(phaseChanges[0]?.payload).toMatchObject({
      fromPhase: GamePhase.Initiative,
      toPhase: GamePhase.Movement,
    });

    expect(() =>
      interactiveSession.applyMovement(
        'atlas-as7-d',
        { q: -2, r: 4 },
        Facing.North,
        MovementType.Walk,
        [
          { q: -2, r: 5 },
          { q: -2, r: 4 },
        ],
      ),
    ).not.toThrow();
  });
});
