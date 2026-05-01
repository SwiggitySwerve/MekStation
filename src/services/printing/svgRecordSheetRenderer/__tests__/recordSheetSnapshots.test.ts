/**
 * Per-Type Record Sheet SVG Snapshot Tests
 *
 * One representative fixture per non-mech unit type. Snapshots lock the
 * SVG output for the new vehicle / aerospace / battlearmor / infantry /
 * protomech renderers so future refactors can't silently shift layout
 * coordinates or strip elements.
 *
 * Fixtures are intentionally minimal — just enough to exercise each
 * renderer's primary code paths (armor diagrams, equipment tables,
 * crew/pilot blocks). Storing them inline keeps the snapshot diff
 * focused; richer corpus-level coverage lives in the contract tests.
 *
 * Closes OpenSpec tasks 3.7, 4.8, 5.8, 6.8, 7.7.
 */

import type {
  IAerospaceRecordSheetData,
  IBattleArmorRecordSheetData,
  IInfantryRecordSheetData,
  IProtoMechRecordSheetData,
  IRecordSheetHeader,
  IVehicleRecordSheetData,
} from '@/types/printing';

import { renderAerospaceSVG } from '../aerospaceRenderer';
import { renderBattleArmorSVG } from '../battleArmorRenderer';
import { renderInfantrySVG } from '../infantryRenderer';
import { renderProtoMechSVG } from '../protoMechRenderer';
import { renderVehicleSVG } from '../vehicleRenderer';

/** Shared header factory — keeps snapshot diffs focused on renderer changes. */
function makeHeader(
  overrides: Partial<IRecordSheetHeader>,
): IRecordSheetHeader {
  return {
    unitName: 'Test Unit',
    chassis: 'Test',
    model: 'TST-1',
    tonnage: 0,
    techBase: 'Inner Sphere',
    rulesLevel: 'Standard',
    era: 'Civil War',
    role: 'Skirmisher',
    battleValue: 1000,
    cost: 1_000_000,
    ...overrides,
  };
}

