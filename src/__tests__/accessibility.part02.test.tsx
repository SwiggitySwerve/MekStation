import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

import type { IFilterDefinition } from '@/components/simulation-viewer/types';
import type { IAnomaly } from '@/types/simulation-viewer';

import { AnomalyAlertCard } from '@/components/simulation-viewer/AnomalyAlertCard';
import { DrillDownLink } from '@/components/simulation-viewer/DrillDownLink';
import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import { KPICard } from '@/components/simulation-viewer/KPICard';
import { TabNavigation } from '@/components/simulation-viewer/TabNavigation';
import { TrendChart } from '@/components/simulation-viewer/TrendChart';
import {
  announce,
  trapFocus,
  handleArrowNavigation,
  createKeyboardClickHandler,
  FOCUS_RING_CLASSES,
  FOCUS_RING_INSET_CLASSES,
  SR_ONLY_CLASSES,
} from '@/utils/accessibility';

expect.extend(toHaveNoViolations);

function mockKeyboardEvent(key: string) {
  return { key, preventDefault: jest.fn() };
}

const mockAnomaly: IAnomaly = {
  id: 'anom-001',
  type: 'heat-suicide',
  severity: 'warning',
  battleId: 'battle-123',
  turn: 8,
  unitId: 'unit-001',
  message: 'Atlas AS7-D generated 35 heat (threshold: 30)',
  configKey: 'heatSuicideThreshold',
  timestamp: Date.now(),
};

const mockTrendData = [
  { date: '2025-01-01', value: 100 },
  { date: '2025-01-08', value: 150 },
  { date: '2025-01-15', value: 130 },
];

const mockFilters: IFilterDefinition[] = [
  {
    id: 'severity',
    label: 'Severity',
    options: ['critical', 'warning', 'info'],
    optionLabels: { critical: 'Critical', warning: 'Warning', info: 'Info' },
  },
];

