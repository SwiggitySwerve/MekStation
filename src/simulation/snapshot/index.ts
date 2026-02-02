import { SnapshotManager } from './SnapshotManager';

export { SnapshotManager } from './SnapshotManager';
export type { ISnapshot } from './SnapshotManager';

export function cleanupOldSnapshots(days: number = 30): number {
  const manager = new SnapshotManager();
  return manager.deleteOldSnapshots(days);
}
