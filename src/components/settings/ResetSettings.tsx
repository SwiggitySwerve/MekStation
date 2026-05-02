import React from 'react';

import { useAccessibilityStore } from '@/stores/useAccessibilityStore';
import { useAppearanceStore } from '@/stores/useAppearanceStore';
import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';
import { useUIBehaviorStore } from '@/stores/useUIBehaviorStore';

import { SettingsSection, SettingsSectionProps } from './SettingsShared';

export function ResetSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  // Each focused store owns its own reset; trigger all four together to
  // preserve the previous "reset all settings" semantics.
  const resetAppearance = useAppearanceStore((s) => s.resetToDefaults);
  const resetCustomizer = useCustomizerSettingsStore((s) => s.resetToDefaults);
  const resetAccessibility = useAccessibilityStore((s) => s.resetToDefaults);
  const resetUIBehavior = useUIBehaviorStore((s) => s.resetToDefaults);

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetAppearance();
      resetCustomizer();
      resetAccessibility();
      resetUIBehavior();
    }
  };

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
          onClick={handleReset}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Reset
        </button>
      </div>
    </SettingsSection>
  );
}
