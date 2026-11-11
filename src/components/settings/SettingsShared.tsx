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
} from '@/stores/useAppearanceStore';

export type { SectionId, SectionConfig } from './SettingsShared.constants';
export {
  SECTIONS,
  isValidSectionId,
  UI_THEME_INFO,
} from './SettingsShared.constants';

import { SvgIcon } from '@/components/ui/SvgIcon';

import type { SectionId } from './SettingsShared.constants';

import { SECTIONS, UI_THEME_INFO } from './SettingsShared.constants';

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
          <SvgIcon
            size="control"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </SvgIcon>
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
        aria-label={label}
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
          className={`border-border-theme absolute top-0.5 left-0.5 h-5 w-5 rounded border bg-white shadow-md transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'} `}
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
        aria-label={label}
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
        Choose the color for highlights, selected controls, and focus outlines.
      </div>
      <div className="flex flex-wrap gap-4">
        {colors.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className={`focus:ring-accent focus:ring-offset-surface-base h-11 w-11 rounded-lg transition-all duration-150 focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              value === color.value
                ? 'scale-125 border-2 border-white shadow-xl ring-4 ring-white/50'
                : 'border-border-theme hover:border-border-theme-strong border-2 hover:scale-110'
            }`}
            style={{ backgroundColor: ACCENT_COLOR_CSS[color.value].primary }}
            aria-label={color.label}
            aria-pressed={value === color.value}
            title={color.label}
          />
        ))}
      </div>
    </div>
  );
}

export function UIThemePicker({
  value,
  onChange,
}: {
  value: UITheme;
  onChange: (theme: UITheme) => void;
}): React.ReactElement {
  const themes = Object.keys(UI_THEME_INFO) as UITheme[];

  return (
    <div>
      <div className="text-text-theme-primary mb-2 text-sm font-medium">
        UI Theme
      </div>
      <div className="text-text-theme-secondary mb-3 text-xs">
        Choose colors for app surfaces and borders. Equipment category colors
        stay consistent.
      </div>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((theme) => {
          const info = UI_THEME_INFO[theme];
          const isSelected = value === theme;

          return (
            <button
              key={theme}
              onClick={() => onChange(theme)}
              aria-label={info.name}
              aria-pressed={isSelected}
              className={`focus:ring-accent focus:ring-offset-surface-base rounded-md border-2 p-3 text-left transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                isSelected
                  ? 'border-accent bg-accent-muted'
                  : 'border-border-theme hover:border-border-theme-strong bg-surface-raised/30'
              } `}
            >
              <div
                aria-hidden="true"
                className={`mb-3 flex h-10 gap-1 rounded border p-1 ${info.preview}`}
                style={{
                  backgroundColor: 'var(--surface-deep)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <span
                  className="w-1/4 rounded-sm"
                  style={{ backgroundColor: 'var(--surface-base)' }}
                />
                <span
                  className="flex-1 rounded-sm"
                  style={{ backgroundColor: 'var(--surface-raised)' }}
                />
                <span
                  className="w-1 rounded-sm"
                  style={{ backgroundColor: 'var(--border-strong)' }}
                />
              </div>
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
