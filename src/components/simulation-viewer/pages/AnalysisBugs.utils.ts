import type { IFilterDefinition } from '@/components/simulation-viewer/types';
import type { IAnomaly } from '@/types/simulation-viewer';
import type { IViolation } from '@/types/simulation-viewer/IViolation';

import type { IPageAnomaly, IThresholds } from './AnalysisBugs.types';

export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function mapToCardAnomaly(anomaly: IPageAnomaly): IAnomaly {
  return {
    id: anomaly.id,
    type: anomaly.detector,
    severity: anomaly.severity,
    battleId: anomaly.battleId,
    turn: null,
    unitId: null,
    message: anomaly.description,
    configKey: getAnomalyConfigKey(anomaly.detector),
    timestamp: Date.parse(anomaly.timestamp) || Date.now(),
  };
}

export function buildViolationFilters(
  violations: IViolation[],
): IFilterDefinition[] {
  const types = Array.from(
    new Set(violations.map((violation) => violation.type)),
  ).sort();
  const battles = Array.from(
    new Set(violations.map((violation) => violation.battleId)),
  ).sort();

  return [
    {
      id: 'severity',
      label: 'Severity',
      options: ['critical', 'warning', 'info'],
      optionLabels: { critical: 'Critical', warning: 'Warning', info: 'Info' },
    },
    {
      id: 'type',
      label: 'Type',
      options: types,
    },
    {
      id: 'battle',
      label: 'Battle',
      options: battles,
    },
  ];
}

export function getThresholdKeyForDetector(
  detector: IPageAnomaly['detector'],
): keyof IThresholds {
  if (detector === 'heat-suicide') {
    return 'heatSuicide';
  }
  if (detector === 'passive-unit') {
    return 'passiveUnit';
  }
  if (detector === 'no-progress') {
    return 'noProgress';
  }
  if (detector === 'long-game') {
    return 'longGame';
  }
  return 'stateCycle';
}

function getAnomalyConfigKey(detector: IPageAnomaly['detector']): string {
  if (detector === 'heat-suicide') {
    return 'heatSuicideThreshold';
  }
  if (detector === 'passive-unit') {
    return 'passiveUnitThreshold';
  }
  if (detector === 'no-progress') {
    return 'noProgressThreshold';
  }
  if (detector === 'long-game') {
    return 'longGameThreshold';
  }
  return 'stateCycleThreshold';
}
