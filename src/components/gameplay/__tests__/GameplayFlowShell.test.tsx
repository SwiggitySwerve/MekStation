import { render, screen, within } from '@testing-library/react';

import GameplayHubPage from '@/pages/gameplay';
import { GAMEPLAY_UI_FLOW_SHELL } from '@/qc/gameplayUiFlowShell';

import { GameplayFlowShell } from '../GameplayFlowShell';

describe('GameplayFlowShell', () => {
  it('renders every required journey-backed flow', () => {
    render(<GameplayFlowShell />);

    for (const journeyId of GAMEPLAY_UI_FLOW_SHELL.requiredJourneyIds) {
      expect(
        screen.getByTestId(`gameplay-flow-row-${journeyId}`),
      ).toBeInTheDocument();
    }
  });

  it('preserves contract campaign route checkpoint order', () => {
    render(<GameplayFlowShell />);

    const checkpointList = screen.getByTestId(
      'gameplay-flow-checkpoints-contract-campaign',
    );
    const checkpointText = within(checkpointList)
      .getAllByRole('listitem')
      .map((item) => item.textContent);

    expect(checkpointText).toEqual([
      expect.stringContaining('1. Campaign base'),
      expect.stringContaining('2. Contract market'),
      expect.stringContaining('3. Mission launch'),
      expect.stringContaining('4. Tactical combat'),
      expect.stringContaining('5. Post-combat report'),
      expect.stringContaining('6. Salvage'),
      expect.stringContaining('7. Repair bay'),
      expect.stringContaining('8. Finances'),
      expect.stringContaining('9. Campaign log'),
    ]);
  });

  it('exposes QC command and GM inspection intent for combat flows', () => {
    render(<GameplayFlowShell />);

    const row = screen.getByTestId('gameplay-flow-row-combat-1v1');
    expect(row).toHaveTextContent(
      'npm.cmd run qc:journeys -- --journey=combat-1v1',
    );
    expect(row).toHaveTextContent('GM review');
    expect(row).toHaveTextContent('GM inspection');
  });
});

describe('GameplayHubPage flow shell integration', () => {
  it('keeps existing gameplay navigation cards while showing the flow shell', () => {
    render(<GameplayHubPage />);

    expect(screen.getByTestId('gameplay-flow-shell')).toBeInTheDocument();
    expect(screen.getByText('Quick Game')).toBeInTheDocument();
    expect(screen.getByText('Pilots')).toBeInTheDocument();
    expect(screen.getByText('Forces')).toBeInTheDocument();
    expect(screen.getByText('Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Encounters')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('Multiplayer')).toBeInTheDocument();
  });
});
