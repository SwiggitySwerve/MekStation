'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { EquipmentTray } from './EquipmentTray';
import { TopStatsBanner } from './TopStatsBanner';
import { TabNavigation } from './TabNavigation';
import { TabContentWrapper } from './TabContentWrapper';
import { OverviewTab } from './tabs/OverviewTab';
import { StructureTab } from './tabs/StructureTab';
import { ArmorTab } from './tabs/ArmorTab';
import { EquipmentTab } from './tabs/EquipmentTab';
import { CriticalsTab } from './tabs/CriticalsTab';
import { FluffTab } from './tabs/FluffTab';
import {
  CustomizerTabId,
  useCustomizerStore,
  useCustomizerViewModel,
} from '../store/useCustomizerStore';
import { ResetConfirmationDialog } from './ResetConfirmationDialog';

const tabs: Array<{ id: CustomizerTabId; label: string; component: React.FC }> = [
  { id: 'overview', label: 'Overview', component: OverviewTab },
  { id: 'structure', label: 'Structure', component: StructureTab },
  { id: 'armor', label: 'Armor', component: ArmorTab },
  { id: 'equipment', label: 'Equipment', component: EquipmentTab },
  { id: 'criticals', label: 'Criticals', component: CriticalsTab },
  { id: 'fluff', label: 'Fluff', component: FluffTab },
];

export const CustomizerApp: React.FC = () => {
  const [isResetOpen, setIsResetOpen] = useState(false);
  const isEquipmentTrayExpanded = useCustomizerStore(state => state.isEquipmentTrayExpanded);
  const toggleEquipmentTray = useCustomizerStore(state => state.toggleEquipmentTray);
  const activeTab = useCustomizerStore(state => state.activeTab);
  const setActiveTab = useCustomizerStore(state => state.setActiveTab);
  const isDebugVisible = useCustomizerStore(state => state.isDebugVisible);
  const toggleDebug = useCustomizerStore(state => state.toggleDebug);
  const unit = useCustomizerViewModel().unit;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedTab = window.localStorage.getItem('mech-customizer-active-tab');
    if (savedTab && tabs.some(tab => tab.id === savedTab)) {
      setActiveTab(savedTab as CustomizerTabId);
    }
  }, [setActiveTab]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('mech-customizer-active-tab', activeTab);
  }, [activeTab]);

  const ActiveTabComponent = useMemo(
    () => tabs.find(tab => tab.id === activeTab)?.component ?? OverviewTab,
    [activeTab]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <EquipmentTray isExpanded={isEquipmentTrayExpanded} onToggle={toggleEquipmentTray} />
      <TopStatsBanner onRequestReset={() => setIsResetOpen(true)} onToggleDebug={toggleDebug} />
      <TabNavigation tabs={tabs.map(({ id, label }) => ({ id, label }))} />
      <TabContentWrapper>
        <ActiveTabComponent />
      </TabContentWrapper>
      <ResetConfirmationDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
      />
      {isDebugVisible && (
        <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-96 h-64 p-4 text-xs overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-100 font-semibold text-sm">Debug Info</h4>
            <button
              className="text-slate-400 hover:text-slate-100 text-xs"
              onClick={toggleDebug}
            >
              Close
            </button>
          </div>
          <pre className="text-slate-300 whitespace-pre-wrap">
            {JSON.stringify(unit, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

