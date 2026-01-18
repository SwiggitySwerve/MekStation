/**
 * Unit Type Router
 * 
 * Routes to the appropriate customizer based on unit type.
 * Provides the correct store context for each unit type.
 */

import React, { useMemo } from 'react';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TabInfo } from '@/stores/useTabManagerStore';
import { UnitStoreProvider, ActiveTabInfo } from '@/stores/UnitStoreProvider';

// Vehicle
import { getVehicleStore, hydrateOrCreateVehicle } from '@/stores/vehicleStoreRegistry';
import { VehicleStoreContext } from '@/stores/useVehicleStore';
import { VehicleCustomizer } from './vehicle/VehicleCustomizer';

// Aerospace
import { getAerospaceStore, hydrateOrCreateAerospace } from '@/stores/aerospaceStoreRegistry';
import { AerospaceStoreContext } from '@/stores/useAerospaceStore';
import { AerospaceCustomizer } from './aerospace/AerospaceCustomizer';

// Battle Armor
import { getBattleArmorStore, hydrateOrCreateBattleArmor } from '@/stores/battleArmorStoreRegistry';
import { BattleArmorStoreContext } from '@/stores/useBattleArmorStore';
import { BattleArmorCustomizer } from './battlearmor/BattleArmorCustomizer';

// Infantry
import { getInfantryStore, hydrateOrCreateInfantry } from '@/stores/infantryStoreRegistry';
import { InfantryStoreContext } from '@/stores/useInfantryStore';
import { InfantryCustomizer } from './infantry/InfantryCustomizer';

// ProtoMech
import { getProtoMechStore, hydrateOrCreateProtoMech } from '@/stores/protoMechStoreRegistry';
import { ProtoMechStoreContext } from '@/stores/useProtoMechStore';
import { ProtoMechCustomizer } from './protomech/ProtoMechCustomizer';

// BattleMech
import { UnitEditorWithRouting } from './UnitEditorWithRouting';
import { CustomizerTabId } from '@/hooks/useCustomizerRouter';

interface UnitTypeRouterProps {
  activeTab: TabInfo | null;
  activeTabId: CustomizerTabId;
  onTabChange: (tabId: CustomizerTabId) => void;
}

export function UnitTypeRouter({
  activeTab,
  activeTabId,
  onTabChange,
}: UnitTypeRouterProps): React.ReactElement {
  // Determine unit type categories
  const isVehicle = activeTab?.unitType === UnitType.VEHICLE || activeTab?.unitType === UnitType.VTOL;
  const isAerospace = activeTab?.unitType === UnitType.AEROSPACE || activeTab?.unitType === UnitType.CONVENTIONAL_FIGHTER;
  const isBattleArmor = activeTab?.unitType === UnitType.BATTLE_ARMOR;
  const isInfantry = activeTab?.unitType === UnitType.INFANTRY;
  const isProtoMech = activeTab?.unitType === UnitType.PROTOMECH;
  
  // Vehicle store
  const vehicleStore = useMemo(() => {
    if (!isVehicle || !activeTab) return null;
    
    const existing = getVehicleStore(activeTab.id);
    if (existing) return existing;
    
    return hydrateOrCreateVehicle(activeTab.id, {
      name: activeTab.name,
      tonnage: activeTab.tonnage,
      techBase: activeTab.techBase,
      unitType: activeTab.unitType as UnitType.VEHICLE | UnitType.VTOL,
    });
  }, [isVehicle, activeTab]);
  
  // Aerospace store
  const aerospaceStore = useMemo(() => {
    if (!isAerospace || !activeTab) return null;
    
    const existing = getAerospaceStore(activeTab.id);
    if (existing) return existing;
    
    return hydrateOrCreateAerospace(activeTab.id, {
      name: activeTab.name,
      tonnage: activeTab.tonnage,
      techBase: activeTab.techBase,
      isConventional: activeTab.unitType === UnitType.CONVENTIONAL_FIGHTER,
    });
  }, [isAerospace, activeTab]);
  
  // Battle Armor store
  const battleArmorStore = useMemo(() => {
    if (!isBattleArmor || !activeTab) return null;
    
    const existing = getBattleArmorStore(activeTab.id);
    if (existing) return existing;
    
    return hydrateOrCreateBattleArmor(activeTab.id, {
      name: activeTab.name,
      techBase: activeTab.techBase,
    });
  }, [isBattleArmor, activeTab]);
  
  // Infantry store
  const infantryStore = useMemo(() => {
    if (!isInfantry || !activeTab) return null;
    
    const existing = getInfantryStore(activeTab.id);
    if (existing) return existing;
    
    return hydrateOrCreateInfantry(activeTab.id, {
      name: activeTab.name,
      techBase: activeTab.techBase,
    });
  }, [isInfantry, activeTab]);
  
  // ProtoMech store
  const protoMechStore = useMemo(() => {
    if (!isProtoMech || !activeTab) return null;
    
    const existing = getProtoMechStore(activeTab.id);
    if (existing) return existing;
    
    return hydrateOrCreateProtoMech(activeTab.id, {
      name: activeTab.name,
      tonnage: activeTab.tonnage,
    });
  }, [isProtoMech, activeTab]);
  
  // No active tab
  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-text-theme-secondary p-8">
          <p className="text-lg mb-2">No unit selected</p>
          <p className="text-sm">Click &quot;New Unit&quot; to create a new unit</p>
        </div>
      </div>
    );
  }
  
  // Vehicle customizer
  if (isVehicle && vehicleStore) {
    return (
      <VehicleStoreContext.Provider value={vehicleStore}>
        <VehicleCustomizer
          store={vehicleStore}
          className="flex-1"
        />
      </VehicleStoreContext.Provider>
    );
  }
  
  // Aerospace customizer
  if (isAerospace && aerospaceStore) {
    return (
      <AerospaceStoreContext.Provider value={aerospaceStore}>
        <AerospaceCustomizer
          store={aerospaceStore}
          className="flex-1"
        />
      </AerospaceStoreContext.Provider>
    );
  }
  
  // Battle Armor customizer
  if (isBattleArmor && battleArmorStore) {
    return (
      <BattleArmorStoreContext.Provider value={battleArmorStore}>
        <BattleArmorCustomizer
          store={battleArmorStore}
          className="flex-1"
        />
      </BattleArmorStoreContext.Provider>
    );
  }
  
  // Infantry customizer
  if (isInfantry && infantryStore) {
    return (
      <InfantryStoreContext.Provider value={infantryStore}>
        <InfantryCustomizer
          store={infantryStore}
          className="flex-1"
        />
      </InfantryStoreContext.Provider>
    );
  }
  
  // ProtoMech customizer
  if (isProtoMech && protoMechStore) {
    return (
      <ProtoMechStoreContext.Provider value={protoMechStore}>
        <ProtoMechCustomizer
          store={protoMechStore}
          className="flex-1"
        />
      </ProtoMechStoreContext.Provider>
    );
  }
  
  // Default: BattleMech editor
  const mechActiveTab: ActiveTabInfo = {
    id: activeTab.id,
    name: activeTab.name,
    tonnage: activeTab.tonnage,
    techBase: activeTab.techBase,
  };
  
  return (
    <UnitStoreProvider
      activeTab={mechActiveTab}
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-text-theme-secondary p-8">
            <p className="text-lg mb-2">Loading unit...</p>
          </div>
        </div>
      }
    >
      <UnitEditorWithRouting
        activeTabId={activeTabId}
        onTabChange={onTabChange}
      />
    </UnitStoreProvider>
  );
}

export default UnitTypeRouter;
