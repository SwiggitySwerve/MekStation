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

import { ArmorPipLayout, Bounds, type PipOptions } from '../ArmorPipLayout';
import {
  BATTLEARMOR_TEMPLATE_IDS,
  INFANTRY_MAX_TROOPERS,
  INFANTRY_TEMPLATE_IDS,
} from './templateElementIds';

/** Default pip fill colour — matches the mech path. */
const DEFAULT_PIP_FILL = '#FFFFFF';
/** Default pip stroke width — matches the mech path. */
const DEFAULT_PIP_STROKE = 0.5;

/** SVG namespace — used to create pip / marker elements. */
const SVG_NS = 'http://www.w3.org/2000/svg';

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

// ============================================================================
// Wave-2 small-unit pip grids
//
// Two additive helpers for the Wave-2 infantry / battle-armor families.
// They layer ONTO the per-location pip layout above — neither modifies
// `layoutPips` / `layoutPipsInGroup` / `ArmorPipLayout`, so the mech and
// Wave-1 families are unaffected.
// ============================================================================

/** One trooper column's per-suit armor pip count for the BA pip grid. */
export interface BattleArmorTrooperPips {
  /** Zero-based trooper-column index (`0`..`5`). */
  readonly column: number;
  /**
   * Per-suit armor pip count for this trooper — the canonical
   * `armorPips` value. The helper draws `armorPips + 1` pips, mirroring
   * MegaMek `PrintBattleArmor` (`getOArmor(trooper) + 1` — the armor
   * value plus one "trooper" pip).
   */
  readonly armorPips: number;
}

/** The result of one Battle Armor per-trooper pip-grid layout. */
export interface BattleArmorPipGridResult {
  /**
   * Per-column rendered pip counts, indexed by trooper column. Each
   * value is the count of pip `<circle>` elements emitted into that
   * column's `pips_N` region (`armorPips + 1`). Columns with no trooper
   * are absent from the map.
   */
  readonly renderedByColumn: ReadonlyMap<number, number>;
}

/** MegaMek max BA armor (`PrintBattleArmor`: width / 19.0). */
const BA_MAX_ARMOR_DIVISOR = 19;
/** CSS class applied to each Battle Armor armor pip. */
const BA_PIP_CLASS = 'pip ba-armor';

/**
 * Lay out the Battle Armor per-trooper pip grid.
 *
 * For each trooper present in `troopers`, resolves the matching
 * `pips_<column>` `<rect>` region
 * (`BATTLEARMOR_TEMPLATE_IDS.pipsPrefix`) and lays out `armorPips + 1`
 * pip `<circle>` elements as a horizontal row across the region's
 * measured geometry. The `pips_N` element is the region rect itself
 * (not a `<g>` of sub-regions), so the helper measures it directly with
 * `Bounds.fromRect` and spaces the pips by `width / 19` — exactly the
 * placement in MegaMek `PrintBattleArmor` (max BA armor is 18, the
 * `+1` trooper pip makes 19 the divisor).
 *
 * Trooper columns beyond the squad size are left untouched (empty),
 * matching `PrintBattleArmor`, which iterates `0..5` but only fills
 * `i < getTroopers()`.
 *
 * The `+1` "trooper" pip is the documented MegaMek divergence (see the
 * `BATTLEARMOR_TEMPLATE_IDS` catalog comment) — the rendered count per
 * column is therefore `armorPips + 1`, and the Wave-2 fidelity gate
 * asserts exactly that.
 *
 * Additive: this does not touch the per-location layout used by the
 * mech and Wave-1 families.
 *
 * @returns the per-column rendered pip counts (the fidelity-gate input).
 */
export function layoutBattleArmorPipGrid(
  svgDoc: Document,
  troopers: readonly BattleArmorTrooperPips[],
  options: PipLayoutOptions = {},
): BattleArmorPipGridResult {
  const renderedByColumn = new Map<number, number>();
  const fill = options.fill ?? DEFAULT_PIP_FILL;
  const strokeWidth = options.strokeWidth ?? DEFAULT_PIP_STROKE;
  const className = options.className ?? BA_PIP_CLASS;

  for (const trooper of troopers) {
    // A real adapter never produces a negative column or armor count;
    // guard defensively so a malformed input is a skip, not a throw.
    if (trooper.column < 0 || trooper.armorPips < 0) {
      continue;
    }
    const groupId = `${BATTLEARMOR_TEMPLATE_IDS.pipsPrefix}${trooper.column}`;
    const region = svgDoc.getElementById(groupId);
    if (!region) {
      continue;
    }
    const bounds = Bounds.fromRect(region);
    if (bounds.width <= 0 || bounds.height <= 0) {
      continue;
    }
    // MegaMek `PrintBattleArmor`: pip count is `getOArmor(trooper) + 1`.
    const pipCount = trooper.armorPips + 1;
    // Pip spacing mirrors MegaMek — region width over the 19-pip max.
    const size = bounds.width / BA_MAX_ARMOR_DIVISOR;
    const radius = size * 0.36;
    const cy = bounds.centerY;
    for (let p = 0; p < pipCount; p++) {
      const pip = svgDoc.createElementNS(SVG_NS, 'circle');
      pip.setAttribute('cx', String(bounds.left + size * (p + 0.5)));
      pip.setAttribute('cy', String(cy));
      pip.setAttribute('r', String(radius));
      pip.setAttribute('fill', fill);
      pip.setAttribute('stroke-width', String(strokeWidth));
      pip.setAttribute('class', className);
      // Append as a sibling of the region rect so the fidelity gate's
      // `querySelectorAll` parses the pips back out.
      region.parentNode?.appendChild(pip);
    }
    renderedByColumn.set(trooper.column, pipCount);
  }
  return { renderedByColumn };
}

