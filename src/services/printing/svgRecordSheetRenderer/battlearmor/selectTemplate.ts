/**
 * Battle Armor family — canonical template selection.
 *
 * Pure function mapping an `IBattleArmorRecordSheetData` to its Wave-2
 * `templateKey`. For the single-unit MVP this is always the per-unit
 * block template `battle_armor_squad` — mirroring MegaMekLab
 * `PrintBattleArmor.getSVGFileName()`, which returns
 * `battle_armor_squad.svg`.
 *
 * The multi-slot outer sheet `battle_armor_default` (MegaMekLab's
 * `PrintSmallUnitSheet` composite, up to 4 squads per page) is
 * registered as an asset but is NOT selected here — the multi-unit
 * composite is a deferred follow-up. See the change's Non-Goals.
 *
 * @spec openspec/changes/add-templated-infantry-battlearmor-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Infantry and Battle Armor Record Sheet Adapters)
 */

import type { IBattleArmorRecordSheetData } from '@/types/printing';

/** The Wave-2 Battle Armor per-unit block template key. */
export type BattleArmorTemplateKey = 'battle_armor_squad';

/**
 * Select the canonical Wave-2 template key for a Battle Armor squad.
 *
 * Always returns the per-unit block `battle_armor_squad` — the atomic,
 * self-contained record sheet — NOT the multi-slot
 * `battle_armor_default` outer sheet. The `data` parameter is accepted
 * for signature parity with the other per-family `selectTemplate`
 * adapters and for forward-compatibility with the deferred composite.
 */
export function selectBattleArmorTemplate(
  _data: IBattleArmorRecordSheetData,
): BattleArmorTemplateKey {
  return 'battle_armor_squad';
}
