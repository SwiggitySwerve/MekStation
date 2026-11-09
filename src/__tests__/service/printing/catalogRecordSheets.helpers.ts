import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

import type { IRecordSheetEquipment } from '@/types/printing';
import type { IRecordSheetData } from '@/types/printing';

import { readCatalogFiles } from '@/__tests__/helpers/catalogFiles.test-helpers';
import {
  expectJavaCatalogAddition,
  javaCatalogAdditionById,
} from '@/__tests__/helpers/equipmentJavaAdditions.test-helpers';
import { buildAerospaceUnitObject } from '@/components/customizer/aerospace/buildAerospaceUnitObject';
import { buildBattleArmorUnitObject } from '@/components/customizer/battlearmor/buildBattleArmorUnitObject';
import { buildInfantryUnitObject } from '@/components/customizer/infantry/buildInfantryUnitObject';
import { buildBattleMechPreviewProjection } from '@/components/customizer/preview/recordSheetPreview.logic';
import { buildProtoMechUnitObject } from '@/components/customizer/protomech/buildProtoMechUnitObject';
import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import { getCalculationService } from '@/services/construction/CalculationService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { parseWeaponCategory } from '@/services/equipment/EquipmentParsers';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { SVG_TEMPLATES } from '@/services/printing/recordsheet/constants';
import {
  formatMissileDamage,
  getDamageCode,
} from '@/services/printing/recordsheet/equipmentUtils';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { bindAerospace } from '@/services/printing/svgRecordSheetRenderer/aerospace/bindings';
import { selectAerospaceTemplate } from '@/services/printing/svgRecordSheetRenderer/aerospace/selectTemplate';
import { bindBattleArmor } from '@/services/printing/svgRecordSheetRenderer/battlearmor/bindings';
import { selectBattleArmorTemplate } from '@/services/printing/svgRecordSheetRenderer/battlearmor/selectTemplate';
import { bindInfantry } from '@/services/printing/svgRecordSheetRenderer/infantry/bindings';
import { selectInfantryTemplate } from '@/services/printing/svgRecordSheetRenderer/infantry/selectTemplate';
import { bindProtoMech } from '@/services/printing/svgRecordSheetRenderer/protomech/bindings';
import { selectProtoMechTemplate } from '@/services/printing/svgRecordSheetRenderer/protomech/selectTemplate';
import { bindVehicle } from '@/services/printing/svgRecordSheetRenderer/vehicle/bindings';
import { selectVehicleTemplate } from '@/services/printing/svgRecordSheetRenderer/vehicle/selectTemplate';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import {
  mapBattleArmorDefinitionToState,
  mapProtoMechDefinitionToState,
} from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { unitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { getTotalAerospaceArmor } from '@/stores/aerospaceState';
import {
  createDefaultInfantryState,
  computeInfantryStateBV,
} from '@/stores/infantryState';
import { computeProtoMechBVFromState } from '@/stores/protoMechState';
import { getStructurePoints } from '@/types/construction/InternalStructureType';
import { configurationRegistry } from '@/types/construction/mechConfigRegistry';
import { UnitContract, type IUnitContract } from '@/types/contracts';
import { WeaponCategory } from '@/types/equipment';
import { calculateBattleArmorBVFromState } from '@/utils/construction/battlearmor/battleArmorBVAdapter';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';
import { isLegacyEquipmentId } from '@/utils/construction/equipmentBVCatalogData';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';
import { mapInfantryDefinition } from '@/utils/construction/infantry/libraryMapping';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';
import { buildArmorByLocation } from '@/utils/validation/armorValidationUtils';

export const families = [
  'battlemechs',
  'vehicles',
  'aerospace',
  'battlearmor',
  'infantry',
  'protomechs',
] as const;
export type Family = (typeof families)[number];
export interface Difference {
  field: string;
  actual: unknown;
  expected: unknown;
}
export interface CatalogRow {
  id: string;
  path: string;
  subtype: string;
  differences: Difference[];
  template?: string;
  modelHash?: string;
  rejection?: string;
  stage?: string;
}
const service = new RecordSheetService();
// Aerospace arcs by contract key, independent of the module under test. Small
// craft print "Left Side"/"Right Side" (SmallCraft.java LOCATION_NAMES).
const AERO_ARC: Record<
  string,
  { code: string; fighter: string; smallCraft: string }
> = {
  NOSE: { code: 'NOS', fighter: 'Nose', smallCraft: 'Nose' },
  LEFT_WING: { code: 'LWG', fighter: 'Left Wing', smallCraft: 'Left Side' },
  RIGHT_WING: { code: 'RWG', fighter: 'Right Wing', smallCraft: 'Right Side' },
  LEFT_SIDE: { code: 'LWG', fighter: 'Left Wing', smallCraft: 'Left Side' },
  RIGHT_SIDE: { code: 'RWG', fighter: 'Right Wing', smallCraft: 'Right Side' },
  AFT: { code: 'AFT', fighter: 'Aft', smallCraft: 'Aft' },
};
// Independent of bindVehicle's own table so a code swap there cannot hide.
const VEHICLE_PIP_CODE: Record<string, string> = {
  FRONT: 'FR',
  LEFT: 'LS',
  RIGHT: 'RS',
  REAR: 'RR',
  FRONT_LEFT: 'FRLS',
  FRONT_RIGHT: 'FRRS',
  REAR_LEFT: 'RRLS',
  REAR_RIGHT: 'RRRS',
  TURRET: 'TU',
  TURRET_2: 'FT',
  ROTOR: 'RO',
};

export async function initializeEquipment(): Promise<void> {
  const transport = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input) => {
      const url = String(input);
      if (!url.startsWith('/data/equipment/official/'))
        throw new Error(`Unexpected asset request: ${url}`);
      const value: unknown = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'public', url), 'utf8'),
      );
      return { ok: true, status: 200, json: async () => value } as Response;
    });
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  transport.mockRestore();
  expect(getEquipmentLookupService().getDataSource()).toBe('json');
}

