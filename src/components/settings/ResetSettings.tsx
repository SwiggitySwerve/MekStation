import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui';
import { DialogTemplate } from '@/components/ui/DialogTemplate';
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
  const [isConfirming, setIsConfirming] = useState(false);
  const pending = useRef(false);

  const dismiss = () => {
    pending.current = false;
    setIsConfirming(false);
  };

  useEffect(() => {
    if (!isExpanded) {
      pending.current = false;
      setIsConfirming(false);
    }
    return () => {
      pending.current = false;
    };
  }, [isExpanded]);

  const handleReset = () => {
    if (!isExpanded || !pending.current) return;
    dismiss();
    resetAppearance();
    resetCustomizer();
    resetAccessibility();
    resetUIBehavior();
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
          <div className="text-text-theme-primary text-sm font-medium">
            Reset All Settings
          </div>
          <div className="text-text-theme-secondary mt-0.5 text-xs">
            Restore all settings to their default values
          </div>
        </div>
        <button
          onClick={() => {
            if (!isExpanded) return;
            pending.current = true;
            setIsConfirming(true);
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Reset
        </button>
      </div>
      <DialogTemplate
        topLayer
        isOpen={isConfirming && isExpanded}
        onClose={dismiss}
        title="Reset all settings?"
        footer={
          <>
            <Button variant="secondary" onClick={dismiss}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset settings
            </Button>
          </>
        }
      >
        Restore all settings to their default values? This cannot be undone.
      </DialogTemplate>
    </SettingsSection>
  );
}
