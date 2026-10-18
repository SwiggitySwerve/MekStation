import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

import type { IPhaseQueueProjection } from '@/hooks/gameplay';
import type { IGameUnit, IUnitGameState } from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import { GamePhase, GameSide, LockState } from '@/types/gameplay';

import { TacticalTurnRail } from '../TacticalTurnRail';

const byId = (id: string): HTMLElement => screen.getByTestId(id);
const unit = (id: string, name: string, side: GameSide): IGameUnit =>
  ({ id, name, side, unitRef: id }) as IGameUnit;
const state = (
  id: string,
  side: GameSide,
  terminal: Partial<IUnitGameState> = {},
): IUnitGameState => ({
  ...createMinimalUnitState(id, side, { q: 0, r: 0 }),
  ...terminal,
});
const GAME_UNITS = [
  unit('allied-live', 'Atlas', GameSide.Player),
  unit('opposing-live', 'Marauder', GameSide.Opponent),
  unit('allied-destroyed', 'Centurion', GameSide.Player),
  unit('opposing-withdrawn', 'Locust', GameSide.Opponent),
];
const UNIT_STATES = {
  'allied-live': state('allied-live', GameSide.Player),
  'allied-destroyed': state('allied-destroyed', GameSide.Player, {
    destroyed: true,
  }),
  'opposing-live': state('opposing-live', GameSide.Opponent),
  'opposing-withdrawn': state('opposing-withdrawn', GameSide.Opponent, {
    hasRetreated: true,
  }),
};
const projection = (
  activeUnitId: string | null,
  gameUnits: readonly IGameUnit[],
): IPhaseQueueProjection => ({
  round: 2,
  phase: GamePhase.Movement,
  activeSide: GameSide.Player,
  activeUnitId,
  initiativeOrder: gameUnits.map((gameUnit) => gameUnit.id),
  unresolvedUnits: ['allied-live', 'opposing-live'],
  blockers: [],
});

interface RailFixtureOptions {
  readonly activeUnitId?: string | null;
  readonly shellMode?: ShellMode;
  readonly playerSide?: GameSide;
  readonly gameUnits?: readonly IGameUnit[];
  readonly unitStates?: Record<string, IUnitGameState>;
}

function renderRail({
  activeUnitId = 'allied-live',
  shellMode = 'combat',
  playerSide = GameSide.Player,
  gameUnits = GAME_UNITS,
  unitStates = UNIT_STATES,
}: RailFixtureOptions = {}): void {
  render(
    <TacticalTurnRail
      projection={projection(activeUnitId, gameUnits)}
      gameUnits={gameUnits}
      unitStates={unitStates}
      shellMode={shellMode}
      playerSide={playerSide}
      turn={2}
      phase={GamePhase.Movement}
      selectedUnitId={null}
      onUnitSelect={jest.fn()}
    />,
  );
}

