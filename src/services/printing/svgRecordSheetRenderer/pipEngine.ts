/**
 * Shared Dynamic Pip Engine
 *
 * Computes armor and structure pip positions from a template's `<rect>`
 * region geometry, generalizing the dynamic layout logic in `armor.ts`
 * so every unit family (mech / vehicle / aerospace / protomech) lays
 * out pips through one engine.
 *
 * The engine builds on `ArmorPipLayout` — the proven MegaMekLab-derived
 * region-geometry layout (mirroring `ArmorPipLayout.java` +
 * `PrintEntity.java`) — and adds two cross-family concerns:
 *
 *   - the `grouped`-layout element-lookup fallback: when a region's
 *     primary element ID is absent, retry `getElementById(id +
 *     "grouped")` (MegaMekLab `PrintEntity.java`);
 *   - the alternate-clustering flag (`groupByFive` in `ArmorPipLayout`,
 *     `ArmorPipLayout.java`'s grouped-by-five placement) surfaced so
 *     callers can request clustered pip placement.
 *
 * Region rect geometry is read from the `<rect>` `x/y/width/height`
 * attributes (`Bounds.fromRect`). When a caller instead measures via
 * `getBBox()`, the template SVG MUST be mounted in a live DOM first —
 * see `TemplateRecordSheetRenderer.mount()`.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Shared Dynamic Pip Engine)
 */

import { ArmorPipLayout, type PipOptions } from '../ArmorPipLayout';

/** Default pip fill colour — matches the mech path. */
const DEFAULT_PIP_FILL = '#FFFFFF';
/** Default pip stroke width — matches the mech path. */
const DEFAULT_PIP_STROKE = 0.5;

/**
 * Options controlling a single pip-layout operation.
 */
export interface PipLayoutOptions {
  /** Pip fill colour. Defaults to white. */
  readonly fill?: string;
  /** Pip stroke width. Defaults to 0.5. */
  readonly strokeWidth?: number;
  /** CSS class applied to each rendered pip element. */
  readonly className?: string;
  /** Stagger alternating rows (used by some location diagrams). */
  readonly staggered?: boolean;
  /**
   * Request the alternate clustered ("grouped-by-five") placement from
   * MegaMekLab `ArmorPipLayout.java`. Default `false` matches the mech
   * path's standard layout.
   */
  readonly clustered?: boolean;
}

/**
 * Resolve a pip-group element by ID, applying the `grouped`-layout
 * fallback when the primary ID is absent.
 *
 * Mirrors MegaMekLab `PrintEntity.java`: armor diagrams may expose
 * either a primary pip region (`armorPipsLS`) or, when the canonical
 * sheet packs that location into a grouped cluster, only the
 * `<id>grouped` twin (`armorPipsLSgrouped`).
 *
 * @returns the resolved element, or `null` when neither ID exists.
 */
export function resolvePipGroup(
  svgDoc: Document,
  groupId: string,
): Element | null {
  const primary = svgDoc.getElementById(groupId);
  if (primary) {
    return primary;
  }
  // Grouped-layout fallback — retry the `<id>grouped` element.
  return svgDoc.getElementById(`${groupId}grouped`);
}

/**
 * Lay out `count` pip elements inside a template region group.
 *
 * Resolves the group (with the `grouped` fallback), then delegates to
 * `ArmorPipLayout.addPips`, which positions exactly `count` pips within
 * the region's measured `<rect>` bounds. A `count` of zero or fewer is
 * a no-op. An unresolvable group ID is a no-op (logged by the caller's
 * own diagnostics, not here — the engine stays pure).
 *
 * @returns `true` when the group resolved and layout ran, `false` when
 *   the group could not be resolved.
 */
export function layoutPips(
  svgDoc: Document,
  groupId: string,
  count: number,
  options: PipLayoutOptions = {},
): boolean {
  if (count <= 0) {
    return false;
  }
  const group = resolvePipGroup(svgDoc, groupId);
  if (!group) {
    return false;
  }
  const pipOptions: PipOptions = {
    fill: options.fill ?? DEFAULT_PIP_FILL,
    strokeWidth: options.strokeWidth ?? DEFAULT_PIP_STROKE,
    className: options.className,
    staggered: options.staggered ?? false,
    // The alternate-clustering flag from ArmorPipLayout.java is surfaced
    // here as `clustered`; ArmorPipLayout names it `groupByFive`.
    groupByFive: options.clustered ?? false,
  };
  ArmorPipLayout.addPips(svgDoc, group, count, pipOptions);
  return true;
}

/**
 * Lay out pips against an already-resolved group element.
 *
 * Used when the caller has resolved the group itself (e.g.
 * `TemplateRecordSheetRenderer.applyPips`). Skips the
 * `resolvePipGroup` step; the `grouped` fallback is the caller's
 * responsibility in that path.
 */
export function layoutPipsInGroup(
  svgDoc: Document,
  group: Element,
  count: number,
  options: PipLayoutOptions = {},
): void {
  if (count <= 0) {
    return;
  }
  ArmorPipLayout.addPips(svgDoc, group, count, {
    fill: options.fill ?? DEFAULT_PIP_FILL,
    strokeWidth: options.strokeWidth ?? DEFAULT_PIP_STROKE,
    className: options.className,
    staggered: options.staggered ?? false,
    groupByFive: options.clustered ?? false,
  });
}
