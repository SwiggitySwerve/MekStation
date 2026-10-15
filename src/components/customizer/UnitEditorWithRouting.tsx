import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IUnitValidationError } from '@/types/validation/UnitValidationInterfaces';

import { ErrorBoundary } from '@/components/common';
import { CampaignRefitCommandBar } from '@/components/customizer/campaign/CampaignRefitCommandBar';
import { ResponsiveLoadoutTray } from '@/components/customizer/equipment/ResponsiveLoadoutTray';
import { UnitInfoBanner } from '@/components/customizer/shared/UnitInfoBanner';
import { ValidationSummary } from '@/components/customizer/shared/ValidationSummary';
import {
  CustomizerTabs,
  DEFAULT_CUSTOMIZER_TABS,
} from '@/components/customizer/tabs/CustomizerTabs';
import { CustomizerTabId, VALID_TAB_IDS } from '@/hooks/useCustomizerRouter';
import { STORAGE_KEYS, usePersistedState } from '@/hooks/usePersistedState';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { useValidationNavigation } from '@/hooks/useValidationNavigation';
import { useValidationToast } from '@/hooks/useValidationToast';
import { useUnitStore } from '@/stores/useUnitStore';
import { getTabForCategory } from '@/utils/validation/validationNavigation';

import { CustomizerToolbarContext } from './CustomizerToolbarContext';
import workbenchStyles from './CustomizerWorkbench.module.css';
import { CustomizerWorkspaceControls } from './CustomizerWorkspaceControls';
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

  const [isWideWorkspace, setIsWideWorkspace] = usePersistedState(
    'mekstation:customizer-wide-workspace',
    false,
  );

  const unitId = useUnitStore((s) => s.id);
  const unitName = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const armActuators = useUnitStore((s) => s.armActuators);
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
    armActuators,
    unitId,
    configuration,
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

  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  const [loadoutRequest, setLoadoutRequest] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [validationTarget, setValidationTarget] = useState<{
    unitId: string;
    tabId: CustomizerTabId;
    instanceId?: string;
  } | null>(null);
  const requestLoadout = useCallback(() => {
    if (window.innerWidth < 768) setLoadoutRequest((value) => value + 1);
    else if (isWideWorkspace) setDrawerOpen(true);
    else setIsTrayExpanded(true);
  }, [isWideWorkspace, setIsTrayExpanded]);
  const toolbarLayout = useMemo(
    () => ({ target: toolbarTarget, requestLoadout }),
    [toolbarTarget, requestLoadout],
  );
  const handleValidationIssue = useCallback(
    (issue: IUnitValidationError) => {
      const tabId = getTabForCategory(issue.category);
      const candidate = issue.field?.startsWith('criticalSlots.')
        ? issue.field.slice('criticalSlots.'.length)
        : undefined;
      const instanceId =
        candidate && equipment.some((item) => item.instanceId === candidate)
          ? candidate
          : undefined;
      if (instanceId) {
        handleSelectEquipment(instanceId);
        requestLoadout();
      }
      handleTabChange(tabId);
      setValidationTarget({ unitId, tabId, instanceId });
    },
    [equipment, handleSelectEquipment, handleTabChange, requestLoadout, unitId],
  );

  useEffect(() => {
    if (
      !validationTarget ||
      validationTarget.unitId !== unitId ||
      validationTarget.tabId !== activeTabId
    )
      return;
    let observer: MutationObserver | undefined;
    const focus = (): boolean => {
      const candidates = validationTarget.instanceId
        ? Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-equipment-placement],[data-equipment-select]',
            ),
          ).filter(
            (element) =>
              element.dataset.equipmentPlacement ===
                validationTarget.instanceId ||
              element.dataset.equipmentSelect === validationTarget.instanceId,
          )
        : [document.getElementById(`tabpanel-${activeTabId}`)];
      const target = candidates.find(
        (element) => element && element.getClientRects().length > 0,
      );
      if (!target) return false;
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      target.focus({ preventScroll: true });
      setValidationTarget(null);
      return true;
    };
    if (!focus()) {
      observer = new MutationObserver(() => {
        if (focus()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => observer?.disconnect();
  }, [activeTabId, unitId, validationTarget, selectedEquipmentId]);

  return (
    <CustomizerToolbarContext.Provider value={toolbarLayout}>
      <div
        className={`${workbenchStyles.workbench} flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}
        data-testid="customizer-workbench"
      >
        <CampaignRefitCommandBar onTabChange={handleTabChange} />
        <div className="bg-surface-base border-border-theme shrink-0 border-b">
          <UnitInfoBanner stats={unitStats} compact />
        </div>
        <div
          className="bg-surface-base border-border-theme flex h-12 shrink-0 items-center gap-1 border-b px-1"
          data-testid="customizer-section-bar"
        >
          <CustomizerTabs
            tabs={DEFAULT_CUSTOMIZER_TABS}
            activeTab={activeTabId}
            onTabChange={handleTabChange}
            validationCounts={validationNav.errorsByTab}
            compact
            className="min-w-0 flex-1 !border-b-0"
          />
          <div ref={setToolbarTarget} className="flex shrink-0 items-center" />
          <ValidationSummary
            key={unitId}
            validation={validation}
            unitName={unitName}
            onIssueNavigate={handleValidationIssue}
          />
          <CustomizerWorkspaceControls
            wide={isWideWorkspace}
            onOpenLoadout={requestLoadout}
            onToggle={() => {
              setIsWideWorkspace((value) => !value);
              setDrawerOpen(false);
            }}
          />
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden pb-11 md:pb-0">
          <div
            className="min-h-0 min-w-0 flex-1 overflow-auto"
            data-testid="customizer-workspace"
          >
            <UnitEditorWithRoutingTabContent
              activeTabId={activeTabId}
              selectedEquipmentId={selectedEquipmentId}
              onSelectEquipment={handleSelectEquipment}
              workbench
            />
          </div>
          <ErrorBoundary componentName="ResponsiveLoadoutTray">
            <ResponsiveLoadoutTray
              hideDesktopSidebar={isWideWorkspace}
              drawerOpen={drawerOpen}
              onCloseDrawer={() => setDrawerOpen(false)}
              openRequest={loadoutRequest}
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
        </div>
      </div>
    </CustomizerToolbarContext.Provider>
  );
}
