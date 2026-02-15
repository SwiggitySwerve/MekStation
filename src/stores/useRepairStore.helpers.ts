import {
  IRepairJob,
  RepairJobStatus,
  calculateTotalRepairCost,
  calculateTotalRepairTime,
} from '@/types/repair';

export { calculateTotalRepairCost, calculateTotalRepairTime };

export function recalculateJobTotals(job: IRepairJob): IRepairJob {
  const preserveTime =
    job.status === RepairJobStatus.InProgress ||
    job.status === RepairJobStatus.Completed;
  return {
    ...job,
    totalCost: calculateTotalRepairCost(job.items),
    totalTimeHours: calculateTotalRepairTime(job.items),
    timeRemainingHours: preserveTime
      ? job.timeRemainingHours
      : calculateTotalRepairTime(job.items),
  };
}
