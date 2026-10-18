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
                    className="bg-surface-raised/70 pointer-events-none absolute inset-y-0 w-px"
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
