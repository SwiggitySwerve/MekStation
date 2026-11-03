import React from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { TECH_RATING_VALUES } from '@/types/validation/TechRating';
import {
  getFixedWingSupportLimits,
  getFixedWingSupportFireControl,
} from '@/utils/construction/aerospace/fixedWingSupport';

import { customizerStyles as cs } from '../styles';

/** Fixed-wing support source facts, inside the existing chassis section. */
export function FixedWingSupportFields({
  readOnly,
}: {
  readOnly: boolean;
}): React.ReactElement {
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const barRating = useAerospaceStore((s) => s.barRating);
  const structuralTechRating = useAerospaceStore((s) => s.structuralTechRating);
  const engineTechRating = useAerospaceStore((s) => s.engineTechRating);
  const equipment = useAerospaceStore((s) => s.equipment);
  const setTonnage = useAerospaceStore((s) => s.setTonnage);
  const setSupportRating = useAerospaceStore((s) => s.setSupportRating);
  const limits = getFixedWingSupportLimits(tonnage);
  const ratings = Object.entries(TECH_RATING_VALUES).map(([label, value]) => ({
    label,
    value,
  }));
  const fields = [
    {
      label: 'BAR',
      field: 'barRating',
      value: barRating,
      options: limits.barRatings.map((value) => ({
        label: String(value),
        value,
      })),
    },
    {
      label: 'Structural Tech Rating',
      field: 'structuralTechRating',
      value: structuralTechRating,
      options: ratings,
    },
    {
      label: 'Engine Tech Rating',
      field: 'engineTechRating',
      value: engineTechRating,
      options: ratings,
    },
  ] as const;
  return (
    <fieldset
      disabled={readOnly}
      className="mb-4 min-w-0 space-y-3"
      data-testid="fixed-wing-support-fields"
    >
      <legend className={cs.text.sectionTitle}>Fixed-Wing Support</legend>
      <label className={`${cs.text.label} block`}>
        Fixed-Wing Support Tonnage
        <input
          type="number"
          min={limits.minTonnageExclusive}
          max={limits.maxTonnage}
          step="any"
          value={tonnage}
          onChange={(e) => setTonnage(Number(e.target.value))}
          className={`${cs.input.full} mt-1`}
        />
      </label>
      <p className="text-text-theme-secondary text-xs">
        Greater than {limits.minTonnageExclusive} to {limits.maxTonnage} t;
        large above {limits.largeThreshold} t.
      </p>
      {fields.map(({ label, field, value, options }) => (
        <label key={field} className={`${cs.text.label} block`}>
          {label}
          <select
            value={value ?? ''}
            onChange={(e) =>
              setSupportRating(
                field,
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
            className={`${cs.select.full} mt-1`}
          >
            <option value="">Unknown</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className={cs.text.label}>Fire-Control Type</dt>
          <dd aria-label="Fire-Control Type" className={cs.text.value}>
            {getFixedWingSupportFireControl(
              equipment.map((m) => m.equipmentId),
            )}
          </dd>
        </div>
        <div>
          <dt className={cs.text.label}>Available Item Slots</dt>
          <dd aria-label="Available Item Slots" className={cs.text.value}>
            {limits.itemSlots}
          </dd>
        </div>
      </dl>
    </fieldset>
  );
}
