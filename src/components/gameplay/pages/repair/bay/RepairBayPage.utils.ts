import { RepairJobStatus, type IRepairJob } from '@/types/repair';

import type {
  RepairStats,
  StatusFilter,
  StatusFilterMap,
} from './RepairBayPage.types';

export const STATUS_FILTER_MAP: StatusFilterMap = {
  all: null,
  pending: RepairJobStatus.Pending,
  'in-progress': RepairJobStatus.InProgress,
  complete: RepairJobStatus.Completed,
};

export function filterAndSortJobs(
  jobs: readonly IRepairJob[],
  statusFilter: StatusFilter,
  searchQuery: string,
): IRepairJob[] {
  let filtered = [...jobs];

  const targetStatus = STATUS_FILTER_MAP[statusFilter];
  if (targetStatus !== null) {
    filtered = filtered.filter((job) => job.status === targetStatus);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((job) =>
      job.unitName.toLowerCase().includes(query),
    );
  }

  return filtered.sort((first, second) => {
    if (
      first.status === RepairJobStatus.InProgress &&
      second.status !== RepairJobStatus.InProgress
    ) {
      return -1;
    }
    if (
      second.status === RepairJobStatus.InProgress &&
      first.status !== RepairJobStatus.InProgress
    ) {
      return 1;
    }
    if (
      first.status === RepairJobStatus.Pending &&
      second.status === RepairJobStatus.Pending
    ) {
      return first.priority - second.priority;
    }
    if (
      first.status === RepairJobStatus.Completed &&
      second.status !== RepairJobStatus.Completed
    ) {
      return 1;
    }
    if (
      second.status === RepairJobStatus.Completed &&
      first.status !== RepairJobStatus.Completed
    ) {
      return -1;
    }
    return 0;
  });
}

export function calculateRepairStats(
  allJobs: readonly IRepairJob[],
): RepairStats {
  const pending = allJobs.filter(
    (job) => job.status === RepairJobStatus.Pending,
  );
  const active = allJobs.filter(
    (job) => job.status === RepairJobStatus.InProgress,
  );
  const complete = allJobs.filter(
    (job) => job.status === RepairJobStatus.Completed,
  );
  const totalCost = pending.reduce((sum, job) => sum + job.totalCost, 0);

  return {
    pending: pending.length,
    active: active.length,
    complete: complete.length,
    totalCost,
  };
}

export function getPendingJobsInPriorityOrder(
  allJobs: readonly IRepairJob[],
): IRepairJob[] {
  return allJobs
    .filter((job) => job.status === RepairJobStatus.Pending)
    .sort((first, second) => first.priority - second.priority);
}

export function reorderPendingJobs(
  pendingJobs: IRepairJob[],
  jobId: string,
  direction: 'up' | 'down',
): string[] | null {
  const currentIndex = pendingJobs.findIndex((job) => job.id === jobId);

  if (direction === 'up') {
    if (currentIndex <= 0) {
      return null;
    }
    const reordered = [...pendingJobs];
    [reordered[currentIndex - 1], reordered[currentIndex]] = [
      reordered[currentIndex],
      reordered[currentIndex - 1],
    ];
    return reordered.map((job) => job.id);
  }

  if (currentIndex < 0 || currentIndex >= pendingJobs.length - 1) {
    return null;
  }
  const reordered = [...pendingJobs];
  [reordered[currentIndex], reordered[currentIndex + 1]] = [
    reordered[currentIndex + 1],
    reordered[currentIndex],
  ];
  return reordered.map((job) => job.id);
}
