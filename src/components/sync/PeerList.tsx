/**
 * PeerList Component
 * Displays connected peers in a P2P sync room with visual hierarchy.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import React from 'react';
import type { IPeer } from '@/lib/p2p';

// =============================================================================
// Types
// =============================================================================

interface PeerListProps {
  /** List of connected peers */
  peers: readonly IPeer[];
  /** Local peer ID to mark with "(you)" indicator */
  localPeerId: string | null;
  /** Local peer display name */
  localPeerName?: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

interface PeerItemProps {
  peer: IPeer;
  isLocal: boolean;
}

function PeerItem({ peer, isLocal }: PeerItemProps): React.ReactElement {
  const displayName = peer.name || `Peer ${peer.id.slice(0, 6)}`;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <li className="flex items-center gap-3 py-2 px-3 rounded-lg bg-surface-base/30 border border-border-theme-subtle/50">
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
          ${isLocal
            ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/40'
            : 'bg-surface-raised text-text-theme-secondary border border-border-theme-subtle'
          }
        `}
      >
        {initials}
      </div>

      {/* Name and indicator */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              isLocal ? 'text-cyan-400' : 'text-text-theme-primary'
            }`}
          >
            {displayName}
          </span>
          {isLocal && (
            <span className="text-xs text-cyan-500/80 font-medium">(you)</span>
          )}
        </div>
      </div>

      {/* Online indicator */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-pulse" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    </li>
  );
}

// =============================================================================
// Component
// =============================================================================

export function PeerList({
  peers,
  localPeerId,
  localPeerName,
  className = '',
}: PeerListProps): React.ReactElement {
  // Build list with local peer first if connected
  const allPeers: Array<{ peer: IPeer; isLocal: boolean }> = [];

  // Add local peer entry if we have a local ID
  if (localPeerId) {
    allPeers.push({
      peer: {
        id: localPeerId,
        name: localPeerName || undefined,
        connectedAt: new Date().toISOString(),
      },
      isLocal: true,
    });
  }

  // Add remote peers
  for (const peer of peers) {
    if (peer.id !== localPeerId) {
      allPeers.push({ peer, isLocal: false });
    }
  }

  const isEmpty = allPeers.length === 0;

  return (
    <div className={`${className}`}>
      {isEmpty ? (
        <div className="py-8 text-center">
          <svg
            className="w-10 h-10 mx-auto text-text-theme-muted/50 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <p className="text-sm text-text-theme-muted">No peers connected</p>
          <p className="text-xs text-text-theme-muted/70 mt-1">
            Share your room code to invite others
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {allPeers.map(({ peer, isLocal }) => (
            <PeerItem key={peer.id} peer={peer} isLocal={isLocal} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default PeerList;