describe('Record sheet SVG snapshots — per unit type', () => {
  // ── Task 3.7 ─────────────────────────────────────────────────────────────
  it('renders a 50t tracked tank vehicle record sheet', () => {
    const data: IVehicleRecordSheetData = {
      unitType: 'vehicle',
      header: makeHeader({
        chassis: 'Manticore',
        model: 'Heavy Tank',
        tonnage: 50,
        battleValue: 1247,
      }),
      motionType: 'Tracked',
      turretConfig: 'Single',
      cruiseMP: 4,
      flankMP: 6,
      armorType: 'Standard',
      armorLocations: [
        { location: 'Front', current: 40, maximum: 40, bar: 8 },
        { location: 'Left Side', current: 32, maximum: 32, bar: 8 },
        { location: 'Right Side', current: 32, maximum: 32, bar: 8 },
        { location: 'Rear', current: 24, maximum: 24, bar: 8 },
        { location: 'Turret', current: 40, maximum: 40, bar: 8 },
        { location: 'Body', current: 0, maximum: 0, bar: 8 },
      ],
      crew: [
        { role: 'driver', name: 'Driver', gunnery: 4, piloting: 5 },
        { role: 'gunner', name: 'Gunner', gunnery: 3, piloting: 5 },
        { role: 'commander', name: 'Cmdr', gunnery: 4, piloting: 4 },
      ],
      equipment: [
        {
          id: 'ac5',
          name: 'AC/5',
          location: 'Turret',
          locationAbbr: 'TR',
          heat: 1,
          damage: 5,
          minimum: 3,
          short: 6,
          medium: 12,
          long: 18,
          quantity: 1,
          isWeapon: true,
          isAmmo: false,
        },
        {
          id: 'ac5-ammo',
          name: 'AC/5 Ammo',
          location: 'Body',
          locationAbbr: 'BD',
          heat: 0,
          damage: '-',
          minimum: '-',
          short: '-',
          medium: '-',
          long: '-',
          quantity: 1,
          isWeapon: false,
          isAmmo: true,
          ammoCount: 20,
        },
      ],
      barRating: 8,
    };

    expect(renderVehicleSVG(data)).toMatchSnapshot();
  });

  // ── Task 4.8 ─────────────────────────────────────────────────────────────
  it('renders a Shilone aerospace fighter record sheet', () => {
    const data: IAerospaceRecordSheetData = {
      unitType: 'aerospace',
      header: makeHeader({
        chassis: 'Shilone',
        model: 'SL-15',
        tonnage: 65,
        battleValue: 1815,
      }),
      structuralIntegrity: 8,
      fuelPoints: 200,
      safeThrust: 5,
      maxThrust: 8,
      heatSinks: {
        type: 'Single',
        count: 16,
        capacity: 16,
        integrated: 10,
        external: 6,
      },
      armorType: 'Standard Aerospace',
      armorArcs: [
        { arc: 'Nose', current: 70, maximum: 70 },
        { arc: 'Left Wing', current: 60, maximum: 60 },
        { arc: 'Right Wing', current: 60, maximum: 60 },
        { arc: 'Aft', current: 50, maximum: 50 },
      ],
      equipment: [
        {
          id: 'ppc',
          name: 'PPC',
          location: 'Nose',
          locationAbbr: 'NO',
          heat: 10,
          damage: 10,
          minimum: 3,
          short: 6,
          medium: 12,
          long: 18,
          quantity: 1,
          isWeapon: true,
          isAmmo: false,
        },
      ],
      bombBaySlots: 0,
      pilot: {
        name: 'Test Pilot',
        gunnery: 3,
        piloting: 4,
        wounds: 0,
        edge: 1,
      },
    };

    expect(renderAerospaceSVG(data)).toMatchSnapshot();
  });

  // ── Task 5.8 ─────────────────────────────────────────────────────────────
  it('renders an Elemental BattleArmor point record sheet', () => {
    const data: IBattleArmorRecordSheetData = {
      unitType: 'battlearmor',
      header: makeHeader({
        chassis: 'Elemental',
        model: 'Standard',
        tonnage: 5,
        techBase: 'Clan',
        battleValue: 437,
      }),
      squadSize: 5,
      troopers: Array.from({ length: 5 }, (_, i) => ({
        index: i + 1,
        armorPips: 10,
        maximumArmorPips: 10,
        modularWeapon: 'SRM 2',
        apWeapon: 'Laser',
        gunnery: 4,
        antiMech: 4,
      })),
      manipulators: { left: 'Battle Claw', right: 'Battle Claw' },
      jumpMP: 3,
      walkMP: 1,
      umuMP: 0,
      vtolMP: 0,
    };

    expect(renderBattleArmorSVG(data)).toMatchSnapshot();
  });

  // ── Task 6.8 ─────────────────────────────────────────────────────────────
  it('renders a Foot rifle infantry platoon record sheet', () => {
    const data: IInfantryRecordSheetData = {
      unitType: 'infantry',
      header: makeHeader({
        chassis: 'Foot Rifle Platoon',
        model: 'Standard',
        tonnage: 3,
        battleValue: 22,
      }),
      platoonSize: 28,
      platoonComposition: { squads: 7, troopersPerSquad: 4 },
      motiveType: 'Foot',
      armorKit: 'None',
      primaryWeapon: {
        name: 'Auto-Rifle',
        damage: '0.18 / trooper',
        minimumRange: 0,
        shortRange: 1,
        mediumRange: 2,
        longRange: 3,
      },
      secondaryWeapons: [],
      antiMechTraining: false,
      gunnery: 4,
      antiMech: 5,
    };

    expect(renderInfantrySVG(data)).toMatchSnapshot();
  });

  // ── Task 7.7 ─────────────────────────────────────────────────────────────
  it('renders a Roc ProtoMech point record sheet', () => {
    const data: IProtoMechRecordSheetData = {
      unitType: 'protomech',
      header: makeHeader({
        chassis: 'Roc',
        model: 'Standard',
        tonnage: 9,
        techBase: 'Clan',
        battleValue: 213,
      }),
      pointSize: 5,
      protos: Array.from({ length: 5 }, (_, i) => ({
        index: i + 1,
        armorByLocation: {
          Head: { current: 2, maximum: 2 },
          Torso: { current: 14, maximum: 14 },
          'Left Arm': { current: 4, maximum: 4 },
          'Right Arm': { current: 4, maximum: 4 },
          Legs: { current: 8, maximum: 8 },
          'Main Gun': { current: 0, maximum: 0 },
        },
      })),
      hasUMU: false,
      isGlider: false,
      walkMP: 4,
      jumpMP: 0,
      equipment: [],
    };

    expect(renderProtoMechSVG(data)).toMatchSnapshot();
  });
});
