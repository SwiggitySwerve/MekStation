/**
 * SearchInput — controlled text input for the SPA picker.
 *
 * Single-line, debounced via the parent (we keep this dumb so tests
 * can drive it synchronously). Has a visible label for accessibility
 * and a clear-button affordance when the input is non-empty.
 */

import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  /** Optional placeholder text — defaults to a generic helper string. */
  placeholder?: string;
}

/**
 * Render the search row. Esc clears the input rather than bubbling up
 * (the picker root handles Esc-to-cancel only when search is empty —
 * see SPAPicker.tsx).
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search abilities by name, description, or source',
}: SearchInputProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="spa-picker-search"
        className="text-text-theme-muted text-xs font-medium tracking-wide uppercase"
      >
        Search
      </label>
      <div className="relative">
        <input
          id="spa-picker-search"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-border-theme-subtle bg-surface-base text-text-theme-primary placeholder:text-text-theme-muted focus:border-accent w-full rounded border px-3 py-2 pr-8 text-sm focus:outline-none"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="text-text-theme-muted hover:text-text-theme-primary absolute top-1/2 right-1 -translate-y-1/2 rounded p-1"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchInput;