describe('TacticalTurnRail force framing', () => {
  it('groups viewer-relative forces with operational and terminal counts', () => {
    renderRail({ playerSide: GameSide.Opponent });
    expect(screen.getAllByText(/^(Allied|Opposing) Force$/)).toHaveLength(2);
    expect(byId('rail-force-allied-list')).toHaveTextContent('Marauder');
    expect(byId('rail-force-opposing-list')).toHaveTextContent('Atlas');
    expect(byId('rail-force-allied').dataset).toMatchObject({
      operationalCount: '1',
      withdrawnCount: '1',
    });
    expect(byId('rail-force-opposing').dataset.eliminatedCount).toBe('1');
    expect(
      screen.getByRole('region', { name: 'Allied Force' }),
    ).toHaveTextContent('1 operational');
    expect(
      screen.getByRole('region', { name: 'Allied Force' }),
    ).toHaveTextContent('1 withdrawn');
    expect(screen.getByRole('list', { name: 'Allied Force' })).toBeVisible();
    expect(screen.getByRole('list', { name: 'Opposing Force' })).toBeVisible();
  });

  it('shows terminal labels without marking a terminal cursor current', () => {
    renderRail({ activeUnitId: 'allied-destroyed' });
    const eliminated = byId('rail-unit-allied-destroyed');
    expect(eliminated).toHaveTextContent('Eliminated');
    expect(within(eliminated).getByText('Centurion')).toHaveClass(
      'line-through',
    );
    expect(within(eliminated).getByText('Eliminated')).not.toHaveClass(
      'line-through',
    );
    expect(byId('rail-unit-opposing-withdrawn')).toHaveTextContent('Withdrawn');
    expect(screen.queryByRole('button', { current: true })).toBeNull();
  });

  it('marks exactly one live active unit as current', () => {
    renderRail();
    expect(screen.getAllByRole('button', { current: true })).toEqual([
      byId('rail-unit-allied-live'),
    ]);
  });

  it.each([
    ['allied-live', LockState.Pending],
    ['opposing-live', LockState.Pending],
    ['allied-live', LockState.Resolved],
  ])(
    'shows an ejected unit as skipped with cursor %s and lock %s',
    (activeUnitId, lockState) => {
      renderRail({
        activeUnitId,
        unitStates: {
          ...UNIT_STATES,
          'allied-live': state('allied-live', GameSide.Player, {
            hasEjected: true,
            lockState,
          }),
        },
      });

      const ejected = byId('rail-unit-allied-live');
      expect(ejected).toHaveAttribute('data-status', 'skipped');
      expect(ejected).toHaveAccessibleName('Atlas — Skipped');
      expect(ejected).not.toHaveAttribute('aria-current');
      expect(ejected).not.toHaveClass('animate-pulse');
    },
  );

  it.each(['gm', 'replay', 'spectator'] as const)(
    'uses fixed force labels in %s mode',
    (shellMode) => {
      renderRail({ shellMode, playerSide: GameSide.Opponent });
      expect(screen.getAllByText(/^(Player|Opponent) Force$/)).toHaveLength(2);
      expect(
        screen.getByRole('region', { name: 'Player Force' }),
      ).toBeVisible();
      expect(
        screen.getByRole('list', { name: 'Opponent Force' }),
      ).toBeVisible();
    },
  );

  it('keeps missing-side units visible in an Unassigned group', () => {
    const gameUnit = unit(
      'unassigned-live',
      'Unknown Contact',
      GameSide.Player,
    );
    const unitState = state('unassigned-live', GameSide.Player);
    Reflect.deleteProperty(gameUnit, 'side');
    Reflect.deleteProperty(unitState, 'side');

    renderRail({
      activeUnitId: 'unassigned-live',
      gameUnits: [...GAME_UNITS, gameUnit],
      unitStates: { ...UNIT_STATES, 'unassigned-live': unitState },
    });

    expect(
      screen.getByRole('region', { name: 'Unassigned' }),
    ).toHaveTextContent('Unknown Contact');
    expect(screen.getByRole('list', { name: 'Unassigned' })).toBeVisible();
    expect(byId('rail-unit-unassigned-live')).toHaveAttribute(
      'data-side',
      'unassigned',
    );
    expect(screen.getAllByRole('button', { current: true })).toEqual([
      byId('rail-unit-unassigned-live'),
    ]);
  });
});

describe('TacticalTurnRail activation-eligible prone units (V211-03)', () => {
  // A fallen (prone) 'Mech still owes its phase action — it may attempt to
  // stand — so the rail must never label it Skipped. Only units that cannot
  // act (shut down / unconscious pilot) are skipped, mirroring the engine's
  // `isPhaseActivationEligible` gate.
  const withAllied = (patch: Partial<IUnitGameState>) => ({
    ...UNIT_STATES,
    'allied-live': state('allied-live', GameSide.Player, patch),
  });

  it('keeps a prone active unit active and prompts a stand attempt', () => {
    renderRail({ unitStates: withAllied({ prone: true }) });
    const token = byId('rail-unit-allied-live');
    expect(token).toHaveAttribute('data-status', 'active');
    expect(token).toHaveAttribute('aria-current', 'true');
    expect(token).toHaveTextContent('Prone');
  });

  it('shows a prone unit that has not activated yet as upcoming', () => {
    renderRail({
      activeUnitId: 'opposing-live',
      unitStates: withAllied({ prone: true }),
    });
    expect(byId('rail-unit-allied-live')).toHaveAttribute(
      'data-status',
      'upcoming',
    );
  });

  it.each([
    ['shut down', { shutdown: true }],
    ['unconscious', { pilotConscious: false }],
  ] as const)('still skips a %s unit', (_label, patch) => {
    renderRail({ unitStates: withAllied({ prone: true, ...patch }) });
    expect(byId('rail-unit-allied-live')).toHaveAttribute(
      'data-status',
      'skipped',
    );
  });
});
