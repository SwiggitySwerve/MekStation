/**
 * buildBattleArmorUnitObject — battle armor store → record-sheet unit object
 *
 * Pure builder mapping the battle armor store's fields onto the
 * `IBattleArmorRecordSheetUnitInput` shape consumed by
 * `RecordSheetService.extractData`. The `unitType` hint resolves via
 * `dispatchTargetFromUnit` to the `'battlearmor'` dispatch kind.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import type { IBattleArmorRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { ManipulatorType } from '@/types/unit/PersonnelInterfaces';

import {
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityInput,
} from '../preview/recordSheetUnitIdentity';

/** Store fields the battle armor unit-object builder reads. */
export interface BattleArmorUnitObjectInput extends RecordSheetUnitIdentityInput {
  squadSize: number;
  armorPerTrooper: number;
  leftManipulator: ManipulatorType;
  rightManipulator: ManipulatorType;
  groundMP: number;
  jumpMP: number;
  umuMP: number;
}

/**
 * Build the discriminated battle armor unit object for the record-sheet
 * service.
 *
 * One synthetic trooper entry is emitted per squad member, each carrying the
 * uniform per-trooper armor value from the store. Battle armor has no unit
 * tonnage, so `tonnage` is reported as 0 (the extractor never relies on it).
 */
export function buildBattleArmorUnitObject(
  input: BattleArmorUnitObjectInput,
): IBattleArmorRecordSheetUnitInput {
  const troopers = Array.from({ length: input.squadSize }, (_, i) => ({
    index: i + 1,
    armorPips: input.armorPerTrooper,
    maximumArmorPips: input.armorPerTrooper,
  }));

  return {
    ...buildRecordSheetUnitIdentity({ ...input, tonnage: 0 }),
    // Dispatch hint — resolves to the 'battlearmor' kind.
    unitType: 'battlearmor',
    squadSize: input.squadSize,
    troopers,
    manipulators: {
      left: String(input.leftManipulator),
      right: String(input.rightManipulator),
    },
    walkMP: input.groundMP,
    jumpMP: input.jumpMP,
    umuMP: input.umuMP,
  };
}
