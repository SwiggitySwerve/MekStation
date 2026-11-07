import { screen, fireEvent, within, act } from '@testing-library/react';

import {
  mockAnomalies,
  renderPage,
  generateViolations,
} from './AnalysisBugs.fixtures';

describe('AnalysisBugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Anomaly Cards', () => {
    it('renders AnomalyAlertCard for each non-dismissed anomaly', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(4);
    });

    it('renders correct number of anomaly card wrappers', () => {
      renderPage();
      const nonDismissed = mockAnomalies.filter((a) => !a.dismissed);
      nonDismissed.forEach((a) => {
        expect(
          screen.getByTestId(`anomaly-card-wrapper-${a.id}`),
        ).toBeInTheDocument();
      });
    });

    it('severity styling applied — critical card has red border', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      const criticalCard = cards[0];
      expect(criticalCard.className).toContain('border-red');
    });

    it('severity styling applied — warning card has orange border', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      const warningCard = cards[1];
      expect(warningCard.className).toContain('border-orange');
    });

    it('severity styling applied — info card has blue border', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      const infoCard = cards[2];
      expect(infoCard.className).toContain('border-blue');
    });

    it('View Battle action calls onViewBattle', () => {
      const onViewBattle = jest.fn();
      renderPage({ onViewBattle });
      const viewBattleButtons = screen.getAllByTestId('action-view-battle');
      fireEvent.click(viewBattleButtons[0]);
      expect(onViewBattle).toHaveBeenCalledWith('b1');
    });

    it('Dismiss action calls onDismissAnomaly', () => {
      jest.useFakeTimers();
      const onDismissAnomaly = jest.fn();
      renderPage({ onDismissAnomaly });
      const dismissButtons = screen.getAllByTestId('action-dismiss');
      fireEvent.click(dismissButtons[0]);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onDismissAnomaly).toHaveBeenCalledWith('a1');
      jest.useRealTimers();
    });

    it('dismissed anomalies are hidden by default', () => {
      renderPage();
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(4);
    });

    it('toggle shows dismissed anomalies', () => {
      renderPage();
      const toggle = screen.getByTestId('toggle-dismissed');
      fireEvent.click(toggle);
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(5);
    });

    it('toggle button text changes when toggled', () => {
      renderPage();
      const toggle = screen.getByTestId('toggle-dismissed');
      expect(toggle).toHaveTextContent('Show Dismissed');
      fireEvent.click(toggle);
      expect(toggle).toHaveTextContent('Hide Dismissed');
    });

    it('toggle button has aria-pressed attribute', () => {
      renderPage();
      const toggle = screen.getByTestId('toggle-dismissed');
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('does not show toggle when no dismissed anomalies', () => {
      const noDismissed = mockAnomalies.map((a) => ({
        ...a,
        dismissed: false,
      }));
      renderPage({ anomalies: noDismissed });
      expect(screen.queryByTestId('toggle-dismissed')).not.toBeInTheDocument();
    });

    it('anomaly count is displayed in heading', () => {
      renderPage();
      const heading = screen.getByTestId('anomaly-heading');
      expect(heading.textContent).toContain('(4)');
    });

    it('does not render cards when anomalies are empty', () => {
      renderPage({ anomalies: [] });
      expect(
        screen.queryByTestId('anomaly-alert-card'),
      ).not.toBeInTheDocument();
    });

    it('renders anomaly cards from all 5 detector types', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('toggle-dismissed'));
      const cards = screen.getAllByTestId('anomaly-alert-card');
      expect(cards).toHaveLength(5);
    });
  });

  describe('Violation Log', () => {
    it('renders all violation rows', () => {
      renderPage();
      const rows = screen.getAllByTestId('violation-row');
      expect(rows).toHaveLength(5);
    });

    it('displays violation count in heading', () => {
      renderPage();
      const heading = screen.getByTestId('violation-heading');
      expect(heading.textContent).toContain('(5)');
    });

    it('filters by severity — critical only', () => {
      renderPage();
      const severitySection = screen.getByTestId('filter-section-severity');
      const criticalCheckbox = within(severitySection).getByTestId(
        'checkbox-severity-critical',
      );
      fireEvent.click(criticalCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('critical');
      });
    });

    it('filters by severity — warning only', () => {
      renderPage();
      const severitySection = screen.getByTestId('filter-section-severity');
      const warningCheckbox = within(severitySection).getByTestId(
        'checkbox-severity-warning',
      );
      fireEvent.click(warningCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('warning');
      });
    });

    it('filters by severity — info only', () => {
      renderPage();
      const infoCheckbox = screen.getByTestId('checkbox-severity-info');
      fireEvent.click(infoCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('info');
      });
    });

    it('filters by type', () => {
      renderPage();
      const typeCheckbox = screen.getByTestId('checkbox-type-heat-suicide');
      fireEvent.click(typeCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(within(row).getByTestId('violation-type')).toHaveTextContent(
          'heat-suicide',
        );
      });
    });

    it('filters by battle', () => {
      renderPage();
      const battleCheckbox = screen.getByTestId('checkbox-battle-b2');
      fireEvent.click(battleCheckbox);
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(within(row).getByTestId('violation-battle')).toHaveTextContent(
          'b2',
        );
      });
    });

    it('combined filters intersect', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('checkbox-severity-critical'));
      fireEvent.click(screen.getByTestId('checkbox-battle-b1'));
      const rows = screen.getAllByTestId('violation-row');
      rows.forEach((row) => {
        expect(row.getAttribute('data-severity')).toBe('critical');
        expect(within(row).getByTestId('violation-battle')).toHaveTextContent(
          'b1',
        );
      });
    });

    it('passes all violations to virtualized log (no pagination)', () => {
      const manyViolations = generateViolations(25);
      renderPage({ violations: manyViolations });
      const rows = screen.getAllByTestId('violation-row');
      expect(rows).toHaveLength(25);
    });

    it('View Battle button calls onViewBattle', () => {
      const onViewBattle = jest.fn();
      renderPage({ onViewBattle });
      const viewBattleButtons = screen.getAllByTestId('violation-view-battle');
      fireEvent.click(viewBattleButtons[0]);
      expect(onViewBattle).toHaveBeenCalled();
    });

    it('violation severity badge renders with correct text', () => {
      renderPage();
      const badges = screen.getAllByTestId('violation-severity-badge');
      expect(badges.length).toBeGreaterThan(0);
      const texts = badges.map((b) => b.textContent);
      expect(texts).toContain('critical');
      expect(texts).toContain('warning');
      expect(texts).toContain('info');
    });

    it('shows empty message when filter yields no results', () => {
      renderPage({ violations: [] });
      expect(screen.getByTestId('violation-empty')).toBeInTheDocument();
    });
  });

  describe('Threshold Configuration', () => {
    it('renders all 5 threshold sliders', () => {
      renderPage();
      expect(
        screen.getByTestId('threshold-slider-heatSuicide'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('threshold-slider-passiveUnit'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('threshold-slider-noProgress'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('threshold-slider-longGame'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('threshold-slider-stateCycle'),
      ).toBeInTheDocument();
    });

    it('sliders render with correct initial values', () => {
      renderPage();
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('80');
      expect(
        screen.getByTestId('threshold-value-passiveUnit'),
      ).toHaveTextContent('60');
      expect(
        screen.getByTestId('threshold-value-noProgress'),
      ).toHaveTextContent('70');
      expect(screen.getByTestId('threshold-value-longGame')).toHaveTextContent(
        '90',
      );
      expect(
        screen.getByTestId('threshold-value-stateCycle'),
      ).toHaveTextContent('75');
    });

    it('slider change updates displayed value', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      fireEvent.change(slider, { target: { value: '50' } });
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('50');
    });

    it('save button calls onThresholdChange for all detectors', () => {
      const onThresholdChange = jest.fn();
      renderPage({ onThresholdChange });
      fireEvent.click(screen.getByTestId('threshold-save'));
      expect(onThresholdChange).toHaveBeenCalledTimes(5);
      expect(onThresholdChange).toHaveBeenCalledWith('heatSuicide', 80);
      expect(onThresholdChange).toHaveBeenCalledWith('passiveUnit', 60);
      expect(onThresholdChange).toHaveBeenCalledWith('noProgress', 70);
      expect(onThresholdChange).toHaveBeenCalledWith('longGame', 90);
      expect(onThresholdChange).toHaveBeenCalledWith('stateCycle', 75);
    });

    it('reset button restores default values', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      fireEvent.change(slider, { target: { value: '10' } });
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('10');
      fireEvent.click(screen.getByTestId('threshold-reset'));
      expect(
        screen.getByTestId('threshold-value-heatSuicide'),
      ).toHaveTextContent('80');
    });

    it('auto-snapshot toggles render', () => {
      renderPage();
      expect(screen.getByTestId('auto-snapshot-config')).toBeInTheDocument();
      expect(
        screen.getByTestId('toggle-auto-snapshot-critical'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('toggle-auto-snapshot-warning'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('toggle-auto-snapshot-info'),
      ).toBeInTheDocument();
    });

    it('auto-snapshot critical toggle is on by default', () => {
      renderPage();
      const input = screen.getByTestId('toggle-input-auto-snapshot-critical');
      expect(input).toBeChecked();
    });

    it('auto-snapshot warning toggle is off by default', () => {
      renderPage();
      const input = screen.getByTestId('toggle-input-auto-snapshot-warning');
      expect(input).not.toBeChecked();
    });

    it('auto-snapshot toggle changes state', () => {
      renderPage();
      const input = screen.getByTestId('toggle-input-auto-snapshot-warning');
      fireEvent.click(input);
      expect(input).toBeChecked();
    });

    it('affected anomaly count shows for active detectors', () => {
      renderPage();
      const affected = screen.getAllByTestId(/threshold-affected/);
      expect(affected.length).toBeGreaterThan(0);
    });

    it('slider has accessible aria attributes', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
      expect(slider).toHaveAttribute('aria-valuenow', '80');
    });

    it('slider value updates aria-valuenow', () => {
      renderPage();
      const slider = screen.getByTestId('threshold-input-heatSuicide');
      fireEvent.change(slider, { target: { value: '45' } });
      expect(slider).toHaveAttribute('aria-valuenow', '45');
    });
  });
});
