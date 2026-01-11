/**
 * Settings Page
 *
 * App configuration and preferences.
 *
 * Appearance settings use a draft/preview system:
 * - Changes are applied immediately for live preview
 * - Changes are NOT persisted until the user clicks "Save"
 * - Navigating away without saving reverts to previous values
 */

import React, { useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { PageLayout } from '@/components/ui/PageLayout';
import {
  useAppSettingsStore,
  AccentColor,
  FontSize,
  AnimationLevel,
  UITheme,
  ACCENT_COLOR_CSS,
} from '@/stores/useAppSettingsStore';
import { ArmorDiagramGridPreview } from '@/components/customizer/armor/ArmorDiagramPreview';
import { ArmorDiagramModeSwitch } from '@/components/armor/ArmorDiagramModeSwitch';

/**
 * Settings section wrapper
 */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-base/50 rounded-lg border border-border-theme-subtle p-5">
      <h3 className="text-lg font-semibold text-text-theme-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-theme-secondary mb-4">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * Toggle switch component
 * Rectangular tactical style with proper sizing math
 */
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-theme-primary">{label}</div>
        {description && (
          <div className="text-xs text-text-theme-secondary mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative h-7 w-12 flex-shrink-0 cursor-pointer
          rounded-md border-2
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base
          ${checked
            ? 'bg-accent border-accent-hover'
            : 'bg-surface-raised border-border-theme-strong hover:bg-surface-raised/80 hover:border-border-theme-strong'
          }
        `}
      >
        <span
          aria-hidden="true"
          className={`
            absolute top-0.5 left-0.5
            h-5 w-5 rounded bg-white shadow-md
            border border-slate-300
            transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

/**
 * Select dropdown component
 */
function Select<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-text-theme-primary mb-1">{label}</div>
      {description && (
        <div className="text-xs text-text-theme-secondary mb-2">{description}</div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-surface-raised border border-border-theme rounded-lg px-3 py-2 text-text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Color picker for accent colors
 */
function AccentColorPicker({
  value,
  onChange,
}: {
  value: AccentColor;
  onChange: (color: AccentColor) => void;
}) {
  const colors: { value: AccentColor; label: string }[] = [
    { value: 'amber', label: 'Amber' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'rose', label: 'Rose' },
    { value: 'violet', label: 'Violet' },
    { value: 'blue', label: 'Blue' },
  ];

  return (
    <div>
      <div className="text-sm font-medium text-text-theme-primary mb-2">Accent Color</div>
      <div className="text-xs text-text-theme-secondary mb-3">
        Customize the highlight color throughout the app
      </div>
      <div className="flex gap-4 flex-wrap">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className={`w-10 h-10 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base ${
              value === color.value
                ? 'scale-125 shadow-xl ring-4 ring-white/50 border-2 border-white'
                : 'border-2 border-border-theme hover:border-border-theme-strong hover:scale-110'
            }`}
            style={{ backgroundColor: ACCENT_COLOR_CSS[color.value].primary }}
            aria-label={color.label}
            title={color.label}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * UI Theme info for display
 */
const UI_THEME_INFO: Record<UITheme, { name: string; description: string; preview: string }> = {
  default: {
    name: 'Default',
    description: 'Clean slate design with amber accents',
    preview: 'bg-surface-base border-border-theme-subtle',
  },
  neon: {
    name: 'Neon',
    description: 'Cyberpunk-inspired with glow effects',
    preview: 'bg-surface-deep border-cyan-500/30',
  },
  tactical: {
    name: 'Tactical',
    description: 'Military HUD style with monospace fonts',
    preview: 'bg-surface-deep border-border-theme',
  },
  minimal: {
    name: 'Minimal',
    description: 'Reduced visual noise, focus on content',
    preview: 'bg-surface-base/50 border-border-theme-subtle/50',
  },
};

/**
 * UI Theme picker
 */
function UIThemePicker({
  value,
  onChange,
}: {
  value: UITheme;
  onChange: (theme: UITheme) => void;
}) {
  const themes: UITheme[] = ['default', 'minimal', 'neon', 'tactical'];

  return (
    <div>
      <div className="text-sm font-medium text-text-theme-primary mb-2">UI Theme</div>
      <div className="text-xs text-text-theme-secondary mb-3">
        Choose the overall visual style of the interface
      </div>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((theme) => {
          const info = UI_THEME_INFO[theme];
          const isSelected = value === theme;

          return (
            <button
              key={theme}
              onClick={() => onChange(theme)}
              className={`
                p-3 rounded-md border-2 text-left transition-all
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base
                ${isSelected
                  ? 'border-accent bg-accent-muted'
                  : 'border-border-theme hover:border-border-theme-strong bg-surface-raised/30'
                }
              `}
            >
              {/* Preview bar */}
              <div className={`h-2 w-full rounded mb-2 border ${info.preview}`} />
              <div className="text-sm font-medium text-text-theme-primary">{info.name}</div>
              <div className="text-xs text-text-theme-secondary mt-0.5">{info.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


export default function SettingsPage() {
  const router = useRouter();

  // Get store actions and state
  const initDraftAppearance = useAppSettingsStore((s) => s.initDraftAppearance);
  const saveAppearance = useAppSettingsStore((s) => s.saveAppearance);
  const revertAppearance = useAppSettingsStore((s) => s.revertAppearance);
  const hasUnsavedAppearance = useAppSettingsStore((s) => s.hasUnsavedAppearance);

  // Get draft values for display (or saved values if no draft)
  const draftAppearance = useAppSettingsStore((s) => s.draftAppearance);
  const savedAccentColor = useAppSettingsStore((s) => s.accentColor);
  const savedUITheme = useAppSettingsStore((s) => s.uiTheme);
  const savedFontSize = useAppSettingsStore((s) => s.fontSize);
  const savedAnimationLevel = useAppSettingsStore((s) => s.animationLevel);
  const savedCompactMode = useAppSettingsStore((s) => s.compactMode);

  // Effective values for display
  const effectiveAccentColor = draftAppearance?.accentColor ?? savedAccentColor;
  const effectiveUITheme = draftAppearance?.uiTheme ?? savedUITheme;
  const effectiveFontSize = draftAppearance?.fontSize ?? savedFontSize;
  const effectiveAnimationLevel = draftAppearance?.animationLevel ?? savedAnimationLevel;
  const effectiveCompactMode = draftAppearance?.compactMode ?? savedCompactMode;

  // Draft setters for live preview
  const setDraftAccentColor = useAppSettingsStore((s) => s.setDraftAccentColor);
  const setDraftUITheme = useAppSettingsStore((s) => s.setDraftUITheme);
  const setDraftFontSize = useAppSettingsStore((s) => s.setDraftFontSize);
  const setDraftAnimationLevel = useAppSettingsStore((s) => s.setDraftAnimationLevel);
  const setDraftCompactMode = useAppSettingsStore((s) => s.setDraftCompactMode);

  // Other settings (not draft-based)
  const settings = useAppSettingsStore();

  // Initialize draft state on mount
  useEffect(() => {
    initDraftAppearance();
  }, [initDraftAppearance]);

  // Handle save
  const handleSaveAppearance = useCallback(() => {
    saveAppearance();
  }, [saveAppearance]);

  // Revert on unmount if there are unsaved changes
  useEffect(() => {
    const handleRouteChange = () => {
      // Revert appearance changes when navigating away
      revertAppearance();
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, revertAppearance]);

  return (
    <>
      <Head>
        <title>Settings | MekStation</title>
      </Head>

      <PageLayout
        title="Settings"
        subtitle="Customize your MekStation experience"
        maxWidth="narrow"
      >
        <div className="space-y-6 pb-8">
          {/* Appearance Section */}
          <SettingsSection
            title="Appearance"
            description="Customize colors, fonts, and visual effects. Changes preview instantly but require saving."
          >
            <UIThemePicker
              value={effectiveUITheme}
              onChange={setDraftUITheme}
            />

            {/* UI Theme Save Notice */}
            {hasUnsavedAppearance && draftAppearance?.uiTheme !== undefined && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span className="text-sm text-amber-200">
                    Theme preview active — save to keep changes
                  </span>
                </div>
                <button
                  onClick={handleSaveAppearance}
                  className="px-3 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors"
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
                { value: 'reduced', label: 'Reduced - Essential animations only' },
                { value: 'none', label: 'None - Disable all animations' },
              ]}
            />

            <Toggle
              label="Compact Mode"
              description="Reduce spacing and padding for more information density"
              checked={effectiveCompactMode}
              onChange={setDraftCompactMode}
            />

            {/* Save Button */}
            <div className="pt-4 border-t border-border-theme-subtle">
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-theme-secondary">
                  {hasUnsavedAppearance
                    ? 'You have unsaved appearance changes'
                    : 'Appearance settings saved'}
                </div>
                <button
                  onClick={handleSaveAppearance}
                  disabled={!hasUnsavedAppearance}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    hasUnsavedAppearance
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'bg-surface-raised text-text-theme-muted cursor-not-allowed'
                  }`}
                >
                  Save Appearance
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* Customizer Section */}
          <SettingsSection
            title="Customizer"
            description="Configure the mech customizer interface"
          >
            {/* Armor Diagram Mode */}
            <div>
              <div className="text-sm font-medium text-text-theme-primary mb-2">Armor Diagram Mode</div>
              <div className="text-xs text-text-theme-secondary mb-3">
                Choose between schematic grid or silhouette SVG display
              </div>
              <ArmorDiagramModeSwitch />
            </div>

            {/* Armor Diagram Variant (only visible for silhouette mode) */}
            {settings.armorDiagramMode === 'silhouette' && (
              <div>
                <div className="text-sm font-medium text-text-theme-primary mb-2">Silhouette Style</div>
                <div className="text-xs text-text-theme-secondary mb-4">
                  Choose the visual style for the silhouette armor diagram
                </div>
                <ArmorDiagramGridPreview
                  selectedVariant={settings.armorDiagramVariant}
                  onSelectVariant={settings.setArmorDiagramVariant}
                />
              </div>
            )}

            <Toggle
              label="Show Design Selector (UAT)"
              description="Display the design variant dropdown in the armor tab for testing"
              checked={settings.showArmorDiagramSelector}
              onChange={settings.setShowArmorDiagramSelector}
            />
          </SettingsSection>

          {/* UI Behavior Section */}
          <SettingsSection
            title="UI Behavior"
            description="Control how the interface behaves"
          >
            <Toggle
              label="Collapse Sidebar by Default"
              description="Start with the sidebar in collapsed state"
              checked={settings.sidebarDefaultCollapsed}
              onChange={settings.setSidebarDefaultCollapsed}
            />

            <Toggle
              label="Confirm Before Closing"
              description="Show a confirmation when closing tabs with unsaved changes"
              checked={settings.confirmOnClose}
              onChange={settings.setConfirmOnClose}
            />

            <Toggle
              label="Show Tooltips"
              description="Display helpful tooltips on hover"
              checked={settings.showTooltips}
              onChange={settings.setShowTooltips}
            />
          </SettingsSection>

          {/* Accessibility Section */}
          <SettingsSection
            title="Accessibility"
            description="Options for better accessibility"
          >
            <Toggle
              label="High Contrast"
              description="Increase contrast for better visibility"
              checked={settings.highContrast}
              onChange={settings.setHighContrast}
            />

            <Toggle
              label="Reduce Motion"
              description="Minimize animations for motion sensitivity"
              checked={settings.reduceMotion}
              onChange={settings.setReduceMotion}
            />
          </SettingsSection>

          {/* Reset Section */}
          <SettingsSection title="Reset">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Reset All Settings</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Restore all settings to their default values
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all settings to defaults?')) {
                    settings.resetToDefaults();
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </SettingsSection>
        </div>
      </PageLayout>
    </>
  );
}
