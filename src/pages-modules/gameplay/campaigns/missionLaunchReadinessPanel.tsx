import Link from 'next/link';
import React from 'react';

import type {
  IMissionReadinessReason,
  IMissionReadinessProjection,
  IMissionReadinessUnitProjection,
} from '@/lib/campaign/readiness/missionReadinessProjection';

import { Badge } from '@/components/ui';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';

function readinessStatusVariant(
  status: IMissionReadinessUnitProjection['status'],
): 'success' | 'warning' | 'red' {
  if (status === 'eligible') return 'success';
  if (status === 'risky') return 'warning';
  return 'red';
}

// Severity glyph shared with the starmap annotation convention (doctrine
// AMBIENT-CHROME rule): status never reads through color alone.
function readinessStatusGlyph(
  status: IMissionReadinessUnitProjection['status'],
): AppIconName {
  if (status === 'eligible') return 'check';
  if (status === 'risky') return 'warning';
  return 'close';
}

function launchReadinessVariant(
  projection: IMissionReadinessProjection,
): 'success' | 'warning' | 'red' {
  if (!projection.canLaunch) return 'red';
  return projection.warnings.length > 0 ? 'warning' : 'success';
}

function launchReadinessGlyph(
  projection: IMissionReadinessProjection,
): AppIconName {
  if (!projection.canLaunch) return 'close';
  return projection.warnings.length === 0 ? 'check' : 'warning';
}

function launchReadinessLabel(projection: IMissionReadinessProjection): string {
  if (!projection.canLaunch) return 'Launch blocked';
  if (projection.warnings.length === 0) return 'Launch ready';
  return `Ready with warnings (${projection.warnings.length})`;
}

/** Shared reason and remediation display for campaign readiness surfaces. */
export function UnitReadinessReasons({
  unitId,
  reasons,
  actionTestId,
}: {
  readonly unitId: string;
  readonly reasons: readonly IMissionReadinessReason[];
  readonly actionTestId?: (reason: IMissionReadinessReason) => string;
}): React.ReactElement | null {
  return reasons.length > 0 ? (
    <ul className="mt-2 space-y-1">
      {reasons.map((reason) => (
        <li
          key={`${unitId}-${reason.code}`}
          // Blockers announce (alert); warnings inform (status) —
          // and both carry the severity glyph so the message
          // never reads through color alone.
          role={reason.severity === 'blocker' ? 'alert' : 'status'}
          className={
            reason.severity === 'blocker'
              ? 'flex flex-wrap items-center gap-2 text-xs text-rose-300'
              : 'flex flex-wrap items-center gap-2 text-xs text-amber-300'
          }
        >
          <span className="inline-flex items-center gap-1">
            <AppIcon
              name={reason.severity === 'blocker' ? 'close' : 'warning'}
              size="inline"
              aria-hidden="true"
            />
            {reason.message}
          </span>
          {reason.actionHref ? (
            <Link
              href={reason.actionHref}
              className="text-accent hover:text-accent/80 font-semibold underline underline-offset-2"
              data-testid={
                actionTestId?.(reason) ??
                `mission-readiness-action-${unitId}-${reason.code}`
              }
            >
              {reason.actionLabel ?? 'Resolve'}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  ) : null;
}

export function MissionReadinessPanel({
  buildCustomizeHref,
  projection,
  onToggleUnit,
}: {
  readonly buildCustomizeHref?: (unitId: string) => string;
  readonly projection: IMissionReadinessProjection;
  readonly onToggleUnit: (unitId: string) => void;
}): React.ReactElement {
  if (projection.loading) {
    return (
      <p role="status" className="text-text-theme-secondary text-sm">
        Loading readiness...
      </p>
    );
  }
  return (
    <section
      className="border-border-theme-subtle bg-surface-base/70 rounded-lg border p-4"
      data-testid="mission-readiness-panel"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-text-theme-primary text-lg font-semibold">
            Mission readiness
          </h2>
          <p className="text-text-theme-secondary text-sm">
            {projection.missionName}: {projection.selectedUnits.length} selected
            / {projection.units.length} available
          </p>
        </div>
        <Badge
          variant={launchReadinessVariant(projection)}
          data-testid="mission-readiness-status"
        >
          <AppIcon
            name={launchReadinessGlyph(projection)}
            size="inline"
            aria-hidden="true"
          />
          {launchReadinessLabel(projection)}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {projection.units.map((unitProjection) => {
          const unit = unitProjection.unit;
          const disabled = unitProjection.status === 'blocked';
          return (
            <label
              key={unit.unitId}
              className="border-border-theme-subtle bg-surface-deep flex gap-3 rounded-lg border p-3"
              data-testid={`mission-readiness-unit-${unit.unitId}`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={unitProjection.selected}
                disabled={disabled}
                onChange={() => onToggleUnit(unit.unitId)}
                aria-label={`Deploy ${unit.unitName}`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-text-theme-primary truncate font-semibold">
                    {unit.unitName}
                  </span>
                  <Badge
                    variant={readinessStatusVariant(unitProjection.status)}
                    size="sm"
                  >
                    <AppIcon
                      name={readinessStatusGlyph(unitProjection.status)}
                      size="inline"
                      aria-hidden="true"
                    />
                    {unitProjection.status}
                  </Badge>
                </span>
                <span className="text-text-theme-secondary mt-1 block text-xs">
                  {unit.chassisVariant} | Pilot:{' '}
                  {unitProjection.pilotName ?? unit.pilotId ?? 'Unassigned'} |
                  Repairs: {unitProjection.repairTicketCount}
                </span>
                <UnitReadinessReasons
                  unitId={unit.unitId}
                  reasons={unitProjection.reasons}
                />
                {buildCustomizeHref ? (
                  // Real button affordance at AA contrast (re-audit UXF-02:
                  // the old sky-100-on-10%-tint label washed out inside the
                  // warning card) — but still visually SECONDARY to the
                  // amber 'Assign pilot' remediation link above it.
                  <a
                    href={buildCustomizeHref(unit.unitId)}
                    className="mt-2 inline-flex rounded border border-sky-300 bg-sky-500/20 px-2.5 py-1 text-xs font-semibold text-sky-50 hover:bg-sky-500/30"
                    data-testid={`mission-readiness-customize-${unit.unitId}`}
                  >
                    Open refit editor
                  </a>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {projection.unresolvedBlockers.length > 0 ? (
        <div
          className="mt-3 rounded border border-rose-700/60 bg-rose-950/30 p-3"
          data-testid="mission-readiness-blockers"
        >
          <p className="text-sm font-semibold text-rose-200">
            Resolve before launch
          </p>
          <ul className="mt-2 space-y-1">
            {projection.unresolvedBlockers.map((reason, index) => (
              <li
                key={`${reason.code}-${reason.subjectId ?? index}`}
                className="text-sm text-rose-100"
              >
                {reason.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul
        className="text-text-theme-secondary mt-3 grid gap-1 text-xs md:grid-cols-3"
        data-testid="mission-readiness-consequences"
      >
        {projection.launchConsequences.map((consequence) => (
          <li key={consequence}>{consequence}</li>
        ))}
      </ul>
    </section>
  );
}
