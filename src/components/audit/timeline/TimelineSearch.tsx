/**
 * TimelineSearch Component
 * Debounced search input for full-text event search.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface TimelineSearchProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes (debounced) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Custom class name */
  className?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

// =============================================================================
// Component
// =============================================================================

export function TimelineSearch({
  value,
  onChange,
  placeholder = 'Search events...',
  className = '',
  debounceMs = 300,
}: TimelineSearchProps): React.ReactElement {
  // Local state for immediate input feedback
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new timeout for debounced callback
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs],
  );

  // Clear search
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Escape to clear
      if (e.key === 'Escape' && localValue) {
        e.preventDefault();
        handleClear();
      }
    },
    [localValue, handleClear],
  );

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="text-text-theme-muted h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`bg-surface-raised/50 border-border-theme text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/20 w-full rounded-lg border py-2.5 pr-10 pl-10 transition-colors duration-200 focus:ring-1 focus:outline-none`}
      />

      {/* Clear Button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="text-text-theme-muted hover:text-text-theme-primary absolute inset-y-0 right-0 flex items-center pr-3 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Loading indicator during debounce */}
      {localValue !== value && (
        <div className="absolute inset-y-0 right-8 flex items-center pr-2">
          <div className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" />
        </div>
      )}
    </div>
  );
}

export default TimelineSearch;
