import React, { useCallback } from 'react';

import { ErrorBoundary } from '@/components/common';
import { ResponsiveLoadoutTray } from '@/components/customizer/equipment/ResponsiveLoadoutTray';
import { UnitInfoBanner } from '@/components/customizer/shared/UnitInfoBanner';
import {
  CustomizerTabs,
  DEFAULT_CUSTOMIZER_TABS,
} from '@/components/customizer/tabs/CustomizerTabs';
import { CustomizerTabId, VALID_TAB_IDS } from '@/hooks/useCustomizerRouter';
import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { STORAGE_KEYS, usePersistedState } from '@/hooks/usePersistedState';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { useValidationNavigation } from '@/hooks/useValidationNavigation';
import { useValidationToast } from '@/hooks/useValidationToast';
import { useUnitStore } from '@/stores/useUnitStore';

import { useUnitEditorLoadout } from './UnitEditorWithRoutingLoadout';
import { useUnitEditorRoutingStats } from './UnitEditorWithRoutingStats';
import { UnitEditorWithRoutingTabContent } from './UnitEditorWithRoutingTabContent';

interface UnitEditorWithRoutingProps {
  activeTabId: CustomizerTabId;
  onTabChange: (tabId: CustomizerTabId) => void;
}

export function UnitEditorWithRouting({
  activeTabId,
  onTabChange,
}: UnitEditorWithRoutingProps): React.ReactElement {
  const [isTrayExpanded, setIsTrayExpanded] = usePersistedState(
    STORAGE_KEYS.LOADOUT_TRAY_EXPANDED,
    true,
  );

  const { isReady: registryReady } = useEquipmentRegistry();

  const unitName = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const techBase = useUnitStore((s) => s.techBase);
  const techBaseMode = useUnitStore((s) => s.techBaseMode);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const armorType = useUnitStore((s) => s.armorType);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const equipment = useUnitStore((s) => s.equipment);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const jumpJetType = useUnitStore((s) => s.jumpJetType);
  const isOmni = useUnitStore((s) => s.isOmni);
  const removeEquipment = useUnitStore((s) => s.removeEquipment);
  const clearAllEquipment = useUnitStore((s) => s.clearAllEquipment);
  const clearEquipmentLocation = useUnitStore((s) => s.clearEquipmentLocation);
  const updateEquipmentLocation = useUnitStore(
    (s) => s.updateEquipmentLocation,
  );

  const validation = useUnitValidation();
  const validationNav = useValidationNavigation(validation);
  useValidationToast(validation, { onNavigate: onTabChange });

  const {
    selectedEquipmentId,
    loadoutEquipment,
    availableLocations,
    handleSelectEquipment,
    handleRemoveEquipment,
    handleRemoveAllEquipment,
    handleUnassignEquipment,
    handleQuickAssign,
    getAvailableLocationsForEquipment,
  } = useUnitEditorLoadout({
    equipment,
    engineType,
    gyroType,
    removeEquipment,
    clearAllEquipment,
    clearEquipmentLocation,
    updateEquipmentLocation,
  });

  const { unitStats, mobileLoadoutStats } = useUnitEditorRoutingStats({
    unitName,
    chassis,
    model,
    tonnage,
    configuration,
    techBase,
    techBaseMode,
    componentTechBases,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorType,
    armorTonnage,
    armorAllocation,
    equipment,
    jumpMP,
    jumpJetType,
    validation,
  });

  const handleToggleTray = useCallback(() => {
    setIsTrayExpanded((prev) => !prev);
  }, [setIsTrayExpanded]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (VALID_TAB_IDS.includes(tabId as CustomizerTabId)) {
        onTabChange(tabId as CustomizerTabId);
      }
    },
    [onTabChange],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="bg-surface-deep border-border-theme flex-shrink-0 border-b p-2">
        <UnitInfoBanner
          stats={unitStats}
          validation={validation}
          onValidationNavigate={handleTabChange}
        />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-shrink-0">
            <CustomizerTabs
              tabs={DEFAULT_CUSTOMIZER_TABS}
              activeTab={activeTabId}
              onTabChange={handleTabChange}
              validationCounts={validationNav.errorsByTab}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <UnitEditorWithRoutingTabContent
              activeTabId={activeTabId}
              selectedEquipmentId={selectedEquipmentId}
              onSelectEquipment={handleSelectEquipment}
            />
          </div>
        </div>

        {activeTabId !== 'preview' && activeTabId !== 'criticals' && (
          <ErrorBoundary componentName="ResponsiveLoadoutTray">
            <ResponsiveLoadoutTray
              equipment={loadoutEquipment}
              equipmentCount={equipment.length}
              onRemoveEquipment={handleRemoveEquipment}
              onRemoveAllEquipment={handleRemoveAllEquipment}
              isExpanded={isTrayExpanded}
              onToggleExpand={handleToggleTray}
              selectedEquipmentId={selectedEquipmentId}
              onSelectEquipment={handleSelectEquipment}
              onUnassignEquipment={handleUnassignEquipment}
              onQuickAssign={handleQuickAssign}
              availableLocations={availableLocations}
              getAvailableLocationsForEquipment={
                getAvailableLocationsForEquipment
              }
              isOmni={isOmni}
              mobileStats={mobileLoadoutStats}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
