/**
 * Conventional Infantry family — template bindings.
 *
 * Pure function mapping an `IInfantryRecordSheetData` to the
 * `{ texts, pips, pipCounts }` structure consumed by the templated
 * render path. Text targets are keyed against the Phase-0
 * `INFANTRY_TEMPLATE_IDS` catalog; the typed `PipCounts` contract
 * carries the platoon trooper count, and the damage row is computed via
 * the Phase-1 damage-per-trooper formula module.
 *
 * The infantry sheet's pips are NOT per-location single-region groups
 * (the Wave-1 `PipFill` model) — they are a single platoon grid.
 * `pips` is therefore the typed `PipCounts` structure the
 * `layoutInfantryPlatoonPipGrid` pip-engine helper consumes directly;
 * the dispatch wrapper hands it straight to that helper rather than
 * through the shared `applyPips` path.
 *
 * No I/O, no DOM, no asset access — a deterministic pure function.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry and Battle Armor Record Sheet Adapters)
 */

import type { IInfantryRecordSheetData } from '@/types/printing';

import type { TextBindings } from '../templateRecordSheetRenderer';

import { INFANTRY_TEMPLATE_IDS } from '../templateElementIds';
import { generateDamageRow, getDamagePerTrooper } from './infantryDamage';

/**
 * Platoon pip counts for a conventional infantry platoon — the typed
 * fidelity-gate contract.
 *
 * `platoonSize` is the total trooper count; the infantry platoon pip
 * grid renders exactly that many pip markers, and the fidelity gate
 * asserts the rendered count equals it.
 */
export interface InfantryPipCounts {
  /** Total platoon trooper count — the platoon pip-grid size. */
  readonly platoonSize: number;
}

/** The result of binding an infantry platoon to its canonical template. */
export interface InfantryBindings {
  /** Text injections keyed by template element ID (incl. the damage row). */
  readonly texts: TextBindings;
  /**
   * The typed platoon pip-count contract. Consumed directly by the
   * `layoutInfantryPlatoonPipGrid` pip-engine helper — infantry does not
   * use the Wave-1 `PipFill` per-location model.
   */
  readonly pips: InfantryPipCounts;
  /** Alias of `pips` — the fidelity-gate input (mirrors Wave-1 naming). */
  readonly pipCounts: InfantryPipCounts;
  /**
   * The per-trooper-count damage row — 30 integers, `DAMAGE+j` for `j`
   * in `1..30`. Exposed for test assertions; the values are also bound
   * into `texts` against the `damage_1`..`damage_30` IDs.
   */
  readonly damageRow: readonly number[];
}

/**
 * Compute the platoon pip counts for an infantry platoon.
 *
 * The pip-grid size is the platoon's total trooper count.
 */
export function computeInfantryPipCounts(
  data: IInfantryRecordSheetData,
): InfantryPipCounts {
  return { platoonSize: Math.max(0, data.platoonSize) };
}

/**
 * Compute the platoon's damage-per-trooper value from its primary and
 * secondary weapons, using the Phase-1 verbatim MegaMek formula.
 *
 * `squadSize` is the platoon's per-squad trooper count
 * (`platoonComposition.troopersPerSquad`); `secondaryWeaponsPerSquad` is
 * the count of secondary weapons carried per squad. The first secondary
 * weapon (if any) supplies the secondary damage input — mirroring
 * MegaMek `Infantry`, which models a single `secondaryWeapon`.
 */
export function computeDamagePerTrooper(
  data: IInfantryRecordSheetData,
): number {
  const squadSize = Math.max(1, data.platoonComposition.troopersPerSquad);
  const firstSecondary = data.secondaryWeapons[0];
  // Secondary weapons per squad: an explicit `count`, else derived from
  // the per-trooper ratio (1 secondary per `perTrooperRatio` troopers).
  let secondaryWeaponsPerSquad = 0;
  if (firstSecondary) {
    secondaryWeaponsPerSquad =
      firstSecondary.count ??
      (firstSecondary.perTrooperRatio > 0
        ? Math.floor(squadSize / firstSecondary.perTrooperRatio)
        : 0);
  }
  return getDamagePerTrooper({
    primaryWeaponDamage: data.primaryWeapon.infantryDamage,
    secondaryWeaponDamage: firstSecondary?.infantryDamage,
    squadSize,
    secondaryWeaponsPerSquad,
  });
}

/**
 * Bind an infantry platoon to its canonical template.
 *
 * Produces header / movement / weapon / crew text injections, the
 * `damage_1`..`damage_30` row computed via the damage-per-trooper
 * formula, and the typed platoon pip-count contract. Only catalogued
 * template IDs are referenced.
 */
export function bindInfantry(data: IInfantryRecordSheetData): InfantryBindings {
  const { header } = data;
  const pipCounts = computeInfantryPipCounts(data);
  const perTrooper = computeDamagePerTrooper(data);
  const damageRow = generateDamageRow(perTrooper);

  // --- Text bindings (catalogued IDs only) ---
  const texts: Record<string, string> = {
    [INFANTRY_TEMPLATE_IDS.type]: `${header.chassis} ${header.model}`,
    [INFANTRY_TEMPLATE_IDS.role]: header.role ?? '',
    [INFANTRY_TEMPLATE_IDS.bv]: header.battleValue.toLocaleString(),
    [INFANTRY_TEMPLATE_IDS.armorKit]: data.armorKit,
    [INFANTRY_TEMPLATE_IDS.transportWt]: String(header.tonnage),
    [INFANTRY_TEMPLATE_IDS.mp1]: data.motiveType,
    [INFANTRY_TEMPLATE_IDS.movementMode1]: data.motiveType,
    [INFANTRY_TEMPLATE_IDS.gunnerySkill0]: String(data.gunnery),
    [INFANTRY_TEMPLATE_IDS.pilotingSkill0]: String(data.antiMech),
  };

  // Damage row — `damage_1`..`damage_30` = round(perTrooper * j).
  damageRow.forEach((value, index) => {
    const slot = index + 1;
    texts[`${INFANTRY_TEMPLATE_IDS.damagePrefix}${slot}`] = String(value);
  });

  // Field gun block — bound only when the platoon fields crew-served guns.
  if (data.fieldGun) {
    texts[INFANTRY_TEMPLATE_IDS.fieldGunType] = data.fieldGun.name;
    texts[INFANTRY_TEMPLATE_IDS.fieldGunQty] = String(data.fieldGun.count);
    texts[INFANTRY_TEMPLATE_IDS.fieldGunDmg] = String(data.fieldGun.damage);
    texts[INFANTRY_TEMPLATE_IDS.fieldGunShort] = String(
      data.fieldGun.shortRange,
    );
    texts[INFANTRY_TEMPLATE_IDS.fieldGunMed] = String(
      data.fieldGun.mediumRange,
    );
    texts[INFANTRY_TEMPLATE_IDS.fieldGunLong] = String(data.fieldGun.longRange);
  }

  return { texts, pips: pipCounts, pipCounts, damageRow };
}
