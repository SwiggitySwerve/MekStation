import React from 'react';

import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

import {
  SettingsSection,
  SettingsSectionProps,
  Toggle,
} from './SettingsShared';

export function AccessibilitySettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  const highContrast = useAppSettingsStore((s) => s.highContrast);
  const setHighContrast = useAppSettingsStore((s) => s.setHighContrast);
  const reduceMotion = useAppSettingsStore((s) => s.reduceMotion);
  const setReduceMotion = useAppSettingsStore((s) => s.setReduceMotion);

  return (
    <SettingsSection
      id="accessibility"
      title="Accessibility"
      description="Options for better accessibility"
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <Toggle
        label="High Contrast"
        description="Increase contrast for better visibility"
        checked={highContrast}
        onChange={setHighContrast}
      />

      <Toggle
        label="Reduce Motion"
        description="Minimize animations for motion sensitivity"
        checked={reduceMotion}
        onChange={setReduceMotion}
      />
    </SettingsSection>
  );
}
