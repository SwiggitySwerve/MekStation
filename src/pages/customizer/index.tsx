/**
 * Unit Customizer Page
 * 
 * Full-featured BattleMech construction and modification interface.
 * Uses multi-unit tabs, customizer tabs, and all UI components.
 * 
 * @spec openspec/changes/add-customizer-ui-components
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Stores and hooks
import { useUnit } from '@/hooks/useUnit';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { createDefaultComponentSelections } from '@/stores/useMultiUnitStore';

// Tab components
import {
  MultiUnitTabs,
  CustomizerTabs,
  DEFAULT_CUSTOMIZER_TABS,
  useCustomizerTabs,
  OverviewTab,
  StructureTab,
  FluffTab,
} from '@/components/customizer/tabs';

// Other customizer components
import { ArmorDiagram, LocationArmorData } from '@/components/customizer/armor';
import { EquipmentBrowser } from '@/components/customizer/equipment/EquipmentBrowser';
import { EquipmentTray, TrayEquipmentItem, WeightStats } from '@/components/customizer/equipment/EquipmentTray';
import { CriticalSlotsDisplay, LocationData } from '@/components/customizer/critical-slots/CriticalSlotsDisplay';
import { ColorLegend } from '@/components/customizer/shared/ColorLegend';
import { UnitInfoBanner } from '@/components/customizer/shared/UnitInfoBanner';
import { ResetConfirmationDialog } from '@/components/customizer/dialogs/ResetConfirmationDialog';

// Utils
import { ValidationStatus } from '@/utils/colors/statusColors';

// Types
import { MechLocation } from '@/types/construction';
import { IEquipmentItem, EquipmentCategory } from '@/types/equipment';

/**
 * Main customizer page component
 */
