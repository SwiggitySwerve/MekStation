import React from 'react';

import {
  MAX_HEAT,
  HEAT_THRESHOLDS,
  getHeatColorClass,
  getActiveHeatEffects,
} from '@/constants/heat';
/**
 * Per `add-interactive-combat-core-ui` § 6.2: the heat bar labels the
 * four canonical to-hit threshold breakpoints (8 = +1, 13 = +2, 17 =
 * +3, 24 = +4) as inline tick marks so the player can see "how close
 * am I to the next penalty" at a glance. Values are pulled from
 * `HEAT_THRESHOLDS` so they stay in sync with the combat engine's
 * canonical table rather than drifting into a local literal.
 */
export const HEAT_TICK_THRESHOLDS: ReadonlyArray<{
  readonly value: number;
  readonly label: string;
  readonly modifier: string;
}> = [
  { value: HEAT_THRESHOLDS.TO_HIT_1, label: '8', modifier: '+1' },
  { value: HEAT_THRESHOLDS.TO_HIT_2, label: '13', modifier: '+2' },
  { value: HEAT_THRESHOLDS.TO_HIT_3, label: '17', modifier: '+3' },
  { value: HEAT_THRESHOLDS.TO_HIT_4, label: '24', modifier: '+4' },
];

import { ArmorPipRail } from './ArmorPipRail';
import { LOCATION_NAMES, getStatusColor } from './recordSheet.helpers';

// =============================================================================
// Location Status Row
// =============================================================================

interface LocationStatusRowProps {
  location: string;
  armor: number;
  maxArmor: number;
  structure: number;
  maxStructure: number;
  destroyed: boolean;
  rearArmor?: number;
  maxRearArmor?: number;
}

