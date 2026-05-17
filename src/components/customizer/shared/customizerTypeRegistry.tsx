/**
 * Customizer Type Descriptor Registry — SINGLE SOURCE OF TRUTH for everything
 * the customizer dispatches by `UnitType`.
 *
 * Before this module, six independent surfaces each carried their own
 * `switch (unitType)` / per-type `if` ladder — `UnitTypeRouter` and the four
 * `*ForType` dispatchers (`OverviewTabForType`, `PreviewTabForType`,
 * `ArmorDiagramForType`, `RecordSheetPreviewForType`). Nothing tied them
 * together, so a unit type could be wired in one ladder and missing/stale in
 * another — the exact bug class that crashed non-mech customizers with
 * `useUnitStore must be used within a UnitStoreProvider`.
 *
 * Now every unit type maps to one `CustomizerTypeDescriptor`. The router and the
 * dispatchers are thin lookups into this registry; adding a unit type is one
 * descriptor registration and a missing field is a TypeScript compile error.
 *
 * The registry is built lazily on first access. `tabRegistry.tsx` imports the
 * `*ForType` dispatchers and those import this module back — a require cycle.
 * Building the descriptor array at module-evaluation time would capture
 * half-initialised component bindings; a lazy memoised build runs only after
 * every module in the cycle has fully evaluated.
 *
 * @spec openspec/changes/refactor-customizer-type-descriptors/specs/customizer-routing/spec.md
 *        Requirement: Unit-Type Customizer Resolution
 */

import type { StoreApi } from 'zustand';

import React, { useMemo } from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';
import type { ActiveTabInfo } from '@/stores/UnitStoreProvider';
import type { AerospaceStore } from '@/stores/useAerospaceStore';
import type { BattleArmorStore } from '@/stores/useBattleArmorStore';
import type { InfantryStore } from '@/stores/useInfantryStore';
import type { ProtoMechStore } from '@/stores/useProtoMechStore';
import type { TabInfo } from '@/stores/useTabManagerStore';
import type { VehicleStore } from '@/stores/useVehicleStore';
import type { PaperSize } from '@/types/printing';

import { ErrorBoundary } from '@/components/common';
import {
  getAerospaceStore,
  hydrateOrCreateAerospace,
} from '@/stores/aerospaceStoreRegistry';
import {
  getBattleArmorStore,
  hydrateOrCreateBattleArmor,
} from '@/stores/battleArmorStoreRegistry';
import {
  getInfantryStore,
  hydrateOrCreateInfantry,
} from '@/stores/infantryStoreRegistry';
import {
  getProtoMechStore,
  hydrateOrCreateProtoMech,
} from '@/stores/protoMechStoreRegistry';
import { UnitStoreProvider } from '@/stores/UnitStoreProvider';
import { AerospaceStoreContext } from '@/stores/useAerospaceStore';
import { BattleArmorStoreContext } from '@/stores/useBattleArmorStore';
import { InfantryStoreContext } from '@/stores/useInfantryStore';
import { ProtoMechStoreContext } from '@/stores/useProtoMechStore';
import { VehicleStoreContext } from '@/stores/useVehicleStore';
import {
  getVehicleStore,
  hydrateOrCreateVehicle,
} from '@/stores/vehicleStoreRegistry';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { TabSpec } from './TabSpec';

import { AerospaceArmorDiagram } from '../aerospace/AerospaceArmorDiagram';
import { AerospaceCustomizer } from '../aerospace/AerospaceCustomizer';
import { AerospacePreviewTab } from '../aerospace/AerospacePreviewTab';
import { AerospaceRecordSheetPreview } from '../aerospace/AerospaceRecordSheetPreview';
import { BattleArmorCustomizer } from '../battlearmor/BattleArmorCustomizer';
import { BattleArmorPipGrid } from '../battlearmor/BattleArmorPipGrid';
import { BattleArmorPreviewTab } from '../battlearmor/BattleArmorPreviewTab';
import { BattleArmorRecordSheetPreview } from '../battlearmor/BattleArmorRecordSheetPreview';
import { InfantryCustomizer } from '../infantry/InfantryCustomizer';
import { InfantryPlatoonCounter } from '../infantry/InfantryPlatoonCounter';
import { InfantryPreviewTab } from '../infantry/InfantryPreviewTab';
import { InfantryRecordSheetPreview } from '../infantry/InfantryRecordSheetPreview';
import { RecordSheetPreview } from '../preview/RecordSheetPreview';
import { ProtoMechArmorDiagram } from '../protomech/ProtoMechArmorDiagram';
import { ProtoMechCustomizer } from '../protomech/ProtoMechCustomizer';
import { ProtoMechPreviewTab } from '../protomech/ProtoMechPreviewTab';
import { ProtoMechRecordSheetPreview } from '../protomech/ProtoMechRecordSheetPreview';
import { NonMechOverviewPlaceholder } from '../tabs/NonMechOverviewPlaceholder';
import { OverviewTab } from '../tabs/OverviewTab';
import { PreviewTab } from '../tabs/PreviewTab';
import { UnitEditorWithRouting } from '../UnitEditorWithRouting';
import { VehicleArmorDiagram } from '../vehicle/VehicleArmorDiagram';
import { VehicleCustomizer } from '../vehicle/VehicleCustomizer';
import { VehiclePreviewTab } from '../vehicle/VehiclePreviewTab';
import { VehicleRecordSheetPreview } from '../vehicle/VehicleRecordSheetPreview';
import { getTabSpecsForUnitType } from './tabRegistry';

