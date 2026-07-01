import { useRouter } from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import { Badge } from '@/components/ui';
import { buildCampaignCustomizerReturnHref } from '@/lib/campaign/customizer/campaignCustomizerRoute';
import { extractMechBuildConfigFromUnitState } from '@/lib/campaign/customizer/campaignCustomizerSession';
import { commitRefitOrder } from '@/stores/campaign/campaignRefitActions';
import { useUnitStore, useUnitStoreApi } from '@/stores/useUnitStore';
import { validateConstruction } from '@/utils/construction/constructionRules/validation';

import { useCampaignCustomizerSession } from './CampaignCustomizerSessionContext';

function validationTabFor(message: string): CustomizerTabId {
  const lower = message.toLowerCase();
  if (lower.includes('armor')) return 'armor';
  if (
    lower.includes('engine') ||
    lower.includes('heat') ||
    lower.includes('jump') ||
    lower.includes('tonnage') ||
    lower.includes('gyro') ||
    lower.includes('cockpit') ||
    lower.includes('structure')
  ) {
    return 'structure';
  }
  return 'overview';
}

function countConfigurationChanges(
  current: ReturnType<typeof extractMechBuildConfigFromUnitState>,
  target: ReturnType<typeof extractMechBuildConfigFromUnitState>,
): number {
  return (Object.keys(current) as Array<keyof typeof current>).filter(
    (key) => current[key] !== target[key],
  ).length;
}

