/**
 * SyncBadge Component
 * Small icon badge indicating sync state for vault items.
 * Shows visual state with tooltip for detailed description.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import React, { useState, useCallback } from 'react';

import { SyncState } from '@/lib/p2p';

// =============================================================================
// Types
// =============================================================================

interface SyncBadgeProps {
  /** Current sync state of the item */
  state: SyncState;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// State Configuration
// =============================================================================

interface StateConfig {
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  borderColor: string;
  tooltip: string;
  animate: boolean;
}

function getSyncedIcon(className: string): React.ReactNode {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function getPendingIcon(className: string): React.ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function getSyncingIcon(className: string): React.ReactNode {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function getConflictIcon(className: string): React.ReactNode {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function getDisabledIcon(className: string): React.ReactNode {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}

function getStateConfig(state: SyncState, iconSize: string): StateConfig {
  switch (state) {
    case SyncState.Synced:
      return {
        icon: getSyncedIcon(iconSize),
        bgColor: 'bg-emerald-600/20',
        iconColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        tooltip: 'Synced with all peers',
        animate: false,
      };
    case SyncState.Pending:
      return {
        icon: getPendingIcon(iconSize),
        bgColor: 'bg-amber-600/20',
        iconColor: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        tooltip: 'Changes pending sync',
        animate: false,
      };
    case SyncState.Syncing:
      return {
        icon: getSyncingIcon(`${iconSize} animate-spin`),
        bgColor: 'bg-cyan-600/20',
        iconColor: 'text-cyan-400',
        borderColor: 'border-cyan-500/40',
        tooltip: 'Syncing...',
        animate: true,
      };
    case SyncState.Conflict:
      return {
        icon: getConflictIcon(iconSize),
        bgColor: 'bg-red-600/20',
        iconColor: 'text-red-400',
        borderColor: 'border-red-500/40',
        tooltip: 'Sync conflict - needs resolution',
        animate: false,
      };
    case SyncState.Disabled:
    default:
      return {
        icon: getDisabledIcon(iconSize),
        bgColor: 'bg-slate-600/20',
        iconColor: 'text-slate-500',
        borderColor: 'border-slate-500/30',
        tooltip: 'Sync disabled',
        animate: false,
      };
  }
}

// =============================================================================
// Size Configuration
// =============================================================================

const sizeConfig = {
  sm: {
    container: 'w-5 h-5',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'w-6 h-6',
    icon: 'w-3.5 h-3.5',
  },
};

// =============================================================================
// Component
// =============================================================================

export function SyncBadge({
  state,
  size = 'sm',
  className = '',
}: SyncBadgeProps): React.ReactElement {
  const [showTooltip, setShowTooltip] = useState(false);
  const sizes = sizeConfig[size];
  const config = getStateConfig(state, sizes.icon);

  const handleMouseEnter = useCallback(() => setShowTooltip(true), []);
  const handleMouseLeave = useCallback(() => setShowTooltip(false), []);

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Badge */}
      <div
        className={` ${sizes.container} flex items-center justify-center rounded-full border ${config.bgColor} ${config.iconColor} ${config.borderColor} transition-colors`}
        aria-label={config.tooltip}
      >
        {config.icon}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="bg-surface-raised border-border-theme absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border px-2.5 py-1.5 whitespace-nowrap shadow-lg shadow-black/30">
          <p className="text-text-theme-primary text-xs font-medium">
            {config.tooltip}
          </p>
          {/* Tooltip arrow */}
          <div className="border-t-surface-raised absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" />
        </div>
      )}
    </div>
  );
}

export default SyncBadge;
