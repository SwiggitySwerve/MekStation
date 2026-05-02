/**
 * Ammo Construction Types
 *
 * Single source-of-truth for the ammo-bin construction shape used by
 * `IGameUnit.ammoConstruction` (session-start bin seeding) and the
 * `ammoTracking` utility module (consumption / explosion logic).
 *
 * Prior to PR6 this shape lived in two parallel definitions —
 * `IAmmoConstructionInit` in `types/gameplay/GameSessionInterfaces.ts`
 * and `IAmmoConstructionData` in `utils/gameplay/ammoTracking/types.ts`
 * — explicitly to "avoid a circular import from the types package into
 * the gameplay utils." The cycle the comment guarded against doesn't
 * actually exist (the types package never imports from utils), so the
 * duplication is now collapsed into this leaf module which both sides
 * re-export.
 *
 * @spec openspec/specs/ammo-tracking/spec.md
 */

/**
 * Construction data for initializing a single ammo bin at session start.
 * One entry per ton of ammo carried; producers (catalog/MTF importers,
 * `InteractiveSession`) populate this from canonical equipment data.
 */
export interface IAmmoConstructionData {
  /** Unique bin identifier */
  readonly binId: string;
  /** Weapon type this ammo feeds (e.g., 'AC/10', 'SRM 6', 'LRM 20') */
  readonly weaponType: string;
  /** Location of the ammo bin */
  readonly location: string;
  /** Maximum rounds per bin */
  readonly maxRounds: number;
  /** Damage per round for explosion calculation */
  readonly damagePerRound: number;
  /** Whether this ammo is explosive */
  readonly isExplosive: boolean;
}

/**
 * Legacy alias. Older call-sites in `GameSessionInterfaces.ts` referred to
 * the same shape as `IAmmoConstructionInit`; the alias keeps those imports
 * compiling while the canonical name converges on `IAmmoConstructionData`.
 *
 * @deprecated Use `IAmmoConstructionData`. Will be removed once all
 *   consumers migrate.
 */
export type IAmmoConstructionInit = IAmmoConstructionData;
