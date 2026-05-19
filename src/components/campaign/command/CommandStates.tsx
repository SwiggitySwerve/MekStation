/**
 * Command Surface State Components
 *
 * Shared loading / empty / error presentation for the three command-tier
 * surfaces (CP2b — `add-campaign-command-ui`). Per design D7 every command
 * surface implements the `campaign-ui` loading / empty / error pattern;
 * these components keep that pattern in one place so all three surfaces
 * stay consistent. Mirrors `bays/BayStates` for the CP2a parallel.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @module components/campaign/command/CommandStates
 */

import React from 'react';

import { Card, EmptyState } from '@/components/ui';

// =============================================================================
// Loading
// =============================================================================

/**
 * Loading skeleton for a command surface while the campaign command data
 * is still resolving. Mirrors the pulsing-card skeleton used by the
 * existing `campaign-ui` pages.
 */
export function CommandLoading(): React.ReactElement {
  return (
    <div className="animate-pulse" data-testid="command-loading">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-32">
            <div className="h-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Empty
// =============================================================================

interface CommandEmptyProps {
  /** Title of the empty state. */
  readonly title: string;
  /** Supporting message. */
  readonly message: string;
}

/**
 * Empty state for a command surface — shown when a market has nothing on
 * offer this cycle, or the ledger has no entries. Per design D7 an empty
 * market is an empty state, NOT an error.
 */
export function CommandEmpty({
  title,
  message,
}: CommandEmptyProps): React.ReactElement {
  return (
    <EmptyState title={title} message={message} data-testid="command-empty" />
  );
}

// =============================================================================
// Error
// =============================================================================

interface CommandErrorProps {
  /** Human-readable failure message. */
  readonly message: string;
  /** Retry affordance — re-attempts the command-data load. */
  readonly onRetry: () => void;
}

/**
 * Error state for a command surface — shown when the campaign command
 * data load fails, or a stale action could not be applied. Carries a
 * retry affordance per the spec's error-state scenarios.
 */
export function CommandError({
  message,
  onRetry,
}: CommandErrorProps): React.ReactElement {
  return (
    <div
      className="rounded-xl border border-red-600/30 bg-red-900/20 p-8 text-center"
      data-testid="command-error"
    >
      <h2 className="mb-2 text-xl font-semibold text-red-400">
        Could not complete the command
      </h2>
      <p className="text-text-theme-secondary mb-6">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-surface-raised hover:bg-border-theme text-text-theme-primary inline-block rounded-lg px-6 py-2 transition-colors"
        data-testid="command-error-retry"
      >
        Retry
      </button>
    </div>
  );
}
