'use client';

import React, { useMemo } from 'react';
import { useCustomizerViewModel } from '../../store/useCustomizerStore';
import { ArmorType, HeatSinkType } from '../../../../types/SystemComponents';
import {
  ARMOR_LOCATIONS,
  ArmorLocation,
  IArmorSegmentAllocation,
  createEmptyArmorAllocation,
} from '../../../mech-lab/store/MechLabState';
import { WeightOps } from '../../../../mechanics/WeightOps';
import { Surface, FormField } from '../../../../ui';

const armorTypes: ArmorType[] = Object.values(ArmorType);
const heatSinkTypes: HeatSinkType[] = Object.values(HeatSinkType);

const clampValue = (value: number): number => (Number.isFinite(value) && value >= 0 ? value : 0);

export const ArmorTab: React.FC = () => {
  const { unit, actions } = useCustomizerViewModel();
  const maxArmor = WeightOps.getMaxArmorPoints(unit.tonnage);
  const allocation = unit.armorAllocation ?? createEmptyArmorAllocation();

  const totalAllocated = useMemo(
    () =>
      Object.values(allocation).reduce((sum, segment) => {
        const front = clampValue(segment?.front ?? 0);
        const rear = clampValue(segment?.rear ?? 0);
        return sum + front + rear;
      }, 0),
    [allocation]
  );

  const remainingArmor = maxArmor - totalAllocated;

  const handleArmorChange = (
    location: ArmorLocation,
    field: keyof IArmorSegmentAllocation,
    rawValue: string
  ) => {
    const numeric = clampValue(parseInt(rawValue, 10));
    const current = allocation[location] ?? { front: 0, rear: 0 };
    const nextAllocation: IArmorSegmentAllocation = {
      ...current,
      [field]: numeric,
    };
    actions.setArmorAllocation(location, nextAllocation);
  };

  const inputClasses =
    'w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-sunken)] px-3 py-2 text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Surface>
          <FormField
            label="Armor Type"
            helperText="Select the plating standard for this chassis."
            id="armor-type-select"
          >
            <select
              id="armor-type-select"
              className={inputClasses}
              value={unit.armorType}
              onChange={event => actions.setArmorType(event.target.value as ArmorType)}
            >
              {armorTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FormField>
          <div className="text-sm text-[var(--text-secondary)] space-y-1">
            <p>
              Total armor allocation:{' '}
              <span className="font-mono text-[var(--text-primary)]">
                {totalAllocated}/{maxArmor}
              </span>
            </p>
            <p className={remainingArmor < 0 ? 'text-[var(--status-danger)] text-xs' : 'text-[var(--text-muted)] text-xs'}>
              {remainingArmor < 0
                ? `Over capacity by ${Math.abs(remainingArmor)} points`
                : `${remainingArmor} points remaining`}
            </p>
          </div>
        </Surface>

        <Surface>
          <FormField
            label="Heat Sink Type"
            helperText="Determines slot usage and dissipation per sink."
            id="heat-sink-select"
          >
            <select
              id="heat-sink-select"
              className={inputClasses}
              value={unit.heatSinkType}
              onChange={event => actions.setHeatSinkType(event.target.value as HeatSinkType)}
            >
              {heatSinkTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FormField>
          <p className="text-xs text-[var(--text-muted)]">
            Heat sink weights follow TechManual defaults (1 point = 1 ton unless Compact or Laser).
          </p>
        </Surface>
      </div>

      <Surface className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Armor Allocation
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Values in armor points (1 point = 1/16 ton)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARMOR_LOCATIONS.map(location => {
            const segment = allocation[location.id as ArmorLocation] ?? { front: 0, rear: 0 };
            return (
              <Surface key={location.id} variant="sunken" padding="sm" className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {location.label}
                  </span>
                </div>
                <FormField label="Front">
                  <input
                    type="number"
                    min={0}
                    className={inputClasses}
                    value={segment.front ?? 0}
                    onChange={event =>
                      handleArmorChange(location.id as ArmorLocation, 'front', event.target.value)
                    }
                  />
                </FormField>
                {location.hasRear && (
                  <FormField label="Rear">
                    <input
                      type="number"
                      min={0}
                      className={inputClasses}
                      value={segment.rear ?? 0}
                      onChange={event =>
                        handleArmorChange(location.id as ArmorLocation, 'rear', event.target.value)
                      }
                    />
                  </FormField>
                )}
              </Surface>
            );
          })}
        </div>
      </Surface>
    </div>
  );
};

