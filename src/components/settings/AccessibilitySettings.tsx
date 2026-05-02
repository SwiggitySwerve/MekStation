import React from 'react';

import { useAccessibilityStore } from '@/stores/useAccessibilityStore';

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
  const highContrast = useAccessibilityStore((s) => s.highContrast);
  const setHighContrast = useAccessibilityStore((s) => s.setHighContrast);
  const reduceMotion = useAccessibilityStore((s) => s.reduceMotion);
  const setReduceMotion = useAccessibilityStore((s) => s.setReduceMotion);

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
