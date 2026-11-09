import React from 'react';

import { ProtoMechLocation } from '@/types/construction/UnitLocation';

import { customizerStyles as cs } from '../styles';
import {
  LOCATION_LABELS,
  PROTO_ARMOR_TYPE_OPTIONS,
  type useProtoMechArmorControls,
} from './ProtoMechStructureTab.logic';

type ArmorControls = ReturnType<typeof useProtoMechArmorControls>;

interface ReadOnlyProps {
  readOnly: boolean;
}

export function ProtoMechArmorAllocationSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: ArmorControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={cs.text.sectionTitle.replace('mb-4', 'mb-0')}>
          Armor Allocation
        </h3>
        <div className="flex gap-2">
          <button
            onClick={controls.handleAutoAllocateArmor}
            disabled={readOnly}
            className={cs.button.action}
          >
            Auto
          </button>
          <button
            onClick={controls.handleClearAllArmor}
            disabled={readOnly}
            className={`${cs.button.action} bg-red-600 hover:bg-red-500`}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {controls.armorLocations.map((location: ProtoMechLocation) => (
          <div key={location}>
            <label
              htmlFor={`proto-armor-points-${location}`}
              className={cs.text.label}
            >
              {LOCATION_LABELS[location]}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`proto-armor-points-${location}`}
                aria-label={`${LOCATION_LABELS[location]} armor points`}
                type="number"
                value={controls.armorByLocation[location] ?? 0}
                onChange={(event) =>
                  controls.handleLocationArmorChange(location, event)
                }
                disabled={readOnly}
                min={0}
                className={cs.input.full}
              />
              <span
                data-testid={`proto-armor-max-${location}`}
                className={cs.text.secondary}
              >
                / {controls.locationLimits[location]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {controls.errors.length > 0 && (
        <ul
          data-testid="protomech-armor-errors"
          role="alert"
          className="mt-4 list-disc space-y-1 pl-5 text-xs text-red-400"
        >
          {controls.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Armor identity and mass come from the ProtoMech owner. Tech filtering is deferred. */
export function ProtoMechArmorPanelSection({
  readOnly,
  controls,
}: ReadOnlyProps & {
  controls: ArmorControls;
}): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Armor</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="proto-armor-type" className={cs.text.label}>
            Armor Type
          </label>
          <select
            id="proto-armor-type"
            aria-label="Armor type"
            value={controls.armorType}
            onChange={controls.handleArmorTypeChange}
            disabled={readOnly}
            className={cs.select.full}
          >
            {PROTO_ARMOR_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={cs.text.label}>Armor Points</label>
          <div className="bg-surface-raised border-border-theme text-text-theme-primary rounded border px-3 py-2 text-sm">
            <span
              data-testid="protomech-armor-total-used"
              className="text-accent font-semibold"
            >
              {controls.totalArmor}
            </span>
            {' / '}
            <span data-testid="protomech-armor-total-max">
              {controls.totalLimit}
            </span>
          </div>
        </div>
        <div>
          <span className={cs.text.label}>Armor Weight</span>
          <output
            data-testid="protomech-armor-weight"
            className={`${cs.text.secondary} block`}
          >
            {controls.armorWeight === null
              ? 'Unavailable'
              : `${controls.armorWeight.toFixed(3)} t`}
          </output>
        </div>
      </div>
    </div>
  );
}
