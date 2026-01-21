/**
 * ConnectionQualityIndicator Component
 * Displays connection quality metrics for P2P sync.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import React, { useState, useEffect } from 'react';
import { ConnectionState, getRetryState } from '@/lib/p2p';

// =============================================================================
// Types
// =============================================================================

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

interface ConnectionQualityIndicatorProps {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Number of connected peers */
  peerCount: number;
  /** Show detailed info on hover/click */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface QualityInfo {
  quality: ConnectionQuality;
  label: string;
  color: string;
  bgColor: string;
  bars: number; // 0-4
}

// =============================================================================
// Quality Assessment
// =============================================================================

function assessQuality(
  connectionState: ConnectionState,
  peerCount: number,
  retryAttempts: number
): QualityInfo {
  // Disconnected
  if (connectionState === ConnectionState.Disconnected) {
    return {
      quality: 'disconnected',
      label: 'Disconnected',
      color: 'text-text-theme-muted',
      bgColor: 'bg-text-theme-muted/30',
      bars: 0,
    };
  }

  // Connecting
  if (connectionState === ConnectionState.Connecting) {
    return {
      quality: 'fair',
      label: 'Connecting',
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/30',
      bars: 2,
    };
  }

  // Error state
  if (connectionState === ConnectionState.Error) {
    return {
      quality: 'poor',
      label: 'Connection Error',
      color: 'text-red-400',
      bgColor: 'bg-red-400/30',
      bars: 1,
    };
  }

  // Connected - assess quality based on peers and retry state
  if (retryAttempts > 0) {
    return {
      quality: 'fair',
      label: 'Reconnecting',
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/30',
      bars: 2,
    };
  }

  if (peerCount === 0) {
    return {
      quality: 'good',
      label: 'Connected (No peers)',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/30',
      bars: 3,
    };
  }

  if (peerCount >= 1) {
    return {
      quality: 'excellent',
      label: `Connected (${peerCount} peer${peerCount > 1 ? 's' : ''})`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/30',
      bars: 4,
    };
  }

  return {
    quality: 'good',
    label: 'Connected',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/30',
    bars: 3,
  };
}

// =============================================================================
// Signal Bars
// =============================================================================

interface SignalBarsProps {
  bars: number;
  color: string;
}

function SignalBars({ bars, color }: SignalBarsProps): React.ReactElement {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`
            w-1 rounded-sm transition-colors
            ${level <= bars ? color : 'bg-text-theme-muted/20'}
          `}
          style={{ height: `${level * 25}%` }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ConnectionQualityIndicator({
  connectionState,
  peerCount,
  showDetails = true,
  className = '',
}: ConnectionQualityIndicatorProps): React.ReactElement {
  const [retryState, setRetryState] = useState(getRetryState());
  const [isExpanded, setIsExpanded] = useState(false);

  // Poll retry state when connecting or in error
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) {
      const interval = setInterval(() => {
        setRetryState(getRetryState());
      }, 1000);
      return () => clearInterval(interval);
    }
    // Reset when connected
    setRetryState({ isRetrying: false, attempts: 0, maxAttempts: 5 });
  }, [connectionState]);

  const qualityInfo = assessQuality(connectionState, peerCount, retryState.attempts);

  return (
    <div className={`relative ${className}`}>
      {/* Main indicator button */}
      <button
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-2 py-1 rounded-md transition-colors
          ${showDetails ? 'hover:bg-surface-raised/50 cursor-pointer' : 'cursor-default'}
          ${isExpanded ? 'bg-surface-raised/50' : ''}
        `}
        aria-label={`Connection quality: ${qualityInfo.label}`}
        aria-expanded={showDetails ? isExpanded : undefined}
      >
        <SignalBars bars={qualityInfo.bars} color={qualityInfo.bgColor} />
        <span className={`text-xs font-medium ${qualityInfo.color}`}>
          {connectionState === ConnectionState.Connected
            ? peerCount > 0
              ? `${peerCount}`
              : '0'
            : connectionState === ConnectionState.Connecting
              ? '...'
              : ''}
        </span>
      </button>

      {/* Details popover */}
      {showDetails && isExpanded && (
        <div
          className="absolute top-full right-0 mt-1 w-56 p-3 rounded-lg bg-surface-raised border border-border-theme-subtle shadow-lg z-50"
        >
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-theme-muted">Status</span>
              <span className={`text-xs font-medium ${qualityInfo.color}`}>
                {qualityInfo.label}
              </span>
            </div>

            {/* Quality bar */}
            <div className="space-y-1">
              <span className="text-xs text-text-theme-muted">Signal Quality</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-base overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${qualityInfo.bgColor}`}
                    style={{ width: `${(qualityInfo.bars / 4) * 100}%` }}
                  />
                </div>
                <span className={`text-xs ${qualityInfo.color}`}>
                  {qualityInfo.bars}/4
                </span>
              </div>
            </div>

            {/* Peer count */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-theme-muted">Peers</span>
              <span className="text-xs text-text-theme-primary">
                {peerCount} connected
              </span>
            </div>

            {/* Retry info */}
            {retryState.isRetrying && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-theme-muted">Retry</span>
                <span className="text-xs text-amber-400">
                  {retryState.attempts}/{retryState.maxAttempts}
                </span>
              </div>
            )}

            {/* Connection type */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-theme-muted">Type</span>
              <span className="text-xs text-text-theme-secondary">
                WebRTC P2P
              </span>
            </div>
          </div>

          {/* Close hint */}
          <div className="mt-3 pt-2 border-t border-border-theme-subtle/50">
            <p className="text-[10px] text-text-theme-muted text-center">
              Click outside to close
            </p>
          </div>
        </div>
      )}

      {/* Click outside handler */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default ConnectionQualityIndicator;
