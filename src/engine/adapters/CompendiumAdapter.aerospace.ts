/** Aerospace combat admission and construction projection.
 * Reuses schema admission, SI/thrust/BV owners and the shared mounted-weapon adapter.
 * @spec establish-all-unit-data-parity: Aerospace definition to editor state
 */
import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IAerospaceArcArmor } from '@/utils/gameplay/aerospace/state';

import { aerospaceStructuralIntegrity } from '@/services/conversion/BlkParserService.helpers';
import { mapHeatSinkType } from '@/services/conversion/ValueMappings';
import { UNIT_DEFINITION_FAMILIES } from '@/services/units/unitLoaderService/definitionTypes';
import { hydrateAmmoStateFromFullUnit } from '@/simulation/runner/UnitHydrationAmmo';
import { hydrateHeatSinksFromFullUnit } from '@/simulation/runner/UnitHydrationMovement';
import { UnitContract } from '@/types/contracts/generated/unit.zod';
import { GameSide, LockState, MovementType, Facing } from '@/types/gameplay';
import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { normalizeArcLocation } from '@/utils/construction/aerospace/aerospaceBV';
import { calculateMaxThrust } from '@/utils/construction/aerospace/thrustCalculations';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  resolveAerospaceContractArc,
} from '@/utils/construction/contractBVUnitAdapter';
import { calculateHeatDissipation } from '@/utils/construction/heatSinkCalculations';

import type { IAdaptedUnit, IAdaptUnitOptions } from '../types';

import { applyInitialDamageToArmor } from './CompendiumAdapter.armor';
import { unitHeightFromUnitData } from './CompendiumAdapter.movementHeight';
import { extractWeapons, ammoFromWeapons } from './CompendiumAdapter.weapons';

export function tryAdaptAerospaceUnit(
  fullUnit: IFullUnit,
  options: IAdaptUnitOptions,
): IAdaptedUnit | undefined {
  const supported: readonly string[] =
    UNIT_DEFINITION_FAMILIES.aerospace.unitTypes;
  if (!supported.includes(fullUnit.unitType)) {
    if (options.family === 'aerospace')
      throw new TypeError('Expected an aerospace definition');
    return undefined;
  }
  if (options.family && options.family !== 'aerospace')
    throw new TypeError('Aerospace definition does not match requested family');
  const definition = UnitContract.parse(fullUnit);
  const unitType =
    fullUnit.unitType === 'SmallCraft' ||
    fullUnit.unitType === UnitType.SMALL_CRAFT
      ? UnitType.SMALL_CRAFT
      : fullUnit.unitType === 'ConventionalFighter' ||
          fullUnit.unitType === UnitType.CONVENTIONAL_FIGHTER
        ? UnitType.CONVENTIONAL_FIGHTER
        : UnitType.AEROSPACE;
  const subType =
    unitType === UnitType.SMALL_CRAFT
      ? AerospaceSubType.SMALL_CRAFT
      : unitType === UnitType.CONVENTIONAL_FIGHTER
        ? AerospaceSubType.CONVENTIONAL_FIGHTER
        : AerospaceSubType.AEROSPACE_FIGHTER;
  const { tonnage, armor: sourceArmor } = definition;
  const safeThrust = definition.movement?.safeThrust;
  if (
    safeThrust === undefined ||
    definition.fuel === undefined ||
    !definition.heatSinks ||
    !sourceArmor?.byArc ||
    tonnage === undefined
  )
    throw new TypeError(`Missing aerospace construction facts: ${fullUnit.id}`);
  const maxThrust = calculateMaxThrust(safeThrust);
  const maxSI = aerospaceStructuralIntegrity({
    aerospaceSubType: subType,
    isFixedWingSupport: definition.subType === 'FixedWingSupport',
    tonnage,
    safeThrust,
    structuralIntegrity: definition.structuralIntegrity,
  });
  const armor: Record<string, number> = {};
  for (const [key, points] of Object.entries(sourceArmor.byArc)) {
    const arc = normalizeArcLocation(resolveAerospaceContractArc(key));
    if (!arc || arc === AerospaceArc.FUSELAGE)
      throw new TypeError(`Invalid aerospace armor arc: ${key}`);
    armor[arc[0].toLowerCase() + arc.slice(1)] = points;
  }
  if (armor.nose === undefined || armor.aft === undefined)
    throw new TypeError('Missing nose/aft armor');
  applyInitialDamageToArmor(armor, options.initialDamage ?? {});
  const armorByArc: IAerospaceArcArmor = {
    ...armor,
    nose: armor.nose,
    aft: armor.aft,
  };
  const heatSinks = hydrateHeatSinksFromFullUnit(fullUnit);
  const aerospaceInit = {
    maxSI,
    armorByArc,
    heatSinks: calculateHeatDissipation(
      mapHeatSinkType(definition.heatSinks.type),
      heatSinks.count,
    ),
    fuelPoints: definition.fuel,
    safeThrust,
    maxThrust,
  };
  const source = {
    ...definition,
    tonnage,
    armor: sourceArmor,
    unitType,
    structuralIntegrity: maxSI,
    movement: { safeThrust, maxThrust },
  };
  const bv = calculateBattleValueForUnit(contractUnitToBVUnit(source), options);
  if (bv?.kind !== 'aerospace')
    throw new TypeError('Expected aerospace BV dispatch');
  const weapons = extractWeapons(definition.equipment ?? [], fullUnit.id, {
    ...definition,
    unitType,
  });
  const ammoState = hydrateAmmoStateFromFullUnit(fullUnit) ?? {};
  const side = options.side ?? GameSide.Player;
  return {
    id: fullUnit.id,
    unitType,
    side,
    position: options.position ?? { q: 0, r: 0 },
    facing:
      options.facing ??
      (side === GameSide.Player ? Facing.North : Facing.South),
    heat: 0,
    heatSinks: heatSinks.count,
    heatSinkType: heatSinks.kind,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor,
    structure: { si: maxSI },
    startingInternalStructure: { si: maxSI },
    aerospaceInit,
    bv: bv.breakdown.final,
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: ammoFromWeapons(weapons, ammoState),
    ammoState,
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    hasRetreated: false,
    hasEjected: false,
    lockState: LockState.Pending,
    tonnage,
    unitHeight: unitHeightFromUnitData(fullUnit),
    weapons,
    walkMP: safeThrust,
    runMP: maxThrust,
    jumpMP: 0,
  };
}