export function catalog(family: Family): { id: string; path: string }[] {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'public/data/units', family, 'index.json'),
      'utf8',
    ),
  ).units;
}

export function verifyCatalogUnit(
  family: Family,
  entry: { id: string; path: string },
  read: () => string = () =>
    fs.readFileSync(
      path.join(process.cwd(), 'public/data/units', family, entry.path),
      'utf8',
    ),
): CatalogRow {
  const row: CatalogRow = { ...entry, subtype: '', differences: [] };
  const check = (field: string, actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      row.differences.push({ field, actual, expected });
  };
  let stage = 'contract';
  try {
    const source = UnitContract.parse(JSON.parse(read()));
    row.subtype = String(
      source.subType ?? source.motionType ?? source.unitType,
    );
    let data: IRecordSheetData;
    stage = 'mapping';
    if (family === 'vehicles') {
      const state = mapToVehicleState(source);
      stage = 'extraction';
      data = service.extractData(buildVehicleUnitObject(state));
      if (data.unitType !== 'vehicle') throw new Error('Wrong sheet family');
      check(
        'BV',
        data.header.battleValue,
        computeVehicleBVFromState(state).final,
      );
      checkSourceBV(source, data, check);
      check(
        'movement',
        [data.cruiseMP, data.flankMP],
        [state.cruiseMP, state.flankMP],
      );
      check('motion', data.motionType, state.motionType);
      check('weightClass', data.isSuperheavy, state.isSuperheavy);
      const armor = Object.fromEntries(
        data.armorLocations.map((a) => [a.location, a.current]),
      );
      const expectedLabels: string[] = [];
      const expectedPips: Record<string, number> = {};
      for (const [key, value] of Object.entries(
        source.armor?.byLocation ?? {},
      )) {
        const label: Record<string, string> = {
          FRONT: 'Front',
          FRONT_LEFT: 'Front Left',
          FRONT_RIGHT: 'Front Right',
          REAR_LEFT: 'Rear Left',
          REAR_RIGHT: 'Rear Right',
          LEFT: 'Left Side',
          RIGHT: 'Right Side',
          REAR: 'Rear',
          TURRET: 'Turret',
          TURRET_2: 'Turret 2',
          ROTOR: 'Rotor',
        };
        if (key !== 'BODY') {
          check(`armor.${key}`, armor[label[key] ?? key], value);
          expectedLabels.push(label[key] ?? key);
          // Superheavy dual-turret sheets print the primary turret as RT.
          const code =
            key === 'TURRET' &&
            state.isSuperheavy &&
            state.motionType !== 'VTOL' &&
            source.armor?.byLocation?.TURRET_2 !== undefined
              ? 'RT'
              : (VEHICLE_PIP_CODE[key] ?? key);
          expectedPips[code] = (expectedPips[code] ?? 0) + value;
        }
      }
      // Extra, duplicate or missing printed locations fail, not just wrong values.
      check(
        'armor.locations',
        data.armorLocations.map((a) => a.location).sort(),
        expectedLabels.sort(),
      );
      // Vehicles have no per-location cap at the pin (only the unit total and
      // the VTOL rotor), so a printed maximum is a fabricated value.
      check(
        'armor.maximum',
        data.armorLocations
          .filter((a) => a.maximum !== undefined)
          .map((a) => a.location),
        [],
      );
      // MML PrintEntity.drawArmor: only support vehicles with BAR armor.
      const expectedBar =
        source.unitType === 'Support Vehicle' && source.armor?.type === 'BAR'
          ? source.armor.barRating
          : undefined;
      check('barRating', data.barRating, expectedBar);
      checkEquipment(data.equipment, state.equipment, check);
      const bindings = bindVehicle(data);
      // PrintEntity.drawArmor prints "BAR: <rating>" as the armor type for BAR
      // support vehicles (PrintTank does not override it).
      check(
        'binding.armorType',
        bindings.texts.armorType,
        expectedBar !== undefined ? `BAR: ${expectedBar}` : data.armorType,
      );
      const printedPips: Record<string, number | undefined> = {
        ...bindings.pipCounts,
      };
      for (const code of new Set([
        ...Object.keys(expectedPips),
        ...Object.keys(printedPips),
      ]))
        check(`pips.${code}`, printedPips[code], expectedPips[code]);
      check(
        'binding.BV',
        bindings.texts.bv,
        String(data.header.battleValue.toLocaleString()),
      );
      if (data.equipment.length)
        check('binding.inventory', bindings.inventory, data.equipment);
      stage = 'template';
      row.template = selectVehicleTemplate(data);
      const subtype = {
        Tracked: 'vehicle',
        Wheeled: 'vehicle',
        Hover: 'vehicle',
        Rail: 'vehicle',
        Maglev: 'vehicle',
        Hydrofoil: 'naval',
        Naval: 'naval',
        Submarine: 'submarine',
        WiGE: state.isSuperheavy ? 'vehicle' : 'wige',
        VTOL: 'vtol',
      }[state.motionType];
      const turret = {
        None: 'noturret',
        Single: 'turret',
        Dual: 'dualturret',
        Front: 'turret',
        Rear: 'turret',
        Sponson: 'turret',
      }[data.turretConfig];
      const weight =
        state.isSuperheavy && state.motionType !== 'VTOL'
          ? 'superheavy'
          : 'standard';
      check('template', row.template, `${subtype}_${turret}_${weight}`);
    } else if (family === 'aerospace') {
      if (!isDefinitionForFamily('aerospace', source))
        throw new Error('Wrong catalog family');
      const state = mapAerospaceDefinitionToState(source);
      stage = 'extraction';
      data = service.extractData(buildAerospaceUnitObject(state));
      if (data.unitType !== 'aerospace') throw new Error('Wrong sheet family');
      const bv = calculateBattleValueForUnit({
        ...state,
        movement: { safeThrust: state.safeThrust, maxThrust: state.maxThrust },
        totalArmorPoints: getTotalAerospaceArmor(state.armorAllocation),
        heatSinkType: state.doubleHeatSinks ? 1 : 0,
      });
      check('BV', data.header.battleValue, bv?.breakdown.final);
      checkSourceBV(source, data, check);
      check(
        'movement',
        [data.safeThrust, data.maxThrust],
        [state.safeThrust, state.maxThrust],
      );
      check('SI', data.structuralIntegrity, state.structuralIntegrity);
      check('fuel', data.fuelPoints, state.fuelPoints);
      check('heat.count', data.heatSinks.count, state.heatSinks);
      check('heat.capacity', data.heatSinks.capacity, state.heatSinkPool);
      const smallCraft = state.unitType === 'Small Craft';
      const expectedLabels: string[] = [];
      const expectedPips: Record<string, number> = {};
      for (const [arc, points] of Object.entries(source.armor?.byArc ?? {})) {
        const entry = AERO_ARC[arc];
        const label = smallCraft ? entry?.smallCraft : entry?.fighter;
        check(
          `armor.${arc}`,
          data.armorArcs.find((a) => a.arc === label)?.current,
          points,
        );
        if (label) expectedLabels.push(label);
        if (entry) expectedPips[entry.code] = points;
      }
      // Each of the four arcs prints exactly once, under the hull's own label.
      check(
        'armor.arcs',
        data.armorArcs.map((a) => a.arc).sort(),
        expectedLabels.sort(),
      );
      // MML UnitUtil.getMaxArmor has no per-arc cap for aerospace: a printed
      // maximum would be fabricated.
      check(
        'armor.maximum',
        data.armorArcs.filter((a) => a.maximum !== undefined).map((a) => a.arc),
        [],
      );
      const expectedBar =
        source.subType === 'FixedWingSupport' && source.armor?.type === 'BAR'
          ? source.armor.barRating
          : undefined;
      check('barRating', data.barRating, expectedBar);
      checkEquipment(data.equipment, state.equipment, check);
      const bindings = bindAerospace(data);
      for (const code of ['NOS', 'LWG', 'RWG', 'AFT']) {
        const points = expectedPips[code] ?? 0;
        // Small craft print their side arcs in the LS/RS template slots.
        const side = smallCraft && (code === 'LWG' || code === 'RWG');
        const slot = side ? (code === 'LWG' ? 'LS' : 'RS') : code;
        const group = `armorPips${slot}`;
        check(`pips.${code}`, bindings.pipCounts[code as 'NOS'], points);
        check(
          `pipGroup.${code}`,
          bindings.pips.find((p) => p.groupId === group)?.count,
          points > 0 ? points : undefined,
        );
        check(`text.${code}`, bindings.texts[`textArmor_${slot}`], `${points}`);
        if (side)
          check(
            `pipGroup.${code}.unused`,
            bindings.pips.some((p) => p.groupId === `armorPips${code}`),
            false,
          );
      }
      // MML PrintEntity.drawArmor: support vehicles with BAR armor print
      // "BAR: <rating>" as the armor type.
      if (expectedBar !== undefined)
        check(
          'binding.armorType',
          bindings.texts.armorType,
          `BAR: ${expectedBar}`,
        );
      if (data.equipment.length)
        check('binding.inventory', bindings.inventory, data.equipment);
      check(
        'binding.SI',
        bindings.pips.find((p) => p.groupId === 'siPips')?.count ?? 0,
        data.structuralIntegrity,
      );
      if (!data.isConventional)
        check(
          'binding.heat',
          bindings.pips.find((p) => p.groupId === 'heatSinkPips')?.count ?? 0,
          data.heatSinks.count,
        );
      else
        check(
          'binding.heat',
          bindings.pips.some((p) => p.groupId === 'heatSinkPips'),
          false,
        );
      row.template = selectAerospaceTemplate(data);
      check(
        'template',
        row.template,
        state.unitType === 'Small Craft'
          ? `smallcraft_${state.motionType === 'Spheroid' ? 'spheroid' : 'aerodyne'}_default`
          : state.unitType === 'Conventional Fighter'
            ? 'fighter_conventional'
            : 'fighter_aerospace',
      );
    } else if (family === 'battlearmor') {
      const state = mapBattleArmorDefinitionToState(source);
      data = service.extractData(
        buildBattleArmorUnitObject({ ...state, source: state }),
      );
      if (data.unitType !== 'battlearmor')
        throw new Error('Wrong sheet family');
      check(
        'BV',
        data.header.battleValue,
        calculateBattleArmorBVFromState(state).final,
      );
      check('tonnage', data.header.tonnage, source.tonnage);
      check(
        'movement',
        [data.walkMP, data.jumpMP, data.umuMP],
        [state.groundMP, state.jumpMP, state.umuMP],
      );
      const bindings = bindBattleArmor(data);
      const suits = Array.from({ length: state.squadSize }, (_, i) => i);
      check(
        'armor',
        bindings.pipCounts.troopers.map((t) => t.armorPips),
        Array(state.squadSize).fill(state.armorPerTrooper),
      );
      // One trooper per suit, numbered 1..n and laid out in columns 0..n-1.
      check(
        'squadSize',
        [data.squadSize, data.troopers.length],
        [state.squadSize, state.squadSize],
      );
      check(
        'troopers.index',
        data.troopers.map((t) => t.index),
        suits.map((i) => i + 1),
      );
      check(
        'troopers.column',
        bindings.pipCounts.troopers.map((t) => t.column),
        suits,
      );
      // PrintBattleArmor.drawArmor draws getOArmor + 1 pips: the maximum is the
      // original armor, which is the domain armor of a fresh squad.
      check(
        'maximumArmor',
        data.troopers.map((t) => t.maximumArmorPips),
        Array(state.squadSize).fill(state.armorPerTrooper),
      );
      check(
        'skills',
        [bindings.texts.gunnerySkill0, bindings.texts.pilotingSkill0],
        [`${data.troopers[0]?.gunnery}`, `${data.troopers[0]?.antiMech}`],
      );
      // PrintBattleArmor.squadName(): by squad size, single squad per sheet.
      const squadName =
        { 1: 'SUIT', 3: 'UN', 5: 'POINT', 6: 'LEVEL I' }[state.squadSize] ??
        'SQUAD';
      check('squadLabel', bindings.texts.squad, `BATTLE ARMOR: ${squadName} 1`);
      // PrintBattleArmor.writeTextFields: the second movement line follows the
      // movement mode (VTOL prints the jump MP), and other modes hide it.
      const line =
        source.motionType === 'JUMP'
          ? ['Jump MP:', state.jumpMP]
          : source.motionType === 'VTOL'
            ? ['VTOL MP:', state.jumpMP]
            : source.motionType === 'UMU'
              ? ['UW MP:', state.umuMP]
              : undefined;
      check(
        'movementLine',
        [bindings.texts.movement_mode_2, bindings.texts.mp_2],
        line ? [line[0], `${line[1]}`] : [undefined, undefined],
      );
      // hideElement(SUIT + i) for every suit beyond the squad.
      check(
        'suits.hidden',
        [...bindings.hiddenIds].sort(),
        Array.from({ length: 6 }, (_, i) => i)
          .filter((i) => i >= state.squadSize)
          .map((i) => `suit${i}`)
          .sort(),
      );
      row.template = selectBattleArmorTemplate(data);
      check('template', row.template, 'battle_armor_squad');
    } else if (family === 'infantry') {
      const config = mapInfantryDefinition(source);
      const state = { ...createDefaultInfantryState(config), ...config };
      data = service.extractData(
        buildInfantryUnitObject({ ...state, source: state }),
      );
      if (data.unitType !== 'infantry') throw new Error('Wrong sheet family');
      check(
        'BV',
        data.header.battleValue,
        computeInfantryStateBV(state)?.final,
      );
      check('composition', data.platoonComposition, state.platoonComposition);
      check(
        'platoonSize',
        bindInfantry(data).pipCounts.platoonSize,
        (source.platoon?.squadCount ?? 0) * (source.platoon?.squadSize ?? 0),
      );
      check('primaryWeapon', data.primaryWeapon.name, state.primaryWeapon);
      check('fieldGunCount', data.fieldGun?.count ?? 0, state.fieldGuns.length);
      row.template = selectInfantryTemplate(data);
    } else if (family === 'protomechs') {
      const state = mapProtoMechDefinitionToState(source);
      data = service.extractData(
        buildProtoMechUnitObject({ ...state, source: state }),
      );
      if (data.unitType !== 'protomech') throw new Error('Wrong sheet family');
      check(
        'BV',
        data.header.battleValue,
        computeProtoMechBVFromState(state).final,
      );
      check(
        'topology',
        [data.isQuad, data.hasMainGun],
        [source.isQuad, source.hasMainGun],
      );
      check(
        'movement',
        [data.walkMP, data.jumpMP],
        [state.walkMP, state.jumpMP],
      );
      const counts = bindProtoMech(data).pipCounts;
      const locations = {
        HD: 'Head',
        T: 'Torso',
        L: 'Legs',
        LA: 'Left Arm',
        RA: 'Right Arm',
        MG: 'Main Gun',
      };
      for (const [code, label] of Object.entries(locations)) {
        // Explicit topology decides applicability; missing expected bindings fail.
        if (source.isQuad && (code === 'LA' || code === 'RA')) continue;
        if (code === 'MG' && !state.hasMainGun) continue;
        const pip = counts[code as keyof typeof counts];
        check(
          `armor.${code}`,
          pip?.armor,
          state.armorByLocation[label as keyof typeof state.armorByLocation],
        );
        check(
          `structure.${code}`,
          pip?.structure,
          state.structureByLocation[
            label as keyof typeof state.structureByLocation
          ],
        );
      }
      check('equipmentCount', data.equipment.length, state.equipment.length);
      row.template = selectProtoMechTemplate(data);
      check(
        'template',
        row.template,
        source.isQuad
          ? 'protomek_quad'
          : source.isGlider
            ? 'protomek_glider'
            : 'protomek_biped',
      );
    } else {
      const state = unitLoaderService.mapToUnitState(parseUnit(source), true);
      const projection = buildBattleMechPreviewProjection(state);
      data = service.extractData(projection.unitConfig);
      if (data.unitType !== 'mech') throw new Error('Wrong sheet family');
      check(
        'BV',
        data.header.battleValue,
        getCalculationService().calculateBattleValue(projection.editableMech),
      );
      check(
        'movement',
        [data.movement.walkMP, data.movement.runMP, data.movement.jumpMP],
        [projection.walkMP, projection.runMP, state.jumpMP],
      );
      const expectedLocations = configurationRegistry.getLocationDefinitions(
        state.configuration,
      );
      const expectedNames = expectedLocations.map(({ id }) => id).sort();
      const locationGroups = [
        ['armor', data.armor.locations],
        ['structure', data.structure.locations],
      ] as const;
      // Domain topology requires locations even when extraction omits them.
      for (const [kind, locations] of locationGroups)
        check(
          `${kind}.locations`,
          locations.map(({ location }) => location).sort(),
          expectedNames,
        );
      const expectedArmor = buildArmorByLocation(
        state.armorAllocation,
        state.tonnage,
        state.configuration,
      );
      for (const { displayName, current } of Object.values(expectedArmor)) {
        const isRear = displayName.endsWith(' (Rear)');
        const location = data.armor.locations.find(
          (entry) => entry.location === displayName.replace(/ \(Rear\)$/, ''),
        );
        check(
          `armor.${displayName}`,
          isRear ? location?.rear : location?.current,
          current,
        );
      }
      for (const { id, abbreviation } of expectedLocations) {
        check(
          `structure.${id}`,
          data.structure.locations.find((location) => location.location === id)
            ?.points,
          getStructurePoints(state.tonnage, id),
        );
        for (const [kind, locations] of locationGroups)
          check(
            `${kind}.${id}.abbreviation`,
            locations.find((location) => location.location === id)
              ?.abbreviation,
            abbreviation,
          );
      }
      check(
        'armor.total',
        data.armor.totalPoints,
        Object.values(state.armorAllocation).reduce(
          (sum, p) => sum + (p ?? 0),
          0,
        ),
      );
      row.template = SVG_TEMPLATES[data.mechType];
      row.modelHash = createHash('sha256')
        .update(
          JSON.stringify(data).replace(
            /[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/gi,
            '<mount-id>',
          ),
        )
        .digest('hex');
    }
    if (family !== 'battlearmor' && family !== 'infantry')
      check('tonnage', data.header.tonnage, source.tonnage);
  } catch (error) {
    row.rejection = error instanceof Error ? error.message : String(error);
    row.stage = stage;
  }
  return row;
}

function checkSourceBV(
  source: IUnitContract,
  data: IRecordSheetData,
  check: (field: string, actual: unknown, expected: unknown) => void,
) {
  if (source.movement && source.armor && typeof source.tonnage === 'number') {
    const movement = z
      .object({
        cruiseMP: z.number().optional(),
        flankMP: z.number().optional(),
        jumpMP: z.number().optional(),
        safeThrust: z.number().optional(),
        maxThrust: z.number().optional(),
      })
      .parse(source.movement);
    const bv = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        ...source,
        movement,
        tonnage: source.tonnage,
        armor: source.armor,
      }),
    );
    check('BV.source', data.header.battleValue, bv?.breakdown.final);
  }
}

