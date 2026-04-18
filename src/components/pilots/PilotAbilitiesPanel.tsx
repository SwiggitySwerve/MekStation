/**
 * PilotAbilitiesPanel — Phase 5 Wave 2a SPA editor section.
 *
 * Mounted on the pilot detail page (and the post-creation flow) below
 * the existing skills + career stats. Lists every SPA the pilot owns
 * with category accent + designation + source, and exposes an
 * "Add Ability" button that opens `<SPAPickerModal>` configured for
 * purchase.
 *
 * Architectural notes:
 *   - All catalog lookups go through `@/lib/spa.getSPADefinition()` —
 *     never duplicate the catalog or hardcode displayName/description.
 *   - State changes (purchase + remove) flow through `usePilotStore`
 *     so the rest of the app (roster, mech assignment) sees fresh data.
 *   - The "Remove" affordance is rendered for every row but disabled
 *     outside the creation flow, with an explanatory tooltip — that's
 *     less surprising than hiding it entirely (per spec task 6.3).
 *   - When a flaw is added, the panel surfaces the XP grant in a toast
 *     so the user understands why their XP pool went up.
 *   - Origin-only SPAs are filtered out of the modal entirely outside
 *     creation flow (the picker drops them via affordability + source
 *     gating); inside creation flow they show with a 0-XP badge.
 */

import React, { useCallback, useMemo, useState } from 'react';

import type { SPADesignation } from '@/components/spa/SPAPicker/types';
import type { IPilot, IPilotAbilityRef } from '@/types/pilot';
import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { useToast } from '@/components/shared/Toast';
import {
  SPA_CATEGORY_COLORS,
  SPA_CATEGORY_LABELS,
} from '@/components/spa/SPAPicker';
import { SPAPickerModal } from '@/components/spa/SPAPickerModal';
import { Badge, Button, Card, CardSection } from '@/components/ui';
import { getSPADefinition } from '@/lib/spa';
import { usePilotStore } from '@/stores/usePilotStore';

// =============================================================================
// Props
// =============================================================================

export interface IPilotAbilitiesPanelProps {
  /** The pilot whose abilities are being edited. */
  pilot: IPilot;
  /** True when rendered inside the pilot creation flow. Enables flaw
   *  purchase, origin-only SPAs, and per-row removal. */
  isCreationFlow?: boolean;
  /** Optional callback fired after a successful add or remove. The
   *  store refreshes pilots automatically; this hook lets parent
   *  components run side-effects (e.g. analytics, focus). */
  onPilotChange?: () => void;
}

// =============================================================================
// Owned-ability row
// =============================================================================

interface OwnedRowProps {
  abilityRef: IPilotAbilityRef;
  spa: ISPADefinition | null;
  isCreationFlow: boolean;
  onRemove: () => void;
  isRemoving: boolean;
}

/**
 * One row in the owned-abilities list. Falls back to a degraded card
 * when the SPA id no longer resolves in the catalog (legacy alias drift).
 *
 * Note: the prop is `abilityRef` (not `ref`) to avoid colliding with
 * React's reserved `ref` prop name on function components.
 */
