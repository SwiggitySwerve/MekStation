/**
 * useSyncToasts Hook
 * Connects P2P sync events to the toast notification system.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import { useEffect } from 'react';

import { useToastSafe } from '@/components/ui/Toast';
import { onSyncEvent, type SyncEvent } from '@/lib/p2p';

/**
 * Maps sync events to toast notifications.
 * Should be called once at app root (inside ToastProvider).
 */
export function useSyncToasts(): void {
  const { addToast } = useToastSafe();

  useEffect(() => {
    const unsubscribe = onSyncEvent((event: SyncEvent) => {
      switch (event.type) {
        case 'connected':
          addToast({
            message: `Connected to room ${formatRoomCode(event.roomCode)}`,
            variant: 'success',
            duration: 3000,
          });
          break;

        case 'disconnected':
          if (event.reason && event.reason !== 'Room destroyed') {
            addToast({
              message: `Disconnected: ${event.reason}`,
              variant: 'warning',
              duration: 4000,
            });
          }
          break;

        case 'peer-joined':
          addToast({
            message: `${event.peer.name || 'A peer'} joined the room`,
            variant: 'info',
            duration: 3000,
          });
          break;

        case 'peer-left':
          addToast({
            message: 'A peer left the room',
            variant: 'info',
            duration: 3000,
          });
          break;

        case 'sync-completed':
          // Don't toast on every sync completion (too noisy)
          break;

        case 'conflict':
          addToast({
            message: 'Sync conflict detected. Manual resolution may be needed.',
            variant: 'warning',
            duration: 6000,
          });
          break;

        case 'error':
          addToast({
            message: event.message || 'Sync error occurred',
            variant: 'error',
            duration: 5000,
          });
          break;
      }
    });

    return unsubscribe;
  }, [addToast]);
}

/**
 * Format room code for display (XXX-XXX format).
 */
function formatRoomCode(code: string): string {
  const clean = code.replace(/-/g, '').toUpperCase();
  if (clean.length === 6) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return code.toUpperCase();
}

export default useSyncToasts;