function checkEquipment(
  equipment: readonly IRecordSheetEquipment[],
  mounts: readonly {
    equipmentId: string;
    name: string;
    location: string;
    isAmmo?: boolean;
  }[],
  check: (field: string, actual: unknown, expected: unknown) => void,
) {
  const lookup = getEquipmentLookupService();
  const weapons = lookup.getAllWeapons();
  const ammunition = lookup.getAllAmmunition();
  check('equipmentCount', equipment.length, mounts.length);
  mounts.forEach((mount, index) => {
    const entry = getEquipmentEntry(mount.equipmentId);
    const added = entry && javaCatalogAdditionById.get(entry.id);
    if (added) expectJavaCatalogAddition(entry, 'bv');
    const exact = weapons.find(
      (w) =>
        w.id === mount.equipmentId ||
        (isLegacyEquipmentId(w.id) && w.name === mount.name),
    );
    const weapon = mount.isAmmo
      ? undefined
      : ((added ? weapons.find((w) => w.id === entry?.id) : undefined) ??
        exact ??
        weapons.find((w) => w.id === entry?.id));
    const printed = equipment[index];
    check(`equipmentLocation.${index}`, printed?.location, mount.location);
    check(`equipmentName.${index}`, printed?.name, mount.name);
    if (weapon) {
      let expected = [
        weapon.heat,
        weapon.category === WeaponCategory.MISSILE
          ? formatMissileDamage(mount.name, weapon.damage)
          : String(weapon.damage),
        getDamageCode(weapon.category),
        weapon.ranges?.minimum ?? 0,
        weapon.ranges?.short ?? '-',
        weapon.ranges?.medium ?? '-',
        weapon.ranges?.long ?? '-',
        true,
      ];
      if (added?.kind === 'weapons') {
        // Pinned Java facts own these newly resolved rows, including fractional
        // infantry damage and explicit variable-damage sentinels.
        const facts = z
          .object({
            heat: z.number(),
            damage: z.union([z.number(), z.string()]),
            category: z.string(),
            ranges: z.object({
              minimum: z.number(),
              short: z.number(),
              medium: z.number(),
              long: z.number(),
            }),
          })
          .parse(added.values);
        const category = parseWeaponCategory(facts.category);
        expected = [
          facts.heat,
          category === WeaponCategory.MISSILE
            ? formatMissileDamage(mount.name, facts.damage)
            : String(facts.damage),
          getDamageCode(category),
          facts.ranges.minimum,
          facts.ranges.short,
          facts.ranges.medium,
          facts.ranges.long,
          true,
        ];
      }
      check(
        `${exact ? 'weaponStats' : 'weaponAliasStats'}.${index}`,
        [
          printed?.heat,
          printed?.damage,
          printed?.damageCode,
          printed?.minimum,
          printed?.short,
          printed?.medium,
          printed?.long,
          printed?.isWeapon,
        ],
        expected,
      );
    } else {
      const ammo =
        ammunition.find(
          (a) => a.id === mount.equipmentId || a.id === entry?.id,
        ) ??
        ammunition.find(
          (a) => isLegacyEquipmentId(a.id) && a.name === mount.name,
        );
      if (ammo)
        check(
          `ammoStats.${index}`,
          [printed?.isAmmo, printed?.ammoCount],
          [true, ammo.shotsPerTon],
        );
      else if (!entry)
        check(
          `equipmentUnresolved.${index}`,
          mount.equipmentId,
          'catalog identity unavailable',
        );
    }
  });
}

