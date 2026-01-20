/**
 * TimelineDatePicker Component
 * Date range selector with quick presets for filtering events by time.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';

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
        const from = new Date(now.getTime() - 60 * 60 * 1000);
        return {
          from: from.toISOString(),
          to: now.toISOString(),
        };
      },
    },
    {
      label: 'Last 24h',
      getValue: () => {
        const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return {
          from: from.toISOString(),
          to: now.toISOString(),
        };
      },
    },
    {
      label: 'Last 7 days',
      getValue: () => {
        const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          from: from.toISOString(),
          to: now.toISOString(),
        };
      },
    },
    {
      label: 'Last 30 days',
      getValue: () => {
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
      const fromDiff = Math.abs(new Date(timeRange.from).getTime() - new Date(presetValue.from).getTime());
      const toDiff = Math.abs(new Date(timeRange.to).getTime() - new Date(presetValue.to).getTime());
      if (fromDiff < 60000 && toDiff < 60000) {
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
    [onChange]
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
    [timeRange, onChange]
  );

  // Handle to date change
  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const toIso = dateTimeInputToIso(e.target.value);
      if (!toIso) return;

      const fromIso = timeRange?.from || new Date(0).toISOString();
      onChange({ from: fromIso, to: toIso });
    },
    [timeRange, onChange]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-theme-secondary">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-1.5">
          {/* All time button */}
          <button
            type="button"
            onClick={handleAllTime}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200
              ${!timeRange
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border-theme-subtle text-text-theme-secondary hover:text-text-theme-primary hover:border-border-theme'
              }
            `}
          >
            All time
          </button>

          {/* Preset buttons */}
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200
                ${activePreset === preset.label
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border-theme-subtle text-text-theme-secondary hover:text-text-theme-primary hover:border-border-theme'
                }
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-theme-secondary">
          Custom Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* From Date */}
          <div className="space-y-1">
            <label className="block text-xs text-text-theme-muted">From</label>
            <input
              type="datetime-local"
              value={isoToDateTimeInput(timeRange?.from)}
              onChange={handleFromChange}
              className={`
                w-full px-3 py-2 rounded-lg text-sm
                bg-surface-raised/50 border border-border-theme
                text-text-theme-primary
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
                transition-colors duration-200
                [color-scheme:dark]
              `}
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="block text-xs text-text-theme-muted">To</label>
            <input
              type="datetime-local"
              value={isoToDateTimeInput(timeRange?.to)}
              onChange={handleToChange}
              className={`
                w-full px-3 py-2 rounded-lg text-sm
                bg-surface-raised/50 border border-border-theme
                text-text-theme-primary
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
                transition-colors duration-200
                [color-scheme:dark]
              `}
            />
          </div>
        </div>
      </div>

      {/* Active Range Display */}
      {timeRange && (
        <div className="flex items-center justify-between pt-2 border-t border-border-theme-subtle/30">
          <div className="text-xs text-text-theme-muted">
            <span className="font-medium text-text-theme-secondary">Active range: </span>
            {new Date(timeRange.from).toLocaleDateString()} - {new Date(timeRange.to).toLocaleDateString()}
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
