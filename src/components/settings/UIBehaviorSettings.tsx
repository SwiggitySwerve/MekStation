import React from 'react';

import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

import {
  SettingsSection,
  SettingsSectionProps,
  Toggle,
} from './SettingsShared';

export function UIBehaviorSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  const sidebarDefaultCollapsed = useAppSettingsStore(
    (s) => s.sidebarDefaultCollapsed,
  );
  const setSidebarDefaultCollapsed = useAppSettingsStore(
    (s) => s.setSidebarDefaultCollapsed,
  );
  const confirmOnClose = useAppSettingsStore((s) => s.confirmOnClose);
  const setConfirmOnClose = useAppSettingsStore((s) => s.setConfirmOnClose);
  const showTooltips = useAppSettingsStore((s) => s.showTooltips);
  const setShowTooltips = useAppSettingsStore((s) => s.setShowTooltips);

  return (
    <SettingsSection
      id="ui-behavior"
      title="UI Behavior"
      description="Control how the interface behaves"
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <Toggle
        label="Collapse Sidebar by Default"
        description="Start with the sidebar in collapsed state"
        checked={sidebarDefaultCollapsed}
        onChange={setSidebarDefaultCollapsed}
      />

      <Toggle
        label="Confirm Before Closing"
        description="Show a confirmation when closing tabs with unsaved changes"
        checked={confirmOnClose}
        onChange={setConfirmOnClose}
      />

      <Toggle
        label="Show Tooltips"
        description="Display helpful tooltips on hover"
        checked={showTooltips}
        onChange={setShowTooltips}
      />
    </SettingsSection>
  );
}
