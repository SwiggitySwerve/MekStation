/**
 * TimelineDatePicker Component
 * Date range selector with quick presets for filtering events by time.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/Button';

// =============================================================================
// Time Constants
// =============================================================================

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const PRESET_TOLERANCE_MS = 60000; // 1 minute tolerance for preset matching

// =============================================================================
// Types
// =============================================================================

export interface TimeRange {
  from: string;
  to: string;
}

export interface TimelineDatePickerProps {
  /** Current time range selection */
  timeRange?: TimeRange;
  /** Callback when time range changes */
  onChange: (range: TimeRange | undefined) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Quick Presets
// =============================================================================

type PresetOption = {
  label: string;
  getValue: () => TimeRange;
};

function getPresets(): PresetOption[] {
  const now = new Date();

  return [
    {
      label: 'Last hour',
      getValue: () => {
        const from = new Date(now.getTime() - ONE_HOUR_MS);
        return {
          from: from.toISOString(),
          to: now.toISOString(),
        };
      },
    },
    {
      label: 'Last 24h',
      getValue: () => {
        const from = new Date(now.getTime() - ONE_DAY_MS);
        return {
          from: from.toISOString(),
          to: now.toISOString(),
        };
      },
    },
    {
      label: 'Last 7 days',
      getValue: () => {
        const from = new Date(now.getTime() - SEVEN_DAYS_MS);
        return {
          from: from.toISOString(),
          to: now.toISOString(),
        };
      },
    },
    {
      label: 'Last 30 days',
      getValue: () => {
        const from = new Date(now.getTime() - THIRTY_DAYS_MS);
        return {
          from: from.toISOString(),
          to: now.toISOString(),
        };
      },
    },
  ];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert ISO string to datetime-local input value.
 */
function isoToDateTimeInput(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    return date.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

/**
 * Convert datetime-local input value to ISO string.
 */
function dateTimeInputToIso(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  try {
    return new Date(dateTimeStr).toISOString();
  } catch {
    return '';
  }
}

// =============================================================================
// Component
// =============================================================================

export function TimelineDatePicker({
  timeRange,
  onChange,
  className = '',
}: TimelineDatePickerProps): React.ReactElement {
  const presets = useMemo(() => getPresets(), []);

  // Check if current range matches a preset
  const activePreset = useMemo(() => {
    if (!timeRange) return null;
    // Compare with each preset (within 1 minute tolerance)
    for (const preset of presets) {
      const presetValue = preset.getValue();
      const fromDiff = Math.abs(
        new Date(timeRange.from).getTime() -
          new Date(presetValue.from).getTime(),
      );
      const toDiff = Math.abs(
        new Date(timeRange.to).getTime() - new Date(presetValue.to).getTime(),
      );
      if (fromDiff < PRESET_TOLERANCE_MS && toDiff < PRESET_TOLERANCE_MS) {
        return preset.label;
      }
    }
    return null;
  }, [timeRange, presets]);

  // Handle preset click
  const handlePresetClick = useCallback(
    (preset: PresetOption) => {
      onChange(preset.getValue());
    },
    [onChange],
  );

  // Handle "All time" click
  const handleAllTime = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  // Handle from date change
  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fromIso = dateTimeInputToIso(e.target.value);
      if (!fromIso) return;

      const toIso = timeRange?.to || new Date().toISOString();
      onChange({ from: fromIso, to: toIso });
    },
    [timeRange, onChange],
  );

  // Handle to date change
  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const toIso = dateTimeInputToIso(e.target.value);
      if (!toIso) return;

      const fromIso = timeRange?.from || new Date(0).toISOString();
      onChange({ from: fromIso, to: toIso });
    },
    [timeRange, onChange],
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-text-theme-secondary block text-sm font-medium">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-1.5">
          {/* All time button */}
          <button
            type="button"
            onClick={handleAllTime}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              !timeRange
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-theme-subtle text-text-theme-secondary hover:text-text-theme-primary hover:border-border-theme'
            } `}
          >
            All time
          </button>

          {/* Preset buttons */}
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                activePreset === preset.label
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border-theme-subtle text-text-theme-secondary hover:text-text-theme-primary hover:border-border-theme'
              } `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="space-y-2">
        <label className="text-text-theme-secondary block text-sm font-medium">
          Custom Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* From Date */}
          <div className="space-y-1">
            <label className="text-text-theme-muted block text-xs">From</label>
            <input
              type="datetime-local"
              value={isoToDateTimeInput(timeRange?.from)}
              onChange={handleFromChange}
              className={`bg-surface-raised/50 border-border-theme text-text-theme-primary focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm [color-scheme:dark] transition-colors duration-200 focus:ring-1 focus:outline-none`}
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-text-theme-muted block text-xs">To</label>
            <input
              type="datetime-local"
              value={isoToDateTimeInput(timeRange?.to)}
              onChange={handleToChange}
              className={`bg-surface-raised/50 border-border-theme text-text-theme-primary focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm [color-scheme:dark] transition-colors duration-200 focus:ring-1 focus:outline-none`}
            />
          </div>
        </div>
      </div>

      {/* Active Range Display */}
      {timeRange && (
        <div className="border-border-theme-subtle/30 flex items-center justify-between border-t pt-2">
          <div className="text-text-theme-muted text-xs">
            <span className="text-text-theme-secondary font-medium">
              Active range:{' '}
            </span>
            {new Date(timeRange.from).toLocaleDateString()} -{' '}
            {new Date(timeRange.to).toLocaleDateString()}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAllTime}
            className="text-xs"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

export default TimelineDatePicker;
