/** @spec openspec/specs/unit-validation-framework/spec.md */
import { EquipmentCategory } from '@/types/equipment';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IUnitValidationRuleDefinition,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import {
  createAmmoWeaponMatcher,
  requiresExternalAmmunition,
} from '@/utils/equipment/ammunitionCompatibility';

import { createRuleError, createRuleResult } from '../ruleResults';

export const MissingAmmunitionRule: IUnitValidationRuleDefinition = {
  id: 'VAL-EQUIP-AMMO-001',
  name: 'Missing Ammunition',
  description:
    'Warn when an ammunition-using weapon has no compatible ammunition',
  category: ValidationCategory.EQUIPMENT,
  priority: 105,
  applicableUnitTypes: 'ALL',
  validate({ unit }) {
    const catalog = unit.equipmentCatalog ?? [];
    const loadout = unit.mountedEquipment ?? [];
    const definitions = new Map(catalog.map((item) => [item.id, item]));
    const carriedAmmo = loadout.flatMap((mounted) => {
      const definition = definitions.get(mounted.equipmentId);
      return mounted.weight > 0 &&
        definition?.category === EquipmentCategory.AMMUNITION
        ? [definition]
        : [];
    });
    const warnings = [];
    for (const id of new Set(loadout.map((item) => item.equipmentId))) {
      const weapon = definitions.get(id);
      if (!weapon || !requiresExternalAmmunition(weapon, catalog)) continue;
      const matches = createAmmoWeaponMatcher([id], catalog);
      if (carriedAmmo.some(matches)) continue;
      const ammo = catalog.find(
        (item) =>
          item.category === EquipmentCategory.AMMUNITION && matches(item),
      );
      warnings.push(
        createRuleError(
          this,
          UnitValidationSeverity.WARNING,
          `${weapon.name} has no ammunition`,
          {
            field: 'mountedEquipment',
            suggestion: `Add ${ammo?.name ?? `${weapon.name} Ammo`} in Equipment`,
            details: { equipmentId: id },
          },
        ),
      );
    }
    return createRuleResult(this, { warnings });
  },
};
