/**
 * Star System data model
 *
 * Per `wire-starmap-into-campaign` (Wave 6.4): the canonical shape for a
 * star system on the campaign starmap. The structure mirrors the existing
 * `IStarSystem` interface inside `StarmapDisplay.tsx` (which was already
 * authored for the display component) — we re-export it as a stable type
 * the data loaders, store actions, and tests can depend on without
 * reaching into the component module.
 *
 * The MVP shape carries `id` / `name` / `position` / `faction` /
 * `population?`. Future extensions (industrial rating, system stats,
 * jump-distance graph) layer on as optional fields when the full SUCKit
 * import lands; the MVP shape stays a strict subset.
 *
 * @spec openspec/changes/wire-starmap-into-campaign/specs/starmap-interface/spec.md
 */

/**
 * Canonical BattleTech-universe factions the seed dataset uses. The list
 * is closed for the MVP — adding a new faction requires extending this
 * union AND the `FACTION_COLORS` table in `StarmapDisplay.tsx`. Mercenary
 * / unaligned systems use `'Independent'`.
 */
export const KNOWN_FACTIONS = [
  'Lyran',
  'Davion',
  'Liao',
  'Kurita',
  'Marik',
  'Steiner',
  'Periphery',
  'ComStar',
  'Clan',
  'Independent',
] as const;

export type KnownFaction = (typeof KNOWN_FACTIONS)[number];

/**
 * A single star system on the campaign starmap.
 *
 * The `position` coordinates are in the standard BattleTech-universe
 * convention: Terra at the origin, +x = "spinward / Davion-ward",
 * +y = "rimward / Periphery-ward". The exact unit is arbitrary for the
 * MVP (canvas pixels scale to fit) but the seed dataset uses light-year
 * offsets so a future SUCKit import drops in cleanly.
 */
export interface IStarSystem {
  /** Stable kebab-case id (e.g. `'terra'`, `'new-avalon'`). */
  readonly id: string;
  /** Display name (e.g. `'New Avalon'`). */
  readonly name: string;
  /** Position on the canvas. */
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  /** Controlling faction at the seed-dataset's snapshot date (3025). */
  readonly faction: KnownFaction;
  /** Optional population for the LOD's "major system" label decision. */
  readonly population?: number;
}

/**
 * Type guard for `IStarSystem`. Used by the seed-dataset loader to
 * reject a malformed entry at build time (failing the unit-test seed
 * shape assertion) rather than letting a bad entry trickle through to
 * the canvas where it would render as a blank dot.
 */
export function isStarSystem(value: unknown): value is IStarSystem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;

  if (typeof v.id !== 'string' || v.id.length === 0) return false;
  if (typeof v.name !== 'string' || v.name.length === 0) return false;
  if (typeof v.faction !== 'string') return false;
  if (!(KNOWN_FACTIONS as readonly string[]).includes(v.faction)) return false;

  const pos = v.position as { x?: unknown; y?: unknown } | undefined;
  if (pos === undefined || pos === null) return false;
  if (typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;

  if (v.population !== undefined && typeof v.population !== 'number')
    return false;

  return true;
}
