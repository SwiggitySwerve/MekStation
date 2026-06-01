/**
 * AI Weapon-Mode Selector — multi-mode weapon mode choice.
 *
 * Per `add-ai-resource-planning` design D4: multi-mode weapons (LB-X
 * cluster/slug, Ultra/Rotary rate-of-fire) always fire their default mode in
 * the legacy bot. This selector picks the mode that maximizes *expected
 * damage* given range, the target's armour state, and the remaining heat
 * budget.
 *
 *   - **LB-X** — cluster mode against an armour-stripped or fast/evading
 *     target (cluster hits spread and crit-seek); slug mode against a fresh,
 *     fully-armoured target at short range.
 *   - **Ultra / Rotary** — the higher rate of fire when the heat budget and
 *     ammo runway both allow; the lower rate when heat or ammo is
 *     constrained.
 *
 * A weapon WITHOUT `firingModes` metadata is single-mode — the selector
 * returns its default mode unchanged (byte-identical to "always default
 * mode" for legacy fixtures). The selected mode is recorded on the declared
 * attack so the combat engine resolves the chosen mode.
 *
 * Pure and deterministic — never consumes `SeededRandom` (design D6).
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Multi-Mode Weapon Selection
 */

import type { IAIStructureState, IWeapon, IWeaponFiringMode } from './types';

/** Mode-id constants for the LB-X cluster/slug family. */
export const LBX_CLUSTER_MODE_ID = 'cluster';
export const LBX_SLUG_MODE_ID = 'slug';
export const MML_LRM_MODE_ID = 'lrm';
export const MML_SRM_MODE_ID = 'srm';

/**
 * The result of a weapon-mode selection: which mode was chosen and the
 * effective per-turn damage/heat/ammo cost of that mode. `AttackAI` records
 * `modeId` on the declared attack and uses `effectiveHeat` / `effectiveShots`
 * for downstream heat and ammo accounting.
 */
export interface IWeaponModeSelection {
  /** The weapon the selection is for. */
  readonly weaponId: string;
  /** The selected mode's id (the default mode id for single-mode weapons). */
  readonly modeId: string;
  /** Damage the selected mode deals per turn. */
  readonly effectiveDamage: number;
  /** Heat the selected mode generates per turn. */
  readonly effectiveHeat: number;
  /** Ammo rounds the selected mode consumes per turn. */
  readonly effectiveShots: number;
  /** Optional ammo-bin weapon family selected by ammo-mode weapons. */
  readonly ammoWeaponType?: string;
}

/**
 * Context the selector needs to weigh modes: the engagement range and the
 * target's structural state plus the heat budget the attacker has left.
 */
export interface IWeaponModeContext {
  /** Hex distance to the target. */
  readonly distance: number;
  /** The target's armour / structure snapshot, if known. */
  readonly targetStructure?: IAIStructureState;
  /** Whether the target is actively evading (ran / jumped this turn). */
  readonly targetEvading?: boolean;
  /**
   * Heat headroom the attacker has left this turn — `safeHeatThreshold`
   * minus heat already committed (movement + weapons chosen so far). A mode
   * whose heat exceeds this headroom is treated as over-budget.
   */
  readonly heatHeadroom: number;
  /**
   * Estimated turns of fire remaining for this weapon (from `AIAmmoRunway`).
   * A short runway discourages the higher-rate-of-fire mode. `Infinity` for
   * an energy weapon or an unknown ammo count.
   */
  readonly ammoTurnsRemaining: number;
}

/**
 * The runway, in turns, below which a rate-of-fire weapon avoids its
 * highest-consumption mode — burning two rounds a turn out of a four-turn
 * runway halves the runway, so the bot drops to single fire to ration it.
 */
const RATE_OF_FIRE_AMMO_FLOOR = 3;

/**
 * Build the single-mode pass-through selection for a weapon. Used for
 * weapons with no `firingModes` metadata and for the default mode lookup.
 */