describe('Accessibility Tests', () => {
  describe('AnomalyAlertCard', () => {
    it('should have no axe violations', async () => {
      const { container } = render(<AnomalyAlertCard anomaly={mockAnomaly} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have role=alert', () => {
      render(<AnomalyAlertCard anomaly={mockAnomaly} />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-label');
    });

    it('should have aria-hidden on decorative icon', () => {
      render(<AnomalyAlertCard anomaly={mockAnomaly} />);
      const icon = screen.getByTestId('anomaly-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('action buttons should have focus indicators', () => {
      render(
        <AnomalyAlertCard
          anomaly={mockAnomaly}
          onDismiss={() => {}}
          onViewBattle={() => {}}
        />,
      );
      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton.className).toContain('focus:ring-2');

      const viewBattleButton = screen.getByText('View Battle');
      expect(viewBattleButton.className).toContain('focus:ring-2');
    });

    it('action buttons should be keyboard accessible', () => {
      jest.useFakeTimers();
      const onDismiss = jest.fn();
      render(<AnomalyAlertCard anomaly={mockAnomaly} onDismiss={onDismiss} />);
      const dismissButton = screen.getByText('Dismiss');

      fireEvent.keyDown(dismissButton, { key: 'Enter' });
      jest.advanceTimersByTime(400);
      expect(onDismiss).toHaveBeenCalledWith('anom-001');
      jest.useRealTimers();
    });
  });
});

describe('Accessibility Utilities', () => {
  describe('announce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      document.querySelectorAll('[aria-live]').forEach((el) => el.remove());
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      document.querySelectorAll('[aria-live]').forEach((el) => el.remove());
    });

    it('should create a live region announcement', () => {
      announce('Filter applied');
      const liveRegions = document.querySelectorAll('[aria-live="polite"]');
      const lastRegion = liveRegions[liveRegions.length - 1];
      expect(lastRegion).not.toBeNull();
      expect(lastRegion?.textContent).toBe('Filter applied');
      expect(lastRegion).toHaveAttribute('role', 'status');
      expect(lastRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should use assertive priority when specified', () => {
      announce('Error occurred', 'assertive');
      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion?.textContent).toBe('Error occurred');
    });

    it('should remove the announcement after timeout', () => {
      announce('Temporary message');
      const liveRegions = document.querySelectorAll('[aria-live="polite"]');
      expect(liveRegions.length).toBeGreaterThan(0);

      jest.advanceTimersByTime(1100);
      const remaining = document.querySelectorAll('[aria-live="polite"]');
      expect(remaining.length).toBe(0);
    });
  });

  describe('trapFocus', () => {
    it('should trap Tab focus within element', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `;
      document.body.appendChild(container);

      const cleanup = trapFocus(container);
      const lastButton = container.querySelector('#last') as HTMLElement;

      lastButton.focus();
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
      });
      Object.defineProperty(tabEvent, 'shiftKey', { value: false });
      container.dispatchEvent(tabEvent);

      cleanup();
      document.body.removeChild(container);
    });

    it('should return cleanup function', () => {
      const container = document.createElement('div');
      container.innerHTML = '<button>Test</button>';
      document.body.appendChild(container);

      const cleanup = trapFocus(container);
      expect(typeof cleanup).toBe('function');

      cleanup();
      document.body.removeChild(container);
    });
  });

  describe('handleArrowNavigation', () => {
    it('should navigate right in horizontal mode', () => {
      const event = mockKeyboardEvent('ArrowRight');
      const result = handleArrowNavigation(event, 0, 3, 'horizontal');
      expect(result).toBe(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should navigate left in horizontal mode', () => {
      const event = mockKeyboardEvent('ArrowLeft');
      const result = handleArrowNavigation(event, 1, 3, 'horizontal');
      expect(result).toBe(0);
    });

    it('should wrap around at boundaries', () => {
      const event = mockKeyboardEvent('ArrowRight');
      const result = handleArrowNavigation(event, 2, 3, 'horizontal');
      expect(result).toBe(0);
    });

    it('should navigate down in vertical mode', () => {
      const event = mockKeyboardEvent('ArrowDown');
      const result = handleArrowNavigation(event, 0, 5, 'vertical');
      expect(result).toBe(1);
    });

    it('should navigate up in vertical mode', () => {
      const event = mockKeyboardEvent('ArrowUp');
      const result = handleArrowNavigation(event, 1, 5, 'vertical');
      expect(result).toBe(0);
    });

    it('should handle Home key', () => {
      const event = mockKeyboardEvent('Home');
      const result = handleArrowNavigation(event, 3, 5, 'horizontal');
      expect(result).toBe(0);
    });

    it('should handle End key', () => {
      const event = mockKeyboardEvent('End');
      const result = handleArrowNavigation(event, 0, 5, 'horizontal');
      expect(result).toBe(4);
    });

    it('should return null for non-navigation keys', () => {
      const event = mockKeyboardEvent('a');
      const result = handleArrowNavigation(event, 0, 5, 'horizontal');
      expect(result).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('createKeyboardClickHandler', () => {
    it('should call callback on Enter', () => {
      const callback = jest.fn();
      const handler = createKeyboardClickHandler(callback);
      const event = mockKeyboardEvent('Enter');

      handler(event);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should call callback on Space', () => {
      const callback = jest.fn();
      const handler = createKeyboardClickHandler(callback);
      const event = mockKeyboardEvent(' ');

      handler(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback on other keys', () => {
      const callback = jest.fn();
      const handler = createKeyboardClickHandler(callback);
      const event = mockKeyboardEvent('Tab');

      handler(event);
      expect(callback).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('CSS class constants', () => {
    it('FOCUS_RING_CLASSES should include ring and offset', () => {
      expect(FOCUS_RING_CLASSES).toContain('focus:ring-2');
      expect(FOCUS_RING_CLASSES).toContain('focus:ring-blue-500');
      expect(FOCUS_RING_CLASSES).toContain('focus:ring-offset-2');
      expect(FOCUS_RING_CLASSES).toContain('dark:focus:ring-offset-gray-900');
    });

    it('FOCUS_RING_INSET_CLASSES should use inset variant', () => {
      expect(FOCUS_RING_INSET_CLASSES).toContain('focus:ring-inset');
      expect(FOCUS_RING_INSET_CLASSES).toContain('focus:ring-2');
    });

    it('SR_ONLY_CLASSES should hide content visually', () => {
      expect(SR_ONLY_CLASSES).toContain('overflow-hidden');
      expect(SR_ONLY_CLASSES).toContain('absolute');
    });
  });
});
