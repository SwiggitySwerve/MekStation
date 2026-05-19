/**
 * Bay Surface State Components
 *
 * Shared loading / empty / error presentation for the four post-battle
 * bay surfaces (CP2a — `add-campaign-bay-ui`). Per design D7 every bay
 * surface implements the `campaign-ui` loading / empty / error pattern;
 * these components keep that pattern in one place so all four surfaces
 * stay consistent.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 * @module components/campaign/bays/BayStates
 */

import React from 'react';

import { Card, EmptyState } from '@/components/ui';

// =============================================================================
// Loading
// =============================================================================

/**
 * Loading skeleton for a bay surface while the campaign inventory is
 * still resolving. Mirrors the pulsing-card skeleton used by the
 * existing `campaign-ui` pages (forces / personnel / missions).
 */
export function BayLoading(): React.ReactElement {
  return (
    <div className="animate-pulse" data-testid="bay-loading">
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

interface BayEmptyProps {
  /** Title of the empty state. */
  readonly title: string;
  /** Supporting message. */
  readonly message: string;
}

/**
 * Empty state for a bay surface — shown when the bay has no items (e.g.
 * no battles fought). Per design D7 an empty bay is an empty state, NOT
 * an error.
 */
export function BayEmpty({
  title,
  message,
}: BayEmptyProps): React.ReactElement {
  return <EmptyState title={title} message={message} data-testid="bay-empty" />;
}

// =============================================================================
// Error
// =============================================================================

interface BayErrorProps {
  /** Human-readable failure message. */
  readonly message: string;
  /** Retry affordance — re-attempts the inventory load. */
  readonly onRetry: () => void;
}

/**
 * Error state for a bay surface — shown when the campaign inventory load
 * fails. Carries a retry affordance per the spec's "Error state on
 * inventory failure" scenario.
 */
export function BayError({
  message,
  onRetry,
}: BayErrorProps): React.ReactElement {
  return (
    <div
      className="rounded-xl border border-red-600/30 bg-red-900/20 p-8 text-center"
      data-testid="bay-error"
    >
      <h2 className="mb-2 text-xl font-semibold text-red-400">
        Could not load bay
      </h2>
      <p className="text-text-theme-secondary mb-6">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="bg-surface-raised hover:bg-border-theme text-text-theme-primary inline-block rounded-lg px-6 py-2 transition-colors"
        data-testid="bay-error-retry"
      >
        Retry
      </button>
    </div>
  );
}
