/**
 * buildInfantryUnitObject — infantry store → record-sheet unit object
 *
 * Pure builder mapping the infantry store's fields onto the
 * `IInfantryRecordSheetUnitInput` shape consumed by
 * `RecordSheetService.extractData`. The `unitType` hint resolves via
 * `dispatchTargetFromUnit` to the `'infantry'` dispatch kind.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import type { IInfantryRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type { InfantryState } from '@/stores/infantryState';
import type { IInfantryFieldGun } from '@/types/unit/InfantryInterfaces';

import { calculateInfantryTransportWeight } from '@/stores/infantryState';
import { IPlatoonComposition } from '@/types/unit/InfantryInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

/** Store fields the infantry unit-object builder reads. */
export interface InfantryUnitObjectInput {
  source?: InfantryState;
  id: string;
  name: string;
  chassis: string;
  model: string;
  techBase: string;
  rulesLevel: string;
  year: number;
  platoonComposition: IPlatoonComposition;
  infantryMotive: string;
  armorKit: InfantryArmorKit;
  primaryWeapon: string;
  primaryWeaponId?: string;
  secondaryWeapon?: string;
  secondaryWeaponId?: string;
  secondaryWeaponCount: number;
  fieldGuns: readonly IInfantryFieldGun[];
  specialization: InfantrySpecialization;
  hasAntiMechTraining: boolean;
}

/**
 * Build the discriminated infantry unit object for the record-sheet service.
 *
 * The full source supplies nominal BV and transport tonnage through their
 * owners. Legacy partial inputs retain zero tonnage. Composition, weapons
 * and field guns pass through by name / id.
 */
export function buildInfantryUnitObject(
  input: InfantryUnitObjectInput,
): IInfantryRecordSheetUnitInput {
  const bv = input.source
    ? calculateBattleValueForUnit({
        unitType: input.source.unitType,
        editorState: input.source,
      })
    : undefined;
  if (input.source && bv?.kind !== 'infantry')
    throw new TypeError('Expected infantry BV');
  return {
    id: input.id,
    name: input.name,
    chassis: input.chassis || input.name.split(' ')[0] || 'Unknown',
    model: input.model || input.name.split(' ').slice(1).join(' ') || 'Custom',
    tonnage: input.source ? calculateInfantryTransportWeight(input.source) : 0,
    battleValue: bv?.breakdown.final,
    techBase: String(input.techBase),
    rulesLevel: String(input.rulesLevel),
    era: `Year ${input.year}`,
    // Dispatch hint — resolves to the 'infantry' kind.
    unitType: 'infantry',
    platoonComposition: input.platoonComposition,
    infantryMotive: String(input.infantryMotive),
    armorKit: String(input.armorKit),
    primaryWeapon: input.primaryWeapon,
    primaryWeaponId: input.primaryWeaponId,
    secondaryWeapon: input.secondaryWeapon,
    secondaryWeaponId: input.secondaryWeaponId,
    secondaryWeaponCount: input.secondaryWeaponCount,
    fieldGuns: [...input.fieldGuns],
    specialization: String(input.specialization),
    hasAntiMechTraining: input.hasAntiMechTraining,
  };
}
