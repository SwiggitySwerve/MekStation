/**
 * tabRegistry — canonical per-type tab-set assertion tests
 *
 * Locks the canonical tab labels for every supported unit type to the values
 * declared in the spec.  Any reordering or rename must update both the spec
 * and these assertions together, which is what "canonical" means in this
 * change.
 *
 * Covers:
 *   Spec § Requirement: Canonical Per-Type Tab Sets
 *     – Scenario: Mech unit shows mech tab set
 *     – Scenario: Vehicle unit shows vehicle tab set
 *     – Scenario: Aerospace unit shows aerospace tab set
 *     – Scenario: BattleArmor unit shows BA tab set
 *     – Scenario: Infantry unit shows infantry tab set
 *     – Scenario: ProtoMech unit shows ProtoMech tab set
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 */

// PreviewTab transitively imports jspdf (ESM-only module). Stub it so the
// tabRegistry import chain resolves without requiring jest to parse jspdf.
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

import {
  AEROSPACE_TABS,
  BATTLE_ARMOR_TABS,
  INFANTRY_TABS,
  MECH_TABS,
  PROTOMECH_TABS,
  VEHICLE_TABS,
} from '../tabRegistry';

// ---------------------------------------------------------------------------
// Expected labels pulled verbatim from the spec — do not reorder.
// ---------------------------------------------------------------------------

const EXPECTED_MECH_LABELS = [
  'Overview',
  'Structure',
  'Armor',
  'Equipment',
  'Critical Slots',
  'Preview',
  'Fluff',
];

const EXPECTED_VEHICLE_LABELS = [
  'Overview',
  'Structure',
  'Armor',
  'Turret',
  'Equipment',
  'Preview',
  'Fluff',
];

const EXPECTED_AEROSPACE_LABELS = [
  'Overview',
  'Structure',
  'Armor',
  'Equipment',
  'Velocity',
  'Bombs',
  'Preview',
  'Fluff',
];

const EXPECTED_BATTLE_ARMOR_LABELS = [
  'Overview',
  'Chassis',
  'Squad',
  'Manipulators',
  'Modular Weapons',
  'AP Weapons',
  'Jump/UMU',
  'Preview',
  'Fluff',
];

const EXPECTED_INFANTRY_LABELS = [
  'Overview',
  'Platoon',
  'Primary Weapon',
  'Secondary Weapons',
  'Field Guns',
  'Specialization',
  'Preview',
  'Fluff',
];

const EXPECTED_PROTOMECH_LABELS = [
  'Overview',
  'Structure',
  'Armor',
  'Main Gun',
  'Equipment',
  'Glider',
  'Preview',
  'Fluff',
];

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

describe('tabRegistry — canonical per-type tab sets', () => {
  it('MECH_TABS matches the spec canonical labels in order', () => {
    expect(MECH_TABS.map((t) => t.label)).toEqual(EXPECTED_MECH_LABELS);
  });

  it('VEHICLE_TABS matches the spec canonical labels in order', () => {
    expect(VEHICLE_TABS.map((t) => t.label)).toEqual(EXPECTED_VEHICLE_LABELS);
  });

  it('AEROSPACE_TABS matches the spec canonical labels in order', () => {
    expect(AEROSPACE_TABS.map((t) => t.label)).toEqual(
      EXPECTED_AEROSPACE_LABELS,
    );
  });

  it('BATTLE_ARMOR_TABS matches the spec canonical labels in order', () => {
    expect(BATTLE_ARMOR_TABS.map((t) => t.label)).toEqual(
      EXPECTED_BATTLE_ARMOR_LABELS,
    );
  });

  it('INFANTRY_TABS matches the spec canonical labels in order', () => {
    expect(INFANTRY_TABS.map((t) => t.label)).toEqual(EXPECTED_INFANTRY_LABELS);
  });

  it('PROTOMECH_TABS matches the spec canonical labels in order', () => {
    expect(PROTOMECH_TABS.map((t) => t.label)).toEqual(
      EXPECTED_PROTOMECH_LABELS,
    );
  });
});
