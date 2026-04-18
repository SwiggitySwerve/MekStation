/**
 * ForceComparisonPanel Tests
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/game-session-management/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IForceSummary } from '@/utils/gameplay/forceSummary';

import { GameSide } from '@/types/gameplay';

import { ForceComparisonPanel } from '../ForceComparisonPanel';

const makeSummary = (
  side: GameSide,
  overrides: Partial<IForceSummary> = {},
): IForceSummary => ({
  side,
  totalBV: 5000,
  totalTonnage: 100,
  heatDissipation: 20,
  avgGunnery: 4,
  avgPiloting: 5,
  weaponDamagePerTurnPotential: 30,
  spaSummary: [],
  unitCount: 2,
  warnings: [],
  ...overrides,
});

describe('ForceComparisonPanel', () => {
  it('renders the empty placeholder when both sides are null', () => {
    render(<ForceComparisonPanel player={null} opponent={null} />);
    const panel = screen.getByTestId('force-comparison-panel');
    expect(panel).toHaveAttribute('data-state', 'empty');
    expect(screen.getByText(/Configure forces to begin/i)).toBeInTheDocument();
  });

  it('renders all six metric rows when both sides are configured', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    expect(
      screen.getByTestId('force-comparison-row-totalBV'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('force-comparison-row-totalTonnage'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('force-comparison-row-heatDissipation'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('force-comparison-row-avgGunnery'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('force-comparison-row-avgPiloting'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('force-comparison-row-weaponDamagePerTurnPotential'),
    ).toBeInTheDocument();
  });

  it('renders delta badges with severity attribute when both sides are configured', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, { totalBV: 8000 })}
        opponent={makeSummary(GameSide.Opponent, { totalBV: 5000 })}
      />,
    );
    const badge = screen.getByTestId('force-comparison-delta-totalBV');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-severity', 'high');
    // Sign + unit per spec § 5.1
    expect(badge.textContent).toContain('+');
    expect(badge.textContent).toContain('BV');
  });

  it('hides delta column when only one side is configured', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={null}
        defaultCollapsed={false}
      />,
    );
    expect(screen.getByTestId('force-comparison-panel')).toHaveAttribute(
      'data-state',
      'partial',
    );
    expect(
      screen.queryByTestId('force-comparison-delta-totalBV'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('force-comparison-partial-notice'),
    ).toBeInTheDocument();
  });

  it('shows the warning icon when any delta is high severity', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, { totalBV: 8000 })}
        opponent={makeSummary(GameSide.Opponent, { totalBV: 5000 })}
      />,
    );
    expect(
      screen.getByTestId('force-comparison-warning-icon'),
    ).toBeInTheDocument();
  });

  it('hides the warning icon when all deltas are low severity', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    expect(
      screen.queryByTestId('force-comparison-warning-icon'),
    ).not.toBeInTheDocument();
  });

  it('renders the decision hint when both sides are configured', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, { totalBV: 5000 })}
        opponent={makeSummary(GameSide.Opponent, { totalBV: 6500 })}
      />,
    );
    const hint = screen.getByTestId('force-comparison-hint');
    expect(hint).toBeInTheDocument();
    expect(hint.textContent).toMatch(/Opponent/);
  });

  it('starts collapsed by default when only one side is configured', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={null}
      />,
    );
    expect(
      screen.queryByTestId('force-comparison-table'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  it('starts expanded by default when both sides are configured', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    expect(screen.getByTestId('force-comparison-table')).toBeInTheDocument();
    expect(screen.getByText('Collapse')).toBeInTheDocument();
  });

  it('toggles collapse state on toggle button click', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    expect(screen.getByTestId('force-comparison-table')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('force-comparison-toggle'));
    expect(
      screen.queryByTestId('force-comparison-table'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('force-comparison-toggle'));
    expect(screen.getByTestId('force-comparison-table')).toBeInTheDocument();
  });

  it('renders SPA chips with count and accessible label', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, {
          spaSummary: [
            { spaId: 'sniper', name: 'Sniper', unitIds: ['u-1', 'u-2'] },
          ],
        })}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    const chip = screen.getByTestId('force-comparison-spa-player-sniper');
    expect(chip).toBeInTheDocument();
    expect(chip.textContent).toContain('Sniper');
    expect(chip.textContent).toContain('× 2');
    expect(chip.getAttribute('aria-label')).toContain('Sniper');
    expect(chip.getAttribute('aria-label')).toContain('u-1');
    expect(chip.getAttribute('aria-label')).toContain('u-2');
  });

  it('renders "No active SPAs" when a side has no SPAs', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    expect(
      screen.getByTestId('force-comparison-spas-player-empty'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('force-comparison-spas-opponent-empty'),
    ).toBeInTheDocument();
  });

  it('surfaces warnings from a side summary inline', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, {
          warnings: ['Force contains unknown units'],
        })}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    const warnings = screen.getByTestId('force-comparison-player-warnings');
    expect(warnings).toBeInTheDocument();
    expect(warnings.textContent).toMatch(/Force contains unknown units/);
  });

  it('updates rendered values when summary props change (re-derives)', () => {
    const { rerender } = render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, { totalBV: 5000 })}
        opponent={makeSummary(GameSide.Opponent, { totalBV: 5000 })}
      />,
    );
    expect(
      screen.getByTestId('force-comparison-player-totalBV').textContent,
    ).toBe('5,000');

    rerender(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, { totalBV: 7500 })}
        opponent={makeSummary(GameSide.Opponent, { totalBV: 5000 })}
      />,
    );
    expect(
      screen.getByTestId('force-comparison-player-totalBV').textContent,
    ).toBe('7,500');
    // Severity should now be high (ratio = 1.5)
    expect(
      screen
        .getByTestId('force-comparison-delta-totalBV')
        .getAttribute('data-severity'),
    ).toBe('high');
  });

  it('renders accessible delta badge with detailed aria-label', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player, { totalBV: 5325 })}
        opponent={makeSummary(GameSide.Opponent, { totalBV: 5000 })}
      />,
    );
    const badge = screen.getByTestId('force-comparison-delta-totalBV');
    const aria = badge.getAttribute('aria-label') ?? '';
    expect(aria).toMatch(/Player.*5,325/);
    expect(aria).toMatch(/Opponent.*5,000/);
    expect(aria).toMatch(/player advantage/);
  });

  it('uses table semantics with caption and th headers', () => {
    render(
      <ForceComparisonPanel
        player={makeSummary(GameSide.Player)}
        opponent={makeSummary(GameSide.Opponent)}
      />,
    );
    const table = screen.getByTestId('force-comparison-table');
    expect(table.tagName).toBe('TABLE');
    expect(table.querySelector('caption')).not.toBeNull();
    // Row headers (th[scope=row]) for each metric
    expect(table.querySelectorAll('th[scope="row"]').length).toBe(6);
    // Column headers (th[scope=col]) for the four columns
    expect(table.querySelectorAll('th[scope="col"]').length).toBe(4);
  });
});
