/**
 * Shared components and types for the Settings page.
 *
 * Contains section navigation, collapsible wrappers, and
 * reusable form controls (Toggle, Select, AccentColorPicker, UIThemePicker).
 */

import React from 'react';

import {
  AccentColor,
  ACCENT_COLOR_CSS,
  UITheme,
} from '@/stores/useAppSettingsStore';

/**
 * Section configuration for navigation and state
 */
export type SectionId =
  | 'appearance'
  | 'customizer'
  | 'vault'
  | 'p2p-sync'
  | 'ui-behavior'
  | 'accessibility'
  | 'audit'
  | 'reset';

export interface SectionConfig {
  id: SectionId;
  title: string;
  description?: string;
  icon: React.ReactNode;
}

export const SECTIONS: SectionConfig[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    description:
      'Customize colors, fonts, and visual effects. Changes preview instantly but require saving.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
        />
      </svg>
    ),
  },
  {
    id: 'customizer',
    title: 'Customizer',
    description: 'Configure the mech customizer interface',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
  },
  {
    id: 'vault',
    title: 'Vault & Sharing',
    description: 'Manage your vault identity for sharing content',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
        />
      </svg>
    ),
  },
  {
    id: 'p2p-sync',
    title: 'P2P Sync',
    description:
      'Real-time peer-to-peer synchronization for collaborative play',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
        />
      </svg>
    ),
  },
  {
    id: 'ui-behavior',
    title: 'UI Behavior',
    description: 'Control how the interface behaves',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
        />
      </svg>
    ),
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    description: 'Options for better accessibility',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    id: 'audit',
    title: 'Audit Log',
    description: 'View event history and system logs',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: 'reset',
    title: 'Reset',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    ),
  },
];

// Valid section IDs for type checking
const VALID_SECTION_IDS: SectionId[] = [
  'appearance',
  'customizer',
  'vault',
  'p2p-sync',
  'ui-behavior',
  'accessibility',
  'audit',
  'reset',
];

export function isValidSectionId(hash: string): hash is SectionId {
  return VALID_SECTION_IDS.includes(hash as SectionId);
}

/**
 * Common props passed to each settings section sub-component
 */
export interface SettingsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onRef: (el: HTMLDivElement | null) => void;
}

/**
 * Quick navigation tags using URL hash anchors
 */
export function QuickNavigation({
  activeSection,
  onNavigate,
}: {
  activeSection: SectionId | null;
  onNavigate: (sectionId: SectionId) => void;
}): React.ReactElement {
  return (
    <div className="bg-surface-deep/95 border-border-theme-subtle sticky top-0 z-10 -mx-4 mb-4 border-b px-4 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-text-theme-muted mr-1 text-xs">Jump to:</span>
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(section.id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium no-underline transition-all duration-150 ${
                isActive
                  ? 'bg-accent/20 text-accent border-accent/30 border'
                  : 'bg-surface-raised/50 text-text-theme-secondary border-border-theme-subtle hover:bg-surface-raised hover:text-text-theme-primary hover:border-border-theme border'
              } `}
            >
              {section.icon}
              {section.title}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Collapsible settings section wrapper
 */
export function SettingsSection({
  id,
  title,
  description,
  isExpanded,
  onToggle,
  onRef,
  children,
}: {
  id: SectionId;
  title: string;
  description?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      ref={onRef}
      id={`section-${id}`}
      className="bg-surface-base/50 border-border-theme-subtle overflow-hidden rounded-lg border transition-all duration-200"
    >
      {/* Header - always visible, clickable to toggle */}
      <button
        onClick={onToggle}
        className="hover:bg-surface-raised/30 flex w-full items-center justify-between p-5 text-left transition-colors"
      >
        <div className="flex-1">
          <h3 className="text-text-theme-primary text-lg font-semibold">
            {title}
          </h3>
          {description && !isExpanded && (
            <p className="text-text-theme-muted mt-0.5 line-clamp-1 text-sm">
              {description}
            </p>
          )}
        </div>
        <div
          className={`text-text-theme-secondary ml-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </button>

      {/* Content - collapsible */}
      <div
        className={`transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 overflow-hidden opacity-0'} `}
      >
        <div className="border-border-theme-subtle/50 border-t px-5 pb-5">
          {description && (
            <p className="text-text-theme-secondary mt-4 mb-4 text-sm">
              {description}
            </p>
          )}
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Toggle switch component
 * Rectangular tactical style with proper sizing math
 */
export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-text-theme-primary text-sm font-medium">
          {label}
        </div>
        {description && (
          <div className="text-text-theme-secondary mt-0.5 text-xs">
            {description}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`focus:ring-accent focus:ring-offset-surface-base relative h-7 w-12 flex-shrink-0 cursor-pointer rounded-md border-2 transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-offset-2 focus:outline-none ${
          checked
            ? 'bg-accent border-accent-hover'
            : 'bg-surface-raised border-border-theme-strong hover:bg-surface-raised/80 hover:border-border-theme-strong'
        } `}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded border border-slate-300 bg-white shadow-md transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'} `}
        />
      </button>
    </div>
  );
}

/**
 * Select dropdown component
 */
export function Select<T extends string>({
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
}): React.ReactElement {
  return (
    <div>
      <div className="text-text-theme-primary mb-1 text-sm font-medium">
        {label}
      </div>
      {description && (
        <div className="text-text-theme-secondary mb-2 text-xs">
          {description}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-surface-raised border-border-theme text-text-theme-primary focus:ring-accent w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
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
export function AccentColorPicker({
  value,
  onChange,
}: {
  value: AccentColor;
  onChange: (color: AccentColor) => void;
}): React.ReactElement {
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
      <div className="text-text-theme-primary mb-2 text-sm font-medium">
        Accent Color
      </div>
      <div className="text-text-theme-secondary mb-3 text-xs">
        Customize the highlight color throughout the app
      </div>
      <div className="flex flex-wrap gap-4">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className={`focus:ring-accent focus:ring-offset-surface-base h-10 w-10 rounded-lg transition-all duration-150 focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              value === color.value
                ? 'scale-125 border-2 border-white shadow-xl ring-4 ring-white/50'
                : 'border-border-theme hover:border-border-theme-strong border-2 hover:scale-110'
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
const UI_THEME_INFO: Record<
  UITheme,
  { name: string; description: string; preview: string }
> = {
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
export function UIThemePicker({
  value,
  onChange,
}: {
  value: UITheme;
  onChange: (theme: UITheme) => void;
}): React.ReactElement {
  const themes: UITheme[] = ['default', 'minimal', 'neon', 'tactical'];

  return (
    <div>
      <div className="text-text-theme-primary mb-2 text-sm font-medium">
        UI Theme
      </div>
      <div className="text-text-theme-secondary mb-3 text-xs">
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
              className={`focus:ring-accent focus:ring-offset-surface-base rounded-md border-2 p-3 text-left transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                isSelected
                  ? 'border-accent bg-accent-muted'
                  : 'border-border-theme hover:border-border-theme-strong bg-surface-raised/30'
              } `}
            >
              {/* Preview bar */}
              <div
                className={`mb-2 h-2 w-full rounded border ${info.preview}`}
              />
              <div className="text-text-theme-primary text-sm font-medium">
                {info.name}
              </div>
              <div className="text-text-theme-secondary mt-0.5 text-xs">
                {info.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
