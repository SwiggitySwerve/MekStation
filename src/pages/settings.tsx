/**
 * Settings Page
 *
 * App configuration and preferences.
 */

import React from 'react';
import Head from 'next/head';
import { PageLayout } from '@/components/ui/PageLayout';
import {
  useAppSettingsStore,
  AccentColor,
  FontSize,
  AnimationLevel,
  ACCENT_COLOR_CSS,
} from '@/stores/useAppSettingsStore';
import { ArmorDiagramGridPreview } from '@/components/customizer/armor/ArmorDiagramPreview';

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
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-5">
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 mb-4">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * Toggle switch component
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
        <div className="text-sm font-medium text-white">{label}</div>
        {description && (
          <div className="text-xs text-slate-400 mt-0.5">{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
          checked ? 'bg-amber-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-[22px]' : 'translate-x-1'
          }`}
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
      <div className="text-sm font-medium text-white mb-1">{label}</div>
      {description && (
        <div className="text-xs text-slate-400 mb-2">{description}</div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
      <div className="text-sm font-medium text-white mb-2">Accent Color</div>
      <div className="text-xs text-slate-400 mb-3">
        Customize the highlight color throughout the app
      </div>
      <div className="flex gap-3 flex-wrap">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className={`w-10 h-10 rounded-lg border-2 transition-all ${
              value === color.value
                ? 'border-white scale-110 shadow-lg'
                : 'border-transparent hover:border-slate-500'
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


export default function SettingsPage() {
  const settings = useAppSettingsStore();

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
            description="Customize colors, fonts, and visual effects"
          >
            <AccentColorPicker
              value={settings.accentColor}
              onChange={settings.setAccentColor}
            />

            <Select<FontSize>
              label="Font Size"
              description="Base font size for the application"
              value={settings.fontSize}
              onChange={settings.setFontSize}
              options={[
                { value: 'small', label: 'Small (14px)' },
                { value: 'medium', label: 'Medium (16px)' },
                { value: 'large', label: 'Large (18px)' },
              ]}
            />

            <Select<AnimationLevel>
              label="Animation Level"
              description="Control the amount of motion and transitions"
              value={settings.animationLevel}
              onChange={settings.setAnimationLevel}
              options={[
                { value: 'full', label: 'Full - All animations enabled' },
                { value: 'reduced', label: 'Reduced - Essential animations only' },
                { value: 'none', label: 'None - Disable all animations' },
              ]}
            />

            <Toggle
              label="Compact Mode"
              description="Reduce spacing and padding for more information density"
              checked={settings.compactMode}
              onChange={settings.setCompactMode}
            />
          </SettingsSection>

          {/* Customizer Section */}
          <SettingsSection
            title="Customizer"
            description="Configure the mech customizer interface"
          >
            <div>
              <div className="text-sm font-medium text-white mb-2">Armor Diagram Style</div>
              <div className="text-xs text-slate-400 mb-4">
                Choose the visual style for the armor allocation diagram. Changes apply immediately.
              </div>
              <ArmorDiagramGridPreview
                selectedVariant={settings.armorDiagramVariant}
                onSelectVariant={settings.setArmorDiagramVariant}
              />
            </div>

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