/** The result of one infantry platoon pip-grid layout. */
export interface InfantryPlatoonPipGridResult {
  /**
   * The number of platoon pip markers emitted — one per occupied
   * `soldier_N` slot. Equals the platoon trooper count (clamped to the
   * template's 30-slot capacity). The Wave-2 fidelity gate asserts this
   * equals the fixture's trooper count.
   */
  readonly renderedCount: number;
}

/** CSS class applied to each infantry platoon pip marker. */
const INFANTRY_PLATOON_PIP_CLASS = 'pip platoon-trooper';

/**
 * Lay out the infantry platoon pip grid.
 *
 * The `conventional_infantry_platoon` template exposes 30 pre-drawn
 * trooper-icon slots (`soldier_1`..`soldier_30`,
 * `INFANTRY_TEMPLATE_IDS.soldierPrefix`). The platoon "pip grid" marks
 * the first `platoonSize` of those slots as occupied by appending a
 * marker pip `<circle>` (centred on the slot's measured geometry) to
 * each. The count of emitted markers equals the platoon trooper count.
 *
 * `platoonSize` is clamped to `INFANTRY_MAX_TROOPERS` (30) — the
 * template has no slot beyond `soldier_30`. A `platoonSize` of zero or
 * fewer is a no-op.
 *
 * Slot geometry is read from the `soldier_N` element's `x/y/width/
 * height` attributes (`Bounds.fromRect`) so the helper works on an
 * un-mounted parsed document, consistent with the rest of the engine.
 *
 * Additive: this does not touch the per-location layout used by the
 * mech and Wave-1 families.
 *
 * @returns the rendered platoon pip count (the fidelity-gate input).
 */
export function layoutInfantryPlatoonPipGrid(
  svgDoc: Document,
  platoonSize: number,
  options: PipLayoutOptions = {},
): InfantryPlatoonPipGridResult {
  if (platoonSize <= 0) {
    return { renderedCount: 0 };
  }
  const occupied = Math.min(platoonSize, INFANTRY_MAX_TROOPERS);
  const fill = options.fill ?? DEFAULT_PIP_FILL;
  const strokeWidth = options.strokeWidth ?? DEFAULT_PIP_STROKE;
  const className = options.className ?? INFANTRY_PLATOON_PIP_CLASS;

  let renderedCount = 0;
  for (let slot = 1; slot <= occupied; slot++) {
    const slotId = `${INFANTRY_TEMPLATE_IDS.soldierPrefix}${slot}`;
    const slotElement = svgDoc.getElementById(slotId);
    if (!slotElement) {
      continue;
    }
    const bounds = Bounds.fromRect(slotElement);
    if (bounds.width <= 0 || bounds.height <= 0) {
      // A slot with no measurable geometry still counts as occupied —
      // but with no resolvable centre we cannot place a marker. Skip the
      // marker; the slot element itself is the fallback visual.
      continue;
    }
    const pip = svgDoc.createElementNS(SVG_NS, 'circle');
    pip.setAttribute('cx', String(bounds.left + bounds.width / 2));
    pip.setAttribute('cy', String(bounds.top + bounds.height / 2));
    // Marker radius scaled to the slot — small enough never to overflow.
    pip.setAttribute('r', String(Math.min(bounds.width, bounds.height) * 0.18));
    pip.setAttribute('fill', fill);
    pip.setAttribute('stroke-width', String(strokeWidth));
    pip.setAttribute('class', className);
    // Append the marker as a sibling of the slot icon so it is parsed
    // back out by the fidelity gate's `querySelectorAll`.
    slotElement.parentNode?.appendChild(pip);
    renderedCount++;
  }
  return { renderedCount };
}
