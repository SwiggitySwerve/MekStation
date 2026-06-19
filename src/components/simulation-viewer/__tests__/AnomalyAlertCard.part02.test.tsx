import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import type { IAnomaly } from '@/types/simulation-viewer';

import { AnomalyAlertCard } from '../AnomalyAlertCard';

const criticalAnomaly: IAnomaly = {
  id: 'anom-001',
  type: 'invariant-violation',
  severity: 'critical',
  battleId: 'battle-100',
  turn: 5,
  unitId: 'unit-001',
  message: 'Negative armor value detected on Atlas AS7-D',
  snapshot: { armor: -3 },
  timestamp: Date.now(),
};

const warningAnomaly: IAnomaly = {
  id: 'anom-002',
  type: 'heat-suicide',
  severity: 'warning',
  battleId: 'battle-200',
  turn: 8,
  unitId: 'unit-002',
  message: 'Atlas AS7-D generated 35 heat (threshold: 30)',
  thresholdUsed: 30,
  actualValue: 35,
  configKey: 'heatSuicideThreshold',
  timestamp: Date.now(),
};

const warningNoConfigAnomaly: IAnomaly = {
  id: 'anom-005',
  type: 'passive-unit',
  severity: 'warning',
  battleId: 'battle-500',
  turn: 12,
  unitId: 'unit-005',
  message: 'Unit did not fire for 5 consecutive turns',
  timestamp: Date.now(),
};

const infoAnomaly: IAnomaly = {
  id: 'anom-003',
  type: 'long-game',
  severity: 'info',
  battleId: 'battle-300',
  turn: null,
  unitId: null,
  message: 'Game exceeded 50 turns',
  timestamp: Date.now(),
};

