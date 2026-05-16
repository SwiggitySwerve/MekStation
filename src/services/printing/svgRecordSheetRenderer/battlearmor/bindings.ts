/**
 * Battle Armor family — template bindings.
 *
 * Pure function mapping an `IBattleArmorRecordSheetData` to the
 * `{ texts, pips, pipCounts }` structure consumed by the templated
 * render path. Text targets are keyed against the Phase-0
 * `BATTLEARMOR_TEMPLATE_IDS` catalog; the typed per-trooper `PipCounts`
 * contract is computed from each trooper's armor pip count and is the
 * input to the Battle Armor per-trooper pip grid.
 *
 * The Battle Armor sheet's pips are NOT per-location single-region
 * groups (the Wave-1 `PipFill` model) — they are a per-trooper column
 * grid. `pips` is therefore the typed per-trooper structure the
 * `layoutBattleArmorPipGrid` pip-engine helper consumes directly; the
 * dispatch wrapper hands it straight to that helper rather than through
 * the shared `applyPips` path.
 *
 * No I/O, no DOM, no asset access — a deterministic pure function.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry and Battle Armor Record Sheet Adapters)
 */

import type { IBattleArmorRecordSheetData } from '@/types/printing';

import type { BattleArmorTrooperPips } from '../pipEngine';
import type { TextBindings } from '../templateRecordSheetRenderer';

import { BATTLEARMOR_TEMPLATE_IDS } from '../templateElementIds';

/**
 * Per-trooper armor pip counts for a Battle Armor squad — the typed
 * fidelity-gate contract.
 *
 * `troopers` holds one entry per trooper present in the squad (4–6),
 * each with its zero-based `column` index and canonical `armorPips`
 * value. The Battle Armor per-trooper pip grid renders `armorPips + 1`
 * pips per column (the MegaMek trooper-pip convention); the fidelity
 * gate asserts the rendered per-column count equals `armorPips + 1`.
 */
export interface BattleArmorPipCounts {
  /** One entry per trooper present in the squad. */
  readonly troopers: readonly BattleArmorTrooperPips[];
}

/** The result of binding a Battle Armor squad to its canonical template. */
export interface BattleArmorBindings {
  /** Text injections keyed by template element ID. */
  readonly texts: TextBindings;
  /**
   * The typed per-trooper pip-count contract. Consumed directly by the
   * `layoutBattleArmorPipGrid` pip-engine helper — Battle Armor does not
   * use the Wave-1 `PipFill` per-location model.
   */
  readonly pips: BattleArmorPipCounts;
  /** Alias of `pips` — the fidelity-gate input (mirrors Wave-1 naming). */
  readonly pipCounts: BattleArmorPipCounts;
}

/**
 * Compute the per-trooper armor pip counts for a Battle Armor squad.
 *
 * One `BattleArmorTrooperPips` entry per trooper, in template-column
 * order (`column` zero-based, capped at the template's 6 columns). The
 * `armorPips` value is the trooper's canonical current armor; the pip
 * grid adds the `+1` trooper pip when it renders.
 */
export function computeBattleArmorPipCounts(
  data: IBattleArmorRecordSheetData,
): BattleArmorPipCounts {
  const troopers: BattleArmorTrooperPips[] = [];
  // The template exposes pips_0..pips_5 — 6 trooper columns. A squad
  // never exceeds 6 troopers; clamp defensively.
  const limit = Math.min(data.troopers.length, 6);
  for (let column = 0; column < limit; column++) {
    const trooper = data.troopers[column];
    troopers.push({
      column,
      armorPips: Math.max(0, trooper.armorPips),
    });
  }
  return { troopers };
}

/**
 * Bind a Battle Armor squad to its canonical template.
 *
 * Produces header / squad / movement / crew text injections and the
 * typed per-trooper pip-count contract. Only catalogued template IDs
 * are referenced.
 */
export function bindBattleArmor(
  data: IBattleArmorRecordSheetData,
): BattleArmorBindings {
  const { header } = data;
  const pipCounts = computeBattleArmorPipCounts(data);

  // --- Text bindings (catalogued IDs only) ---
  const texts: Record<string, string> = {
    [BATTLEARMOR_TEMPLATE_IDS.type]: `${header.chassis} ${header.model}`,
    [BATTLEARMOR_TEMPLATE_IDS.role]: header.role ?? '',
    [BATTLEARMOR_TEMPLATE_IDS.bv]: header.battleValue.toLocaleString(),
    [BATTLEARMOR_TEMPLATE_IDS.squad]: `BATTLE ARMOR: ${header.chassis} ${header.model}`,
    [BATTLEARMOR_TEMPLATE_IDS.mpWalk]: String(data.walkMP),
  };

  // Secondary movement mode — jump / VTOL / UW, in that priority order
  // (mirrors MegaMek `PrintBattleArmor`).
  if (data.jumpMP > 0) {
    texts[BATTLEARMOR_TEMPLATE_IDS.movementMode2] = 'Jump MP:';
    texts[BATTLEARMOR_TEMPLATE_IDS.mp2] = String(data.jumpMP);
  } else if (data.vtolMP > 0) {
    texts[BATTLEARMOR_TEMPLATE_IDS.movementMode2] = 'VTOL MP:';
    texts[BATTLEARMOR_TEMPLATE_IDS.mp2] = String(data.vtolMP);
  } else if (data.umuMP > 0) {
    texts[BATTLEARMOR_TEMPLATE_IDS.movementMode2] = 'UW MP:';
    texts[BATTLEARMOR_TEMPLATE_IDS.mp2] = String(data.umuMP);
  }

  // Crew skills — bind the first trooper's gunnery / anti-mech skill.
  const lead = data.troopers[0];
  if (lead) {
    texts[BATTLEARMOR_TEMPLATE_IDS.gunnerySkill0] = String(lead.gunnery);
    texts[BATTLEARMOR_TEMPLATE_IDS.pilotingSkill0] = String(lead.antiMech);
  }

  return { texts, pips: pipCounts, pipCounts };
}