// =============================================================================
// Public prop shapes — the supersets the four dispatchers pass through
// =============================================================================

/** Props the active customizer shell receives from `UnitTypeRouter`. */
export interface CustomizerShellProps {
  /** The active customizer tab (unit identity + type). */
  activeTab: TabInfo;
  /** The active sub-tab id (mech editor only; non-mech shells self-manage). */
  activeTabId: CustomizerTabId;
  /** Sub-tab change callback (mech editor only). */
  onTabChange: (tabId: CustomizerTabId) => void;
}

/** Props the Overview-tab dispatcher forwards to a descriptor's Overview. */
export interface DispatchedOverviewProps {
  unitType: UnitType;
  readOnly?: boolean;
  className?: string;
}

/** Props the Preview-tab dispatcher forwards to a descriptor's Preview. */
export interface DispatchedPreviewProps {
  _readOnly?: boolean;
  className?: string;
}

/** Props the armor-diagram dispatcher forwards to a descriptor's diagram. */
export interface DispatchedArmorDiagramProps {
  className?: string;
}

/** Props the record-sheet-preview dispatcher forwards to a descriptor canvas. */
export interface DispatchedRecordSheetPreviewProps {
  paperSize?: PaperSize;
  scale?: number;
  className?: string;
}

// =============================================================================
// Descriptor interface
// =============================================================================

/**
 * Everything the customizer needs to render one unit-type family. One
 * descriptor per family; `getCustomizerDescriptor` resolves a `UnitType` to it.
 */
export interface CustomizerTypeDescriptor {
  /** Every `UnitType` value this descriptor serves. */
  readonly unitTypes: readonly UnitType[];
  /** Human label — used for ErrorBoundary names and debugging. */
  readonly label: string;
  /** Registry tab set for this unit-type family. */
  readonly tabs: TabSpec<unknown>[];
  /** Full customizer shell: hydrates the store, mounts provider + customizer. */
  readonly Shell: React.ComponentType<CustomizerShellProps>;
  /** Component rendered by `OverviewTabForType`. */
  readonly OverviewComponent: React.ComponentType<DispatchedOverviewProps>;
  /** Component rendered by `PreviewTabForType`. */
  readonly PreviewComponent: React.ComponentType<DispatchedPreviewProps>;
  /** Component rendered by `ArmorDiagramForType`. */
  readonly ArmorDiagramComponent: React.ComponentType<DispatchedArmorDiagramProps>;
  /** Component rendered by `RecordSheetPreviewForType`. */
  readonly RecordSheetPreviewComponent: React.ComponentType<DispatchedRecordSheetPreviewProps>;
}

// =============================================================================
// Shell builders
// =============================================================================

/**
 * Build the customizer shell shared by every non-mech unit type: hydrate the
 * per-type store, then mount it in its store context with the customizer. This
 * is the consolidation of the five byte-identical blocks that lived in
 * `UnitTypeRouter`.
 */
function createNonMechShell<S>(config: {
  label: string;
  getStore: (id: string) => StoreApi<S> | undefined;
  hydrateOrCreate: (id: string, tab: TabInfo) => StoreApi<S>;
  StoreContext: React.Context<StoreApi<S> | null>;
  Customizer: React.ComponentType<{ store: StoreApi<S>; className?: string }>;
}): React.FC<CustomizerShellProps> {
  const { label, getStore, hydrateOrCreate, StoreContext, Customizer } = config;

  function NonMechShell({
    activeTab,
  }: CustomizerShellProps): React.ReactElement {
    // Reuse a registered store for this unit id, else hydrate/create one.
    const store = useMemo(
      () => getStore(activeTab.id) ?? hydrateOrCreate(activeTab.id, activeTab),
      [activeTab],
    );
    return (
      <ErrorBoundary componentName={label}>
        <StoreContext.Provider value={store}>
          <Customizer store={store} className="flex-1" />
        </StoreContext.Provider>
      </ErrorBoundary>
    );
  }
  NonMechShell.displayName = `${label}Shell`;
  return NonMechShell;
}

