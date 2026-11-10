/**
 * Capital ship read-only view (UL-14). A DropShip, JumpShip, WarShip or Space
 * Station definition maps to a frozen view model. No editor store is created;
 * open views are kept by editor tab id for the read-only shell.
 */
import type { IUnitContract } from '@/types/contracts';
import type { TechBase } from '@/types/enums/TechBase';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { validateAerospaceSource } from '@/utils/construction/aerospace/sourceValidation';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import type { IUnitDefinitionReference } from './definitionTypes';

import { mapTechBase } from './componentMappers';
import { UnsupportedUnitConfigurationError } from './movementConfiguration';

export type CapitalShipUnitType =
  | UnitType.DROPSHIP
  | UnitType.JUMPSHIP
  | UnitType.WARSHIP
  | UnitType.SPACE_STATION;

/** A partial (defensive) value is never reported as the total. */
export type CapitalShipBV =
  | {
      readonly scope: 'complete';
      readonly total: number;
      readonly defensive: number;
      readonly offensive: number;
    }
  | { readonly scope: 'defensive-only'; readonly defensive: number }
  | { readonly scope: 'unavailable'; readonly reason: string };

export interface ICapitalShipRow {
  readonly label: string;
  readonly count: number;
  readonly detail?: string;
}

export interface ICapitalShipView {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceDefinition?: IUnitDefinitionReference;
  readonly name: string;
  readonly unitType: CapitalShipUnitType;
  readonly techBase: TechBase;
  readonly tonnage: number;
  readonly year?: number;
  readonly structuralIntegrity?: number;
  readonly safeThrust?: number;
  readonly maxThrust?: number;
  readonly heatSinks?: string;
  readonly fuel?: number;
  /** JumpShips, WarShips and stations only. */
  readonly kf?: readonly ICapitalShipRow[];
  readonly armorType: string;
  readonly armorByArc: readonly ICapitalShipRow[];
  readonly crew: readonly ICapitalShipRow[];
  readonly transport: readonly ICapitalShipRow[];
  readonly equipmentByArc: readonly {
    readonly arc: string;
    readonly items: readonly ICapitalShipRow[];
  }[];
  readonly bv: CapitalShipBV;
  readonly constructionErrors?: readonly string[];
}

const ARCS: Record<string, string> = {
  NOSE: 'Nose',
  FRONT_LEFT_SIDE: 'Front Left',
  FRONT_RIGHT_SIDE: 'Front Right',
  LEFT_SIDE: 'Left Side',
  RIGHT_SIDE: 'Right Side',
  LEFT_BROADSIDE: 'Left Broadside',
  RIGHT_BROADSIDE: 'Right Broadside',
  AFT_LEFT_SIDE: 'Aft Left',
  AFT_RIGHT_SIDE: 'Aft Right',
  AFT: 'Aft',
  HULL: 'Hull',
};
const ARC_ORDER = Object.keys(ARCS);

/** Pinned BLKFile transporter keys; unit bays count units, the rest tons. */
const BAYS: Record<string, readonly [string, 'units' | 't' | null]> = {
  asfbay: ['Fighter Bay', 'units'],
  artsasfbay: ['ARTS Fighter Bay', 'units'],
  smallcraftbay: ['Small Craft Bay', 'units'],
  dropshuttlebay: ['Drop Shuttle Bay', null],
  mekbay: ['Mek Bay', 'units'],
  protomekbay: ['ProtoMek Bay', 'units'],
  lightvehiclebay: ['Light Vehicle Bay', 'units'],
  heavyvehiclebay: ['Heavy Vehicle Bay', 'units'],
  battlearmorbay: ['Battle Armor Bay', 'units'],
  infantrybay: ['Infantry Bay', 'units'],
  cargobay: ['Cargo Bay', 't'],
  liquidcargobay: ['Liquid Cargo Bay', 't'],
  refrigeratedcargobay: ['Refrigerated Cargo Bay', 't'],
  crewquarters: ['Crew Quarters', 't'],
  '1stclassquarters': ['First Class Quarters', 't'],
  '2ndclassquarters': ['Second Class Quarters', 't'],
  steeragequarters: ['Steerage Quarters', 't'],
  navalrepairpressurized: ['Pressurized Naval Repair', 't'],
  navalrepairunpressurized: ['Unpressurized Naval Repair', 't'],
  artsnavalrepairpressurized: ['ARTS Pressurized Naval Repair', 't'],
  dockingcollar: ['Docking Collar', null],
};

