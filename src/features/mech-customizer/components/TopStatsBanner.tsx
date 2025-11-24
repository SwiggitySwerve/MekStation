'use client';

import React, { useMemo } from 'react';
import { useCustomizerStore } from '../store/useCustomizerStore';
import { CriticalSlotMechanics } from '../../../mechanics/CriticalSlots';
import { WeightOps } from '../../../mechanics/WeightOps';
import { Surface, Button, StatCard } from '../../../ui';
import { classNames } from '../../../ui/utils/classNames';

interface TopStatsBannerProps {
  onRequestReset(): void;
  onToggleDebug(): void;
}

export const TopStatsBanner: React.FC<TopStatsBannerProps> = ({
  onRequestReset,
  onToggleDebug,
}) => {
  const unit = useCustomizerStore(state => state.unit);
  const metrics = useCustomizerStore(state => state.metrics);
  const validation = useCustomizerStore(state => state.validation);

  const slotUsage = useMemo(() => CriticalSlotMechanics.getSlotUsage(unit), [unit]);
  const maxArmorPoints = useMemo(() => WeightOps.getMaxArmorPoints(unit.tonnage), [unit.tonnage]);
  const allocatedArmor = useMemo(() => {
    const allocations = Object.values(unit.armorAllocation ?? {});
    if (allocations.length === 0) {
      return 0;
    }
    return allocations.reduce((sum, value) => {
      if (typeof value === 'number') {
        return sum + value;
      }
      if (typeof value === 'object' && value !== null) {
        return (
          sum +
          Object.values(value)
            .filter(v => typeof v === 'number')
            .reduce((sub, v) => sub + (v as number), 0)
        );
      }
      return sum;
    }, 0);
  }, [unit.armorAllocation]);

  const runningMP = Math.ceil(unit.walkingMP * 1.5);
  const engineHeatSinks = Math.floor(metrics.engineRating / 25);
  const weightTone = metrics.currentWeight > unit.tonnage ? 'negative' : 'neutral';

  return (
    <Surface
      variant="sunken"
      padding="lg"
      className="rounded-none border-x-0 border-t-0 gap-4 flex flex-col"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            {unit.techBase} • {unit.rulesLevel}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {unit.name}{' '}
            <span className="text-lg text-[var(--text-muted)] font-normal">{unit.model}</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{unit.tonnage}-ton chassis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-pill bg-[var(--surface-panel)] px-3 py-1 text-xs">
            <span
              className={classNames(
                'h-2 w-2 rounded-full',
                validation.isValid
                  ? 'bg-[var(--status-success)]'
                  : 'bg-[var(--status-danger)]'
              )}
            />
            <span className={validation.isValid ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'}>
              {validation.isValid
                ? 'Design Valid'
                : `${validation.errors.length} issues • ${validation.warnings.length} warnings`}
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={onRequestReset}>
            Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleDebug}>
            Debug
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard label="Movement" value={`${unit.walkingMP}/${runningMP}`} helperText="Walk / Run MP" />
        <StatCard
          label="Weight"
          value={`${metrics.currentWeight.toFixed(2)}/${unit.tonnage}t`}
          helperText="Tons used"
          tone={weightTone}
        />
        <StatCard
          label="Critical Slots"
          value={`${slotUsage.used}/${slotUsage.total}`}
          helperText="Allocated / Total"
        />
        <StatCard
          label="Armor Allocation"
          value={`${allocatedArmor}/${maxArmorPoints}`}
          helperText="Points spent"
        />
        <StatCard label="Engine Rating" value={metrics.engineRating} helperText={unit.engineType} />
        <StatCard
          label="Integral Heat Sinks"
          value={engineHeatSinks}
          helperText="Engine provided"
        />
        <StatCard label="Structure" value={unit.structureType} helperText="Internal skeleton" />
        <StatCard label="Armor Type" value={unit.armorType} helperText="Current plating" />
      </div>
    </Surface>
  );
};