/**
 * The BattleMech shell. Unlike the non-mech shells it uses the async-hydrating
 * `UnitStoreProvider` (with a loading fallback) and `UnitEditorWithRouting`
 * rather than a `store`-prop customizer — so it is a bespoke component, not a
 * `createNonMechShell` instance.
 */
function MechShell({
  activeTab,
  activeTabId,
  onTabChange,
}: CustomizerShellProps): React.ReactElement {
  const mechActiveTab: ActiveTabInfo = {
    id: activeTab.id,
    name: activeTab.name,
    tonnage: activeTab.tonnage,
    techBase: activeTab.techBase,
  };
  return (
    <ErrorBoundary componentName="BattleMechEditor">
      <UnitStoreProvider
        activeTab={mechActiveTab}
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <div className="text-text-theme-secondary p-8 text-center">
              <p className="mb-2 text-lg">Loading unit...</p>
            </div>
          </div>
        }
      >
        <UnitEditorWithRouting
          activeTabId={activeTabId}
          onTabChange={onTabChange}
        />
      </UnitStoreProvider>
    </ErrorBoundary>
  );
}
MechShell.displayName = 'MechShell';

/**
 * Placeholder armor diagram for mech types. The mech `ArmorDiagram` needs props
 * (armorData, callbacks) the dispatcher cannot supply, so mech Armor tabs use
 * `<ArmorDiagram>` directly — this preserves the pre-refactor `default` branch
 * of `ArmorDiagramForType`.
 */
function MechArmorDiagramPlaceholder({
  className = '',
}: DispatchedArmorDiagramProps): React.ReactElement {
  return (
    <div
      className={`text-text-theme-secondary p-4 text-center text-sm ${className}`}
    >
      Use <code className="font-mono text-xs">&lt;ArmorDiagram&gt;</code> for
      mech-type units.
    </div>
  );
}
MechArmorDiagramPlaceholder.displayName = 'MechArmorDiagramPlaceholder';

// =============================================================================
// Lazy descriptor registry
// =============================================================================

let DESCRIPTORS: CustomizerTypeDescriptor[] | null = null;
let MECH_DESCRIPTOR: CustomizerTypeDescriptor | null = null;

