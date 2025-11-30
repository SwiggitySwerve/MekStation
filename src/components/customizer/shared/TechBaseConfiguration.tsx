/**
 * Tech Base Configuration Component
 * 
 * Allows configuration of global and per-component tech base settings.
 * Supports Inner Sphere, Clan, and Mixed Tech modes.
 * 
 * @spec Based on BattleTech TechManual mixed tech rules
 */

import React from 'react';
import { TechBase } from '@/types/enums/TechBase';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  TECH_BASE_COMPONENT_LABELS,
  TECH_BASE_COMPONENT_DESCRIPTIONS,
} from '@/types/construction/TechBaseConfiguration';

// =============================================================================
// Style Constants
// =============================================================================

const styles = {
  // Base button styles
  button: {
    base: 'px-3 py-1.5 text-sm font-medium transition-colors',
    baseLarge: 'px-4 py-2 text-sm font-medium transition-colors',
    inactive: 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300',
    disabled: 'opacity-50 cursor-not-allowed',
    enabled: 'cursor-pointer',
    borderLeft: 'border-l border-slate-600',
  },
  
  // Tech base colors (active state)
  techBase: {
    innerSphere: 'bg-green-600 text-white',
    clan: 'bg-red-600 text-white',
    mixed: 'bg-purple-600 text-white',
  },
  
  // Container styles
  container: {
    panel: 'bg-slate-800 rounded-lg border border-slate-700 overflow-hidden',
    header: 'px-4 py-3 border-b border-slate-700 bg-slate-800',
    buttonGroup: 'inline-flex rounded-lg overflow-hidden border border-slate-600',
    rowEven: 'bg-slate-800',
    rowOdd: 'bg-slate-800/50',
  },
  
  // Text styles
  text: {
    title: 'text-sm font-medium text-slate-400 text-center mb-2',
    label: 'text-sm font-medium text-slate-200',
  },
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

function getModeButtonClass(isActive: boolean, isDisabled: boolean): string {
  return [
    styles.button.baseLarge,
    isActive ? '' : styles.button.inactive,
    isDisabled ? styles.button.disabled : styles.button.enabled,
  ].filter(Boolean).join(' ');
}

function getSegmentButtonClass(isActive: boolean, isDisabled: boolean): string {
  return [
    styles.button.base,
    isActive ? '' : styles.button.inactive,
    isDisabled ? styles.button.disabled : styles.button.enabled,
  ].filter(Boolean).join(' ');
}

// =============================================================================
// Props Interfaces
// =============================================================================

interface TechBaseConfigurationProps {
  mode: TechBaseMode;
  components: IComponentTechBases;
  onModeChange: (mode: TechBaseMode) => void;
  onComponentChange: (component: TechBaseComponent, techBase: TechBase) => void;
  readOnly?: boolean;
  className?: string;
}

interface SegmentedButtonProps {
  value: TechBase;
  onChange: (value: TechBase) => void;
  disabled?: boolean;
}

interface ComponentRowProps {
  component: TechBaseComponent;
  techBase: TechBase;
  onChange: (techBase: TechBase) => void;
  disabled: boolean;
  isOdd: boolean;
}

// =============================================================================
// Sub-Components
// =============================================================================

function TechBaseSegmentedButton({ value, onChange, disabled = false }: SegmentedButtonProps) {
  const isIS = value === TechBase.INNER_SPHERE;
  const isClan = value === TechBase.CLAN;

  return (
    <div className={styles.container.buttonGroup}>
      <button
        type="button"
        onClick={() => onChange(TechBase.INNER_SPHERE)}
        disabled={disabled}
        className={`${getSegmentButtonClass(isIS, disabled)} ${isIS ? styles.techBase.innerSphere : ''}`}
      >
        Inner Sphere
      </button>
      <button
        type="button"
        onClick={() => onChange(TechBase.CLAN)}
        disabled={disabled}
        className={`${getSegmentButtonClass(isClan, disabled)} ${styles.button.borderLeft} ${isClan ? styles.techBase.clan : ''}`}
      >
        Clan
      </button>
    </div>
  );
}

function ComponentRow({ component, techBase, onChange, disabled, isOdd }: ComponentRowProps) {
  const rowBg = isOdd ? styles.container.rowOdd : styles.container.rowEven;
  const opacity = disabled ? 'opacity-60' : '';

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 ${rowBg} ${opacity}`}
      title={TECH_BASE_COMPONENT_DESCRIPTIONS[component]}
    >
      <div className={styles.text.label}>
        {TECH_BASE_COMPONENT_LABELS[component]}
      </div>
      <TechBaseSegmentedButton
        value={techBase}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

const COMPONENT_ORDER: TechBaseComponent[] = [
  'chassis', 'gyro', 'engine', 'heatsink',
  'targeting', 'myomer', 'movement', 'armor',
];

export function TechBaseConfiguration({
  mode,
  components,
  onModeChange,
  onComponentChange,
  readOnly = false,
  className = '',
}: TechBaseConfigurationProps) {
  const isMixed = mode === 'mixed';
  const isIS = mode === 'inner_sphere';
  const isClan = mode === 'clan';

  return (
    <div className={`${styles.container.panel} ${className}`}>
      {/* Header */}
      <div className={styles.container.header}>
        <h3 className={styles.text.title}>Tech Base</h3>
        
        {/* Mode Selector */}
        <div className="flex justify-center">
          <div className={styles.container.buttonGroup}>
            <button
              type="button"
              onClick={() => onModeChange('inner_sphere')}
              disabled={readOnly}
              title="All components use Inner Sphere technology"
              className={`${getModeButtonClass(isIS, readOnly)} ${isIS ? styles.techBase.innerSphere : ''}`}
            >
              Inner Sphere
            </button>
            <button
              type="button"
              onClick={() => onModeChange('clan')}
              disabled={readOnly}
              title="All components use Clan technology"
              className={`${getModeButtonClass(isClan, readOnly)} ${styles.button.borderLeft} ${isClan ? styles.techBase.clan : ''}`}
            >
              Clan
            </button>
            <button
              type="button"
              onClick={() => onModeChange('mixed')}
              disabled={readOnly}
              title="Configure each component's tech base individually"
              className={`${getModeButtonClass(isMixed, readOnly)} ${styles.button.borderLeft} ${isMixed ? styles.techBase.mixed : ''}`}
            >
              Mixed
            </button>
          </div>
        </div>
      </div>

      {/* Component Rows */}
      <div className="divide-y divide-slate-700/50">
        {COMPONENT_ORDER.map((component, index) => (
          <ComponentRow
            key={component}
            component={component}
            techBase={components[component]}
            onChange={(techBase) => onComponentChange(component, techBase)}
            disabled={readOnly || !isMixed}
            isOdd={index % 2 === 1}
          />
        ))}
      </div>
    </div>
  );
}
