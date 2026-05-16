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
import type { IInfantryFieldGun } from '@/types/unit/InfantryInterfaces';

import { IPlatoonComposition } from '@/types/unit/InfantryInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';

/** Store fields the infantry unit-object builder reads. */
export interface InfantryUnitObjectInput {
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
 * Infantry has no unit tonnage, so `tonnage` is reported as 0 (the extractor
 * never relies on it). The platoon composition drives platoon size in the
 * extractor; weapons and field guns pass through by name / id.
 */
export function buildInfantryUnitObject(
  input: InfantryUnitObjectInput,
): IInfantryRecordSheetUnitInput {
  return {
    id: input.id,
    name: input.name,
    chassis: input.chassis || input.name.split(' ')[0] || 'Unknown',
    model: input.model || input.name.split(' ').slice(1).join(' ') || 'Custom',
    tonnage: 0,
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
