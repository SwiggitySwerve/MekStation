import type {
  IThresholds,
  InvariantStatus,
  Severity,
} from './AnalysisBugs.types';

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 2,
  warning: 1,
  info: 0,
};

export const INVARIANT_STATUS_CLASSES: Record<InvariantStatus, string> = {
  pass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  fail: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const DEFAULT_THRESHOLDS: IThresholds = {
  heatSuicide: 80,
  passiveUnit: 60,
  noProgress: 70,
  longGame: 90,
  stateCycle: 75,
};

export const DETECTOR_LABELS: Record<string, string> = {
  heatSuicide: 'Heat Suicide',
  passiveUnit: 'Passive Unit',
  noProgress: 'No Progress',
  longGame: 'Long Game',
  stateCycle: 'State Cycle',
};

export const DETECTOR_DESCRIPTIONS: Record<string, string> = {
  heatSuicide: 'Threshold for heat suicide detection',
  passiveUnit: 'Threshold for passive unit detection',
  noProgress: 'Threshold for no progress detection',
  longGame: 'Threshold for long game detection',
  stateCycle: 'Threshold for state cycle detection',
};
