/**
 * Refit Launch Panel
 *
 * The refit launch flow reachable from the mech bay (CP3 —
 * `add-campaign-refit-and-prestige`, design D6). The player selects a
 * target configuration for an owned unit; the panel classifies the refit
 * and shows the estimated cost and hours; committing creates a refit
 * order through `commitRefitOrder` (which gates the `in-progress` advance
 * on construction validation).
 *
 * The target-configuration editor is deliberately scoped to the fields a
 * campaign refit touches — engine rating, armour points, heat sinks, jump
 * MP — derived from the unit's current configuration. A full unit editor
 * is out of scope (a refit validates a target build; it does not
 * reimplement construction).
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module components/campaign/bays/RefitLaunchPanel
 */

import React, { useMemo, useState } from 'react';

import type { IRefitOrder } from '@/types/campaign/Refit';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { Badge, Button, Card } from '@/components/ui';
import { estimateRefit } from '@/lib/campaign/refit/refitEstimator';
import { RefitClass } from '@/types/campaign/Refit';

// =============================================================================
// Refit-class presentation
// =============================================================================

/** Human-readable label for a refit class. */
function refitClassLabel(refitClass: RefitClass): string {
  switch (refitClass) {
    case RefitClass.EquipmentSwap:
      return 'Equipment Swap';
    case RefitClass.VariantUpgrade:
      return 'Variant Upgrade';
    case RefitClass.ChassisConversion:
      return 'Chassis Conversion';
  }
}

/** Badge colour for a refit class — heavier classes read warmer. */
function refitClassClasses(refitClass: RefitClass): string {
  switch (refitClass) {
    case RefitClass.EquipmentSwap:
      return 'bg-emerald-500/20 text-emerald-400';
    case RefitClass.VariantUpgrade:
      return 'bg-amber-500/20 text-amber-400';
    case RefitClass.ChassisConversion:
      return 'bg-red-500/20 text-red-400';
  }
}

// =============================================================================
// Numeric field
// =============================================================================

interface RefitFieldProps {
  readonly label: string;
  readonly testId: string;
  readonly value: number;
  readonly onChange: (next: number) => void;
}

/** One labelled numeric input for a target-configuration field. */
function RefitField({
  label,
  testId,
  value,
  onChange,
}: RefitFieldProps): React.ReactElement {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-text-theme-secondary text-sm">{label}</span>
      <input
        type="number"
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-surface-raised border-border-theme text-text-theme-primary w-24 rounded border px-2 py-1 text-right text-sm"
      />
    </label>
  );
}

// =============================================================================
// Panel
// =============================================================================

export interface RefitLaunchPanelProps {
  /** The unit being refit. */
  readonly unitId: string;
  /** Display name of the unit. */
  readonly unitName: string;
  /** The unit's current configuration. */
  readonly currentConfiguration: MechBuildConfig;
  /**
   * Commit the refit. Returns the created order (or its validation
   * errors) so the panel can surface the outcome.
   */
  readonly onCommit: (target: MechBuildConfig) => {
    readonly order?: IRefitOrder;
    readonly validationErrors?: readonly string[];
  };
  /** Cancel / close the launch flow. */
  readonly onCancel: () => void;
}

/**
 * The refit launch panel — target editor, live class + estimate, commit.
 */
export function RefitLaunchPanel({
  unitId,
  unitName,
  currentConfiguration,
  onCommit,
  onCancel,
}: RefitLaunchPanelProps): React.ReactElement {
  // Target configuration — seeded from the current build, edited in place.
  const [target, setTarget] = useState<MechBuildConfig>(currentConfiguration);
  const [committedOrder, setCommittedOrder] = useState<IRefitOrder | null>(
    null,
  );
  const [errors, setErrors] = useState<readonly string[]>([]);

  // Live classification + estimate for the current target.
  const estimate = useMemo(
    () => estimateRefit(currentConfiguration, target),
    [currentConfiguration, target],
  );

  /** Patch a single numeric field on the target configuration. */
  const patchTarget = (patch: Partial<MechBuildConfig>): void => {
    setTarget((prev) => ({ ...prev, ...patch }));
    setCommittedOrder(null);
    setErrors([]);
  };

  /** Commit the refit through the supplied handler. */
  const handleCommit = (): void => {
    const result = onCommit(target);
    setCommittedOrder(result.order ?? null);
    setErrors(result.validationErrors ?? []);
  };

  return (
    <Card className="p-5" data-testid={`refit-launch-${unitId}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-text-theme-primary text-lg font-semibold">
            Refit — {unitName}
          </h3>
          <p className="text-text-theme-secondary text-xs">
            Choose a target configuration for this unit.
          </p>
        </div>
        <Badge
          className={refitClassClasses(estimate.refitClass)}
          data-testid="refit-class-badge"
        >
          {refitClassLabel(estimate.refitClass)}
        </Badge>
      </div>

      {/* Target-configuration editor. */}
      <div className="mb-4 space-y-2" data-testid="refit-target-editor">
        <RefitField
          label="Engine Rating"
          testId="refit-field-engine-rating"
          value={target.engineRating}
          onChange={(engineRating) => patchTarget({ engineRating })}
        />
        <RefitField
          label="Armour Points"
          testId="refit-field-armor-points"
          value={target.totalArmorPoints}
          onChange={(totalArmorPoints) => patchTarget({ totalArmorPoints })}
        />
        <RefitField
          label="Heat Sinks"
          testId="refit-field-heat-sinks"
          value={target.totalHeatSinks}
          onChange={(totalHeatSinks) => patchTarget({ totalHeatSinks })}
        />
        <RefitField
          label="Jump MP"
          testId="refit-field-jump-mp"
          value={target.jumpMP}
          onChange={(jumpMP) => patchTarget({ jumpMP })}
        />
      </div>

      {/* Live estimate. */}
      <div
        className="bg-surface-raised mb-4 grid grid-cols-2 gap-3 rounded p-3"
        data-testid="refit-estimate"
      >
        <div>
          <p className="text-text-theme-secondary text-xs">Estimated Cost</p>
          <p
            className="text-text-theme-primary font-mono text-sm"
            data-testid="refit-estimate-cost"
          >
            {estimate.estimatedCost.toLocaleString()} C-bills
          </p>
        </div>
        <div>
          <p className="text-text-theme-secondary text-xs">Estimated Hours</p>
          <p
            className="text-text-theme-primary font-mono text-sm"
            data-testid="refit-estimate-hours"
          >
            {estimate.estimatedHours.toLocaleString()} tech-hours
          </p>
        </div>
      </div>

      {/* Commit outcome. */}
      {committedOrder ? (
        <div
          className={`mb-4 rounded border p-3 text-sm ${
            committedOrder.status === 'in-progress'
              ? 'border-emerald-600/40 bg-emerald-900/20 text-emerald-300'
              : 'border-amber-600/40 bg-amber-900/20 text-amber-300'
          }`}
          data-testid="refit-commit-result"
        >
          {committedOrder.status === 'in-progress' ? (
            <span>Refit order accepted — work has begun.</span>
          ) : (
            <span>
              Refit order created but not started — the target configuration
              failed construction validation.
            </span>
          )}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <ul
          className="mb-4 space-y-1 rounded border border-red-600/40 bg-red-900/20 p-3 text-xs text-red-300"
          data-testid="refit-validation-errors"
        >
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={onCancel}
          data-testid="refit-cancel"
        >
          Cancel
        </Button>
        <Button onClick={handleCommit} data-testid="refit-commit">
          Commit Refit
        </Button>
      </div>
    </Card>
  );
}

export default RefitLaunchPanel;
