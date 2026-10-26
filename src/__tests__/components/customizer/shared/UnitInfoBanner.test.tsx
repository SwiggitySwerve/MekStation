import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import {
  UnitInfoBanner,
  UnitStats,
} from '@/components/customizer/shared/UnitInfoBanner';
import { READOUT_NOTE_TEXT_CLASS } from '@/components/customizer/shared/unitStatStatus';
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
    expect(movement).toHaveTextContent('walk / run / jump');
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

  it('shows running hot in the note hue, value and bar, without a duplicate pill', () => {
    render(
      <UnitInfoBanner
        stats={createStats({ heatGenerated: 33, heatDissipation: 22 })}
        compact
      />,
    );
    const heat = screen.getByTestId('unit-info-stat-heat');
    expect(heat).toHaveAttribute('data-status', 'warning');
    // The build status lists the note; the readout does not repeat it.
    expect(heat).not.toHaveTextContent('+11');
    expect(heat.querySelector('.text-red-400')).toBeNull();
    expect(heat.querySelector('.text-amber-400')).toBeNull();
    expect(READOUT_NOTE_TEXT_CLASS).toBe('text-sky-300');
    expect(heat.querySelector(`.${READOUT_NOTE_TEXT_CLASS}`)).toHaveTextContent(
      '33',
    );
    expect(
      (heat.querySelector('.budgetFill') as HTMLElement).style.background,
    ).toContain('--color-sky-300');
    expect(heat).toHaveAccessibleName(
      'Heat: 33 / 22. 33 heat at full fire / 22 dissipation. 11 over: legal; add heat sinks to run cool.',
    );
    expect(heat).toHaveAttribute('tabindex', '0');
    expect(heat).toHaveAccessibleDescription(
      '33 heat at full fire / 22 dissipation. 11 over: legal; add heat sinks to run cool.',
    );
  });

  it('names both heat numbers even when heat is in budget', () => {
    render(<UnitInfoBanner stats={createStats()} compact />);
    const heat = screen.getByTestId('unit-info-stat-heat');
    expect(heat).toHaveTextContent('gen / diss');
    expect(heat).toHaveAccessibleName(
      'Heat: 20 / 30. 20 heat at full fire / 30 dissipation.',
    );
    expect(heat).toHaveAttribute('tabindex', '0');
  });

  it('keeps caps legible: denominators are 12px secondary text', () => {
    render(<UnitInfoBanner stats={createStats()} compact />);
    for (const cap of ['100t', '78', '30', '307'])
      expect(screen.getByText(cap)).toHaveClass(
        'text-xs',
        'text-text-theme-secondary',
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
        stats={createStats({ heatGenerated: 33, heatDissipation: 22 })}
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
      name: 'Show all unit readouts',
    });
    const readouts = document.getElementById(
      toggle.getAttribute('aria-controls')!,
    );
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(readouts).not.toHaveClass('readoutsDetailsOpen');
    fireEvent.click(toggle);
    expect(
      screen.getByRole('button', { name: 'Hide all unit readouts' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(readouts).toHaveClass('readoutsDetailsOpen');
    expect(screen.getByRole('button', { name: 'Valid' })).toBeInTheDocument();
  });

  it('shows tonnage once, as the weight cap', () => {
    const stats = createStats();
    render(<UnitInfoBanner stats={stats} compact />);

    expect(screen.queryByText('Tonnage')).not.toBeInTheDocument();
    expect(screen.getByTestId('unit-info-stat-weight')).toHaveTextContent(
      '50.0t/100t',
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
      screen.queryByRole('button', { name: /Show readouts/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('unit-info-stat-run-plus')).toBeNull();
    rerender(<UnitInfoBanner stats={createStats({ maxRunMP: 8 })} compact />);
    expect(screen.getByTestId('unit-info-stat-run-plus')).toHaveTextContent(
      '(8)',
    );
  });
});
