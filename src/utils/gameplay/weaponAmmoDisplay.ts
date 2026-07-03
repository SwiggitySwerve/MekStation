/**
 * Live per-weapon ammo counters for display surfaces (Wave 3 residual —
 * command-screens re-audit follow-up).
 *
 * The store's `unitWeapons` display map is derived ONCE at session adoption
 * (`deriveSupplementalDisplayData`), so it deliberately omits ammo counters:
 * ammo is consumed turn-by-turn and an adoption-time snapshot would go
 * stale. This helper merges the LIVE unit state's ammo into those static
 * weapon rows at the render boundary, so `WeaponRow`'s existing
 * `N/M rds` display (and the inspector's out-of-ammo signal) track play.
 *
 * Matching mirrors the canonical ammo-tracking rules
 * (`normalizeAmmoWeaponType` — the same normalization `consumeAmmo` /
 * `findAvailableAmmoBin` use), so the counter agrees with what the engine
 * will actually let the weapon fire. Energy weapons have no matching bins
 * and keep `ammoRemaining === undefined`, which renders no counter.
 */

import type {
  IAmmoSlotState,
  IUnitGameState,
  IWeaponStatus,
} from '@/types/gameplay';

import { normalizeAmmoWeaponType } from './ammoTracking';

/** The two live ammo sources a unit state may carry. */
type LiveAmmoSource = Pick<IUnitGameState, 'ammo' | 'ammoState'>;

/**
 * Bins feeding a weapon, matched by the canonical normalization. The
 * weapon's catalog id is tried first (exact family ids like `ac-20`),
 * then its display name (`AC/20`) — engine ids can carry mount suffixes
 * the id-normalization keeps, so the name is the reliable fallback.
 */
function binsFeedingWeapon(
  ammoState: Readonly<Record<string, IAmmoSlotState>>,
  weapon: IWeaponStatus,
): readonly IAmmoSlotState[] {
  const bins = Object.values(ammoState);
  const byKey = (key: string): readonly IAmmoSlotState[] => {
    const requested = normalizeAmmoWeaponType(key);
    return bins.filter(
      (bin) => normalizeAmmoWeaponType(bin.weaponType) === requested,
    );
  };
  const byId = byKey(weapon.id);
  return byId.length > 0 ? byId : byKey(weapon.name);
}

/**
 * Merge live ammo counters into static display weapon rows.
 *
 * - Bin state present (`ammoState`): `ammoRemaining` = Σ remainingRounds,
 *   `ammoMax` = Σ maxRounds across the bins feeding that weapon; weapons
 *   with no matching bins (energy weapons) pass through unchanged.
 * - No bins but the legacy per-weapon `ammo` record has an entry: use it
 *   as `ammoRemaining` with no `ammoMax` (WeaponRow falls back to the
 *   flat `N rds` line).
 * - No live source at all: rows pass through unchanged.
 *
 * Pure and allocation-light — safe to call per render at the record-sheet
 * / inspector boundary.
 */
export function mergeLiveAmmoIntoWeaponStatuses(
  weapons: readonly IWeaponStatus[],
  unitState: LiveAmmoSource | null | undefined,
): readonly IWeaponStatus[] {
  if (!unitState || weapons.length === 0) return weapons;
  const ammoState = unitState.ammoState;
  const hasBins = ammoState !== undefined && Object.keys(ammoState).length > 0;
  const legacyAmmo = unitState.ammo;

  return weapons.map((weapon) => {
    if (hasBins) {
      const bins = binsFeedingWeapon(ammoState, weapon);
      if (bins.length === 0) return weapon;
      return {
        ...weapon,
        ammoRemaining: bins.reduce((sum, bin) => sum + bin.remainingRounds, 0),
        ammoMax: bins.reduce((sum, bin) => sum + bin.maxRounds, 0),
      };
    }
    const legacy = legacyAmmo?.[weapon.id];
    return typeof legacy === 'number'
      ? { ...weapon, ammoRemaining: legacy }
      : weapon;
  });
}
