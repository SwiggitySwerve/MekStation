/**
 * CheckpointSelector Component
 * Two inputs to select "from" and "to" sequence numbers for state comparison.
 * Includes swap and compare buttons with min/max validation.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useCallback, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// =============================================================================
// Types
// =============================================================================

export interface CheckpointSelectorProps {
  /** Minimum valid sequence number */
  minSequence: number;
  /** Maximum valid sequence number */
  maxSequence: number;
  /** Current "from" sequence number */
  fromSequence: number;
  /** Current "to" sequence number */
  toSequence: number;
  /** Callback when either sequence changes */
  onChange: (from: number, to: number) => void;
  /** Callback when Compare button is clicked */
  onCompare: () => void;
  /** Whether a comparison is in progress */
  isLoading?: boolean;
  /** Optional additional className */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function SwapIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function CompareIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CheckpointSelector({
  minSequence,
  maxSequence,
  fromSequence,
  toSequence,
  onChange,
  onCompare,
  isLoading = false,
  className = '',
}: CheckpointSelectorProps): React.ReactElement {
  // Local state for input values (allows intermediate invalid states while typing)
  const [localFrom, setLocalFrom] = useState(String(fromSequence));
  const [localTo, setLocalTo] = useState(String(toSequence));
  const [fromError, setFromError] = useState<string | undefined>();
  const [toError, setToError] = useState<string | undefined>();

  // Sync local state with props
  useEffect(() => {
    setLocalFrom(String(fromSequence));
  }, [fromSequence]);

  useEffect(() => {
    setLocalTo(String(toSequence));
  }, [toSequence]);

  // Validate a sequence number
  const validateSequence = useCallback(
    (value: string, field: 'from' | 'to'): number | null => {
      const num = parseInt(value, 10);

      if (isNaN(num)) {
        return null;
      }

      if (num < minSequence) {
        if (field === 'from') setFromError(`Min: ${minSequence}`);
        else setToError(`Min: ${minSequence}`);
        return null;
      }

      if (num > maxSequence) {
        if (field === 'from') setFromError(`Max: ${maxSequence}`);
        else setToError(`Max: ${maxSequence}`);
        return null;
      }

      if (field === 'from') setFromError(undefined);
      else setToError(undefined);

      return num;
    },
    [minSequence, maxSequence],
  );

  // Handle from input change
  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalFrom(value);

      const validated = validateSequence(value, 'from');
      if (validated !== null) {
        onChange(validated, toSequence);
      }
    },
    [onChange, toSequence, validateSequence],
  );

  // Handle to input change
  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalTo(value);

      const validated = validateSequence(value, 'to');
      if (validated !== null) {
        onChange(fromSequence, validated);
      }
    },
    [onChange, fromSequence, validateSequence],
  );

  // Handle swap button
  const handleSwap = useCallback(() => {
    onChange(toSequence, fromSequence);
  }, [onChange, fromSequence, toSequence]);

  // Check if comparison is valid
  const canCompare =
    !fromError && !toError && fromSequence !== toSequence && !isLoading;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-text-theme-primary text-sm font-semibold tracking-wider uppercase">
          Compare States
        </h3>
        <span className="text-text-theme-muted font-mono text-xs">
          Range: {minSequence} - {maxSequence}
        </span>
      </div>

      {/* Inputs Row */}
      <div className="flex items-end gap-3">
        {/* From Input */}
        <div className="flex-1">
          <Input
            type="number"
            label="From (Before)"
            value={localFrom}
            onChange={handleFromChange}
            min={minSequence}
            max={maxSequence}
            error={fromError}
            accent="cyan"
            className="font-mono"
          />
        </div>

        {/* Swap Button */}
        <Button
          variant="ghost"
          size="md"
          onClick={handleSwap}
          disabled={isLoading}
          title="Swap from and to"
          className="mb-0.5 flex-shrink-0"
        >
          <SwapIcon />
        </Button>

        {/* To Input */}
        <div className="flex-1">
          <Input
            type="number"
            label="To (After)"
            value={localTo}
            onChange={handleToChange}
            min={minSequence}
            max={maxSequence}
            error={toError}
            accent="emerald"
            className="font-mono"
          />
        </div>
      </div>

      {/* Compare Button */}
      <Button
        variant="primary"
        size="md"
        onClick={onCompare}
        disabled={!canCompare}
        isLoading={isLoading}
        leftIcon={<CompareIcon />}
        fullWidth
      >
        {isLoading ? 'Computing Diff...' : 'Compare States'}
      </Button>

      {/* Sequence Order Warning */}
      {fromSequence > toSequence && (
        <p className="flex items-center gap-1.5 text-xs text-amber-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <span>
            Note: &quot;From&quot; is after &quot;To&quot; - diff will show
            reverse changes
          </span>
        </p>
      )}
    </div>
  );
}

export default CheckpointSelector;
