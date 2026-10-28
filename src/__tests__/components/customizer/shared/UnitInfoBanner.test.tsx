import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import {
  UnitInfoBanner,
  UnitStats,
} from '@/components/customizer/shared/UnitInfoBanner';
import { STAT_STATUS_TEXT_CLASS } from '@/components/customizer/shared/unitStatStatus';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';

describe('UnitInfoBanner', () => {
  const createStats = (overrides?: Partial<UnitStats>): UnitStats => ({
    name: 'Atlas AS7-D',
    tonnage: 100,
    techBaseMode: TechBaseMode.INNER_SPHERE,
    engineRating: 300,
    walkMP: 3,
    runMP: 5,
    jumpMP: 0,
    weightUsed: 50,
    weightRemaining: 50,
    armorPoints: 200,
    maxArmorPoints: 307,
    criticalSlotsUsed: 40,
    criticalSlotsTotal: 78,
    heatGenerated: 20,
    heatDissipation: 30,
    validationStatus: 'valid',
    errorCount: 0,
    warningCount: 0,
    ...overrides,
  });

  it('should render unit name', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('Atlas AS7-D')).toBeInTheDocument();
  });

  it('should render tech base badge', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('IS')).toBeInTheDocument();
  });

  it('should render validation badge', () => {
    const stats = createStats();
    const mockValidation: UnitValidationState = {
      isValid: true,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      status: 'valid',
      hasCriticalErrors: false,
      result: null,
      isLoading: false,
      isValidating: false,
    };
    render(<UnitInfoBanner stats={stats} validation={mockValidation} />);

    expect(screen.getByRole('status')).toHaveTextContent('Ready');
    expect(
      screen.getByRole('status').querySelector('[data-icon-name="check"]'),
    ).toBeInTheDocument();
  });

  it('shows walk, run and jump together in one Movement cell', () => {
    const stats = createStats({ walkMP: 4, runMP: 6, jumpMP: 3 });
    render(<UnitInfoBanner stats={stats} />);

    const movement = screen.getByRole('group', {
      name: 'Movement: walk 4, run 6, jump 3 MP',
    });
    expect(movement).toHaveAttribute('data-testid', 'unit-info-stat-movement');
    // Each number carries its word on the value line, not beside the label.
    expect(
      [...movement.querySelectorAll('[data-stat-qualifier]')].map(
        (word) => word.textContent,
      ),
    ).toEqual(['walk', 'run', 'jump']);
    for (const [id, value] of [
      ['walk', '4'],
      ['run', '6'],
      ['jump', '3'],
    ])
      expect(
        within(movement).getByTestId(`unit-info-stat-${id}`),
      ).toHaveTextContent(value);
  });

  it('adds the enhanced top run speed beside run when an enhancement is active', () => {
    const stats = createStats({ runMP: 5, maxRunMP: 10 });
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByTestId('unit-info-stat-run-plus')).toHaveTextContent(
      '(10)',
    );
    expect(screen.getByTestId('unit-info-stat-movement')).toHaveAccessibleName(
      /run 5 \(10 with enhancement\)/,
    );
  });

  it('should display weight stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText(/50.0/)).toBeInTheDocument();
  });

  it('should display armor stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('Armor')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('307')).toBeInTheDocument();
  });

  it('should display critical slots stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('Slots')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
  });

  it('should display heat stats', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('Heat')).toBeInTheDocument();
    const heatLabel = screen.getByText('Heat');
    const heatContainer = heatLabel.closest('div');
    expect(heatContainer).toHaveTextContent('20');
    expect(heatContainer).toHaveTextContent('30');
  });

  it('shows running hot in the warning hue, value and bar, without a duplicate pill', () => {
    render(
      <UnitInfoBanner
        stats={createStats({
          heatGenerated: 33,
          heatDissipation: 22,
          heatGeneration: {
            alphaStrikeHeat: 31,
            movementHeat: 2,
            movementMode: 'running',
          },
        })}
        compact
      />,
    );
    const heat = screen.getByTestId('unit-info-stat-heat');
    expect(heat).toHaveAttribute('data-status', 'warning');
    // The build status lists the warning; the readout does not repeat it.
    expect(heat).not.toHaveTextContent('+11');
    expect(heat.querySelector('.text-red-400')).toBeNull();
    expect(heat.querySelector('.text-amber-400')).toBeNull();
    expect(STAT_STATUS_TEXT_CLASS.warning).toBe('text-warning');
    expect(
      heat.querySelector(`.${STAT_STATUS_TEXT_CLASS.warning}`),
    ).toHaveTextContent('33');
    expect(
      (heat.querySelector('.budgetFill') as HTMLElement).style.background,
    ).toContain('--warning');
    expect(heat).toHaveAccessibleName(
      'Heat: 33 / 22. 33 heat at full fire (31 from weapons + 2 from running) / 22 dissipation. 11 over: legal; add heat sinks to run cool.',
    );
    expect(heat).toHaveAttribute('tabindex', '0');
    expect(heat).toHaveAccessibleDescription(
      '33 heat at full fire (31 from weapons + 2 from running) / 22 dissipation. 11 over: legal; add heat sinks to run cool.',
    );
  });

  it('names both heat numbers even when heat is in budget', () => {
    render(<UnitInfoBanner stats={createStats()} compact />);
    const heat = screen.getByTestId('unit-info-stat-heat');
    expect(
      [...heat.querySelectorAll('[data-stat-qualifier]')].map(
        (word) => word.textContent,
      ),
    ).toEqual(['dissipation']);
    // Label, then "20 / 30 dissipation" in full words, like the Build Summary
    // heat card; the tooltip text follows.
    expect(heat).toHaveTextContent(/^Heat20 \/ 30dissipation/);
    expect(heat).toHaveAccessibleName(
      'Heat: 20 / 30. 20 heat at full fire / 30 dissipation.',
    );
    expect(heat).toHaveAttribute('tabindex', '0');
  });

  it('keeps caps legible: denominators are 13px secondary text', () => {
    render(<UnitInfoBanner stats={createStats()} compact />);
    const weightCap = screen.getByText('100.0 t');
    for (const cap of [
      weightCap,
      ...['78', '30', '307'].map((text) => screen.getByText(text)),
    ])
      expect(cap).toHaveClass('text-[13px]', 'text-text-theme-secondary');
  });

  it('counts placed slots in the Slots readout and explains the pending ones without warning', () => {
    render(
      <UnitInfoBanner
        stats={createStats({
          criticalSlotsUsed: 69,
          criticalSlotsPlaced: 66,
          criticalSlotsPending: 3,
          unplacedItemCount: 1,
        })}
        compact
      />,
    );
    const slots = screen.getByTestId('unit-info-stat-slots');
    expect(slots).toHaveTextContent('66');
    expect(slots).not.toHaveTextContent('69');
    // The unplaced item is the Unplaced equipment warning; the budget stays neutral.
    expect(slots).toHaveAttribute('data-status', 'normal');
    expect(slots).toHaveAccessibleName(
      'Slots: 66 / 78. 66 of 78 slots filled · 3 pending (1 unplaced item).',
    );
  });

  it('keeps red for real capacity errors and no excess when heat is in budget', () => {
    render(
      <UnitInfoBanner
        stats={createStats({
          weightUsed: 101,
          weightRemaining: -1,
          criticalSlotsUsed: 80,
        })}
        compact
      />,
    );
    expect(screen.getByTestId('unit-info-stat-weight')).toHaveAttribute(
      'data-status',
      'error',
    );
    expect(screen.getByTestId('unit-info-stat-slots')).toHaveAttribute(
      'data-status',
      'error',
    );
    const heat = screen.getByTestId('unit-info-stat-heat');
    expect(heat).toHaveAttribute('data-status', 'normal');
    expect(heat).not.toHaveTextContent('+');
  });

  it('groups the budget readouts as the emphasized capacity group with fill bars', () => {
    render(
      <UnitInfoBanner
        stats={createStats({
          heatGenerated: 33,
          heatDissipation: 22,
          heatGeneration: {
            alphaStrikeHeat: 31,
            movementHeat: 2,
            movementMode: 'running',
          },
        })}
        compact
      />,
    );
    const capacity = screen.getByRole('group', { name: 'Capacity' });
    expect(capacity).toHaveClass('readoutGroupKey');
    for (const id of ['weight', 'slots', 'heat', 'armor']) {
      const stat = screen.getByTestId(`unit-info-stat-${id}`);
      expect(capacity).toContainElement(stat);
      expect(stat).toHaveClass('budgetStat');
      expect(stat.querySelector('.budgetFill')).toHaveAttribute(
        'data-status',
        stat.getAttribute('data-status'),
      );
    }
    const fill = (id: string) =>
      (
        screen
          .getByTestId(`unit-info-stat-${id}`)
          .querySelector('.budgetFill') as HTMLElement
      ).style.width;
    expect(fill('weight')).toBe('50%');
    // Over the cap stays a full bar rather than overflowing.
    expect(fill('heat')).toBe('100%');
    // Every metric shares one value size; only budgets carry a fill bar.
    for (const id of ['movement', 'engine', 'bv']) {
      const stat = screen.getByTestId(`unit-info-stat-${id}`);
      expect(stat.querySelector('.budgetValue')).toHaveClass(
        'text-base',
        'sm:text-lg',
        'font-bold',
      );
      expect(stat.querySelector('.budgetFill')).toBeNull();
    }
    for (const id of ['weight', 'slots', 'heat', 'armor'])
      expect(
        screen
          .getByTestId(`unit-info-stat-${id}`)
          .querySelector('.budgetValue'),
      ).toHaveClass('text-base', 'sm:text-lg', 'font-bold');
  });

  it('lets phone users open the remaining compact readouts', () => {
    render(
      <UnitInfoBanner
        stats={createStats()}
        compact
        status={<button type="button">Valid</button>}
      />,
    );
    const toggle = screen.getByRole('button', {
      name: 'More stats (Armor, Movement, BV)',
    });
    const readouts = document.getElementById(
      toggle.getAttribute('aria-controls')!,
    );
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // A visible label, so the toggle never reads as the status chip's chevron.
    expect(toggle).toHaveTextContent(/^More$/);
    expect(readouts).not.toHaveClass('readoutsDetailsOpen');
    fireEvent.click(toggle);
    expect(
      screen.getByRole('button', { name: 'Fewer stats (Armor, Movement, BV)' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent(/^Less$/);
    expect(readouts).toHaveClass('readoutsDetailsOpen');
    expect(screen.getByRole('button', { name: 'Valid' })).toBeInTheDocument();
  });

  it('shows tonnage once, as the weight cap', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} compact />);

    expect(screen.queryByText('Tonnage')).not.toBeInTheDocument();
    expect(screen.getByTestId('unit-info-stat-weight')).toHaveTextContent(
      '50.0 / 100.0 t',
    );
  });

  it('should display engine rating stat', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('should display battle value when provided', () => {
    const stats = createStats({ battleValue: 2500 });
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('BV')).toBeInTheDocument();
    expect(screen.getByText('2,500')).toBeInTheDocument();
  });

  it('should display dash for battle value when not provided', () => {
    const stats = createStats({ battleValue: undefined });
    render(<UnitInfoBanner stats={stats} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });
  it('keeps seven cells, with movement and conditional Run+ in one, in the compact workbench', () => {
    const { rerender } = render(
      <UnitInfoBanner stats={createStats()} compact />,
    );
    for (const name of [
      'Movement',
      'Engine',
      'Weight',
      'Slots',
      'Armor',
      'Heat',
      'BV',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.queryByText('Atlas AS7-D')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Show Readouts/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('unit-info-stat-run-plus')).toBeNull();
    rerender(<UnitInfoBanner stats={createStats({ maxRunMP: 8 })} compact />);
    expect(screen.getByTestId('unit-info-stat-run-plus')).toHaveTextContent(
      '(8)',
    );
  });
});
