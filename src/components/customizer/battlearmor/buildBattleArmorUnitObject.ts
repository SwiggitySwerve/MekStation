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
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { ManipulatorType } from '@/types/unit/PersonnelInterfaces';

import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import {
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityInput,
} from '../preview/recordSheetUnitIdentity';

/** Store fields the battle armor unit-object builder reads. */
export interface BattleArmorUnitObjectInput extends RecordSheetUnitIdentityInput {
  source?: BattleArmorState;
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
 * uniform per-trooper armor value from the store. The canonical default
 * transport tonnage is the squad size (pinned BattleArmor.getWeight).
 */
export function buildBattleArmorUnitObject(
  input: BattleArmorUnitObjectInput,
): IBattleArmorRecordSheetUnitInput {
  const source = input.source;
  const bv = source
    ? calculateBattleValueForUnit({
        unitType: source.unitType,
        editorState: source,
      })
    : undefined;
  if (source && bv?.kind !== 'battlearmor')
    throw new TypeError('Expected battle armor BV');
  const troopers = Array.from({ length: input.squadSize }, (_, i) => ({
    index: i + 1,
    armorPips: input.armorPerTrooper,
    maximumArmorPips: input.armorPerTrooper,
  }));

  return {
    ...buildRecordSheetUnitIdentity({ ...input, tonnage: input.squadSize }),
    battleValue: bv?.breakdown.final,
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
    movementMode: source && toMovementMode(source.motionType),
  };
}

/**
 * The squad's movement mode for the sheet's second movement line. MML switches
 * on the entity's movement mode, not on which MP values are non-zero, so a
 * ground-mode squad with jump MP prints no line and a VTOL squad prints "VTOL".
 */
function toMovementMode(
  motionType: SquadMotionType,
): NonNullable<IBattleArmorRecordSheetUnitInput['movementMode']> {
  switch (motionType) {
    case SquadMotionType.JUMP:
      return 'jump';
    case SquadMotionType.VTOL:
      return 'vtol';
    case SquadMotionType.UMU:
      return 'umu';
    default:
      return 'ground';
  }
}