export function CampaignRefitCommandBar({
  onTabChange,
}: {
  readonly onTabChange: (tabId: CustomizerTabId) => void;
}): React.ReactElement | null {
  const session = useCampaignCustomizerSession();
  const router = useRouter();
  const store = useUnitStoreApi();
  const isModified = useUnitStore((state) => state.isModified);
  const armorAllocation = useUnitStore((state) => state.armorAllocation);
  const armorType = useUnitStore((state) => state.armorType);
  const cockpitType = useUnitStore((state) => state.cockpitType);
  const configuration = useUnitStore((state) => state.configuration);
  const engineRating = useUnitStore((state) => state.engineRating);
  const engineType = useUnitStore((state) => state.engineType);
  const gyroType = useUnitStore((state) => state.gyroType);
  const heatSinkCount = useUnitStore((state) => state.heatSinkCount);
  const heatSinkType = useUnitStore((state) => state.heatSinkType);
  const internalStructureType = useUnitStore(
    (state) => state.internalStructureType,
  );
  const jumpMP = useUnitStore((state) => state.jumpMP);
  const tonnage = useUnitStore((state) => state.tonnage);
  const [saveError, setSaveError] = useState<string | null>(null);

  const targetConfiguration = useMemo(
    () =>
      extractMechBuildConfigFromUnitState({
        armorAllocation,
        armorType,
        cockpitType,
        configuration,
        engineRating,
        engineType,
        gyroType,
        heatSinkCount,
        heatSinkType,
        internalStructureType,
        jumpMP,
        tonnage,
      }),
    [
      armorAllocation,
      armorType,
      cockpitType,
      configuration,
      engineRating,
      engineType,
      gyroType,
      heatSinkCount,
      heatSinkType,
      internalStructureType,
      jumpMP,
      tonnage,
    ],
  );
  const validation = useMemo(
    () => validateConstruction(targetConfiguration),
    [targetConfiguration],
  );
  const changeCount = useMemo(
    () =>
      session
        ? countConfigurationChanges(
            session.currentConfiguration,
            targetConfiguration,
          )
        : 0,
    [session, targetConfiguration],
  );
  const canSaveRefit = validation.isValid && changeCount > 0;

  // Single muted context string: campaign, plain campaign date (never raw ISO),
  // budget, rules level, and the refit constraint label. Shown truncated with a
  // title tooltip; the build-delta count is surfaced separately above it.
  const refitContextSummary = session
    ? `${session.campaignName} | ${formatCampaignDate(
        session.route.campaignDate,
      )} | Budget ${session.route.budget.toLocaleString()} C-bills | ${
        session.route.rulesLevel
      } rules | ${formatRefitConstraintLabel(session.route.refitConstraints)}`
    : '';

  const handleCancel = useCallback(() => {
    if (!session) return;
    void router.push(
      buildCampaignCustomizerReturnHref(session.route, {
        status: 'cancelled',
      }),
    );
  }, [router, session]);

  const handleSave = useCallback(() => {
    if (!session) return;
    setSaveError(null);

    const latestTarget = extractMechBuildConfigFromUnitState(store.getState());
    const latestValidation = validateConstruction(latestTarget);
    if (!latestValidation.isValid) {
      setSaveError('Resolve construction blockers before saving this refit.');
      return;
    }
    const latestChangeCount = countConfigurationChanges(
      session.currentConfiguration,
      latestTarget,
    );
    if (latestChangeCount === 0) {
      setSaveError('Make at least one refit change before saving an order.');
      return;
    }

    const result = commitRefitOrder({
      unitId: session.route.unitId,
      currentConfiguration: session.currentConfiguration,
      targetConfiguration: latestTarget,
    });
    if (!result.applied) {
      setSaveError(result.reason ?? 'Campaign refit order could not be saved.');
      return;
    }

    store.getState().markModified(false);
    void router.push(
      buildCampaignCustomizerReturnHref(session.route, {
        status: 'saved',
        refitOrderId: result.order?.id,
      }),
    );
  }, [router, session, store]);

  if (!session) return null;

  return (
    <section
      className="border-border-theme bg-surface-base flex flex-wrap items-start justify-between gap-3 border-b px-3 py-3"
      data-testid="campaign-refit-command-bar"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-text-theme-primary text-sm font-semibold">
            Campaign refit: {session.unit.unitName}
          </h2>
          <Badge variant={validation.isValid ? 'success' : 'red'} size="sm">
            {validation.isValid ? 'Valid target' : 'Blocked target'}
          </Badge>
          {isModified ? (
            <Badge variant="warning" size="sm">
              Unsaved editor changes
            </Badge>
          ) : null}
        </div>
        {/* Command-bar context slim (focus doctrine, refit CONTEXT-FRAME): the
            build-delta count stays prominent; campaign / date / budget / rules /
            constraint collapse into one muted, truncated line whose full value
            is available on hover (title). The full context text stays in the DOM
            so it remains glanceable and assertable. */}
        <p
          className="text-text-theme-primary mt-1 text-xs font-medium"
          data-testid="campaign-refit-change-count"
        >
          {changeCount} build field{changeCount === 1 ? '' : 's'} changed
        </p>
        <p
          className="text-text-theme-secondary mt-0.5 max-w-full truncate text-xs"
          data-testid="campaign-refit-context"
          title={refitContextSummary}
        >
          {refitContextSummary}
        </p>

        {!validation.isValid ? (
          <div className="mt-2" data-testid="campaign-refit-validation">
            <p className="text-xs font-semibold text-rose-200">
              Resolve before saving
            </p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {validation.errors.slice(0, 4).map((error) => {
                const tab = validationTabFor(error);
                return (
                  <li key={error}>
                    <button
                      type="button"
                      onClick={() => onTabChange(tab)}
                      className="rounded border border-rose-700/70 px-2 py-1 text-left text-xs text-rose-100 hover:border-rose-400"
                    >
                      {tab}: {error}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {saveError ? (
          <p
            role="alert"
            className="mt-2 text-xs text-rose-200"
            data-testid="campaign-refit-save-error"
          >
            {saveError}
          </p>
        ) : null}
        {validation.isValid && changeCount === 0 ? (
          <p
            className="text-text-theme-secondary mt-2 text-xs"
            data-testid="campaign-refit-no-delta"
          >
            No refit order will be created until at least one build field
            changes.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="border-border-theme-subtle text-text-theme-secondary hover:text-text-theme-primary rounded border px-3 py-2 text-sm"
          data-testid="campaign-refit-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSaveRefit}
          className={
            canSaveRefit
              ? 'rounded border border-sky-500/60 bg-sky-600/20 px-3 py-2 text-sm font-semibold text-sky-100'
              : 'cursor-not-allowed rounded border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm font-semibold text-slate-500'
          }
          data-testid="campaign-refit-save"
        >
          Save refit order
        </button>
      </div>
    </section>
  );
}

function formatCampaignDate(value: string): string {
  return value.includes('T') ? value.slice(0, 10) : value;
}

function formatRefitConstraintLabel(value: string): string {
  if (value === 'campaign-owned-refit') return 'Campaign refit limits';
  return value.replace(/[-_]+/g, ' ');
}
