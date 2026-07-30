import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import type { IPhaseQueueProjection } from '@/hooks/gameplay';
import type { IGameUnit, IUnitGameState } from '@/types/gameplay';

import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import { GamePhase, GameSide } from '@/types/gameplay';

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
const projection = (activeUnitId: string | null): IPhaseQueueProjection => ({
  round: 2,
  phase: GamePhase.Movement,
  activeSide: GameSide.Player,
  activeUnitId,
  initiativeOrder: GAME_UNITS.map((unit) => unit.id),
  unresolvedUnits: ['allied-live', 'opposing-live'],
  blockers: [],
});

function renderRail(
  activeUnitId: string | null = 'allied-live',
  shellMode: 'combat' | 'gm' = 'combat',
  playerSide: GameSide = GameSide.Player,
): void {
  render(
    <TacticalTurnRail
      projection={projection(activeUnitId)}
      gameUnits={GAME_UNITS}
      unitStates={UNIT_STATES}
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
    renderRail('allied-live', 'combat', GameSide.Opponent);
    expect(screen.getAllByText(/^(Allied|Opposing) Force$/)).toHaveLength(2);
    expect(byId('rail-force-allied-list')).toHaveTextContent('Marauder');
    expect(byId('rail-force-opposing-list')).toHaveTextContent('Atlas');
    expect(byId('rail-force-allied').dataset).toMatchObject({
      operationalCount: '1',
      withdrawnCount: '1',
    });
    expect(byId('rail-force-opposing').dataset.eliminatedCount).toBe('1');
  });

  it('shows terminal labels without marking a terminal cursor current', () => {
    renderRail('allied-destroyed');
    expect(byId('rail-unit-allied-destroyed')).toHaveTextContent('Eliminated');
    expect(byId('rail-unit-opposing-withdrawn')).toHaveTextContent('Withdrawn');
    expect(screen.queryByRole('button', { current: true })).toBeNull();
  });

  it('uses fixed force labels outside player combat mode', () => {
    renderRail('allied-live', 'gm', GameSide.Opponent);
    expect(screen.getAllByText(/^(Player|Opponent) Force$/)).toHaveLength(2);
  });
});
