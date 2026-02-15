import { RepairJobStatus, type IRepairJob } from '@/types/repair';

export type StatusFilter = 'all' | 'pending' | 'in-progress' | 'complete';

export interface RepairStats {
  pending: number;
  active: number;
  complete: number;
  totalCost: number;
}

export type StatusFilterMap = Record<StatusFilter, RepairJobStatus | null>;

export type RepairStatusBadgeVariant =
  | 'amber'
  | 'cyan'
  | 'emerald'
  | 'red'
  | 'orange';

export type RepairStatusBorderMap = Record<RepairJobStatus, string>;

export type RepairJobList = IRepairJob[];
