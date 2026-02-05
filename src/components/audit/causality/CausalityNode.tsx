/**
 * CausalityNode Component
 * Individual node in the causality DAG.
 * Shows event type, category badge, and selection state.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { ICausalityNode } from '@/hooks/audit';
import { EventCategory } from '@/types/events';

// =============================================================================
// Types
// =============================================================================

export interface CausalityNodeProps {
  /** The causality node to display */
  node: ICausalityNode;
  /** Click handler for selection */
  onClick?: () => void;
  /** Whether this node is currently selected */
  isSelected?: boolean;
  /** Whether this is the focus event (the one being traced) */
  isFocusEvent?: boolean;
  /** Compact mode shows minimal info */
  compact?: boolean;
}

// =============================================================================
// Configuration
// =============================================================================

type CategoryConfig = {
  badgeVariant: 'amber' | 'cyan' | 'emerald' | 'violet' | 'rose' | 'slate';
  ringColor: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
};

const CATEGORY_CONFIG: Record<EventCategory, CategoryConfig> = {
  [EventCategory.Game]: {
    badgeVariant: 'amber',
    ringColor: 'ring-amber-500/50',
    bgColor: 'bg-amber-950/30',
    borderColor: 'border-amber-600/40',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
        />
      </svg>
    ),
  },
  [EventCategory.Campaign]: {
    badgeVariant: 'cyan',
    ringColor: 'ring-cyan-500/50',
    bgColor: 'bg-cyan-950/30',
    borderColor: 'border-cyan-600/40',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
        />
      </svg>
    ),
  },
  [EventCategory.Pilot]: {
    badgeVariant: 'emerald',
    ringColor: 'ring-emerald-500/50',
    bgColor: 'bg-emerald-950/30',
    borderColor: 'border-emerald-600/40',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
  },
  [EventCategory.Repair]: {
    badgeVariant: 'violet',
    ringColor: 'ring-violet-500/50',
    bgColor: 'bg-violet-950/30',
    borderColor: 'border-violet-600/40',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
        />
      </svg>
    ),
  },
  [EventCategory.Award]: {
    badgeVariant: 'rose',
    ringColor: 'ring-rose-500/50',
    bgColor: 'bg-rose-950/30',
    borderColor: 'border-rose-600/40',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.927 0"
        />
      </svg>
    ),
  },
  [EventCategory.Meta]: {
    badgeVariant: 'slate',
    ringColor: 'ring-slate-500/50',
    bgColor: 'bg-slate-800/30',
    borderColor: 'border-slate-600/40',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </svg>
    ),
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format event type to display string (e.g., "pilot.skill_improved" -> "Skill Improved").
 */
function formatEventType(type: string): string {
  const shortType = type.includes('.')
    ? type.split('.').slice(1).join('.')
    : type;
  return shortType
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format timestamp to short format for compact display.
 */
function formatTimestamp(timestamp: string, compact: boolean): string {
  const date = new Date(timestamp);
  if (compact) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// Component
// =============================================================================

export function CausalityNode({
  node,
  onClick,
  isSelected = false,
  isFocusEvent = false,
  compact = false,
}: CausalityNodeProps): React.ReactElement {
  const config =
    CATEGORY_CONFIG[node.event.category] || CATEGORY_CONFIG[EventCategory.Meta];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left transition-all duration-200 ${compact ? 'min-w-[120px] p-2' : 'min-w-[180px] p-3'} rounded-lg border ${config.bgColor} ${config.borderColor} ${isSelected ? `ring-2 ${config.ringColor}` : ''} ${isFocusEvent ? 'ring-accent/70 ring-offset-surface-deep ring-2 ring-offset-2' : ''} ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20' : 'cursor-default'} focus-visible:ring-accent focus:outline-none focus-visible:ring-2`}
    >
      {/* Focus event indicator */}
      {isFocusEvent && (
        <div className="bg-accent absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full" />
      )}

      {/* Header: Icon + Badge */}
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={`bg-surface-raised/50 text-text-theme-secondary flex h-5 w-5 flex-shrink-0 items-center justify-center rounded`}
        >
          {config.icon}
        </span>
        <Badge variant={config.badgeVariant} size="sm" pill>
          {node.event.category}
        </Badge>
      </div>

      {/* Event Type */}
      <p
        className={`text-text-theme-primary truncate font-medium ${compact ? 'text-xs' : 'text-sm'} `}
      >
        {formatEventType(node.event.type)}
      </p>

      {/* Timestamp (shown in full mode only, or on hover in compact) */}
      {!compact && (
        <p className="text-text-theme-muted mt-1 text-xs">
          {formatTimestamp(node.event.timestamp, false)}
        </p>
      )}

      {/* Compact hover tooltip */}
      {compact && (
        <div className="bg-surface-raised text-text-theme-secondary pointer-events-none absolute -bottom-8 left-1/2 z-10 -translate-x-1/2 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {formatTimestamp(node.event.timestamp, false)}
        </div>
      )}

      {/* Depth indicator (subtle) */}
      <div className="absolute right-1.5 bottom-1 opacity-60">
        <span className="text-text-theme-muted font-mono text-[9px]">
          d{node.depth}
        </span>
      </div>
    </button>
  );
}

export default CausalityNode;