describe('AnomalyAlertCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  describe('Action Callbacks', () => {
    it('calls onViewSnapshot with anomaly when clicked', () => {
      const handleSnapshot = jest.fn();
      render(
        <AnomalyAlertCard
          anomaly={criticalAnomaly}
          onViewSnapshot={handleSnapshot}
        />,
      );

      fireEvent.click(screen.getByTestId('action-view-snapshot'));
      expect(handleSnapshot).toHaveBeenCalledWith(criticalAnomaly);
    });

    it('calls onViewBattle with battleId when clicked', () => {
      const handleBattle = jest.fn();
      render(
        <AnomalyAlertCard
          anomaly={warningAnomaly}
          onViewBattle={handleBattle}
        />,
      );

      fireEvent.click(screen.getByTestId('action-view-battle'));
      expect(handleBattle).toHaveBeenCalledWith('battle-200');
    });

    it('calls onConfigureThreshold with configKey when clicked', () => {
      const handleConfigure = jest.fn();
      render(
        <AnomalyAlertCard
          anomaly={warningAnomaly}
          onConfigureThreshold={handleConfigure}
        />,
      );

      fireEvent.click(screen.getByTestId('action-configure-threshold'));
      expect(handleConfigure).toHaveBeenCalledWith('heatSuicideThreshold');
    });
  });

  describe('Dismiss Animation', () => {
    it('starts with opacity-100', () => {
      render(
        <AnomalyAlertCard anomaly={criticalAnomaly} onDismiss={jest.fn()} />,
      );

      expect(screen.getByTestId('anomaly-alert-card')).toHaveClass(
        'opacity-100',
      );
    });

    it('transitions to opacity-0 on dismiss click', () => {
      render(
        <AnomalyAlertCard anomaly={criticalAnomaly} onDismiss={jest.fn()} />,
      );

      fireEvent.click(screen.getByTestId('action-dismiss'));
      expect(screen.getByTestId('anomaly-alert-card')).toHaveClass('opacity-0');
    });

    it('has transition-opacity duration-300 class', () => {
      render(
        <AnomalyAlertCard anomaly={criticalAnomaly} onDismiss={jest.fn()} />,
      );

      const card = screen.getByTestId('anomaly-alert-card');
      expect(card).toHaveClass('transition-opacity');
      expect(card).toHaveClass('duration-300');
    });

    it('calls onDismiss after 300ms timeout', () => {
      const handleDismiss = jest.fn();
      render(
        <AnomalyAlertCard
          anomaly={criticalAnomaly}
          onDismiss={handleDismiss}
        />,
      );

      fireEvent.click(screen.getByTestId('action-dismiss'));
      expect(handleDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(handleDismiss).toHaveBeenCalledWith('anom-001');
    });

    it('removes card from DOM after dismiss timeout', () => {
      render(
        <AnomalyAlertCard anomaly={criticalAnomaly} onDismiss={jest.fn()} />,
      );

      fireEvent.click(screen.getByTestId('action-dismiss'));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(
        screen.queryByTestId('anomaly-alert-card'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('triggers button on Enter key', () => {
      const handleBattle = jest.fn();
      render(
        <AnomalyAlertCard anomaly={infoAnomaly} onViewBattle={handleBattle} />,
      );

      fireEvent.keyDown(screen.getByTestId('action-view-battle'), {
        key: 'Enter',
      });
      expect(handleBattle).toHaveBeenCalledWith('battle-300');
    });

    it('triggers button on Space key', () => {
      const handleBattle = jest.fn();
      render(
        <AnomalyAlertCard anomaly={infoAnomaly} onViewBattle={handleBattle} />,
      );

      fireEvent.keyDown(screen.getByTestId('action-view-battle'), { key: ' ' });
      expect(handleBattle).toHaveBeenCalledWith('battle-300');
    });

    it('does not trigger on other keys', () => {
      const handleBattle = jest.fn();
      render(
        <AnomalyAlertCard anomaly={infoAnomaly} onViewBattle={handleBattle} />,
      );

      fireEvent.keyDown(screen.getByTestId('action-view-battle'), {
        key: 'Escape',
      });
      expect(handleBattle).not.toHaveBeenCalled();
    });
  });

  describe('Dark Mode', () => {
    it('critical card has dark mode classes', () => {
      render(<AnomalyAlertCard anomaly={criticalAnomaly} />);

      const card = screen.getByTestId('anomaly-alert-card');
      expect(card).toHaveClass('dark:bg-red-900/20');

      const title = screen.getByTestId('anomaly-title');
      expect(title).toHaveClass('dark:text-red-100');

      const message = screen.getByTestId('anomaly-message');
      expect(message).toHaveClass('dark:text-red-300');
    });

    it('warning card has dark mode classes', () => {
      render(<AnomalyAlertCard anomaly={warningAnomaly} />);

      expect(screen.getByTestId('anomaly-alert-card')).toHaveClass(
        'dark:bg-orange-900/20',
      );
      expect(screen.getByTestId('anomaly-title')).toHaveClass(
        'dark:text-orange-100',
      );
    });

    it('info card has dark mode classes', () => {
      render(<AnomalyAlertCard anomaly={infoAnomaly} />);

      expect(screen.getByTestId('anomaly-alert-card')).toHaveClass(
        'dark:bg-blue-900/20',
      );
      expect(screen.getByTestId('anomaly-title')).toHaveClass(
        'dark:text-blue-100',
      );
    });
  });

  describe('Full Action Sets', () => {
    it('critical shows: View Snapshot, View Battle, Dismiss', () => {
      render(
        <AnomalyAlertCard
          anomaly={criticalAnomaly}
          onViewSnapshot={jest.fn()}
          onViewBattle={jest.fn()}
          onDismiss={jest.fn()}
        />,
      );

      expect(screen.getByTestId('action-view-snapshot')).toBeInTheDocument();
      expect(screen.getByTestId('action-view-battle')).toBeInTheDocument();
      expect(screen.getByTestId('action-dismiss')).toBeInTheDocument();
      expect(
        screen.queryByTestId('action-configure-threshold'),
      ).not.toBeInTheDocument();
    });

    it('warning with configKey shows: View Battle, Configure Threshold, Dismiss', () => {
      render(
        <AnomalyAlertCard
          anomaly={warningAnomaly}
          onViewBattle={jest.fn()}
          onConfigureThreshold={jest.fn()}
          onDismiss={jest.fn()}
        />,
      );

      expect(
        screen.queryByTestId('action-view-snapshot'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('action-view-battle')).toBeInTheDocument();
      expect(
        screen.getByTestId('action-configure-threshold'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('action-dismiss')).toBeInTheDocument();
    });

    it('info shows: View Battle, Dismiss', () => {
      render(
        <AnomalyAlertCard
          anomaly={infoAnomaly}
          onViewBattle={jest.fn()}
          onDismiss={jest.fn()}
        />,
      );

      expect(
        screen.queryByTestId('action-view-snapshot'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('action-view-battle')).toBeInTheDocument();
      expect(
        screen.queryByTestId('action-configure-threshold'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('action-dismiss')).toBeInTheDocument();
    });
  });
});
