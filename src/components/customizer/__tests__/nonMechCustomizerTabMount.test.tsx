/**
 * Non-mech customizer tab-mount regression suite — the definitive guard.
 *
 * The shipped bug class: a mech-coupled tab component (one that hard-calls
 * `useUnitStore`) sneaks into a non-mech customizer's tab set and crashes the
 * whole customizer with:
 *
 *   "useUnitStore must be used within a UnitStoreProvider"
 *
 * This was hit live on the Vehicle customizer (Preview tab) and again on the
 * Aerospace customizer (Overview tab). The root cause is always the same:
 * `tabRegistry.tsx` is the SINGLE SOURCE OF TRUTH for which component each tab
 * renders, and a non-mech tab set must never reference a raw mech tab.
 *
 * This suite closes the bug class permanently. For EVERY non-mech unit type it
 * walks the canonical registry tab set (`getCustomizerDescriptor().tabs`) and mounts
 * each tab's component inside ONLY that type's own store context — exactly the
 * provider stack the real customizer gives it. If any tab reaches for the mech
 * `useUnitStore`, the missing-provider error throws during render and the
 * matching `it` fails.
 *
 * Because the suite is data-driven off the registry, a new tab added to any
 * non-mech tab set is covered automatically with zero extra test code — the
 * "iterative coverage and discovery" requirement from the bug report.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/customizer-tabs/spec.md
 *        Requirement: Overview Tab Non-Mech Crash Guard
 *        Requirement: Preview Tab
 */

// PreviewTab (mech) and the per-type preview tabs transitively import jspdf,
// an ESM-only module jest cannot parse. Stub it so the registry import chain
// resolves.
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

import type { StoreApi } from 'zustand';

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { AerospaceCustomizer } from '@/components/customizer/aerospace/AerospaceCustomizer';
import { BattleArmorCustomizer } from '@/components/customizer/battlearmor/BattleArmorCustomizer';
import { InfantryCustomizer } from '@/components/customizer/infantry/InfantryCustomizer';
import { ProtoMechCustomizer } from '@/components/customizer/protomech/ProtoMechCustomizer';
import { getCustomizerDescriptor } from '@/components/customizer/shared/customizerTypeRegistry';
import { VehicleCustomizer } from '@/components/customizer/vehicle/VehicleCustomizer';
import {
  AerospaceStoreContext,
  createNewAerospaceStore,
  type AerospaceStore,
} from '@/stores/useAerospaceStore';
import {
  BattleArmorStoreContext,
  createNewBattleArmorStore,
  type BattleArmorStore,
} from '@/stores/useBattleArmorStore';
import {
  InfantryStoreContext,
  createNewInfantryStore,
  type InfantryStore,
} from '@/stores/useInfantryStore';
import {
  ProtoMechStoreContext,
  createNewProtoMechStore,
  type ProtoMechStore,
} from '@/stores/useProtoMechStore';
import {
  VehicleStoreContext,
  createNewVehicleStore,
  type VehicleStore,
} from '@/stores/useVehicleStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

// ---------------------------------------------------------------------------
// Per-type fixtures
// ---------------------------------------------------------------------------
//
// Each fixture knows how to (a) build a fresh hydrated store for that unit type
// and (b) wrap arbitrary children in that type's store context provider — the
// exact provider the per-type customizer mounts. No mech `UnitStoreProvider`
// is ever present, so any mech-coupled component throws immediately.

interface TypeFixture {
  /** Human label for test output. */
  label: string;
  /** UnitType whose registry tab set is exercised. */
  unitType: UnitType;
  /** Wrap children in this type's store context with a fresh store. */
  wrap: (children: React.ReactNode) => React.ReactElement;
}

function wrapVehicle(children: React.ReactNode): React.ReactElement {
  const store: StoreApi<VehicleStore> = createNewVehicleStore({
    name: 'Test Vehicle',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    unitType: UnitType.VEHICLE,
  });
  return (
    <VehicleStoreContext.Provider value={store}>
      {children}
    </VehicleStoreContext.Provider>
  );
}

