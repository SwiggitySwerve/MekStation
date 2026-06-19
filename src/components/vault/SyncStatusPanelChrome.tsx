import React from 'react';

import {
  SignalIcon,
  XMarkIcon,
  SpinnerIcon,
  ExclamationCircleIcon,
} from './SyncStatus.icons';

const syncHeaderBackdropClasses = [
  'absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent',
  'absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/10 via-transparent to-transparent',
];

interface SyncStatusHeaderProps {
  onClose: () => void;
}

export function SyncStatusHeader({
  onClose,
}: SyncStatusHeaderProps): React.ReactElement {
  return (
    <div className="relative flex-shrink-0 overflow-hidden">
      {syncHeaderBackdropClasses.map((className) => (
        <div key={className} className={className} />
      ))}
      <div className="relative border-b border-gray-700/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 shadow-lg shadow-cyan-500/10">
              <SignalIcon className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Sync Status
              </h2>
              <p className="text-sm text-gray-400">
                Message queue & peer connections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sync status"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SyncLoadingState(): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-16">
      <SpinnerIcon className="h-8 w-8 text-cyan-400" />
      <span className="ml-3 font-medium text-gray-400">
        Loading sync status...
      </span>
    </div>
  );
}

interface SyncErrorStateProps {
  error: string;
}

export function SyncErrorState({
  error,
}: SyncErrorStateProps): React.ReactElement {
  return (
    <div className="p-6">
      <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-900/30 p-4">
        <ExclamationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
        <div>
          <p className="font-medium text-red-300">Failed to load sync status</p>
          <p className="mt-1 text-sm text-red-400/70">{error}</p>
        </div>
      </div>
    </div>
  );
}