/**
 * Registers the whole-family record-sheet parity test for one family. The six
 * per-family catalogRecordSheets.<family>.test.ts files call this so each
 * family is its own Jest file (and snapshot file); the describe/test names are
 * identical to the former single catalogRecordSheets.test.ts, so the committed
 * snapshot entries carry over unchanged.
 *
 * `part`/`parts` split one family's index into `parts` interleaved slices
 * (index % parts === part, as in realCatalog.consumer.support) so the largest
 * family (battlemechs, ~4,300 units) is several files instead of one 4-5 min
 * file. Every unit is in exactly one slice and every slice asserts the same
 * things; a slice's snapshot pins its own unit total.
 */
export function defineCatalogFamilyParity(
  family: Family,
  part = 0,
  parts = 1,
): void {
  jest.setTimeout(300000);
  beforeAll(initializeEquipment);

  describe('committed catalog record-sheet model parity', () => {
    const label = parts === 1 ? family : `${family} (${part + 1}/${parts})`;
    it(`${label}: checks every indexed unit and records every mismatch/rejection`, async () => {
      const entries = catalog(family).filter(
        (_, index) => index % parts === part,
      );
      const rows: CatalogRow[] = [];
      for await (const { entry, read } of readCatalogFiles(
        path.join(process.cwd(), 'public/data/units', family),
        entries,
      ))
        rows.push(verifyCatalogUnit(family, entry, read));
      const counts: Record<string, number> = {};
      for (const row of rows)
        for (const field of new Set(
          row.differences.map((d) => d.field.replace(/\.\d+$/, '')),
        ))
          counts[field] = (counts[field] ?? 0) + 1;
      const summary = {
        total: rows.length,
        rejected: rows.filter((r) => r.rejection).length,
        counts,
      };
      // New Java-value assertions must not become accepted snapshot rejections.
      expect(summary.rejected).toBe(0);
      if (process.env.RECORD_SHEET_AUDIT)
        fs.writeFileSync(
          `${process.env.RECORD_SHEET_AUDIT}/${family}${parts === 1 ? '' : `-${part + 1}-of-${parts}`}.json`,
          JSON.stringify({ summary, rows }, null, 2),
        );
      expect(rows.length).toBeGreaterThan(0);
      // These repaired classes are a strict gate; remaining gaps are explicitly
      // counted below instead of silently skipping rejected or mismatched units.
      if (family === 'vehicles' || family === 'aerospace') {
        expect(
          rows
            .flatMap((r) =>
              r.differences
                .filter(
                  (d) =>
                    d.field === 'BV' ||
                    d.field === 'motion' ||
                    d.field === 'weightClass' ||
                    d.field === 'binding.inventory' ||
                    (family === 'vehicles' &&
                      (d.field.startsWith('armor.') ||
                        d.field.startsWith('pips.') ||
                        d.field === 'binding.armorType' ||
                        d.field === 'barRating')) ||
                    (family === 'aerospace' &&
                      (d.field.startsWith('armor.') ||
                        d.field.startsWith('pips.') ||
                        d.field.startsWith('pipGroup.') ||
                        d.field.startsWith('text.') ||
                        d.field === 'barRating' ||
                        d.field === 'binding.armorType' ||
                        d.field === 'binding.heat' ||
                        d.field === 'binding.SI' ||
                        d.field === 'SI')) ||
                    d.field.startsWith('weaponStats') ||
                    d.field.startsWith('weaponAliasStats') ||
                    (d.field === 'template' && r.subtype !== 'SmallCraft'),
                )
                .map((d) => ({ id: r.id, ...d })),
            )
            .slice(0, 10),
        ).toEqual([]);
      }
      if (family === 'vehicles')
        expect(
          rows.filter((r) => r.stage === 'template' && r.rejection),
        ).toEqual([]);
      const residual = rows.filter((r) => r.rejection || r.differences.length);
      const digest = createHash('sha256')
        .update(JSON.stringify(residual))
        .digest('hex');
      expect({ ...summary, residualDigest: digest }).toMatchSnapshot();
    });
  });
}
