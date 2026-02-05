/**
 * SyncStatusIndicator Component
 * Compact indicator showing P2P sync connection status and peer count.
 * Designed for header bar placement with click-to-open room dialog.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import React from 'react';

import { ConnectionState } from '@/lib/p2p';

// =============================================================================
// Types
// =============================================================================

interface SyncStatusIndicatorProps {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Number of connected peers (excluding self) */
  peerCount: number;
  /** Click handler to open room dialog */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Status Configuration
// =============================================================================

interface StatusConfig {
  dotColor: string;
  pulseColor: string;
  label: string;
  showPulse: boolean;
}

function getStatusConfig(
  state: ConnectionState,
  peerCount: number,
): StatusConfig {
  switch (state) {
    case ConnectionState.Connected:
      return {
        dotColor: 'bg-emerald-500',
        pulseColor: 'bg-emerald-400',
        label:
          peerCount > 0
            ? `${peerCount} peer${peerCount !== 1 ? 's' : ''}`
            : 'Connected',
        showPulse: false,
      };
    case ConnectionState.Connecting:
      return {
        dotColor: 'bg-amber-500',
        pulseColor: 'bg-amber-400',
        label: 'Connecting',
        showPulse: true,
      };
    case ConnectionState.Error:
      return {
        dotColor: 'bg-red-500',
        pulseColor: 'bg-red-400',
        label: 'Error',
        showPulse: false,
      };
    case ConnectionState.Disconnected:
    default:
      return {
        dotColor: 'bg-slate-500',
        pulseColor: 'bg-slate-400',
        label: 'Offline',
        showPulse: false,
      };
  }
}

// =============================================================================
// Component
// =============================================================================

export function SyncStatusIndicator({
  connectionState,
  peerCount,
  onClick,
  className = '',
}: SyncStatusIndicatorProps): React.ReactElement {
  const config = getStatusConfig(connectionState, peerCount);
  const isClickable = onClick !== undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={`bg-surface-base/50 border-border-theme-subtle inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-200 ${isClickable ? 'hover:bg-surface-raised hover:border-border-theme cursor-pointer' : 'cursor-default'} ${className} `}
      aria-label={`Sync status: ${config.label}`}
    >
      {/* Status dot with optional pulse */}
      <span className="relative flex h-2.5 w-2.5">
        {config.showPulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pulseColor} animate-ping opacity-75`}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dotColor}`}
        />
      </span>

      {/* Status label */}
      <span className="text-text-theme-secondary text-sm font-medium">
        {config.label}
      </span>

      {/* Connection icon */}
      <svg
        className="text-text-theme-muted h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
        />
      </svg>
    </button>
  );
}

export default SyncStatusIndicator;
