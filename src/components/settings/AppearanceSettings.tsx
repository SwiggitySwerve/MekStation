import React from 'react';

import {
  useAppSettingsStore,
  FontSize,
  AnimationLevel,
} from '@/stores/useAppSettingsStore';

import {
  SettingsSection,
  SettingsSectionProps,
  Toggle,
  Select,
  AccentColorPicker,
  UIThemePicker,
} from './SettingsShared';

export function AppearanceSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  const initDraftAppearance = useAppSettingsStore((s) => s.initDraftAppearance);
  const saveUITheme = useAppSettingsStore((s) => s.saveUITheme);
  const saveOtherAppearance = useAppSettingsStore((s) => s.saveOtherAppearance);
  const hasUnsavedUITheme = useAppSettingsStore((s) => s.hasUnsavedUITheme);
  const hasUnsavedOtherAppearance = useAppSettingsStore(
    (s) => s.hasUnsavedOtherAppearance,
  );

  const draftAppearance = useAppSettingsStore((s) => s.draftAppearance);
  const savedAccentColor = useAppSettingsStore((s) => s.accentColor);
  const savedUITheme = useAppSettingsStore((s) => s.uiTheme);
  const savedFontSize = useAppSettingsStore((s) => s.fontSize);
  const savedAnimationLevel = useAppSettingsStore((s) => s.animationLevel);
  const savedCompactMode = useAppSettingsStore((s) => s.compactMode);

  const effectiveAccentColor = draftAppearance?.accentColor ?? savedAccentColor;
  const effectiveUITheme = draftAppearance?.uiTheme ?? savedUITheme;
  const effectiveFontSize = draftAppearance?.fontSize ?? savedFontSize;
  const effectiveAnimationLevel =
    draftAppearance?.animationLevel ?? savedAnimationLevel;
  const effectiveCompactMode = draftAppearance?.compactMode ?? savedCompactMode;

  const setDraftAccentColor = useAppSettingsStore((s) => s.setDraftAccentColor);
  const setDraftUITheme = useAppSettingsStore((s) => s.setDraftUITheme);
  const setDraftFontSize = useAppSettingsStore((s) => s.setDraftFontSize);
  const setDraftAnimationLevel = useAppSettingsStore(
    (s) => s.setDraftAnimationLevel,
  );
  const setDraftCompactMode = useAppSettingsStore((s) => s.setDraftCompactMode);

  React.useEffect(() => {
    initDraftAppearance();
  }, [initDraftAppearance]);

  return (
    <SettingsSection
      id="appearance"
      title="Appearance"
      description="Customize colors, fonts, and visual effects. Changes preview instantly but require saving."
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <UIThemePicker value={effectiveUITheme} onChange={setDraftUITheme} />

      {hasUnsavedUITheme && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 text-amber-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span className="text-sm text-amber-200">
              Theme preview active — save to keep changes
            </span>
          </div>
          <button
            onClick={saveUITheme}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
          >
            Save Theme
          </button>
        </div>
      )}

      <AccentColorPicker
        value={effectiveAccentColor}
        onChange={setDraftAccentColor}
      />

      <Select<FontSize>
        label="Font Size"
        description="Base font size for the application"
        value={effectiveFontSize}
        onChange={setDraftFontSize}
        options={[
          { value: 'small', label: 'Small (14px)' },
          { value: 'medium', label: 'Medium (16px)' },
          { value: 'large', label: 'Large (18px)' },
        ]}
      />

      <Select<AnimationLevel>
        label="Animation Level"
        description="Control the amount of motion and transitions"
        value={effectiveAnimationLevel}
        onChange={setDraftAnimationLevel}
        options={[
          { value: 'full', label: 'Full - All animations enabled' },
          {
            value: 'reduced',
            label: 'Reduced - Essential animations only',
          },
          { value: 'none', label: 'None - Disable all animations' },
        ]}
      />

      <Toggle
        label="Compact Mode"
        description="Reduce spacing and padding for more information density"
        checked={effectiveCompactMode}
        onChange={setDraftCompactMode}
      />

      <div className="border-border-theme-subtle border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="text-text-theme-secondary text-sm">
            {hasUnsavedOtherAppearance
              ? 'You have unsaved appearance changes'
              : 'Appearance settings saved'}
          </div>
          <button
            onClick={saveOtherAppearance}
            disabled={!hasUnsavedOtherAppearance}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              hasUnsavedOtherAppearance
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-surface-raised text-text-theme-muted cursor-not-allowed'
            }`}
          >
            Save Appearance
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
