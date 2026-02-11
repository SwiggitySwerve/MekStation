import React from 'react';

import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

import { SettingsSection, SettingsSectionProps } from './SettingsShared';

export function ResetSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  const resetToDefaults = useAppSettingsStore((s) => s.resetToDefaults);

  return (
    <SettingsSection
      id="reset"
      title="Reset"
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-white">
            Reset All Settings
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            Restore all settings to their default values
          </div>
        </div>
        <button
          onClick={() => {
            if (
              confirm(
                'Are you sure you want to reset all settings to defaults?',
              )
            ) {
              resetToDefaults();
            }
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Reset
        </button>
      </div>
    </SettingsSection>
  );
}
