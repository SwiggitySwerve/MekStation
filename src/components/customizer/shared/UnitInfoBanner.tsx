/**
 * Unit Info Banner Component
 *
 * Unit identity and grouped readouts: seven equal-width cells at one value
 * size, a 1px rule between every pair on wide screens. The budget stats (weight, slots, heat, armor) add fill bars against
 * their caps; movement (walk / run / jump in one cell), engine and BV show the
 * value alone. Detailed phone readouts expand without displacing the editor.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import React, { useId, useState } from 'react';

import type { IHeatGeneration } from '@/services/construction/CalculationService';

import { AppIcon } from '@/components/ui/AppIcon';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import { UnitValidationState } from '@/hooks/useUnitValidation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { ValidationStatus } from '@/utils/colors/statusColors';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import { TechBaseBadge } from './TechBaseBadge';
import { BudgetStat, MovementStat, SimpleStat } from './UnitInfoStats';
import {
  describeHeat,
  describeSlotFill,
  getCapacityStatus,
  getHeatStatus,
  getSlotFillStatus,
  getWeightStatus,
} from './unitStatStatus';
import { ValidationSummary } from './ValidationSummary';

// =============================================================================
// Types
// =============================================================================

export interface UnitStats {
  name: string;
  tonnage: number;
  techBaseMode: TechBaseMode;
  engineRating: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  maxRunMP?: number;
  weightUsed: number;
  weightRemaining: number;
  armorPoints: number;
  maxArmorPoints: number;
  /** Slots the build needs: system slots plus every mounted item's slots. */
  criticalSlotsUsed: number;
  criticalSlotsTotal: number;
  /** Slots actually filled: `criticalSlotsUsed` minus pending ones. */
  criticalSlotsPlaced?: number;
  /** Slots needed by mounted items that are not placed yet. */
  criticalSlotsPending?: number;
  /** Mounted items that are not placed yet. */
  unplacedItemCount?: number;
  heatGenerated: number;
  heatDissipation: number;
  heatGeneration?: IHeatGeneration;
  battleValue?: number;
  validationStatus: ValidationStatus;
  errorCount: number;
  warningCount: number;
}

interface UnitInfoBannerProps {
  stats: UnitStats;
  validation?: UnitValidationState;
  onValidationNavigate?: (tabId: CustomizerTabId) => void;
  className?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  /** Compact only: a status control below the metrics on phones. */
  status?: React.ReactNode;
}

// =============================================================================
// Main Component
// =============================================================================

