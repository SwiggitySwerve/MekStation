import { render, screen, fireEvent } from '@testing-library/react';

import type { IBattle } from '@/components/simulation-viewer/pages/EncounterHistory';

import {
  mockBattle1,
  mockBattles,
  renderPage,
  selectBattle,
  EncounterHistory,
  formatDuration,
} from './EncounterHistory.fixtures';

describe('EncounterHistory', () => {
  describe('Render Tests', () => {
    it('renders the page container', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history')).toBeInTheDocument();
    });

    it('renders campaign-id as data attribute', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history')).toHaveAttribute(
        'data-campaign-id',
        'campaign-001',
      );
    });

    it('renders the page title', () => {
      renderPage();
      expect(screen.getByTestId('encounter-history-title')).toHaveTextContent(
        'Encounter History',
      );
    });

    it('renders battle list sidebar', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-sidebar')).toBeInTheDocument();
    });

    it('renders battle list grouped by missions', () => {
      renderPage();
      expect(screen.getByTestId('mission-group-m1')).toBeInTheDocument();
      expect(screen.getByTestId('mission-group-m2')).toBeInTheDocument();
    });

    it('renders battle cards within mission groups', () => {
      renderPage();
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b2')).toBeInTheDocument();
      expect(screen.getByTestId('battle-card-b3')).toBeInTheDocument();
    });

    it('renders empty battle list message when no battles', () => {
      renderPage({ battles: [] });
      expect(screen.getByTestId('empty-battle-list')).toBeInTheDocument();
    });

    it('renders "no battle selected" when none selected', () => {
      renderPage();
      expect(screen.getByTestId('no-battle-selected')).toBeInTheDocument();
    });

    it('renders battle detail when battle is selected', () => {
      renderPage();
      selectBattle('b1');
      expect(
        screen.queryByTestId('no-battle-selected'),
      ).not.toBeInTheDocument();
    });

    it('renders forces section when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('forces-section')).toBeInTheDocument();
    });

    it('renders player force with units', () => {
      renderPage();
      selectBattle('b1');
      const playerForce = screen.getByTestId('player-force');
      expect(playerForce).toHaveTextContent('Atlas AS7-D');
      expect(playerForce).toHaveTextContent('Timber Wolf');
    });

    it('renders enemy force with units', () => {
      renderPage();
      selectBattle('b1');
      const enemyForce = screen.getByTestId('enemy-force');
      expect(enemyForce).toHaveTextContent('Mad Cat');
      expect(enemyForce).toHaveTextContent('Warhawk');
    });

    it('renders unit status badges', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('unit-status-badge-u1')).toHaveTextContent(
        'operational',
      );
      expect(screen.getByTestId('unit-status-badge-u2')).toHaveTextContent(
        'damaged',
      );
      expect(screen.getByTestId('unit-status-badge-e1')).toHaveTextContent(
        'destroyed',
      );
    });

    it('renders damage matrix when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('damage-matrix')).toBeInTheDocument();
    });

    it('renders damage matrix cells with correct values', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('damage-cell-u1-e1')).toHaveTextContent('45');
      expect(screen.getByTestId('damage-cell-u1-e2')).toHaveTextContent('30');
      expect(screen.getByTestId('damage-cell-u2-e1')).toHaveTextContent('25');
      expect(screen.getByTestId('damage-cell-u2-e2')).toHaveTextContent('40');
    });

    it('renders key moments timeline when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moments-section')).toBeInTheDocument();
      expect(screen.getByTestId('key-moments-timeline')).toBeInTheDocument();
    });

    it('renders key moment cards with tier badges', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moment-km1')).toBeInTheDocument();
      expect(screen.getByTestId('key-moment-tier-badge-km1')).toHaveTextContent(
        'critical',
      );
      expect(screen.getByTestId('key-moment-tier-badge-km2')).toHaveTextContent(
        'major',
      );
      expect(screen.getByTestId('key-moment-tier-badge-km3')).toHaveTextContent(
        'minor',
      );
    });

    it('renders event timeline when battle selected', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('event-timeline-section')).toBeInTheDocument();
    });

    it('renders VCR controls', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-controls')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-play-pause')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-step-back')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-step-forward')).toBeInTheDocument();
      expect(screen.getByTestId('vcr-speed-select')).toBeInTheDocument();
    });

    it('renders comparison section', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('comparison-section')).toBeInTheDocument();
    });
  });

  describe('Mock Data Edge Cases', () => {
    it('handles empty battles array', () => {
      renderPage({ battles: [] });
      expect(screen.getByTestId('empty-battle-list')).toBeInTheDocument();
    });

    it('handles battle with no key moments', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.getByTestId('empty-key-moments')).toBeInTheDocument();
    });

    it('handles battle with no events', () => {
      const battleNoEvents: IBattle = {
        ...mockBattle1,
        id: 'b-no-events',
        events: [],
      };
      renderPage({ battles: [battleNoEvents] });
      selectBattle('b-no-events');
      expect(screen.getByTestId('empty-events')).toBeInTheDocument();
    });

    it('handles zero damage in matrix', () => {
      const battleZeroDmg: IBattle = {
        ...mockBattle1,
        id: 'b-zero',
        damageMatrix: {
          attackers: ['u1'],
          targets: ['e1'],
          cells: [{ attackerId: 'u1', targetId: 'e1', damage: 0 }],
        },
      };
      renderPage({ battles: [battleZeroDmg] });
      selectBattle('b-zero');
      expect(screen.getByTestId('damage-cell-u1-e1')).toHaveTextContent('0');
    });

    it('handles empty damage matrix', () => {
      const battleEmptyMatrix: IBattle = {
        ...mockBattle1,
        id: 'b-empty-matrix',
        damageMatrix: { attackers: [], targets: [], cells: [] },
      };
      renderPage({ battles: [battleEmptyMatrix] });
      selectBattle('b-empty-matrix');
      expect(screen.getByTestId('empty-damage-matrix')).toBeInTheDocument();
    });

    it('handles missing optional onSelectBattle', () => {
      expect(() => {
        render(<EncounterHistory campaignId="test" battles={mockBattles} />);
        fireEvent.click(screen.getByTestId('battle-card-b1'));
      }).not.toThrow();
    });

    it('handles missing optional onDrillDown', () => {
      expect(() => {
        render(<EncounterHistory campaignId="test" battles={mockBattles} />);
        fireEvent.click(screen.getByTestId('battle-card-b1'));
      }).not.toThrow();
    });

    it('handles empty campaignId', () => {
      renderPage({ campaignId: '' });
      expect(screen.getByTestId('encounter-history')).toHaveAttribute(
        'data-campaign-id',
        '',
      );
    });

    it('handles single battle', () => {
      renderPage({ battles: [mockBattle1] });
      expect(screen.getByTestId('battle-card-b1')).toBeInTheDocument();
    });

    it('handles battle with single event', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.getByTestId('event-list')).toBeInTheDocument();
    });

    it('battle card shows outcome badge', () => {
      renderPage();
      expect(screen.getByTestId('battle-outcome-badge-b1')).toHaveTextContent(
        'victory',
      );
      expect(screen.getByTestId('battle-outcome-badge-b2')).toHaveTextContent(
        'defeat',
      );
      expect(screen.getByTestId('battle-outcome-badge-b3')).toHaveTextContent(
        'draw',
      );
    });

    it('battle card shows formatted duration', () => {
      renderPage();
      expect(screen.getByTestId('battle-duration-b1')).toHaveTextContent(
        '30:00',
      );
    });

    it('battle card shows kill count', () => {
      renderPage();
      expect(screen.getByTestId('battle-kills-b1')).toHaveTextContent(
        '2 kills',
      );
    });

    it('battle card shows damage total', () => {
      renderPage();
      expect(screen.getByTestId('battle-damage-b1')).toHaveTextContent(
        '140 dmg',
      );
    });

    it('outcome summary shows correct stats', () => {
      renderPage();
      selectBattle('b1');
      const summary = screen.getByTestId('outcome-summary');
      expect(summary).toHaveTextContent('Victory');
      expect(summary).toHaveTextContent('2 kills');
      expect(summary).toHaveTextContent('140 damage');
      expect(summary).toHaveTextContent('0 lost');
    });
  });

  describe('formatDuration', () => {
    it('formats 1800 seconds as 30:00', () => {
      expect(formatDuration(1800)).toBe('30:00');
    });

    it('formats 0 seconds as 0:00', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('formats 90 seconds as 1:30', () => {
      expect(formatDuration(90)).toBe('1:30');
    });

    it('formats 65 seconds as 1:05', () => {
      expect(formatDuration(65)).toBe('1:05');
    });

    it('formats 3600 seconds as 60:00', () => {
      expect(formatDuration(3600)).toBe('60:00');
    });
  });

  describe('Accessibility', () => {
    it('sidebar has aria-label', () => {
      renderPage();
      expect(screen.getByTestId('battle-list-sidebar')).toHaveAttribute(
        'aria-label',
        'Battle list',
      );
    });

    it('main content has aria-label', () => {
      renderPage();
      expect(screen.getByTestId('battle-detail')).toHaveAttribute(
        'aria-label',
        'Battle detail',
      );
    });

    it('sort controls group has aria-label', () => {
      renderPage();
      expect(screen.getByTestId('sort-controls')).toHaveAttribute(
        'aria-label',
        'Sort battles by',
      );
    });

    it('sort buttons have aria-pressed', () => {
      renderPage();
      expect(screen.getByTestId('sort-button-duration')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByTestId('sort-button-kills')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('VCR buttons have aria-labels', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-play-pause')).toHaveAttribute(
        'aria-label',
        'Play',
      );
      expect(screen.getByTestId('vcr-step-back')).toHaveAttribute(
        'aria-label',
        'Step back',
      );
      expect(screen.getByTestId('vcr-step-forward')).toHaveAttribute(
        'aria-label',
        'Step forward',
      );
    });

    it('damage matrix cells are keyboard accessible', () => {
      const onDrillDown = jest.fn();
      renderPage({ onDrillDown });
      selectBattle('b1');
      const cell = screen.getByTestId('damage-cell-u1-e1');
      fireEvent.keyDown(cell, { key: 'Enter' });
      expect(onDrillDown).toHaveBeenCalled();
    });

    it('damage matrix cells have title for hover tooltip', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('damage-cell-u1-e1')).toHaveAttribute(
        'title',
        '45 damage',
      );
    });

    it('detail sections have aria-labels', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('forces-section')).toHaveAttribute(
        'aria-label',
        'Forces',
      );
      expect(screen.getByTestId('damage-matrix-section')).toHaveAttribute(
        'aria-label',
        'Damage matrix',
      );
      expect(screen.getByTestId('key-moments-section')).toHaveAttribute(
        'aria-label',
        'Key moments',
      );
      expect(screen.getByTestId('event-timeline-section')).toHaveAttribute(
        'aria-label',
        'Event timeline',
      );
      expect(screen.getByTestId('comparison-section')).toHaveAttribute(
        'aria-label',
        'Comparison view',
      );
    });
  });
});
