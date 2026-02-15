import React from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import { ErrorBoundary } from '@/components/common';
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { EquipmentTab } from '@/components/customizer/tabs/EquipmentTab';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { PreviewTab } from '@/components/customizer/tabs/PreviewTab';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';

interface UnitEditorWithRoutingTabContentProps {
  activeTabId: CustomizerTabId;
  selectedEquipmentId: string | null;
  onSelectEquipment: (id: string | null) => void;
}

export function UnitEditorWithRoutingTabContent({
  activeTabId,
  selectedEquipmentId,
  onSelectEquipment,
}: UnitEditorWithRoutingTabContentProps): React.ReactElement {
  return (
    <>
      {activeTabId === 'overview' && (
        <ErrorBoundary componentName="OverviewTab">
          <OverviewTab />
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
            selectedEquipmentId={selectedEquipmentId}
            onSelectEquipment={onSelectEquipment}
          />
        </ErrorBoundary>
      )}
      {activeTabId === 'fluff' && <PlaceholderTab name="Fluff" />}
      {activeTabId === 'preview' && (
        <ErrorBoundary componentName="PreviewTab">
          <PreviewTab />
        </ErrorBoundary>
      )}
    </>
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