export function UnitInfoBanner({
  stats,
  validation,
  onValidationNavigate,
  className = '',
  actions,
  compact = false,
  status,
}: UnitInfoBannerProps): React.ReactElement {
  const [showReadouts, setShowReadouts] = useState(false);
  const readoutsId = useId();
  const hasRunPlus = stats.maxRunMP && stats.maxRunMP > stats.runMP;
  const slotFill = {
    used: stats.criticalSlotsUsed,
    total: stats.criticalSlotsTotal,
    placed: stats.criticalSlotsPlaced,
    pendingSlots: stats.criticalSlotsPending,
    unplacedItems: stats.unplacedItemCount,
  };
  const slotStatus = getSlotFillStatus(slotFill);
  // The readout counts placed slots; over capacity it keeps the full demand.
  const slotsShown =
    slotStatus === 'error'
      ? stats.criticalSlotsUsed
      : (stats.criticalSlotsPlaced ?? stats.criticalSlotsUsed);
  const slotsTitle =
    (stats.criticalSlotsPending ?? 0) > 0
      ? describeSlotFill(slotFill)
      : undefined;

  const readouts = (
    <div
      id={readoutsId}
      className={`${workbenchStyles.readouts} ${showReadouts || compact ? workbenchStyles.readoutsExpanded : ''} ${compact && showReadouts ? workbenchStyles.readoutsDetailsOpen : ''}`}
    >
      <div
        role="group"
        aria-label="Capacity"
        className={`${workbenchStyles.readoutGroup} ${workbenchStyles.readoutGroupKey} ${compact ? 'max-md:col-span-2! max-md:min-h-11!' : ''}`}
      >
        <span className={workbenchStyles.readoutHeading}>Capacity</span>
        <div className="grid auto-cols-fr grid-flow-col gap-4">
          <BudgetStat
            label="Weight"
            current={stats.weightUsed}
            max={stats.tonnage}
            format={(value) => value.toFixed(1)}
            formatMax={(value) => value.toFixed(0)}
            unit="t"
            status={getWeightStatus(stats.weightUsed, stats.tonnage)}
          />
          <BudgetStat
            label="Slots"
            current={slotsShown}
            max={stats.criticalSlotsTotal}
            status={slotStatus}
            title={slotsTitle}
          />
          <BudgetStat
            label="Heat"
            current={stats.heatGenerated}
            max={stats.heatDissipation}
            status={getHeatStatus(stats.heatGenerated, stats.heatDissipation)}
            caption="gen / diss"
            title={describeHeat(
              stats.heatGenerated,
              stats.heatDissipation,
              stats.heatGeneration,
            )}
          />
          <BudgetStat
            label="Armor"
            current={stats.armorPoints}
            max={stats.maxArmorPoints}
            status={getCapacityStatus(stats.armorPoints, stats.maxArmorPoints)}
            phoneDetail
          />
        </div>
      </div>
      <div
        role="group"
        aria-label="Movement and engine"
        className={`${workbenchStyles.readoutGroup} ${compact ? 'max-md:row-start-3!' : ''}`}
      >
        <span className={workbenchStyles.readoutHeading}>
          Movement and engine
        </span>
        <div className="grid auto-cols-fr grid-flow-col gap-4">
          <MovementStat
            walk={stats.walkMP}
            run={stats.runMP}
            runPlus={hasRunPlus ? stats.maxRunMP : undefined}
            jump={stats.jumpMP}
          />
          <SimpleStat label="Engine" value={stats.engineRating} />
        </div>
      </div>
      <div
        role="group"
        aria-label="Battle value"
        className={`${workbenchStyles.readoutGroup} ${workbenchStyles.readoutGroupAside} ${compact ? 'max-md:row-start-3!' : ''}`}
      >
        <span className={workbenchStyles.readoutHeading}>Battle value</span>
        <div className="grid auto-cols-fr grid-flow-col gap-4">
          <SimpleStat
            label="BV"
            value={stats.battleValue?.toLocaleString() ?? '-'}
          />
        </div>
      </div>
    </div>
  );

  return (
    <section
      aria-label="Unit status"
      className={`${workbenchStyles.identityBanner} ${compact ? workbenchStyles.compactMetrics : ''} ${className}`}
    >
      {!compact && (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              title={stats.name}
              className="text-text-theme-primary min-w-0 truncate text-lg font-semibold tracking-tight"
            >
              {stats.name}
            </h2>
            <TechBaseBadge techBaseMode={stats.techBaseMode} />
            {validation && (
              <ValidationSummary
                validation={validation}
                onNavigate={onValidationNavigate}
              />
            )}
          </div>
          {actions}
        </div>
      )}
      {!compact && (
        <button
          type="button"
          className="text-text-theme-secondary flex min-h-11 w-full items-center justify-between gap-2 text-xs sm:hidden"
          aria-expanded={showReadouts}
          aria-controls={readoutsId}
          onClick={() => setShowReadouts((value) => !value)}
        >
          <span className="tabular-nums">
            {stats.tonnage}t {'\u00b7'} {stats.walkMP} / {stats.runMP} /{' '}
            {stats.jumpMP} MP
          </span>
          <span>
            {showReadouts ? 'Hide readouts' : 'Show readouts'}{' '}
            <AppIcon
              name="chevron-down"
              size="inline"
              aria-hidden="true"
              className={showReadouts ? 'rotate-180' : ' '}
            />
          </span>
        </button>
      )}
      {compact ? (
        <div
          className={`${workbenchStyles.compactBar} max-md:min-h-11! max-md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]!`}
        >
          {readouts}
          {status && (
            <div
              className={`${workbenchStyles.compactStatus} max-md:col-span-full! max-md:col-start-1! max-md:row-start-2! max-md:mt-0! max-md:border-l-0! max-md:pl-0!`}
            >
              {status}
            </div>
          )}
          <button
            type="button"
            className={`text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised focus-visible:outline-accent flex h-11 w-11 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-[-2px] max-md:col-start-3! max-md:mt-0! md:hidden ${workbenchStyles.compactToggle}`}
            aria-expanded={showReadouts}
            aria-controls={readoutsId}
            aria-label={
              showReadouts
                ? 'Fewer stats (Armor, Movement, BV)'
                : 'More stats (Armor, Movement, BV)'
            }
            title={
              showReadouts
                ? 'Fewer stats (Armor, Movement, BV)'
                : 'More stats (Armor, Movement, BV)'
            }
            onClick={() => setShowReadouts((value) => !value)}
          >
            <AppIcon
              name="chevron-down"
              size="control"
              aria-hidden="true"
              className={showReadouts ? 'rotate-180' : ''}
            />
          </button>
        </div>
      ) : (
        readouts
      )}
    </section>
  );
}
