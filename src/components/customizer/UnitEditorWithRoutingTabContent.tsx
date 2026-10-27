import React from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import { ErrorBoundary } from '@/components/common';
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { EquipmentTab } from '@/components/customizer/tabs/EquipmentTab';
import { MechFluffTab } from '@/components/customizer/tabs/MechFluffTab';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { PreviewTab } from '@/components/customizer/tabs/PreviewTab';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';

interface UnitEditorWithRoutingTabContentProps {
  activeTabId: CustomizerTabId;
  selectedEquipmentId: string | null;
  onSelectEquipment: (id: string | null) => void;
  workbench?: boolean;
  /** Opens another customizer tab, e.g. from the Overview readiness rows. */
  onNavigate?: (tabId: CustomizerTabId) => void;
}

export function UnitEditorWithRoutingTabContent({
  activeTabId,
  selectedEquipmentId,
  onSelectEquipment,
  workbench = false,
  onNavigate,
}: UnitEditorWithRoutingTabContentProps): React.ReactElement {
  return (
    <div
      id={`tabpanel-${activeTabId}`}
      role="tabpanel"
      aria-labelledby={`customizer-tab-${activeTabId}`}
      tabIndex={-1}
      className="focus:outline-accent h-full min-h-0 focus:outline-2 focus:outline-offset-[-2px]"
    >
      {activeTabId === 'overview' && (
        <ErrorBoundary componentName="OverviewTab">
          <OverviewTab onNavigate={onNavigate} />
        </ErrorBoundary>
      )}
      {activeTabId === 'structure' && (
        <ErrorBoundary componentName="StructureTab">
          <StructureTab />
        </ErrorBoundary>
      )}
      {activeTabId === 'armor' && (
        <ErrorBoundary componentName="ArmorTab">
          <ArmorTab />
        </ErrorBoundary>
      )}
      {activeTabId === 'weapons' && <PlaceholderTab name="Weapons" />}
      {activeTabId === 'equipment' && (
        <ErrorBoundary componentName="EquipmentTab">
          <EquipmentTab />
        </ErrorBoundary>
      )}
      {activeTabId === 'criticals' && (
        <ErrorBoundary componentName="CriticalSlotsTab">
          <CriticalSlotsTab
            hideLoadoutTray={!workbench}
            selectedEquipmentId={selectedEquipmentId}
            onSelectEquipment={onSelectEquipment}
          />
        </ErrorBoundary>
      )}
      {activeTabId === 'fluff' && (
        <ErrorBoundary componentName="MechFluffTab">
          <MechFluffTab />
        </ErrorBoundary>
      )}
      {activeTabId === 'preview' && (
        <ErrorBoundary componentName="PreviewTab">
          <PreviewTab />
        </ErrorBoundary>
      )}
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-text-theme-secondary text-center">
        <h3 className="mb-2 text-xl font-bold">{name}</h3>
        <p className="text-sm">This section is under development</p>
      </div>
    </div>
  );
}
