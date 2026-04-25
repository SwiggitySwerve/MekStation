/**
 * ArmorAllocationInput — Shared Number-Input Primitive
 *
 * A small number-input + spinner used by every per-type armor diagram for
 * setting per-location armor values. Centralises:
 *   - clamp behaviour (0..max)
 *   - keyboard arrow-key navigation between sibling inputs
 *     (`data-armor-input` cursor — see ArmorDiagramForType.tsx)
 *   - styling so all diagrams look identical
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Shared Armor Pip Primitive
 */

import React, { useCallback, useRef } from "react";

// =============================================================================
// Types
// =============================================================================

export interface ArmorAllocationInputProps {
  /** Human-readable label for ARIA */
  label: string;
  /** Current value (must be finite — caller is responsible for default 0) */
  value: number;
  /** Hard maximum the input clamps to */
  max: number;
  /** Minimum (defaults to 0) */
  min?: number;
  /** Step amount used by the spinner (default 1) */
  step?: number;
  /** Change handler — receives the clamped value */
  onChange: (next: number) => void;
  /** Test id passthrough */
  "data-testid"?: string;
  /** Extra Tailwind classes appended to the <input> */
  className?: string;
  /** Optional grouping key: enables arrow-key navigation between sibling inputs sharing the same group */
  groupId?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Clamp a numeric value to the [min, max] range. */
function clamp(raw: number, min: number, max: number): number {
  if (Number.isNaN(raw)) return min;
  if (raw < min) return min;
  if (raw > max) return max;
  return raw;
}

/**
 * Find the next/previous sibling input in the DOM that shares the same
 * data-armor-group attribute. Used for keyboard arrow navigation.
 */
function focusSibling(
  current: HTMLInputElement,
  direction: "prev" | "next",
): void {
  const group = current.getAttribute("data-armor-group");
  if (!group) return;
  const siblings = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[data-armor-group="${group}"]`,
    ),
  );
  const index = siblings.indexOf(current);
  if (index === -1) return;
  const next = direction === "next" ? siblings[index + 1] : siblings[index - 1];
  next?.focus();
  next?.select();
}

// =============================================================================
// Component
// =============================================================================

/**
 * Compact number input with built-in clamping + arrow navigation.
 *
 * Keyboard:
 *   ArrowUp / ArrowDown — increment / decrement by `step` (browser default)
 *   ArrowLeft / ArrowRight at the input's edges — move focus to prev / next
 *     sibling input within the same `groupId`
 */
export function ArmorAllocationInput({
  label,
  value,
  max,
  min = 0,
  step = 1,
  onChange,
  "data-testid": testId,
  className = "",
  groupId,
}: ArmorAllocationInputProps): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      onChange(clamp(raw, min, max));
    },
    [onChange, min, max],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Arrow navigation hops to the next/previous sibling input that shares
      // the same `groupId`. For type="number" inputs, browsers do not expose
      // selectionStart (returns null), so we always navigate on ArrowLeft /
      // ArrowRight when a groupId is present. The browser's built-in
      // ArrowUp/ArrowDown spinner behaviour is left untouched.
      if (!groupId) return;
      const input = event.currentTarget;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusSibling(input, "next");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusSibling(input, "prev");
      }
    },
    [groupId],
  );

  return (
    <input
      ref={ref}
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      data-armor-group={groupId}
      data-testid={testId}
      aria-label={`${label} armor value`}
      className={`w-full rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-center text-xs text-white ${className}`}
    />
  );
}

export default ArmorAllocationInput;
