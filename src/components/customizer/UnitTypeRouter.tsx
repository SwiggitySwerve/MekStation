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
import { getVehicleStore, hydrateOrCreateVehicle } from '@/stores/vehicleStoreRegistry';
import { VehicleStoreContext } from '@/stores/useVehicleStore';

import { UnitEditorWithRouting } from './UnitEditorWithRouting';
import { VehicleCustomizer } from './vehicle/VehicleCustomizer';
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
  const isVehicle = activeTab?.unitType === UnitType.VEHICLE || activeTab?.unitType === UnitType.VTOL;
  
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