const CREW: ReadonlyArray<readonly [string, string]> = [
  ['crew', 'Crew'],
  ['officers', 'Officers'],
  ['gunners', 'Gunners'],
  ['otherCrew', 'Other Crew'],
  ['marines', 'Marines'],
  ['battleArmor', 'Battle Armor'],
  ['passengers', 'Passengers'],
  ['otherPassengers', 'Other Passengers'],
  ['escapePods', 'Escape Pods'],
  ['lifeBoats', 'Lifeboats'],
];

/** Jumpship.java:89-93 DRIVE_CORE_* at the pinned MegaMek commit. */
const DRIVE_CORES = ['Standard', 'Compact', 'Subcompact', 'None', 'Primitive'];
const ARMOR_CODES: Readonly<Record<string, number>> = {
  STANDARD: 0,
  FERRO_ALUMINUM: 19,
  PRIMITIVE_AERO: 40,
  AEROSPACE: 41,
};

const titleCase = (key: string): string =>
  key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
const arcLabel = (arc: string): string => ARCS[arc] ?? titleCase(arc);
const arcRank = (arc: string): number =>
  ARC_ORDER.includes(arc) ? ARC_ORDER.indexOf(arc) : ARC_ORDER.length;
const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const yesNo = (value: unknown): string => (value === true ? 'Yes' : 'No');

/** Count repeated rows, keeping first-seen order. */
function tally(rows: readonly ICapitalShipRow[]): ICapitalShipRow[] {
  const out = new Map<string, ICapitalShipRow>();
  for (const row of rows) {
    const key = `${row.label}\u0000${row.detail ?? ''}`;
    const seen = out.get(key);
    out.set(key, seen ? { ...seen, count: seen.count + row.count } : row);
  }
  return [...out.values()];
}

function transportRow(entry: string): ICapitalShipRow {
  const [key, size, doors] = entry.split(':');
  const [label, unit] = BAYS[key.toLowerCase()] ?? [key, null];
  const parts = [
    unit && size ? `${Number(size).toLocaleString('en-US')} ${unit}` : '',
    doors && Number(doors) > 0
      ? `${doors} door${doors === '1' ? '' : 's'}`
      : '',
  ].filter(Boolean);
  return { label, count: 1, detail: parts.join(', ') || undefined };
}

