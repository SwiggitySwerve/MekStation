import React from 'react';

export type HeatScale = 'Single' | 'Double' | 'Triple';

const HEAT_SCALE_MAX: Record<HeatScale, number> = {
  Single: 30,
  Double: 50,
  Triple: 70,
};

export interface HeatTrackerProps {
  currentHeat: number;
  heatScale: HeatScale;
  onScaleChange: (scale: HeatScale) => void;
  className?: string;
  isCooling?: boolean;
  coolingTurns?: number;
}

export function HeatTracker({
  currentHeat,
  heatScale,
  onScaleChange,
  className = '',
  isCooling = false,
  coolingTurns = 0,
}: HeatTrackerProps): React.ReactElement {
  const maxHeat = HEAT_SCALE_MAX[heatScale];
  const heatPercentage = (currentHeat / maxHeat) * 100;

  const getWarningState = () => {
    if (currentHeat >= maxHeat) {
      return {
        level: 'max' as const,
        color: 'bg-red-600',
        textColor: 'text-red-600',
        message: 'MAX HEAT - SHUTDOWN',
        showAmmoRisk: true,
      };
    } else if (heatPercentage >= 75) {
      return {
        level: 'critical' as const,
        color: 'bg-red-500',
        textColor: 'text-red-500',
        message: 'WARNING: NEAR MAX HEAT',
        showAmmoRisk: false,
      };
    } else if (heatPercentage >= 50) {
      return {
        level: 'warning' as const,
        color: 'bg-amber-500',
        textColor: 'text-amber-500',
        message: 'CAUTION: HEAT BUILDUP',
        showAmmoRisk: false,
      };
    }
    return {
      level: 'normal' as const,
      color: 'bg-green-500',
      textColor: 'text-green-500',
      message: '',
      showAmmoRisk: false,
    };
  };

  const warning = getWarningState();

  return (
    <div
      className={`heat-tracker rounded-lg bg-gray-50 p-4 dark:bg-gray-800 ${className}`.trim()}
      data-testid="heat-tracker"
    >
      {/* Header with scale selector */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Heat
        </h3>
        <select
          value={heatScale}
          onChange={(e) => onScaleChange(e.target.value as HeatScale)}
          className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
          aria-label="Heat scale"
          data-testid="heat-scale-select"
        >
          <option value="Single">Single Heat</option>
          <option value="Double">Double Heat</option>
          <option value="Triple">Triple Heat</option>
        </select>
      </div>

      {/* Current heat display */}
      <div className="mb-3">
        <div className="mb-2 flex items-baseline justify-center">
          <span
            className={`text-4xl font-bold ${warning.textColor} tabular-nums`}
            data-testid="heat-tracker-current"
          >
            {currentHeat}
          </span>
          <span className="mx-1 text-xl text-gray-500 dark:text-gray-400">
            /
          </span>
          <span
            className="text-xl text-gray-600 tabular-nums dark:text-gray-400"
            data-testid="heat-tracker-max"
          >
            {maxHeat}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full ${warning.color} transition-all duration-300`}
            style={{ width: `${Math.min(heatPercentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={currentHeat}
            aria-valuemin={0}
            aria-valuemax={maxHeat}
            aria-label={`Current heat: ${currentHeat} of ${maxHeat}`}
            data-testid="heat-tracker-bar"
          />
        </div>
      </div>

      {/* Warning message */}
      {warning.message && (
        <div
          className={`mb-3 rounded-md p-3 ${warning.color} bg-opacity-10 border-opacity-30 border-2 ${warning.textColor} border-${warning.color.replace('bg-', '')}`}
          data-testid="heat-tracker-warning"
          data-warning-level={warning.level}
        >
          <p className="text-center text-sm font-semibold">{warning.message}</p>
          {warning.showAmmoRisk && (
            <p
              className="mt-1 text-center text-xs"
              data-testid="heat-tracker-ammo-risk"
            >
              ⚠️ Ammo explosion risk
            </p>
          )}
        </div>
      )}

      {/* Cooling indicator */}
      {isCooling && (
        <div
          className="flex items-center justify-center gap-2 rounded-md bg-blue-100 p-2 dark:bg-blue-900/30"
          data-testid="heat-tracker-cooling"
        >
          <svg
            className="h-5 w-5 animate-pulse text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Cooling: {coolingTurns} turn{coolingTurns !== 1 ? 's' : ''}{' '}
            remaining
          </span>
        </div>
      )}

      {/* Overflow indicator */}
      {currentHeat > maxHeat && (
        <div
          className="mt-3 rounded-md border-2 border-red-500 bg-red-100 p-3 dark:bg-red-900/30"
          data-testid="heat-tracker-overflow"
        >
          <p className="text-center text-sm font-semibold text-red-700 dark:text-red-300">
            ⚠️ HEAT OVERFLOW: {currentHeat - maxHeat} over limit
          </p>
        </div>
      )}
    </div>
  );
}