export function LocationStatusRow({
  location,
  armor,
  maxArmor,
  structure,
  maxStructure,
  destroyed,
  rearArmor,
  maxRearArmor,
}: LocationStatusRowProps): React.ReactElement {
  const displayName = LOCATION_NAMES[location] || location;
  const armorColor = getStatusColor(armor, maxArmor);
  const structureColor = getStatusColor(structure, maxStructure);
  const rearArmorColor =
    rearArmor !== undefined && maxRearArmor !== undefined
      ? getStatusColor(rearArmor, maxRearArmor)
      : '';

  return (
    <div
      className={`px-3 py-2 md:px-2 md:py-1 ${destroyed ? 'line-through opacity-50' : ''}`}
      data-testid={`location-row-${location}`}
    >
      <div className="md:flex md:items-center">
        <div className="mb-1 flex items-center justify-between md:mb-0 md:w-28">
          <span className="text-text-theme-primary text-base font-medium md:text-sm">
            {displayName}
          </span>
          {destroyed && (
            <span
              className="text-xs font-bold text-red-600 md:hidden"
              data-testid={`location-destroyed-${location}-mobile`}
            >
              DESTROYED
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 md:flex md:flex-1 md:items-center md:gap-4">
          <div className="flex items-center gap-1">
            <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
              AR:
            </span>
            <span
              className={`font-mono text-base md:w-8 md:text-right md:text-sm ${armorColor}`}
              data-testid={`location-armor-${location}`}
            >
              {armor}/{maxArmor}
            </span>
          </div>
          {rearArmor !== undefined && maxRearArmor !== undefined ? (
            <div className="flex items-center gap-1">
              <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
                RR:
              </span>
              <span
                className={`font-mono text-base md:w-8 md:text-right md:text-sm ${rearArmorColor}`}
                data-testid={`location-armor-${location}_rear`}
              >
                {rearArmor}/{maxRearArmor}
              </span>
            </div>
          ) : (
            <div className="md:hidden" />
          )}
          <div className="flex items-center gap-1">
            <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
              IS:
            </span>
            <span
              className={`font-mono text-base md:w-8 md:text-right md:text-sm ${structureColor}`}
              data-testid={`location-structure-${location}`}
            >
              {structure}/{maxStructure}
            </span>
          </div>
        </div>

        {destroyed && (
          <span
            className="ml-2 hidden text-xs font-bold text-red-600 md:inline"
            data-testid={`location-destroyed-${location}`}
          >
            DESTROYED
          </span>
        )}
      </div>

      {/*
        Per § 5.1 the panel renders armor pips for every location so
        players can see remaining protection at a glance without
        parsing numbers. The numeric row above is preserved because
        many players (and existing tests) key on it directly.
      */}
      <div
        className="mt-1 flex flex-col gap-0.5"
        data-testid={`location-pips-${location}`}
      >
        <ArmorPipRail
          label="AR"
          current={armor}
          max={maxArmor}
          destroyed={destroyed}
          kind="armor"
          testId={`armor-pips-${location}`}
        />
        {rearArmor !== undefined && maxRearArmor !== undefined && (
          <ArmorPipRail
            label="RR"
            current={rearArmor}
            max={maxRearArmor}
            destroyed={destroyed}
            kind="armor"
            testId={`armor-pips-${location}_rear`}
          />
        )}
        <ArmorPipRail
          label="IS"
          current={structure}
          max={maxStructure}
          destroyed={destroyed}
          kind="structure"
          testId={`structure-pips-${location}`}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Weapon Row
// =============================================================================

export { WeaponRow } from './WeaponRow';

// =============================================================================
// Simple Heat Display
// =============================================================================

export function SimpleHeatDisplay({
  heat,
  heatSinks,
}: {
  heat: number;
  heatSinks: number;
}): React.ReactElement {
  const heatPercent = Math.min((heat / MAX_HEAT) * 100, 100);
  const effects = getActiveHeatEffects(heat);

  return (
    <div className="bg-surface-raised rounded p-2" data-testid="heat-display">
      <div className="mb-2 flex items-center gap-4">
        <div className="flex-1">
          {/*
            Relative wrapper so the § 6.2 threshold tick marks can be
            absolute-positioned on top of the bar without disturbing
            the existing fill layout. Tick marks render as thin
            vertical lines at 8/13/17/24 with a label strip below so
            they are legible at the default 16px bar height.
          */}
          <div className="relative">
            <div
              className="bg-surface-deep relative h-4 overflow-hidden rounded"
              data-testid="heat-bar-track"
            >
              <div
                className={`h-full ${getHeatColorClass(heat)} transition-all`}
                style={{ width: `${heatPercent}%` }}
                data-testid="heat-bar"
              />
              {HEAT_TICK_THRESHOLDS.map((tick) => {
                const left = Math.min((tick.value / MAX_HEAT) * 100, 100);
                return (
                  <span
                    key={tick.value}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-px bg-gray-600/70"
                    style={{ left: `${left}%` }}
                    data-testid={`heat-tick-${tick.value}`}
                  />
                );
              })}
            </div>
            {/*
              Threshold label strip — each tick's numeric breakpoint
              and to-hit modifier is rendered inline so the player can
              read the scale without hovering. Absolute-positioned so
              the strip never disturbs the main flex layout.
            */}
            <div
              className="text-text-theme-secondary pointer-events-none relative h-4 text-[9px] leading-none"
              data-testid="heat-threshold-labels"
            >
              {HEAT_TICK_THRESHOLDS.map((tick) => {
                const left = Math.min((tick.value / MAX_HEAT) * 100, 100);
                return (
                  <span
                    key={tick.value}
                    className="absolute -translate-x-1/2 font-mono whitespace-nowrap"
                    style={{ left: `${left}%`, top: 2 }}
                    data-testid={`heat-tick-label-${tick.value}`}
                    data-threshold={tick.value}
                  >
                    <span className="font-semibold">{tick.label}</span>
                    <span className="ml-0.5 opacity-70">{tick.modifier}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="font-mono text-sm">
          <span className="font-bold" data-testid="heat-value">
            {heat}
          </span>
          <span className="text-text-theme-secondary">/{MAX_HEAT}</span>
        </div>
      </div>
      {effects.length > 0 && (
        <div className="text-xs text-red-600" data-testid="heat-effects">
          {effects.join(' • ')}
        </div>
      )}
      <div
        className="text-text-theme-secondary mt-1 text-xs"
        data-testid="heat-dissipation"
      >
        Dissipation: {heatSinks} heat/turn
      </div>
    </div>
  );
}

// =============================================================================
// Pilot Status
// =============================================================================

export function PilotStatus({
  name,
  gunnery,
  piloting,
  wounds,
  conscious,
}: {
  name: string;
  gunnery: number;
  piloting: number;
  wounds: number;
  conscious: boolean;
}): React.ReactElement {
  const woundIndicators = [];
  for (let i = 0; i < 6; i++) {
    woundIndicators.push(
      <span
        key={i}
        className={`h-4 w-4 rounded-full border ${
          i < wounds
            ? 'border-red-600 bg-red-500'
            : 'bg-surface-raised border-border-theme'
        }`}
        data-testid={`pilot-wound-${i}`}
        data-filled={i < wounds}
      />,
    );
  }

  return (
    <div className="bg-surface-raised rounded p-2" data-testid="pilot-status">
      {/*
        Per `add-interactive-combat-core-ui` § 9.3: an unconscious
        pilot gets a full-width red banner at the top of the pilot
        panel so the player sees the state immediately even when
        the small inline "UNCONSCIOUS" label is clipped. The
        original inline label is preserved for tests and accessibility.
      */}
      {!conscious && (
        <div
          className="mb-2 flex items-center gap-2 rounded border border-red-700 bg-red-600 px-2 py-1 text-xs font-bold tracking-wide text-white uppercase"
          data-testid="pilot-unconscious-banner"
          role="alert"
        >
          <span aria-hidden="true">⚠</span>
          <span>Pilot unconscious — cannot act this turn</span>
        </div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-text-theme-primary font-medium"
          data-testid="pilot-name"
        >
          {name}
        </span>
        {!conscious && (
          <span
            className="text-xs font-bold text-red-600"
            data-testid="pilot-unconscious"
          >
            UNCONSCIOUS
          </span>
        )}
      </div>
      <div className="text-text-theme-primary flex items-center gap-4 text-sm">
        <span data-testid="pilot-gunnery">
          Gunnery: <strong>{gunnery}</strong>
        </span>
        <span data-testid="pilot-piloting">
          Piloting: <strong>{piloting}</strong>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1" data-testid="pilot-wounds">
        <span className="text-text-theme-secondary mr-2 text-xs">Wounds:</span>
        {woundIndicators}
      </div>
    </div>
  );
}
