import type { IUnitContract } from '@/types/contracts';
import type { IRecordSheetHeader } from '@/types/printing/RecordSheetTypes';

import { mapHeatSinkType } from '@/services/conversion/ValueMappings';
import { mapCapitalDefinitionToView } from '@/services/units/unitLoaderService/capitalShipView';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { capitalStructure } from '@/utils/construction/aerospace/capitalStructure';
import {
  groupLargeAerospaceMounts,
  largeAerospaceHeatByArc,
  resolveLargeAerospaceMountBV,
} from '@/utils/construction/aerospace/dropShipMountBV';
import { calculateHeatDissipation } from '@/utils/construction/heatSinkCalculations';

const ARMOR_CODES: Readonly<Record<string, string>> = {
  NOSE: 'NOS',
  LEFT_SIDE: 'LS',
  RIGHT_SIDE: 'RS',
  AFT: 'AFT',
  FRONT_LEFT_SIDE: 'FLS',
  FRONT_RIGHT_SIDE: 'FRS',
  AFT_LEFT_SIDE: 'ALS',
  AFT_RIGHT_SIDE: 'ARS',
};

/** MML 62bf193 PrintDropship/PrintCapitalShip, both paper sizes. */
export function selectCapitalTemplate(data: {
  shipType: string;
  motionType?: string;
}): string {
  if (data.shipType === UnitType.DROPSHIP) {
    if (data.motionType !== 'SPHEROID' && data.motionType !== 'AERODYNE')
      throw new Error('No capital record sheet for this DropShip hull.');
    return `dropship_${data.motionType.toLowerCase()}_default`;
  }
  const key: Readonly<Record<string, string>> = {
    [UnitType.JUMPSHIP]: 'jumpship_default',
    [UnitType.WARSHIP]: 'warship_default',
    [UnitType.SPACE_STATION]: 'spacestation_default',
  };
  if (!key[data.shipType])
    throw new Error(`No capital record sheet for ${data.shipType}.`);
  return key[data.shipType];
}

/** Project validated source facts and existing domain owners; no saved BV estimate. */
export function extractCapitalData(
  source: IUnitContract,
): ICapitalRecordSheetData {
  return projectCapitalData(source);
}

function projectCapitalData(source: IUnitContract) {
  const shipType = String(source.unitType);
  const motionType =
    typeof source.motionType === 'string' ? source.motionType : undefined;
  selectCapitalTemplate({ shipType, motionType });
  const view = mapCapitalDefinitionToView(source, source.id);
  const capitalType =
    view.unitType === UnitType.DROPSHIP ? undefined : view.unitType;
  const mounts = (source.equipment ?? []).map((m) => ({
    equipmentId: m.id,
    location: m.location,
  }));
  const resolution = resolveLargeAerospaceMountBV(mounts, capitalType);
  const weaponBays = groupLargeAerospaceMounts(mounts, capitalType).map(
    (b) => ({
      arc: b.arc,
      number: b.number,
      items: b.indices.map((sourceIndex) => ({
        sourceIndex,
        name:
          source.equipment![sourceIndex].name ??
          mounts[sourceIndex].equipmentId,
      })),
    }),
  );
  const heatByArc = largeAerospaceHeatByArc(resolution, mounts, capitalType);
  const heatSinkCount = source.heatSinks?.count;
  const header: IRecordSheetHeader = {
    unitName: view.name,
    chassis: source.chassis ?? view.name,
    model: source.model ?? '',
    tonnage: view.tonnage,
    techBase: view.techBase,
    rulesLevel: String(source.rulesLevel),
    era: String(source.era),
    battleValue: view.bv.scope === 'complete' ? view.bv.total : 0,
    cost: 0,
  };
  return {
    unitType: 'capital' as const,
    header,
    shipType,
    motionType,
    bv: view.bv,
    armor: Object.entries(source.armor?.byArc ?? {}).map(([arc, points]) => ({
      arc,
      code: ARMOR_CODES[arc],
      points,
    })),
    structuralIntegrity: view.structuralIntegrity,
    safeThrust: view.safeThrust,
    maxThrust: view.maxThrust,
    fuel: view.fuel,
    heatSinkCount,
    heatCapacity: source.heatSinks
      ? calculateHeatDissipation(
          mapHeatSinkType(source.heatSinks.type),
          source.heatSinks.count,
        )
      : undefined,
    heatByArc,
    crew: view.crew,
    transport: view.transport,
    kf: view.kf,
    integrity: capitalStructure(
      shipType,
      view.tonnage,
      typeof source.driveCoreType === 'number' ? source.driveCoreType : 3,
      typeof source.jumpRange === 'number' ? source.jumpRange : 30,
      source.hasSail === true,
    ),
    weaponBays,
    unresolved: resolution.unresolved,
  };
}

export type ICapitalRecordSheetData = ReturnType<typeof projectCapitalData>;
