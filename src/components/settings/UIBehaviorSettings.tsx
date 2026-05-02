import React from 'react';

import { useUIBehaviorStore } from '@/stores/useUIBehaviorStore';

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
  const sidebarDefaultCollapsed = useUIBehaviorStore(
    (s) => s.sidebarDefaultCollapsed,
  );
  const setSidebarDefaultCollapsed = useUIBehaviorStore(
    (s) => s.setSidebarDefaultCollapsed,
  );
  const confirmOnClose = useUIBehaviorStore((s) => s.confirmOnClose);
  const setConfirmOnClose = useUIBehaviorStore((s) => s.setConfirmOnClose);
  const showTooltips = useUIBehaviorStore((s) => s.showTooltips);
  const setShowTooltips = useUIBehaviorStore((s) => s.setShowTooltips);

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