export default function CustomizerPage() {
  const { tab, isLoading } = useUnit();
  const { tabs, activeTab, setActiveTab } = useCustomizerTabs('overview');
  const {
    autoModeSettings,
    toggleAutoFillUnhittables,
    toggleShowPlacementPreview,
    colorLegendExpanded,
    toggleColorLegend,
  } = useCustomizerStore();

  // Local state for dialogs
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  // Mock state for armor (would come from unit data)
  const [selectedArmorLocation, setSelectedArmorLocation] = useState<MechLocation | null>(null);
  
  // Mock state for equipment (would come from unit data)
  const [unitEquipment, setUnitEquipment] = useState<TrayEquipmentItem[]>([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | undefined>();

  // Generate mock armor data based on unit
  const armorData: LocationArmorData[] = useMemo(() => {
    const tonnage = tab?.tonnage || 50;
    const maxArmor = Math.floor(tonnage * 2 * 3.5);
    
    return [
      { location: MechLocation.HEAD, current: 0, maximum: 9 },
      { location: MechLocation.CENTER_TORSO, current: 0, maximum: Math.floor(maxArmor * 0.2), rear: 0, rearMaximum: Math.floor(maxArmor * 0.1) },
      { location: MechLocation.LEFT_TORSO, current: 0, maximum: Math.floor(maxArmor * 0.15), rear: 0, rearMaximum: Math.floor(maxArmor * 0.07) },
      { location: MechLocation.RIGHT_TORSO, current: 0, maximum: Math.floor(maxArmor * 0.15), rear: 0, rearMaximum: Math.floor(maxArmor * 0.07) },
      { location: MechLocation.LEFT_ARM, current: 0, maximum: Math.floor(maxArmor * 0.1) },
      { location: MechLocation.RIGHT_ARM, current: 0, maximum: Math.floor(maxArmor * 0.1) },
      { location: MechLocation.LEFT_LEG, current: 0, maximum: Math.floor(maxArmor * 0.12) },
      { location: MechLocation.RIGHT_LEG, current: 0, maximum: Math.floor(maxArmor * 0.12) },
    ];
  }, [tab?.tonnage]);

  // Generate mock critical slot data
  const criticalSlotsData: LocationData[] = useMemo(() => {
    return Object.values(MechLocation).map(location => ({
      location: location as MechLocation,
      slots: [], // Would be populated with actual slot data
    }));
  }, []);

  // Weight stats
  const weightStats: WeightStats = useMemo(() => ({
    maxWeight: tab?.tonnage || 50,
    usedWeight: unitEquipment.reduce((sum, eq) => sum + eq.weight, 0),
    remainingWeight: (tab?.tonnage || 50) - unitEquipment.reduce((sum, eq) => sum + eq.weight, 0),
  }), [tab?.tonnage, unitEquipment]);

  // Get component selections from the tab (or use defaults)
  const componentSelections = useMemo(() => {
    if (!tab) return createDefaultComponentSelections(50, 4);
    return tab.componentSelections ?? createDefaultComponentSelections(tab.tonnage, 4, tab.techBase);
  }, [tab]);
  
  // Calculate unit stats using the hook
  const calculations = useUnitCalculations(tab?.tonnage ?? 50, componentSelections);
  
  // Unit stats for the persistent banner
  const unitStats = useMemo(() => {
    if (!tab) return null;
    const tonnage = tab.tonnage;
    const maxArmorPoints = Math.floor(tonnage * 2 * 3.5);
    
    // Equipment weight from added equipment
    const equipmentWeight = unitEquipment.reduce((sum, eq) => sum + eq.weight, 0);
    
    // Total used weight = structural + equipment
    const totalUsedWeight = calculations.totalStructuralWeight + equipmentWeight;
    
    // Critical slots from equipment
    const equipmentSlots = unitEquipment.reduce((sum, eq) => sum + eq.criticalSlots, 0);
    const totalSlots = 78; // Standard BattleMech has 78 critical slots
    const usedSlots = calculations.totalSystemSlots + equipmentSlots;
    
    return {
      name: tab.name,
      tonnage: tab.tonnage,
      techBase: tab.techBase,
      walkMP: calculations.walkMP,
      runMP: calculations.runMP,
      jumpMP: 0,
      weightUsed: totalUsedWeight,
      weightRemaining: tonnage - totalUsedWeight,
      armorPoints: 0, // Placeholder - would come from armor allocation
      maxArmorPoints,
      criticalSlotsUsed: usedSlots,
      criticalSlotsTotal: totalSlots,
      heatGenerated: 0, // Placeholder - would come from weapons
      heatDissipation: calculations.totalHeatDissipation,
      validationStatus: 'warning' as ValidationStatus,
      errorCount: 0,
      warningCount: 1,
    };
  }, [tab, unitEquipment, calculations]);

  // Handlers
  const handleAddEquipment = useCallback((equipment: IEquipmentItem) => {
    const newItem: TrayEquipmentItem = {
      id: `${equipment.id}-${Date.now()}`,
      name: equipment.name,
      category: equipment.category,
      weight: equipment.weight,
      criticalSlots: equipment.criticalSlots,
      isAllocated: false,
    };
    setUnitEquipment(prev => [...prev, newItem]);
  }, []);

  const handleRemoveEquipment = useCallback((id: string) => {
    setUnitEquipment(prev => prev.filter(eq => eq.id !== id));
    if (selectedEquipmentId === id) {
      setSelectedEquipmentId(undefined);
    }
  }, [selectedEquipmentId]);

  const handleSlotClick = useCallback((location: MechLocation, slotIndex: number) => {
    console.log('Slot clicked:', location, slotIndex);
    // Would handle equipment placement
  }, []);

  const handleEquipmentDrop = useCallback((location: MechLocation, slotIndex: number, equipmentId: string) => {
    console.log('Equipment dropped:', equipmentId, 'at', location, slotIndex);
    // Would handle equipment placement
  }, []);

  const handleEquipmentRemove = useCallback((location: MechLocation, slotIndex: number) => {
    console.log('Equipment removed from:', location, slotIndex);
    // Would handle equipment removal
  }, []);

  const handleToolbarAction = useCallback((action: 'fill' | 'compact' | 'sort' | 'reset') => {
    if (action === 'reset') {
      setIsResetDialogOpen(true);
    } else {
      console.log('Toolbar action:', action);
    }
  }, []);

  const handleResetConfirm = useCallback(async (optionId: string) => {
    console.log('Reset confirmed:', optionId);
    if (optionId === 'equipment' || optionId === 'full') {
      setUnitEquipment([]);
    }
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading customizer...</div>
      </div>
    );
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    if (!tab) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            tabId={tab.id}
            unitName={tab.name}
            tonnage={tab.tonnage}
          />
        );

      case 'structure':
        return (
          <StructureTab
            tabId={tab.id}
            tonnage={tab.tonnage}
          />
        );

      case 'armor':
        return (
          <div className="p-4">
            <div className="max-w-lg mx-auto">
              <ArmorDiagram
                armorData={armorData}
                selectedLocation={selectedArmorLocation}
                unallocatedPoints={100}
                onLocationClick={setSelectedArmorLocation}
                onAutoAllocate={() => console.log('Auto-allocate clicked')}
              />
            </div>
          </div>
        );

      case 'weapons':
      case 'equipment':
        return (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <EquipmentBrowser onAddEquipment={handleAddEquipment} />
            </div>
            <div>
              <EquipmentTray
                equipment={unitEquipment}
                weightStats={weightStats}
                onRemoveEquipment={handleRemoveEquipment}
                onSelectEquipment={setSelectedEquipmentId}
                selectedEquipmentId={selectedEquipmentId}
                className="h-[600px]"
              />
            </div>
          </div>
        );

      case 'criticals':
        return (
          <div className="p-4">
            <CriticalSlotsDisplay
              locations={criticalSlotsData}
              selectedEquipmentId={selectedEquipmentId}
              assignableSlots={[]}
              autoFillUnhittables={autoModeSettings.autoFillUnhittables}
              showPlacementPreview={autoModeSettings.showPlacementPreview}
              onSlotClick={handleSlotClick}
              onEquipmentDrop={handleEquipmentDrop}
              onEquipmentRemove={handleEquipmentRemove}
              onAutoFillToggle={toggleAutoFillUnhittables}
              onPreviewToggle={toggleShowPlacementPreview}
              onToolbarAction={handleToolbarAction}
            />
          </div>
        );

      case 'fluff':
        return (
          <FluffTab
            chassis={tab.name.split(' ')[0]}
            model={tab.name}
          />
        );

      default:
        return (
          <div className="p-8 text-center text-slate-400">
            Tab content not implemented yet
          </div>
        );
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Multi-unit tabs at top */}
        <MultiUnitTabs>
          {tab && unitStats ? (
            <div className="flex flex-col h-full">
              {/* Persistent unit stats banner */}
              <UnitInfoBanner 
                stats={unitStats}
                onReset={() => setIsResetDialogOpen(true)}
              />
              
              {/* Customizer section tabs */}
              <CustomizerTabs
                tabs={DEFAULT_CUSTOMIZER_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {/* Tab content */}
              <div className="flex-1 overflow-auto bg-slate-900">
                {renderTabContent()}
              </div>

              {/* Color legend (collapsible) */}
              <div className="border-t border-slate-700 p-2">
                <ColorLegend defaultExpanded={colorLegendExpanded} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <p className="text-lg mb-2">No unit selected</p>
                <p className="text-sm">Create a new unit to get started</p>
              </div>
            </div>
          )}
        </MultiUnitTabs>

        {/* Reset confirmation dialog */}
        <ResetConfirmationDialog
          isOpen={isResetDialogOpen}
          onClose={() => setIsResetDialogOpen(false)}
          onConfirm={handleResetConfirm}
        />
      </div>
    </DndProvider>
  );
}
