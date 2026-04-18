/**
 * ArmorPipRow — Shared Armor Pip Primitive
 *
 * Renders a strip of N armor pips, each filled (allocated) or empty (unallocated).
 * All per-type diagrams (vehicle, aerospace, BA, ProtoMech) delegate pip rendering
 * here so visual consistency and damage-state logic are centralised.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Shared Armor Pip Primitive
 */

import React from "react";

// =============================================================================
// Types
// =============================================================================

export interface ArmorPipRowProps {
  /** Human-readable location label, used for ARIA ("front armor: 20 of 25") */
  label: string;
  /** Currently allocated / remaining armor points */
  current: number;
  /** Maximum possible armor points for this location */
  max: number;
  /**
   * Layout direction.
   * 'row'    — pips flow left-to-right (default, used in compact location blocks)
   * 'column' — pips flow top-to-bottom (used in BA trooper columns)
   */
  orientation?: "row" | "column";
  /** Optional extra CSS applied to the outermost element */
  className?: string;
  /** Pip size in pixels (default 8) */
  pipSize?: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine pip fill colour by threshold relative to max.
 * Mirrors the colour semantics used across the rest of the diagrams.
 */
function pipFill(index: number, current: number): string {
  if (index < current) {
    return "#22d3ee"; // cyan-400 — allocated / filled pip
  }
  return "#334155"; // slate-700 — empty pip
}

// =============================================================================
// Component
// =============================================================================

/**
 * A row (or column) of armor pips.
 *
 * Accessible: the wrapping <div> carries an aria-label of the form
 * "<label>: <current> of <max>" so screen readers announce the location state.
 */
export function ArmorPipRow({
  label,
  current,
  max,
  orientation = "row",
  className = "",
  pipSize = 8,
}: ArmorPipRowProps): React.ReactElement {
  // Clamp current so we never render more filled pips than slots exist
  const filled = Math.max(0, Math.min(current, max));

  const pips = Array.from({ length: max }, (_, i) => i);

  const containerClass =
    orientation === "column"
      ? "flex flex-col items-center gap-0.5"
      : "flex flex-row flex-wrap gap-0.5";

  return (
    <div
      className={`${containerClass} ${className}`}
      aria-label={`${label}: ${current} of ${max}`}
      role="img"
    >
      {pips.map((i) => (
        <span
          key={i}
          style={{
            width: pipSize,
            height: pipSize,
            borderRadius: 2,
            display: "inline-block",
            backgroundColor: pipFill(i, filled),
            border: "1px solid #475569", // slate-600 border on every pip
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}
