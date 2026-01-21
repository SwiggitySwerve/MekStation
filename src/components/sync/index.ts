/**
 * Sync Components
 *
 * UI components for P2P vault synchronization.
 *
 * @example
 * ```tsx
 * import {
 *   SyncStatusIndicator,
 *   PeerList,
 *   RoomCodeDialog,
 *   SyncBadge,
 * } from '@/components/sync';
 *
 * // In header bar
 * <SyncStatusIndicator
 *   connectionState={connectionState}
 *   peerCount={peerCount}
 *   onClick={openDialog}
 * />
 *
 * // On vault items
 * <SyncBadge state={SyncState.Synced} />
 * ```
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */

export { SyncStatusIndicator } from './SyncStatusIndicator';
export { PeerList } from './PeerList';
export { RoomCodeDialog } from './RoomCodeDialog';
export { SyncBadge } from './SyncBadge';
export { ConflictResolutionDialog } from './ConflictResolutionDialog';
export { PeerItemList } from './PeerItemList';
export { ConnectionQualityIndicator, type ConnectionQuality } from './ConnectionQualityIndicator';