function singleModeSelection(weapon: IWeapon): IWeaponModeSelection {
  return {
    weaponId: weapon.id,
    modeId: 'default',
    effectiveDamage: weapon.damage,
    effectiveHeat: weapon.heat,
    // Energy weapons consume no ammo; ammo-dependent weapons fire one round.
    effectiveShots: weapon.ammoPerTon > 0 ? 1 : 0,
  };
}

/** Project an `IWeaponFiringMode` into an `IWeaponModeSelection`. */
function modeToSelection(
  weapon: IWeapon,
  mode: IWeaponFiringMode,
): IWeaponModeSelection {
  return {
    weaponId: weapon.id,
    modeId: mode.id,
    effectiveDamage: mode.damage,
    effectiveHeat: mode.heat,
    effectiveShots: mode.shotsPerTurn,
    ...(mode.ammoWeaponType !== undefined
      ? { ammoWeaponType: mode.ammoWeaponType }
      : {}),
  };
}

/**
 * True when the target is "exposed" — any location has stripped armour
 * (armour at zero) or prior internal damage. Cluster fire's spread is worth
 * more against an exposed target because individual cluster hits can reach
 * open internal structure and seek a crit.
 */
function isTargetExposed(structure: IAIStructureState | undefined): boolean {
  if (!structure) return false;
  for (const [loc, armorMax] of Object.entries(structure.armorMaxByLocation)) {
    if (armorMax > 0 && (structure.armorByLocation[loc] ?? armorMax) <= 0) {
      return true;
    }
  }
  for (const [loc, internalMax] of Object.entries(
    structure.internalMaxByLocation,
  )) {
    if (
      internalMax > 0 &&
      (structure.internalByLocation[loc] ?? internalMax) < internalMax
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Pick the firing mode for the LB-X cluster/slug family.
 *
 * Cluster mode is chosen when the target is exposed (stripped armour / prior
 * internal damage) or evading — its spread reliably lands hits and seeks
 * crits on an opened unit, and lands *some* damage on a hard-to-hit target.
 * Slug mode is chosen against a fresh, fully-armoured, stationary target at
 * short range — a focused slug punches a single deep wound to start cracking
 * armour. Beyond short range slug accuracy falls off, so cluster is
 * preferred there too.
 */
function selectClusterSlugMode(
  weapon: IWeapon,
  cluster: IWeaponFiringMode,
  slug: IWeaponFiringMode,
  ctx: IWeaponModeContext,
): IWeaponFiringMode {
  const exposed = isTargetExposed(ctx.targetStructure);
  const evading = ctx.targetEvading === true;
  // Cluster against an opened or evading target.
  if (exposed || evading) return cluster;
  // Slug against a fresh target only at short range — `weapon.shortRange`
  // bounds the slug's reliable bracket.
  if (ctx.distance <= weapon.shortRange) return slug;
  // Beyond short range against a fresh target — cluster's spread beats a
  // long slug shot.
  return cluster;
}

/**
 * Pick the firing mode for the Ultra / Rotary rate-of-fire family.
 *
 * The modes are ranked by `shotsPerTurn` ascending — index `0` is the
 * lowest-consumption mode, the last index the highest. The selector walks
 * from the highest mode down and returns the first whose heat fits the
 * remaining heat headroom AND whose ammo consumption leaves the runway above
 * `RATE_OF_FIRE_AMMO_FLOOR`. If no higher mode qualifies, it falls back to
 * the lowest-consumption mode — single fire under heat or ammo pressure.
 */
function selectRateOfFireMode(
  modes: readonly IWeaponFiringMode[],
  ctx: IWeaponModeContext,
): IWeaponFiringMode {
  const ranked = [...modes].sort((a, b) => a.shotsPerTurn - b.shotsPerTurn);
  for (let i = ranked.length - 1; i >= 1; i--) {
    const mode = ranked[i];
    const heatFits = mode.heat <= ctx.heatHeadroom;
    // Firing `shotsPerTurn` rounds a turn must leave a runway above the
    // floor — `Infinity` ammo (unknown / energy) always passes.
    const runwayAfter =
      ctx.ammoTurnsRemaining === Infinity
        ? Infinity
        : Math.floor(ctx.ammoTurnsRemaining / Math.max(1, mode.shotsPerTurn));
    const ammoFits = runwayAfter > RATE_OF_FIRE_AMMO_FLOOR;
    if (heatFits && ammoFits) return mode;
  }
  // Heat or ammo constrained — drop to the lowest-consumption (single) mode.
  return ranked[0];
}

function selectAmmoMode(
  weapon: IWeapon,
  modes: readonly IWeaponFiringMode[],
  ctx: IWeaponModeContext,
): IWeaponFiringMode {
  const srm = modes.find((m) => m.id === MML_SRM_MODE_ID) ?? modes[0];
  const lrm = modes.find((m) => m.id === MML_LRM_MODE_ID) ?? srm;
  return ctx.distance <= weapon.shortRange ? srm : lrm;
}

/**
 * Select the firing mode for one weapon.
 *
 * When `weaponModeSelection` is disabled (or the weapon has no `firingModes`
 * metadata), the weapon's default mode is returned — single-mode
 * pass-through. Otherwise the mode-kind heuristic picks the
 * expected-damage-maximizing mode.
 *
 * @param weapon  the weapon to select a mode for
 * @param ctx     range / target / heat / ammo context
 * @param enabled the tier's `weaponModeSelection` flag — `false` forces the
 *                default mode (the `Green`/`Regular` inert path)
 */
export function selectWeaponMode(
  weapon: IWeapon,
  ctx: IWeaponModeContext,
  enabled: boolean,
): IWeaponModeSelection {
  const modes = weapon.firingModes;

  // Single-mode weapon, or mode selection disabled by tier — pass through
  // the default mode unchanged. For a metadata-bearing weapon we still
  // resolve the default mode so the engine gets the right numbers; for a
  // metadata-free weapon we fall back to the weapon's base stats.
  if (!modes || modes.modes.length === 0) {
    return singleModeSelection(weapon);
  }

  const defaultMode =
    modes.modes.find((m) => m.id === modes.defaultModeId) ?? modes.modes[0];

  if (!enabled) {
    return modeToSelection(weapon, defaultMode);
  }

  if (modes.kind === 'cluster-slug') {
    const cluster =
      modes.modes.find((m) => m.id === LBX_CLUSTER_MODE_ID) ?? modes.modes[0];
    const slug =
      modes.modes.find((m) => m.id === LBX_SLUG_MODE_ID) ??
      modes.modes[modes.modes.length - 1];
    return modeToSelection(
      weapon,
      selectClusterSlugMode(weapon, cluster, slug, ctx),
    );
  }

  if (modes.kind === 'ammo-mode') {
    return modeToSelection(weapon, selectAmmoMode(weapon, modes.modes, ctx));
  }

  // 'rate-of-fire'
  return modeToSelection(weapon, selectRateOfFireMode(modes.modes, ctx));
}

/**
 * Per `add-ai-resource-planning` (A2) design D4: build the `weaponModes` map
 * recorded on a declared attack — the selected firing mode of every
 * multi-mode weapon that survived the heat trim.
 *
 * Returns `undefined` when no surviving weapon is multi-mode, which is the
 * pre-A2 attack-payload shape (byte-identical for the `Green`/`Regular`
 * tiers and single-mode-only fire lists). Defined here, alongside the
 * selector, so `BotPlayer` does not re-implement the mode-id bookkeeping.
 *
 * @param entries        the planned fire list — weapon + selected mode pairs
 * @param survivingIds   ids of the weapons that survived the heat-budget trim
 */
export function collectWeaponModes(
  entries: readonly {
    readonly weapon: IWeapon;
    readonly mode: IWeaponModeSelection;
  }[],
  survivingIds: readonly string[],
): Readonly<Record<string, string>> | undefined {
  const surviving = new Set(survivingIds);
  const modes: Record<string, string> = {};
  for (const entry of entries) {
    if (
      surviving.has(entry.weapon.id) &&
      entry.weapon.firingModes &&
      entry.mode.modeId !== 'default'
    ) {
      modes[entry.weapon.id] = entry.mode.modeId;
    }
  }
  return Object.keys(modes).length > 0 ? modes : undefined;
}