function capitalBV(definition: IUnitContract): CapitalShipBV {
  let result;
  try {
    result = calculateBattleValueForUnit(
      contractUnitToBVUnit(definition as unknown as IContractBVSource),
    );
  } catch (error) {
    return {
      scope: 'unavailable',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  if (result?.kind !== 'dropship' && result?.kind !== 'capital-ship') {
    return {
      scope: 'unavailable',
      reason: `No BV calculator for ${definition.unitType}`,
    };
  }
  const { breakdown } = result;
  if (breakdown.calculationScope === 'complete') {
    const { final, defensive, offensive } = breakdown;
    return { scope: 'complete', total: final, defensive, offensive };
  }
  return { scope: 'defensive-only', defensive: breakdown.defensive };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Map a validated capital definition to its frozen read-only view. */
export function mapCapitalDefinitionToView(
  definition: IUnitContract,
  id: string,
  sourceDefinition?: IUnitDefinitionReference,
): ICapitalShipView {
  const raw = definition as unknown as Record<string, unknown>;
  const movement = (raw.movement ?? {}) as Record<string, unknown>;
  const armor = (raw.armor ?? {}) as {
    type?: string;
    byArc?: Record<string, number>;
  };
  const sinks = raw.heatSinks as { type: string; count: number } | undefined;
  const equipment = (definition.equipment ?? []) as readonly {
    id: string;
    name?: string;
    location: string;
  }[];
  const arcs = [...new Set(equipment.map((item) => item.location))].sort(
    (a, b) => arcRank(a) - arcRank(b),
  );
  const core = num(raw.driveCoreType);
  const tonnage = num(definition.tonnage);
  if (tonnage === undefined) {
    throw new UnsupportedUnitConfigurationError(
      'The capital ship view cannot open a ship without a tonnage.',
    );
  }
  const construction =
    typeof raw.crew === 'number' && Array.isArray(raw.transporters)
      ? {
          crew: raw.crew,
          officers: num(raw.officers),
          passengers: num(raw.passengers),
          marines: num(raw.marines),
          unitType: String(definition.unitType),
          tonnage,
          year: num(raw.originalBuildYear) ?? num(raw.year) ?? 2500,
          type: String(raw.sourceTechType ?? definition.techBase),
          motionType: String(raw.motionType),
          safeThrust: num(movement.safeThrust),
          structuralIntegrity: num(raw.structuralIntegrity),
          fuel: num(raw.fuel),
          heatsinks: sinks?.count,
          armorType: ARMOR_CODES[armor.type ?? ''] ?? -1,
          armor: Object.values(armor.byArc ?? {}),
          battlearmor: num(raw.battleArmor),
          designType: raw.designType === 'MILITARY' ? 1 : 0,
          transporters: raw.transporters as string[],
          lifeBoat: num(raw.lifeBoats),
          escapePod: num(raw.escapePods),
          rawTags: {
            ...Object.fromEntries(
              arcs.map((arc) => [
                arc + ' Equipment',
                equipment
                  .filter((m) => m.location === arc)
                  .map((m) => m.name ?? m.id),
              ]),
            ),
            kf_core: String(core ?? 0),
            sail: String(Number(raw.hasSail !== false)),
            lfbattery: String(Number(raw.hasLFBattery === true)),
            grav_decks: ((raw.gravDecks as number[]) ?? []).map(String),
          },
        }
      : undefined;
  return deepFreeze({
    id,
    sourceId: definition.id,
    ...(sourceDefinition?.source === 'custom'
      ? { sourceDefinition: { ...sourceDefinition } }
      : {}),
    name: [definition.chassis, definition.model].filter(Boolean).join(' '),
    unitType: definition.unitType as CapitalShipUnitType,
    techBase: mapTechBase(String(definition.techBase)),
    tonnage,
    year: num(raw.year),
    structuralIntegrity: num(raw.structuralIntegrity),
    safeThrust: num(movement.safeThrust),
    maxThrust: num(movement.maxThrust),
    heatSinks: sinks && `${sinks.count} ${titleCase(sinks.type)}`,
    fuel: num(raw.fuel),
    kf:
      core === undefined
        ? undefined
        : [
            { label: 'Drive Core', count: 1, detail: DRIVE_CORES[core] },
            ...(num(raw.jumpRange) === undefined
              ? []
              : [
                  {
                    label: 'Jump Range',
                    count: 1,
                    detail: `${raw.jumpRange} light years`,
                  },
                ]),
            { label: 'Jump Sail', count: 1, detail: yesNo(raw.hasSail) },
            {
              label: 'Lithium-Fusion Battery',
              count: 1,
              detail: yesNo(raw.hasLFBattery),
            },
            { label: 'HPG', count: 1, detail: yesNo(raw.hasHPG) },
            ...(Array.isArray(raw.gravDecks) && raw.gravDecks.length
              ? [
                  {
                    label: 'Grav Decks',
                    count: raw.gravDecks.length,
                    detail: `${raw.gravDecks.join(', ')} m`,
                  },
                ]
              : []),
          ],
    armorType: titleCase(armor.type ?? 'unknown'),
    armorByArc: Object.entries(armor.byArc ?? {})
      .sort(([a], [b]) => arcRank(a) - arcRank(b))
      .map(([arc, points]) => ({ label: arcLabel(arc), count: points })),
    crew: CREW.flatMap(([key, label]) => {
      const count = num(raw[key]);
      return count === undefined || (count === 0 && key !== 'crew')
        ? []
        : [{ label, count }];
    }),
    transport: tally(((raw.transporters ?? []) as string[]).map(transportRow)),
    equipmentByArc: arcs.map((arc) => ({
      arc: arcLabel(arc),
      items: tally(
        equipment
          .filter((item) => item.location === arc)
          .map((item) => ({ label: item.name ?? item.id, count: 1 })),
      ),
    })),
    bv: capitalBV(definition),
    constructionErrors: construction
      ? validateAerospaceSource(construction)
      : undefined,
  });
}

const openViews = new Map<string, ICapitalShipView>();

/** Keep an opened view for its editor tab. */
export function registerCapitalShipView(
  view: ICapitalShipView,
): ICapitalShipView {
  openViews.set(view.id, view);
  return view;
}

export function getCapitalShipView(id: string): ICapitalShipView | undefined {
  return openViews.get(id);
}
