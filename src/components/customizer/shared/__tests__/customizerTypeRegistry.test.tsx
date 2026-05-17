/**
 * customizerTypeRegistry — descriptor registry contract tests.
 *
 * The descriptor registry is the single source of truth the customizer router
 * and the four `*ForType` dispatchers resolve against. These tests lock that
 * contract:
 *   - every `UnitType` resolves a descriptor with every field populated;
 *   - each descriptor wires the SAME component the pre-refactor `switch`
 *     selected for that type (component-identity regression guard);
 *   - unmapped types fall back to the BattleMech descriptor.
 *
 * @spec openspec/changes/refactor-customizer-type-descriptors/specs/customizer-routing/spec.md
 *        Requirement: Unit-Type Customizer Resolution
 */

// PreviewTab transitively imports jspdf (ESM-only). Stub it so the descriptor
// import chain resolves under jest.
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { AerospacePreviewTab } from '../../aerospace/AerospacePreviewTab';
import { BattleArmorPreviewTab } from '../../battlearmor/BattleArmorPreviewTab';
import { InfantryPreviewTab } from '../../infantry/InfantryPreviewTab';
import { ProtoMechPreviewTab } from '../../protomech/ProtoMechPreviewTab';
import { NonMechOverviewPlaceholder } from '../../tabs/NonMechOverviewPlaceholder';
import { OverviewTab } from '../../tabs/OverviewTab';
import { PreviewTab } from '../../tabs/PreviewTab';
import { VehiclePreviewTab } from '../../vehicle/VehiclePreviewTab';
import {
  getCustomizerDescriptor,
  getCustomizerDescriptors,
} from '../customizerTypeRegistry';

const ALL_UNIT_TYPES: UnitType[] = Object.values(UnitType);

// Types with a dedicated descriptor (every other type falls back to mech).
const MAPPED_TYPES: UnitType[] = [
  UnitType.BATTLEMECH,
  UnitType.OMNIMECH,
  UnitType.INDUSTRIALMECH,
  UnitType.VEHICLE,
  UnitType.VTOL,
  UnitType.SUPPORT_VEHICLE,
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
  UnitType.BATTLE_ARMOR,
  UnitType.INFANTRY,
  UnitType.PROTOMECH,
];

// Capital craft etc. — intentionally unmapped, must fall back to mech.
const UNMAPPED_TYPES: UnitType[] = [
  UnitType.SMALL_CRAFT,
  UnitType.DROPSHIP,
  UnitType.JUMPSHIP,
  UnitType.WARSHIP,
  UnitType.SPACE_STATION,
];

describe('customizerTypeRegistry — descriptor completeness', () => {
  it.each(ALL_UNIT_TYPES)(
    'resolves a complete descriptor for %s',
    (unitType) => {
      const d = getCustomizerDescriptor(unitType);
      expect(d).toBeDefined();
      expect(d.Shell).toBeDefined();
      expect(d.tabs.length).toBeGreaterThan(0);
      expect(d.OverviewComponent).toBeDefined();
      expect(d.PreviewComponent).toBeDefined();
      expect(d.ArmorDiagramComponent).toBeDefined();
      expect(d.RecordSheetPreviewComponent).toBeDefined();
      expect(d.label.length).toBeGreaterThan(0);
    },
  );

  it('memoises the descriptor list (stable identity across calls)', () => {
    expect(getCustomizerDescriptors()).toBe(getCustomizerDescriptors());
  });

  it('declares no overlapping unitTypes across descriptors', () => {
    const seen = new Set<UnitType>();
    for (const d of getCustomizerDescriptors()) {
      for (const t of d.unitTypes) {
        expect(seen.has(t)).toBe(false);
        seen.add(t);
      }
    }
  });

  it('maps every dedicated unit type to a descriptor (not the fallback)', () => {
    for (const t of MAPPED_TYPES) {
      expect(getCustomizerDescriptor(t).unitTypes).toContain(t);
    }
  });
});

describe('customizerTypeRegistry — mech fallback', () => {
  it.each(UNMAPPED_TYPES)(
    'falls back to the BattleMech descriptor for %s',
    (unitType) => {
      const d = getCustomizerDescriptor(unitType);
      expect(d.label).toBe('BattleMech');
      expect(d.OverviewComponent).toBe(OverviewTab);
      expect(d.PreviewComponent).toBe(PreviewTab);
    },
  );
});

describe('customizerTypeRegistry — component identity (no-behaviour-change guard)', () => {
  it('mech descriptor wires the mech Overview/Preview components', () => {
    const d = getCustomizerDescriptor(UnitType.BATTLEMECH);
    expect(d.OverviewComponent).toBe(OverviewTab);
    expect(d.PreviewComponent).toBe(PreviewTab);
  });

  it('every non-mech Overview resolves the store-free placeholder', () => {
    for (const t of [
      UnitType.VEHICLE,
      UnitType.VTOL,
      UnitType.SUPPORT_VEHICLE,
      UnitType.AEROSPACE,
      UnitType.CONVENTIONAL_FIGHTER,
      UnitType.BATTLE_ARMOR,
      UnitType.INFANTRY,
      UnitType.PROTOMECH,
    ]) {
      expect(getCustomizerDescriptor(t).OverviewComponent).toBe(
        NonMechOverviewPlaceholder,
      );
    }
  });

  it('each non-mech Preview resolves its per-type preview component', () => {
    expect(getCustomizerDescriptor(UnitType.VEHICLE).PreviewComponent).toBe(
      VehiclePreviewTab,
    );
    expect(getCustomizerDescriptor(UnitType.AEROSPACE).PreviewComponent).toBe(
      AerospacePreviewTab,
    );
    expect(
      getCustomizerDescriptor(UnitType.BATTLE_ARMOR).PreviewComponent,
    ).toBe(BattleArmorPreviewTab);
    expect(getCustomizerDescriptor(UnitType.INFANTRY).PreviewComponent).toBe(
      InfantryPreviewTab,
    );
    expect(getCustomizerDescriptor(UnitType.PROTOMECH).PreviewComponent).toBe(
      ProtoMechPreviewTab,
    );
  });

  it('mech and Vehicle descriptors do not share an armor diagram', () => {
    expect(
      getCustomizerDescriptor(UnitType.BATTLEMECH).ArmorDiagramComponent,
    ).not.toBe(getCustomizerDescriptor(UnitType.VEHICLE).ArmorDiagramComponent);
  });
});