/** Build the descriptor array once, after the require cycle has settled. */
function buildDescriptors(): CustomizerTypeDescriptor[] {
  const mech: CustomizerTypeDescriptor = {
    unitTypes: [
      UnitType.BATTLEMECH,
      UnitType.OMNIMECH,
      UnitType.INDUSTRIALMECH,
    ],
    label: 'BattleMech',
    tabs: getTabSpecsForUnitType(UnitType.BATTLEMECH),
    Shell: MechShell,
    OverviewComponent: OverviewTab,
    PreviewComponent: PreviewTab,
    ArmorDiagramComponent: MechArmorDiagramPlaceholder,
    RecordSheetPreviewComponent: RecordSheetPreview,
  };
  MECH_DESCRIPTOR = mech;

  const vehicle: CustomizerTypeDescriptor = {
    unitTypes: [UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE],
    label: 'Vehicle',
    tabs: getTabSpecsForUnitType(UnitType.VEHICLE),
    Shell: createNonMechShell<VehicleStore>({
      label: 'VehicleCustomizer',
      getStore: getVehicleStore,
      hydrateOrCreate: (id, tab) =>
        hydrateOrCreateVehicle(id, {
          name: tab.name,
          tonnage: tab.tonnage,
          techBase: tab.techBase,
          unitType: tab.unitType as
            | UnitType.VEHICLE
            | UnitType.VTOL
            | UnitType.SUPPORT_VEHICLE,
        }),
      StoreContext: VehicleStoreContext,
      Customizer: VehicleCustomizer,
    }),
    OverviewComponent: NonMechOverviewPlaceholder,
    PreviewComponent: VehiclePreviewTab,
    ArmorDiagramComponent: VehicleArmorDiagram,
    RecordSheetPreviewComponent: VehicleRecordSheetPreview,
  };

  const aerospace: CustomizerTypeDescriptor = {
    unitTypes: [UnitType.AEROSPACE, UnitType.CONVENTIONAL_FIGHTER],
    label: 'Aerospace',
    tabs: getTabSpecsForUnitType(UnitType.AEROSPACE),
    Shell: createNonMechShell<AerospaceStore>({
      label: 'AerospaceCustomizer',
      getStore: getAerospaceStore,
      hydrateOrCreate: (id, tab) =>
        hydrateOrCreateAerospace(id, {
          name: tab.name,
          tonnage: tab.tonnage,
          techBase: tab.techBase,
          isConventional: tab.unitType === UnitType.CONVENTIONAL_FIGHTER,
        }),
      StoreContext: AerospaceStoreContext,
      Customizer: AerospaceCustomizer,
    }),
    OverviewComponent: NonMechOverviewPlaceholder,
    PreviewComponent: AerospacePreviewTab,
    ArmorDiagramComponent: AerospaceArmorDiagram,
    RecordSheetPreviewComponent: AerospaceRecordSheetPreview,
  };

  const battleArmor: CustomizerTypeDescriptor = {
    unitTypes: [UnitType.BATTLE_ARMOR],
    label: 'BattleArmor',
    tabs: getTabSpecsForUnitType(UnitType.BATTLE_ARMOR),
    Shell: createNonMechShell<BattleArmorStore>({
      label: 'BattleArmorCustomizer',
      getStore: getBattleArmorStore,
      hydrateOrCreate: (id, tab) =>
        hydrateOrCreateBattleArmor(id, {
          name: tab.name,
          techBase: tab.techBase,
        }),
      StoreContext: BattleArmorStoreContext,
      Customizer: BattleArmorCustomizer,
    }),
    OverviewComponent: NonMechOverviewPlaceholder,
    PreviewComponent: BattleArmorPreviewTab,
    ArmorDiagramComponent: BattleArmorPipGrid,
    RecordSheetPreviewComponent: BattleArmorRecordSheetPreview,
  };

  const infantry: CustomizerTypeDescriptor = {
    unitTypes: [UnitType.INFANTRY],
    label: 'Infantry',
    tabs: getTabSpecsForUnitType(UnitType.INFANTRY),
    Shell: createNonMechShell<InfantryStore>({
      label: 'InfantryCustomizer',
      getStore: getInfantryStore,
      hydrateOrCreate: (id, tab) =>
        hydrateOrCreateInfantry(id, {
          name: tab.name,
          techBase: tab.techBase,
        }),
      StoreContext: InfantryStoreContext,
      Customizer: InfantryCustomizer,
    }),
    OverviewComponent: NonMechOverviewPlaceholder,
    PreviewComponent: InfantryPreviewTab,
    ArmorDiagramComponent: InfantryPlatoonCounter,
    RecordSheetPreviewComponent: InfantryRecordSheetPreview,
  };

  const protoMech: CustomizerTypeDescriptor = {
    unitTypes: [UnitType.PROTOMECH],
    label: 'ProtoMech',
    tabs: getTabSpecsForUnitType(UnitType.PROTOMECH),
    Shell: createNonMechShell<ProtoMechStore>({
      label: 'ProtoMechCustomizer',
      getStore: getProtoMechStore,
      hydrateOrCreate: (id, tab) =>
        hydrateOrCreateProtoMech(id, {
          name: tab.name,
          tonnage: tab.tonnage,
        }),
      StoreContext: ProtoMechStoreContext,
      Customizer: ProtoMechCustomizer,
    }),
    OverviewComponent: NonMechOverviewPlaceholder,
    PreviewComponent: ProtoMechPreviewTab,
    ArmorDiagramComponent: ProtoMechArmorDiagram,
    RecordSheetPreviewComponent: ProtoMechRecordSheetPreview,
  };

  return [mech, vehicle, aerospace, battleArmor, infantry, protoMech];
}

/** Return the descriptor list, building it once on first access. */
export function getCustomizerDescriptors(): CustomizerTypeDescriptor[] {
  if (!DESCRIPTORS) {
    DESCRIPTORS = buildDescriptors();
  }
  return DESCRIPTORS;
}

/**
 * Resolve a `UnitType` to its descriptor. Any type not explicitly mapped (e.g.
 * capital ships) falls back to the BattleMech descriptor — identical to the
 * pre-refactor `default:` branch every dispatcher carried.
 */
export function getCustomizerDescriptor(
  unitType: UnitType,
): CustomizerTypeDescriptor {
  const descriptors = getCustomizerDescriptors();
  const match = descriptors.find((d) => d.unitTypes.includes(unitType));
  // MECH_DESCRIPTOR is assigned inside buildDescriptors(), which get
  // CustomizerDescriptors() guarantees has run.
  return match ?? MECH_DESCRIPTOR!;
}
