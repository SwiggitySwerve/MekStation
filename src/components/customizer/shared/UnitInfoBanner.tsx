/**
 * Unit Info Banner Component
 * 
 * Modular stat box display that flows and wraps as space permits.
 * Single responsive component for both mobile and desktop.
 * 
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import React from 'react';
import { TechBaseBadge } from './TechBaseBadge';
import { ValidationBadge } from './ValidationBadge';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { ValidationStatus } from '@/utils/colors/statusColors';

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
  criticalSlotsUsed: number;
  criticalSlotsTotal: number;
  heatGenerated: number;
  heatDissipation: number;
  battleValue?: number;
  validationStatus: ValidationStatus;
  errorCount: number;
  warningCount: number;
}

interface UnitInfoBannerProps {
  stats: UnitStats;
  className?: string;
}

// =============================================================================
// Styles
// =============================================================================

const styles = {
  label: 'text-[9px] sm:text-[10px] font-medium text-text-theme-secondary uppercase tracking-wider',
  value: {
    normal: 'text-white',
    warning: 'text-amber-400',
    error: 'text-red-400',
    success: 'text-green-400',
    engine: 'text-orange-500',
    bv: 'text-cyan-400',
  },
  muted: 'text-slate-500',
  box: 'flex flex-col items-center px-2 sm:px-3 py-0.5 sm:py-1 bg-surface-raised/50 rounded',
} as const;

// =============================================================================
// Stat Box Components
// =============================================================================

interface SimpleStatProps {
  label: string;
  value: number | string;
  status?: keyof typeof styles.value;
}

function SimpleStat({ label, value, status = 'normal' }: SimpleStatProps) {
  return (
    <div className={styles.box}>
      <span className={styles.label}>{label}</span>
      <span className={`text-sm sm:text-base font-bold ${styles.value[status]}`}>{value}</span>
    </div>
  );
}

interface CapacityStatProps {
  label: string;
  current: number | string;
  max: number | string;
  unit?: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
}

function CapacityStat({ label, current, max, unit = '', status = 'normal' }: CapacityStatProps) {
  return (
    <div className={styles.box}>
      <span className={styles.label}>{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-sm sm:text-base font-bold ${styles.value[status]}`}>
          {current}{unit}
        </span>
        <span className={`text-[10px] ${styles.muted}`}>/</span>
        <span className={`text-[10px] ${styles.muted}`}>
          {max}{unit}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function UnitInfoBanner({ stats, className = '' }: UnitInfoBannerProps): React.ReactElement {
  const weightStatus: 'normal' | 'warning' | 'error' = 
    stats.weightUsed > stats.tonnage ? 'error' :
    stats.weightRemaining < 0.5 ? 'warning' : 'normal';
  
  const slotsStatus: 'normal' | 'warning' | 'error' = 
    stats.criticalSlotsUsed > stats.criticalSlotsTotal ? 'error' : 'normal';
  
  const heatStatus: 'normal' | 'warning' | 'error' | 'success' = 
    stats.heatGenerated > stats.heatDissipation ? 'error' :
    stats.heatGenerated === stats.heatDissipation ? 'warning' : 'success';

  return (
    <div className={`bg-surface-base border border-border-theme-subtle rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <h2 className="text-sm sm:text-base font-bold text-white truncate">{stats.name}</h2>
        <TechBaseBadge techBaseMode={stats.techBaseMode} />
        <ValidationBadge 
          status={stats.validationStatus}
          label={stats.validationStatus === 'valid' ? 'Valid' : 
                `${stats.errorCount} errors, ${stats.warningCount} warnings`}
        />
      </div>
      
      <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 justify-center">
        <SimpleStat label="TON" value={stats.tonnage} />
        <SimpleStat label="W" value={stats.walkMP} />
        <SimpleStat label="R" value={stats.runMP} />
        {stats.maxRunMP && stats.maxRunMP > stats.runMP && (
          <SimpleStat label="R+" value={stats.maxRunMP} />
        )}
        <SimpleStat label="J" value={stats.jumpMP} />
        <SimpleStat label="BV" value={stats.battleValue?.toLocaleString() ?? '-'} status="bv" />
        <SimpleStat label="ENG" value={stats.engineRating} status="engine" />
        <CapacityStat
          label="WT"
          current={stats.weightUsed.toFixed(1)}
          max={stats.tonnage.toFixed(0)}
          unit="t"
          status={weightStatus}
        />
        <CapacityStat label="ARM" current={stats.armorPoints} max={stats.maxArmorPoints} />
        <CapacityStat label="SLOTS" current={stats.criticalSlotsUsed} max={stats.criticalSlotsTotal} status={slotsStatus} />
        <CapacityStat label="HEAT" current={stats.heatGenerated} max={stats.heatDissipation} status={heatStatus} />
      </div>
    </div>
  );
}
