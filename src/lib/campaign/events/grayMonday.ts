import type { IRandomEvent } from '@/types/campaign/events/randomEventTypes';

import {
  RandomEventCategory,
  RandomEventSeverity,
} from '@/types/campaign/events/randomEventTypes';

const GRAY_MONDAY = {
  START: { year: 3132, month: 8, day: 3 },
  BANKRUPTCY: { year: 3132, month: 8, day: 9 },
  EMPLOYER_BEGGING: { year: 3132, month: 8, day: 10 },
  END: { year: 3132, month: 8, day: 12 },
} as const;

let grayMondayCounter = 0;
function generateGrayMondayId(): string {
  return `gm-evt-${Date.now()}-${++grayMondayCounter}`;
}

export function _resetGrayMondayCounter(): void {
  grayMondayCounter = 0;
}

function matchesDate(
  currentDate: string,
  target: { year: number; month: number; day: number },
): boolean {
  const d = new Date(currentDate);
  return (
    d.getUTCFullYear() === target.year &&
    d.getUTCMonth() === target.month - 1 &&
    d.getUTCDate() === target.day
  );
}

export function processGrayMonday(
  currentDate: string,
  simulateGrayMonday: boolean,
  currentBalance: number,
): IRandomEvent | null {
  if (!simulateGrayMonday) return null;

  if (matchesDate(currentDate, GRAY_MONDAY.START)) {
    return {
      id: generateGrayMondayId(),
      category: RandomEventCategory.HISTORICAL,
      severity: RandomEventSeverity.CRITICAL,
      title: 'Gray Monday Begins',
      description:
        'Reports of widespread HPG network failures are flooding in. Communications are collapsing across the Inner Sphere.',
      effects: [
        {
          type: 'notification',
          message: 'HPG network failures detected across the Inner Sphere',
          severity: 'critical',
        },
      ],
      timestamp: currentDate,
    };
  }

  if (matchesDate(currentDate, GRAY_MONDAY.BANKRUPTCY)) {
    const loss = Math.floor(currentBalance * 0.99);
    return {
      id: generateGrayMondayId(),
      category: RandomEventCategory.HISTORICAL,
      severity: RandomEventSeverity.CRITICAL,
      title: 'Gray Monday - Financial Collapse',
      description:
        'The HPG network has collapsed. Your accounts have been seized. 99% of your balance has been debited.',
      effects: [
        {
          type: 'financial',
          amount: -loss,
          description: 'Gray Monday bankruptcy - 99% balance seized',
        },
      ],
      timestamp: currentDate,
    };
  }

  if (matchesDate(currentDate, GRAY_MONDAY.EMPLOYER_BEGGING)) {
    return {
      id: generateGrayMondayId(),
      category: RandomEventCategory.HISTORICAL,
      severity: RandomEventSeverity.CRITICAL,
      title: 'Gray Monday - Employer Begging',
      description:
        'Your employer cannot pay. Contract payments suspended indefinitely.',
      effects: [
        {
          type: 'notification',
          message: 'Contract payments suspended - employer cannot pay',
          severity: 'critical',
        },
      ],
      timestamp: currentDate,
    };
  }

  if (matchesDate(currentDate, GRAY_MONDAY.END)) {
    return {
      id: generateGrayMondayId(),
      category: RandomEventCategory.HISTORICAL,
      severity: RandomEventSeverity.MAJOR,
      title: 'Gray Monday Ends',
      description:
        'The worst of the Gray Monday crisis is over, but the effects will be felt for years to come.',
      effects: [
        {
          type: 'notification',
          message: 'Gray Monday crisis period ends',
          severity: 'warning',
        },
      ],
      timestamp: currentDate,
    };
  }

  return null;
}

export { GRAY_MONDAY };
