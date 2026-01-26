import type { PartQuality } from './PartQuality';

export interface IUnitQuality {
  readonly unitId: string;
  readonly quality: PartQuality;
  readonly lastMaintenanceDate?: Date;
  readonly maintenanceHistory: readonly IMaintenanceRecord[];
}

export interface IMaintenanceRecord {
  readonly date: Date;
  readonly techId?: string;
  readonly roll: number;
  readonly targetNumber: number;
  readonly margin: number;
  readonly outcome: 'success' | 'failure' | 'critical_success' | 'critical_failure';
  readonly qualityBefore: PartQuality;
  readonly qualityAfter: PartQuality;
}

export const MAINTENANCE_THRESHOLDS = {
  QUALITY_IMPROVE_MARGIN: 4,
  QUALITY_DEGRADE_MARGIN: -3,
  CRITICAL_FAILURE_MARGIN: -6,
} as const;
