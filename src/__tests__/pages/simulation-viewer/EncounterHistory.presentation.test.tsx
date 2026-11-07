import { screen, fireEvent, within } from '@testing-library/react';

import {
  mockBattle1,
  renderPage,
  selectBattle,
} from './EncounterHistory.fixtures';

describe('EncounterHistory', () => {
  describe('Filter/Sort Tests', () => {
    it('renders outcome filter panel', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-filter')).toBeInTheDocument();
    });

    it('filters battles by victory outcome', () => {
      renderPage();
      const filterPanel = screen.getByTestId('battle-list-filter');
      const victoryCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-victory',
      );
      fireEvent.click(victoryCheckbox);
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b3')).not.toBeInTheDocument();
    });

    it('filters battles by defeat outcome', () => {
      renderPage();
      const filterPanel = screen.getByTestId('battle-list-filter');
      const defeatCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-defeat',
      );
      fireEvent.click(defeatCheckbox);
      expect(screen.queryByTestId('battle-card-b1')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b3')).not.toBeInTheDocument();
    });

    it('filters battles by draw outcome', () => {
      renderPage();
      const filterPanel = screen.getByTestId('battle-list-filter');
      const drawCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-draw',
      );
      fireEvent.click(drawCheckbox);
      expect(screen.queryByTestId('battle-card-b1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('battle-card-b2')).not.toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b3')).toBeInTheDocument();
    });

    it('shows empty message when filter matches nothing', () => {
      renderPage({ battles: [mockBattle1] });
      const filterPanel = screen.getByTestId('battle-list-filter');
      const defeatCheckbox = within(filterPanel).getByTestId(
        'checkbox-outcome-defeat',
      );
      fireEvent.click(defeatCheckbox);
      expect(screen.getByTestId('empty-battle-list')).toBeInTheDocument();
    });

    it('renders sort controls', () => {
      renderPage();
      expect(screen.getByTestId('sort-controls')).toBeInTheDocument();
      expect(screen.getByTestId('sort-button-duration')).toBeInTheDocument();
      expect(screen.getByTestId('sort-button-kills')).toBeInTheDocument();
      expect(screen.getByTestId('sort-button-damage')).toBeInTheDocument();
    });

    it('defaults to duration sort ascending', () => {
      renderPage();
      expect(screen.getByTestId('sort-button-duration')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const indicator = screen.getByTestId('sort-direction-indicator');
      expect(indicator).toHaveAccessibleName('Ascending');
      expect(
        indicator.querySelector('[data-icon-name="arrow-up"]'),
      ).toBeInTheDocument();
    });

    it('toggles sort direction when clicking same sort button', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-duration'));
      const indicator = screen.getByTestId('sort-direction-indicator');
      expect(indicator).toHaveAccessibleName('Descending');
      expect(
        indicator.querySelector('[data-icon-name="arrow-down"]'),
      ).toBeInTheDocument();
    });

    it('sorts battles by kills when kills button clicked', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-kills'));
      expect(screen.getByTestId('sort-button-kills')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByTestId('sort-button-duration')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('sorts battles by damage when damage button clicked', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-damage'));
      expect(screen.getByTestId('sort-button-damage')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('resets to ascending when switching sort keys', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('sort-button-duration'));
      const descendingIndicator = screen.getByTestId(
        'sort-direction-indicator',
      );
      expect(descendingIndicator).toHaveAccessibleName('Descending');
      expect(
        descendingIndicator.querySelector('[data-icon-name="arrow-down"]'),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('sort-button-kills'));
      const ascendingIndicator = screen.getByTestId('sort-direction-indicator');
      expect(ascendingIndicator).toHaveAccessibleName('Ascending');
      expect(
        ascendingIndicator.querySelector('[data-icon-name="arrow-up"]'),
      ).toBeInTheDocument();
    });

    it('filters key moments by tier', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const criticalCheckbox = within(kmFilter).getByTestId(
        'checkbox-tier-critical',
      );
      fireEvent.click(criticalCheckbox);
      expect(screen.getByTestId('key-moment-km1')).toBeInTheDocument();
      expect(screen.queryByTestId('key-moment-km2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('key-moment-km3')).not.toBeInTheDocument();
    });

    it('filters key moments by type', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const shutdownCheckbox = within(kmFilter).getByTestId(
        'checkbox-type-shutdown',
      );
      fireEvent.click(shutdownCheckbox);
      expect(screen.queryByTestId('key-moment-km1')).not.toBeInTheDocument();
      expect(screen.getByTestId('key-moment-km3')).toBeInTheDocument();
    });

    it('shows empty key moments message when filter matches none', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const fallCheckbox = within(kmFilter).getByTestId('checkbox-type-fall');
      fireEvent.click(fallCheckbox);
      expect(screen.getByTestId('empty-key-moments')).toBeInTheDocument();
    });

    it('combines tier and type filters', () => {
      renderPage();
      selectBattle('b1');
      const kmFilter = screen.getByTestId('key-moments-filter');
      const criticalCheckbox = within(kmFilter).getByTestId(
        'checkbox-tier-critical',
      );
      const killCheckbox = within(kmFilter).getByTestId('checkbox-type-kill');
      fireEvent.click(criticalCheckbox);
      fireEvent.click(killCheckbox);
      expect(screen.getByTestId('key-moment-km1')).toBeInTheDocument();
      expect(screen.queryByTestId('key-moment-km2')).not.toBeInTheDocument();
    });
  });

  describe('Comparison View Tests', () => {
    it('defaults to campaign average comparison mode', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId(
        'comparison-mode-toggle',
      ) as HTMLSelectElement;
      expect(toggle.value).toBe('campaign-average');
    });

    it('renders comparison metrics', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();
      expect(
        screen.getByTestId('comparison-metric-duration'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('comparison-metric-kills')).toBeInTheDocument();
      expect(
        screen.getByTestId('comparison-metric-damage'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('comparison-metric-unitsLost'),
      ).toBeInTheDocument();
    });

    it('toggle to specific battle shows battle selector', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      expect(
        screen.getByTestId('comparison-battle-select'),
      ).toBeInTheDocument();
    });

    it('specific battle selector excludes current battle', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      const selector = screen.getByTestId('comparison-battle-select');
      const options = within(selector).getAllByRole('option');
      const optionValues = options.map((o) => (o as HTMLOptionElement).value);
      expect(optionValues).not.toContain('b1');
      expect(optionValues).toContain('b2');
      expect(optionValues).toContain('b3');
    });

    it('shows message when no comparison target selected', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      expect(screen.getByTestId('no-comparison-target')).toBeInTheDocument();
    });

    it('selecting comparison battle shows comparison metrics', () => {
      renderPage();
      selectBattle('b1');
      const toggle = screen.getByTestId('comparison-mode-toggle');
      fireEvent.change(toggle, { target: { value: 'specific-battle' } });
      const selector = screen.getByTestId('comparison-battle-select');
      fireEvent.change(selector, { target: { value: 'b2' } });
      expect(screen.getByTestId('comparison-metrics')).toBeInTheDocument();
    });

    it('bar charts are rendered for each metric', () => {
      renderPage();
      selectBattle('b1');
      expect(
        screen.getByTestId('comparison-bar-current-duration'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('comparison-bar-baseline-duration'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('comparison-bar-current-kills'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('comparison-bar-baseline-kills'),
      ).toBeInTheDocument();
    });

    it('comparison metrics show current vs baseline values', () => {
      renderPage();
      selectBattle('b1');
      const durationMetric = screen.getByTestId('comparison-metric-duration');
      expect(durationMetric).toHaveTextContent('30:00');
    });

    it('DrillDownLink present in comparison section', () => {
      renderPage();
      selectBattle('b1');
      const compSection = screen.getByTestId('comparison-metrics');
      const link = within(compSection).getByTestId('drill-down-link');
      expect(link).toBeInTheDocument();
    });

    it('comparison DrillDownLink triggers onDrillDown', () => {
      const onDrillDown = jest.fn();
      renderPage({ onDrillDown });
      selectBattle('b1');
      const compSection = screen.getByTestId('comparison-metrics');
      const link = within(compSection).getByTestId('drill-down-link');
      fireEvent.click(link);
      expect(onDrillDown).toHaveBeenCalledWith(
        'analysis-bugs',
        expect.objectContaining({ battleId: 'b1' }),
      );
    });
  });

  describe('Responsive Layout Tests', () => {
    it('page has responsive padding', () => {
      renderPage();
      const container = screen.getByTestId('encounter-history');
      expect(container).toHaveClass('p-4');
      expect(container).toHaveClass('md:p-6');
      expect(container).toHaveClass('lg:p-8');
    });

    it('layout container uses flex-col lg:flex-row', () => {
      renderPage();
      const container = screen.getByTestId('encounter-history');
      const flexContainer = container.querySelector(
        '.flex.flex-col.lg\\:flex-row',
      );
      expect(flexContainer).toBeInTheDocument();
    });

    it('sidebar has w-full lg:w-[30%] classes', () => {
      renderPage();
      const sidebar = screen.getByTestId('battle-list-sidebar');
      expect(sidebar).toHaveClass('w-full');
      expect(sidebar).toHaveClass('lg:w-[30%]');
    });

    it('main content has w-full lg:w-[70%] classes', () => {
      renderPage();
      const main = screen.getByTestId('battle-detail');
      expect(main).toHaveClass('w-full');
      expect(main).toHaveClass('lg:w-[70%]');
    });

    it('forces section uses responsive grid', () => {
      renderPage();
      selectBattle('b1');
      const forcesSection = screen.getByTestId('forces-section');
      const grid = forcesSection.querySelector(
        '.grid.grid-cols-1.md\\:grid-cols-2',
      );
      expect(grid).toBeInTheDocument();
    });

    it('battle list sidebar is full width on mobile', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-sidebar')).toHaveClass('w-full');
    });

    it('battle detail is full width on mobile', () => {
      renderPage();
      expect(screen.getByTestId('battle-detail')).toHaveClass('w-full');
    });

    it('sidebar has gap-4 with main', () => {
      renderPage();
      const container = screen.getByTestId('encounter-history');
      const flexContainer = container.querySelector('.flex.flex-col');
      expect(flexContainer).toHaveClass('gap-4');
    });

    it('damage matrix has overflow-x-auto for small screens', () => {
      renderPage();
      selectBattle('b1');
      const matrixSection = screen.getByTestId('damage-matrix-section');
      const wrapper = matrixSection.querySelector('.overflow-x-auto');
      expect(wrapper).toBeInTheDocument();
    });

    it('key moments timeline has horizontal scroll', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moments-timeline')).toHaveClass(
        'overflow-x-auto',
      );
    });
  });

  describe('Semantic Palette Tests', () => {
    it('uses the semantic deep surface token for the page container', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history')).toHaveClass(
        'bg-surface-deep',
      );
    });

    it('uses the semantic primary-text token for the page title', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history-title')).toHaveClass(
        'text-text-theme-primary',
      );
    });

    it('use the semantic primary-text token for section headings', () => {
      renderPage();
      selectBattle('b1');
      const headings = screen.getAllByTestId('section-heading');
      headings.forEach((h) => {
        expect(h).toHaveClass('text-text-theme-primary');
      });
    });

    it('use semantic surface and border tokens for force panels', () => {
      renderPage();
      selectBattle('b1');
      const playerForce = screen.getByTestId('player-force');
      expect(playerForce).toHaveClass('bg-surface-base');
      expect(playerForce).toHaveClass('border-border-theme-subtle');
    });

    it('use semantic surface and border tokens for VCR controls', () => {
      renderPage();
      selectBattle('b1');
      const vcr = screen.getByTestId('vcr-controls');
      expect(vcr).toHaveClass('bg-surface-base');
      expect(vcr).toHaveClass('border-border-theme-subtle');
    });
  });
});