function wrapAerospace(children: React.ReactNode): React.ReactElement {
  const store: StoreApi<AerospaceStore> = createNewAerospaceStore({
    name: 'Test Fighter',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  return (
    <AerospaceStoreContext.Provider value={store}>
      {children}
    </AerospaceStoreContext.Provider>
  );
}

function wrapBattleArmor(children: React.ReactNode): React.ReactElement {
  const store: StoreApi<BattleArmorStore> = createNewBattleArmorStore({
    name: 'Test BA',
    techBase: TechBase.INNER_SPHERE,
  });
  return (
    <BattleArmorStoreContext.Provider value={store}>
      {children}
    </BattleArmorStoreContext.Provider>
  );
}

function wrapInfantry(children: React.ReactNode): React.ReactElement {
  const store: StoreApi<InfantryStore> = createNewInfantryStore({
    name: 'Test Platoon',
    techBase: TechBase.INNER_SPHERE,
  });
  return (
    <InfantryStoreContext.Provider value={store}>
      {children}
    </InfantryStoreContext.Provider>
  );
}

function wrapProtoMech(children: React.ReactNode): React.ReactElement {
  const store: StoreApi<ProtoMechStore> = createNewProtoMechStore({
    name: 'Test ProtoMech',
    tonnage: 5,
  });
  return (
    <ProtoMechStoreContext.Provider value={store}>
      {children}
    </ProtoMechStoreContext.Provider>
  );
}

const FIXTURES: TypeFixture[] = [
  { label: 'Vehicle', unitType: UnitType.VEHICLE, wrap: wrapVehicle },
  { label: 'VTOL', unitType: UnitType.VTOL, wrap: wrapVehicle },
  { label: 'Aerospace', unitType: UnitType.AEROSPACE, wrap: wrapAerospace },
  {
    label: 'Conventional Fighter',
    unitType: UnitType.CONVENTIONAL_FIGHTER,
    wrap: wrapAerospace,
  },
  {
    label: 'Battle Armor',
    unitType: UnitType.BATTLE_ARMOR,
    wrap: wrapBattleArmor,
  },
  { label: 'Infantry', unitType: UnitType.INFANTRY, wrap: wrapInfantry },
  { label: 'ProtoMech', unitType: UnitType.PROTOMECH, wrap: wrapProtoMech },
];

// ---------------------------------------------------------------------------
// The definitive mount guard — every tab of every non-mech type
// ---------------------------------------------------------------------------

describe('non-mech customizer registry tabs — store-safe mount guard', () => {
  for (const fx of FIXTURES) {
    describe(`${fx.label} (${fx.unitType})`, () => {
      const specs = getCustomizerDescriptor(fx.unitType).tabs;

      it('registry returns a non-empty tab set', () => {
        expect(specs.length).toBeGreaterThan(0);
      });

      it.each(specs.map((s) => [s.label, s] as const))(
        'tab "%s" mounts inside its own store context without throwing',
        (_label, spec) => {
          const TabComponent = spec.component as React.ComponentType<{
            readOnly?: boolean;
          }>;
          expect(() =>
            render(fx.wrap(<TabComponent readOnly={false} />)),
          ).not.toThrow();
        },
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Targeted reproduction of the two shipped crashes
// ---------------------------------------------------------------------------
//
// These name the exact failure mode so a regression produces an obvious test
// name rather than a generic "did not throw" failure buried in the matrix.

describe('shipped-crash reproductions', () => {
  it('Aerospace Overview tab does NOT throw the UnitStoreProvider error', () => {
    const overview = getCustomizerDescriptor(UnitType.AEROSPACE).tabs.find(
      (s) => s.id === 'overview',
    );
    expect(overview).toBeDefined();
    const Overview = overview!.component as React.ComponentType;
    let caught: unknown;
    try {
      render(wrapAerospace(<Overview />));
    } catch (e) {
      caught = e;
    }
    expect(String(caught ?? '')).not.toMatch(/UnitStoreProvider/);
  });

  it('Vehicle Preview tab does NOT throw the UnitStoreProvider error', () => {
    const preview = getCustomizerDescriptor(UnitType.VEHICLE).tabs.find(
      (s) => s.id === 'preview',
    );
    expect(preview).toBeDefined();
    const Preview = preview!.component as React.ComponentType;
    let caught: unknown;
    try {
      render(wrapVehicle(<Preview />));
    } catch (e) {
      caught = e;
    }
    expect(String(caught ?? '')).not.toMatch(/UnitStoreProvider/);
  });

  it('every non-mech Overview tab renders the store-free placeholder', () => {
    for (const fx of FIXTURES) {
      const overview = getCustomizerDescriptor(fx.unitType).tabs.find(
        (s) => s.id === 'overview',
      );
      expect(overview).toBeDefined();
      const Overview = overview!.component as React.ComponentType;
      const { getByTestId, unmount } = render(fx.wrap(<Overview />));
      expect(getByTestId('non-mech-overview-placeholder')).toBeInTheDocument();
      unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// Customizer-level integration — render the real customizer, click every tab
// ---------------------------------------------------------------------------
//
// The component-level matrix above proves each tab mounts store-safe in
// isolation. This block proves the same through the real per-type customizer
// shell: it renders `<XCustomizer store={...} />` (which wires its own store
// context + the registry-driven tab bar) and clicks through every tab button,
// asserting the tab switch never throws. This catches wiring regressions in
// the customizer / `useCustomizerTabs` path that a direct component render
// would miss — i.e. it mirrors the user "click through every tab" walkthrough.

interface CustomizerFixture {
  label: string;
  render: () => ReturnType<typeof render>;
}

const CUSTOMIZER_FIXTURES: CustomizerFixture[] = [
  {
    label: 'VehicleCustomizer',
    render: () =>
      render(
        <VehicleCustomizer
          store={createNewVehicleStore({
            name: 'Test Vehicle',
            tonnage: 50,
            techBase: TechBase.INNER_SPHERE,
            unitType: UnitType.VEHICLE,
          })}
        />,
      ),
  },
  {
    label: 'AerospaceCustomizer',
    render: () =>
      render(
        <AerospaceCustomizer
          store={createNewAerospaceStore({
            name: 'Test Fighter',
            tonnage: 50,
            techBase: TechBase.INNER_SPHERE,
          })}
        />,
      ),
  },
  {
    label: 'BattleArmorCustomizer',
    render: () =>
      render(
        <BattleArmorCustomizer
          store={createNewBattleArmorStore({
            name: 'Test BA',
            techBase: TechBase.INNER_SPHERE,
          })}
        />,
      ),
  },
  {
    label: 'InfantryCustomizer',
    render: () =>
      render(
        <InfantryCustomizer
          store={createNewInfantryStore({
            name: 'Test Platoon',
            techBase: TechBase.INNER_SPHERE,
          })}
        />,
      ),
  },
  {
    label: 'ProtoMechCustomizer',
    render: () =>
      render(
        <ProtoMechCustomizer
          store={createNewProtoMechStore({
            name: 'Test ProtoMech',
            tonnage: 5,
          })}
        />,
      ),
  },
];

describe('non-mech customizers — click through every tab without crashing', () => {
  it.each(CUSTOMIZER_FIXTURES.map((f) => [f.label, f] as const))(
    '%s mounts and every tab switch is store-safe',
    (_label, fixture) => {
      let result: ReturnType<typeof render> | undefined;
      expect(() => {
        result = fixture.render();
      }).not.toThrow();

      const tabs = result!.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      for (const tab of tabs) {
        expect(() => {
          act(() => {
            fireEvent.click(tab);
          });
        }).not.toThrow();
      }
    },
  );
});