function OwnedAbilityRow({
  abilityRef,
  spa,
  isCreationFlow,
  onRemove,
  isRemoving,
}: OwnedRowProps): React.ReactElement {
  // Unresolvable id — render a minimal card so the user can still see
  // the row exists and remove it during creation.
  if (!spa) {
    return (
      <li className="border-border-theme-subtle bg-surface-raised/20 flex items-center justify-between rounded-lg border p-3">
        <span className="text-text-theme-muted text-sm">
          Unknown ability: {abilityRef.abilityId}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!isCreationFlow || isRemoving}
          onClick={onRemove}
          isLoading={isRemoving}
        >
          Remove
        </Button>
      </li>
    );
  }

  const colorSlug = SPA_CATEGORY_COLORS[spa.category] ?? 'slate';
  const categoryLabel = SPA_CATEGORY_LABELS[spa.category] ?? spa.category;

  return (
    <li
      data-testid={`owned-spa-${spa.id}`}
      className="border-border-theme-subtle bg-surface-raised/40 flex flex-col gap-2 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-label={`Category: ${categoryLabel}`}
            className={`inline-block h-2 w-2 rounded-full bg-${colorSlug}-400`}
          />
          <h4 className="text-text-theme-primary font-semibold">
            {spa.displayName}
          </h4>
          {abilityRef.designation && (
            <Badge variant="cyan" size="sm">
              {abilityRef.designation.displayLabel}
            </Badge>
          )}
          {spa.isFlaw && (
            <Badge variant="red" size="sm">
              Flaw
            </Badge>
          )}
          {spa.isOriginOnly && (
            <Badge variant="amber" size="sm">
              Origin
            </Badge>
          )}
          <span className="border-border-theme-subtle bg-surface-base text-text-theme-secondary rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            {spa.source}
          </span>
        </div>
        <p className="text-text-theme-secondary mt-1 text-sm">
          {spa.description}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        {abilityRef.xpSpent !== undefined && (
          <span className="text-text-theme-muted text-xs tabular-nums">
            {abilityRef.xpSpent >= 0
              ? `${abilityRef.xpSpent} XP`
              : `+${-abilityRef.xpSpent} XP`}
          </span>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={!isCreationFlow || isRemoving}
          onClick={onRemove}
          isLoading={isRemoving}
          title={
            isCreationFlow
              ? undefined
              : 'Abilities cannot be removed after creation'
          }
        >
          Remove
        </Button>
      </div>
    </li>
  );
}

// =============================================================================
// Main panel
// =============================================================================

/**
 * The Abilities section. Encapsulates list + add button + modal so the
 * pilot detail page only has to mount one component.
 */
export function PilotAbilitiesPanel({
  pilot,
  isCreationFlow = false,
  onPilotChange,
}: IPilotAbilitiesPanelProps): React.ReactElement {
  const { purchaseSPA, removeSPA, error } = usePilotStore();
  const { showToast } = useToast();

  const [isModalOpen, setModalOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const availableXp = pilot.career?.xp ?? 0;

  // Resolve every owned ability against the canonical catalog up-front
  // so the row renderer doesn't repeat the lookup. `null` entries surface
  // legacy ids the catalog no longer recognizes.
  const ownedRows = useMemo(
    () =>
      (pilot.abilities ?? []).map((abilityRef) => ({
        abilityRef,
        spa: getSPADefinition(abilityRef.abilityId),
      })),
    [pilot.abilities],
  );

  const ownedIds = useMemo(
    () => (pilot.abilities ?? []).map((a) => a.abilityId),
    [pilot.abilities],
  );

  const handleSelect = useCallback(
    async (
      spa: ISPADefinition,
      designation?: SPADesignation,
    ): Promise<void> => {
      // The picker only shows affordable rows in purchase mode, but the
      // service still validates — guard the toast UX here too.
      const xpCost = spa.xpCost ?? 0;
      if (xpCost > 0 && availableXp < xpCost) {
        showToast({
          message: `Insufficient XP — need ${xpCost}, have ${availableXp}`,
          variant: 'error',
        });
        return;
      }

      setPendingId(spa.id);
      const success = await purchaseSPA(pilot.id, spa.id, {
        designation,
        isCreationFlow,
      });
      setPendingId(null);

      if (success) {
        if (spa.isFlaw && spa.xpCost !== null && spa.xpCost < 0) {
          showToast({
            message: `${spa.displayName} added — granted ${Math.abs(spa.xpCost)} XP`,
            variant: 'success',
          });
        } else {
          showToast({
            message: `${spa.displayName} added`,
            variant: 'success',
          });
        }
        onPilotChange?.();
      } else {
        showToast({
          message: error || `Failed to add ${spa.displayName}`,
          variant: 'error',
        });
      }
    },
    [
      availableXp,
      error,
      isCreationFlow,
      onPilotChange,
      pilot.id,
      purchaseSPA,
      showToast,
    ],
  );

  const handleRemove = useCallback(
    async (abilityRef: IPilotAbilityRef): Promise<void> => {
      const spa = getSPADefinition(abilityRef.abilityId);
      const label = spa?.displayName ?? abilityRef.abilityId;

      setPendingId(abilityRef.abilityId);
      const success = await removeSPA(pilot.id, abilityRef.abilityId, {
        isCreationFlow,
      });
      setPendingId(null);

      if (success) {
        showToast({ message: `${label} removed`, variant: 'success' });
        onPilotChange?.();
      } else {
        showToast({
          message: error || `Failed to remove ${label}`,
          variant: 'error',
        });
      }
    },
    [error, isCreationFlow, onPilotChange, pilot.id, removeSPA, showToast],
  );

  return (
    <Card variant="dark">
      <CardSection title="Abilities">
        <div className="flex items-center gap-3">
          <Badge variant="amber" size="sm">
            {availableXp} XP available
          </Badge>
          {isCreationFlow && (
            <Badge variant="cyan" size="sm">
              Creation flow
            </Badge>
          )}
          <div className="flex-1" />
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            data-testid="add-ability-btn"
            leftIcon={
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
          >
            Add Ability
          </Button>
        </div>
      </CardSection>

      {ownedRows.length === 0 ? (
        <div className="bg-surface-raised/20 border-border-theme-subtle text-text-theme-secondary mt-4 rounded-lg border border-dashed p-6 text-center text-sm">
          No abilities yet — open the picker to browse the unified catalog.
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2" aria-label="Owned abilities">
          {ownedRows.map(({ abilityRef, spa }) => (
            <OwnedAbilityRow
              key={abilityRef.abilityId}
              abilityRef={abilityRef}
              spa={spa}
              isCreationFlow={isCreationFlow}
              onRemove={() => handleRemove(abilityRef)}
              isRemoving={pendingId === abilityRef.abilityId}
            />
          ))}
        </ul>
      )}

      {error && (
        <div className="mt-4 rounded border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <SPAPickerModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelect}
        excludedIds={ownedIds}
        availableXP={availableXp}
        mode="purchase"
      />
    </Card>
  );
}

export default PilotAbilitiesPanel;
