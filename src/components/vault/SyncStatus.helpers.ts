import type { P2PConnectionState } from '@/types/vault';

export type SyncConnectionState = 'online' | 'syncing' | 'offline' | 'error';

export function truncateFriendCode(code: string): string {
  if (code.length <= 12) return code;
  return code.slice(0, 4) + '...' + code.slice(-4);
}

export function getConnectionStateLabel(state: P2PConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'disconnected':
      return 'Offline';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
}
