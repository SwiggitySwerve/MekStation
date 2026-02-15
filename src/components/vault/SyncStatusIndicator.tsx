import React from 'react';

import { formatNumber } from '@/utils/formatting';

import type { SyncConnectionState } from './SyncStatus.helpers';

import {
  CloudIcon,
  CloudArrowUpIcon,
  CloudOffIcon,
  ExclamationCircleIcon,
} from './SyncStatus.icons';

export interface SyncStatusIndicatorProps {
  state: SyncConnectionState;
  pendingCount?: number;
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SyncStatusIndicator({
  state,
  pendingCount = 0,
  showLabel = false,
  onClick,
  className = '',
}: SyncStatusIndicatorProps): React.ReactElement {
  const stateConfig: Record<
    SyncConnectionState,
    {
      icon: React.ReactNode;
      bgClass: string;
      dotClass: string;
      textClass: string;
      label: string;
      pulseClass?: string;
    }
  > = {
    online: {
      icon: <CloudIcon className="h-4 w-4" />,
      bgClass:
        'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      label: 'Synced',
    },
    syncing: {
      icon: <CloudArrowUpIcon className="h-4 w-4" />,
      bgClass: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
      dotClass: 'bg-blue-500',
      textClass: 'text-blue-400',
      label: 'Syncing',
      pulseClass: 'animate-pulse',
    },
    offline: {
      icon: <CloudOffIcon className="h-4 w-4" />,
      bgClass: 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30',
      dotClass: 'bg-gray-500',
      textClass: 'text-gray-400',
      label: 'Offline',
    },
    error: {
      icon: <ExclamationCircleIcon className="h-4 w-4" />,
      bgClass: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30',
      dotClass: 'bg-red-500',
      textClass: 'text-red-400',
      label: 'Error',
    },
  };

  const config = stateConfig[state];
  const hasPending = pendingCount > 0;

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all duration-200 ${config.bgClass} ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className} `}
      title={`${config.label}${hasPending ? ` • ${pendingCount} pending` : ''}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulseClass && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-75 ${config.pulseClass}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`}
        />
      </span>

      <span className={config.textClass}>{config.icon}</span>

      {showLabel && (
        <span className={`text-xs font-medium ${config.textClass}`}>
          {config.label}
        </span>
      )}

      {hasPending && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-amber-500/30">
          {formatNumber(pendingCount)}
        </span>
      )}
    </button>
  );
}
