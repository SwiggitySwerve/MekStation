/**
 * Customizer V2 - Next generation unit customizer using the V2 data model
 * Built on top of the UnitCriticalManager system for advanced unit customization
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { MultiUnitProvider, useUnit } from '../../components/multiUnit/MultiUnitProvider';
import { TabManager } from '../../components/multiUnit/TabManager';
import { formatCondensedMovement } from '../../utils/movementCalculations';
import { TabContentWrapper } from '../../components/common/TabContentWrapper';

// Import equipment components
import { EquipmentTray } from '../../components/criticalSlots/EquipmentTray';
import { EquipmentAllocationDebugPanel } from '../../components/criticalSlots/EquipmentAllocationDebugPanel';

// Import Overview tab
import { OverviewTab } from '../../components/overview/OverviewTab';

// Import extracted tab components
import { StructureTab } from '../../components/editor/tabs/StructureTab';
import { ArmorTab } from '../../components/editor/tabs/ArmorTab';
import { EquipmentTab } from '../../components/editor/tabs/EquipmentTab';
import { CriticalsTab } from '../../components/editor/tabs/CriticalsTab';
import { FluffTab } from '../../components/editor/tabs/FluffTab';

// Import reset functionality
import { ResetConfirmationDialog } from '../../components/common/ResetConfirmationDialog';

// Inner component that uses the V2 data model with V1 UI design
function CustomizerV2Content() {
  const { unit, unitVersion } = useUnit();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isEquipmentTrayExpanded, setIsEquipmentTrayExpanded] = useState(false);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Get the current unit configuration directly from the unit
  const unitConfig = useMemo(() => unit.getConfiguration(), [unit, unitVersion]);

  // Get unallocated equipment for weight calculations
  const unallocatedEquipment = useMemo(() => unit.getUnallocatedEquipment(), [unit, unitVersion]);

  // Get unit statistics for the top bar
  const unitStats = useMemo(() => ({
    usedTonnage: unit.getUsedTonnage(),
    totalTonnage: unitConfig.tonnage,
    totalCriticalSlots: unit.getTotalCriticalSlots(),
    usedCriticalSlots: unit.getTotalUsedCriticalSlots(),
    remainingCriticalSlots: unit.getRemainingCriticalSlots(),
    armorPoints: unit.getMaxArmorPoints(),
    allocatedArmorPoints: unit.getAllocatedArmorPoints(),
    heatDissipation: unit.getHeatDissipation(),
    heatGeneration: unit.getHeatGeneration(),
    isOverweight: unit.isOverweight(),
    validation: unit.validate()
  }), [unit, unitVersion, unitConfig.tonnage]);

  // Initialize active tab from URL query or localStorage
  useEffect(() => {
    const getInitialTab = () => {
      // First, try to get tab from URL query parameter
      if (router.query.tab && typeof router.query.tab === 'string') {
        const urlTab = router.query.tab;
        if (['overview', 'structure', 'armor', 'equipment', 'criticals', 'fluff'].includes(urlTab)) {
          return urlTab;
        }
      }
      
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem('customizer-v2-active-tab');
        if (savedTab && ['overview', 'structure', 'armor', 'equipment', 'criticals', 'fluff'].includes(savedTab)) {
          return savedTab;
        }
      }
      
      return 'overview';
    };

    const initialTab = getInitialTab();
    setActiveTab(initialTab);
  }, [router.query.tab]);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('customizer-v2-active-tab', activeTab);
    }
  }, [activeTab]);

  // Handle tab change with URL update
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    
    // Update URL query parameter
    const newQuery = { ...router.query, tab: tabId };
    router.push({
      pathname: router.pathname,
      query: newQuery
    }, undefined, { shallow: true });
  }, [router]);

  // Handle reset completion
  const handleResetComplete = useCallback((success: boolean) => {
    if (success) {
      console.log('[CustomizerV2Content] Reset completed successfully');
      // Optionally show a success notification or redirect
    } else {
      console.error('[CustomizerV2Content] Reset failed');
      // Optionally show an error notification
    }
  }, []);

  // Tab definitions
  const tabs = useMemo(() => [
    {
      id: 'overview',
      label: 'Overview',
      component: OverviewTab
    },
    {
      id: 'structure',
      label: 'Structure',
      component: StructureTab
    },
    {
      id: 'armor',
      label: 'Armor',
      component: ArmorTab
    },
    {
      id: 'equipment',
      label: 'Equipment',
      component: EquipmentTab
    },
    {
      id: 'criticals',
      label: 'Criticals',
      component: CriticalsTab
    },
    {
      id: 'fluff',
      label: 'Fluff',
      component: FluffTab
    }
  ], []);

  // Memoize the active tab component to prevent unnecessary re-renders
  const ActiveTabComponent = useMemo(() => {
    return tabs.find(tab => tab.id === activeTab)?.component || OverviewTab;
  }, [activeTab, tabs]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Equipment Tray */}
      <EquipmentTray 
        isExpanded={isEquipmentTrayExpanded}
        onToggle={() => setIsEquipmentTrayExpanded(!isEquipmentTrayExpanded)}
      />

      {/* Unit Information Banner - Single Row Design */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Unit Identity */}
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-100">
              {unitConfig.chassis}
            </h2>
            <span className="text-sm text-slate-400">
              {unitConfig.tonnage}-ton {unitConfig.techBase} {unitConfig.unitType}
            </span>
          </div>

          {/* Center: Statistics Grid */}
          <div className="flex items-center space-x-8">
            {/* Movement */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Movement</span>
              <span className="font-medium text-slate-200">
                {formatCondensedMovement(unitConfig, unitConfig.tonnage)}
              </span>
              <span className="text-slate-500 text-xs">MP</span>
            </div>

            {/* Weight */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Weight</span>
              <span className={`font-medium ${unitStats.isOverweight ? 'text-red-400' : 'text-slate-200'}`}>
                {unitStats.usedTonnage.toFixed(1)}/{unitStats.totalTonnage}
              </span>
              <span className="text-slate-500 text-xs">tons</span>
            </div>

            {/* Critical Slots */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Critical</span>
              <span className="font-medium text-slate-200">
                {unitStats.usedCriticalSlots}/{unitStats.totalCriticalSlots}
              </span>
              <span className="text-slate-500 text-xs">slots</span>
            </div>

            {/* Heat Sinks */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Heat</span>
              <span className="font-medium text-slate-200">
                {unitConfig.totalHeatSinks || 10}
              </span>
              <span className="text-slate-500 text-xs">sinks</span>
            </div>

            {/* Heat Status */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Heat</span>
              <span className={`font-medium ${unitStats.heatGeneration > unitStats.heatDissipation ? 'text-red-400' : 'text-green-400'}`}>
                {unitStats.heatGeneration}/{unitStats.heatDissipation}
              </span>
              <span className="text-slate-500 text-xs">gen/diss</span>
            </div>

            {/* Armor */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Armor</span>
              <span className="font-medium text-slate-200">
                {unitStats.allocatedArmorPoints}/{unitStats.armorPoints}
              </span>
              <span className="text-slate-500 text-xs">points</span>
            </div>

            {/* Rules Level */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Rules</span>
              <span className="font-medium text-slate-200">
                {unitConfig.rulesLevel || 'Standard'}
              </span>
              <span className="text-slate-500 text-xs">level</span>
            </div>

            {/* Era */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Era</span>
              <span className="font-medium text-slate-200">
                {unitConfig.introductionYear || 3025}
              </span>
              <span className="text-slate-500 text-xs">year</span>
            </div>

            {/* Tech Rating */}
            <div className="flex flex-col items-center text-center">
              <span className="text-slate-400 text-xs mb-1">Tech</span>
              <span className="font-medium text-slate-200">
                {typeof unitConfig.techRating === 'object' 
                  ? unitConfig.techRating?.era2801_3050 || 'D'
                  : unitConfig.techRating || 'D'}
              </span>
              <span className="text-slate-500 text-xs">rating</span>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Validation Status */}
            <div className="flex items-center mr-4">
              <div className={`w-2 h-2 rounded-full mr-2 ${unitStats.validation.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${unitStats.validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                {unitStats.validation.isValid ? 'Valid' : `${unitStats.validation.errors.length} Errors`}
              </span>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => setIsResetDialogOpen(true)}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center"
              title="Reset Customizer"
            >
              <span className="mr-1">🔄</span>
              Reset
            </button>

            {/* Debug Button */}
            <button
              onClick={() => setIsDebugVisible(!isDebugVisible)}
              className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 rounded transition-colors"
              title="Toggle Debug Panel"
            >
              Debug
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 bg-slate-800 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`
              px-6 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-slate-100 border-b-2 border-blue-500 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }
            `}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Using standardized wrapper */}
      <TabContentWrapper>
        <ActiveTabComponent readOnly={false} />
      </TabContentWrapper>

      {/* Conditional Debug Panel */}
      {isDebugVisible && (
        <div className="fixed bottom-4 right-4 w-96 h-64 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50">
          <EquipmentAllocationDebugPanel />
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ResetConfirmationDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onResetComplete={handleResetComplete}
      />
    </div>
  );
}

// Main component with MultiUnitProvider
const CustomizerV2Page: React.FC = () => {
  return (
    <>
      <Head>
        <title>Customizer V2 | BattleTech Editor</title>
        <meta name="description" content="Next generation unit customizer using the V2 data model with advanced critical slot management." />
      </Head>

      <MultiUnitProvider>
        <TabManager>
          <CustomizerV2Content />
        </TabManager>
      </MultiUnitProvider>
    </>
  );
};

export default CustomizerV2Page;
