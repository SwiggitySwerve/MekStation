/**
 * Tech Base Configuration Component
 * 
 * Combined panel showing component selections and tech base toggles.
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
    base: 'px-2 py-1 text-xs font-medium transition-colors',
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
    buttonGroup: 'inline-flex rounded-md overflow-hidden border border-slate-600',
    rowEven: 'bg-slate-800',
    rowOdd: 'bg-slate-800/50',
  },
  
  // Text styles
  text: {
    title: 'text-lg font-semibold text-white',
    subtitle: 'text-xs text-slate-400 mt-0.5',
    label: 'text-sm font-medium text-slate-200',
    value: 'text-sm text-white',
    valueMuted: 'text-sm text-slate-400',
  },
} as const;

// =============================================================================
// Types
// =============================================================================

/**
 * Current values for each component category
 */
export interface IComponentValues {
  chassis: string;      // e.g., "Standard", "Endo Steel"
  gyro: string;         // e.g., "Standard", "XL", "Compact"
  engine: string;       // e.g., "Standard Fusion 200", "XL 300"
  heatsink: string;     // e.g., "Single", "Double"
  targeting: string;    // e.g., "None", "Standard", "C3"
  myomer: string;       // e.g., "Standard", "TSM", "Industrial"
  movement: string;     // e.g., "None", "Jump Jets", "MASC"
  armor: string;        // e.g., "Standard", "Ferro-Fibrous"
}

/**
 * Default placeholder values
 */
export const DEFAULT_COMPONENT_VALUES: IComponentValues = {
  chassis: 'Standard',
  gyro: 'Standard',
  engine: 'Not Selected',
  heatsink: 'Single',
  targeting: 'None',
  myomer: 'Standard',
  movement: 'None',
  armor: 'Standard',
};

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
  componentValues?: Partial<IComponentValues>;
  onModeChange: (mode: TechBaseMode) => void;
  onComponentChange: (component: TechBaseComponent, techBase: TechBase) => void;
  readOnly?: boolean;
  className?: string;
}

interface SegmentedButtonProps {
  value: TechBase;
  onChange: (value: TechBase) => void;
  disabled?: boolean;
  size?: 'small' | 'normal';
}

interface ComponentRowProps {
  component: TechBaseComponent;
  techBase: TechBase;
  currentValue: string;
  onChange: (techBase: TechBase) => void;
  disabled: boolean;
  isOdd: boolean;
}

// =============================================================================
// Sub-Components
// =============================================================================

function TechBaseSegmentedButton({ value, onChange, disabled = false, size = 'normal' }: SegmentedButtonProps) {
  const isIS = value === TechBase.INNER_SPHERE;
  const isClan = value === TechBase.CLAN;
  const buttonClass = size === 'small' ? getSegmentButtonClass : getModeButtonClass;

  return (
    <div className={styles.container.buttonGroup}>
      <button
        type="button"
        onClick={() => onChange(TechBase.INNER_SPHERE)}
        disabled={disabled}
        className={`${buttonClass(isIS, disabled)} ${isIS ? styles.techBase.innerSphere : ''}`}
      >
        IS
      </button>
      <button
        type="button"
        onClick={() => onChange(TechBase.CLAN)}
        disabled={disabled}
        className={`${buttonClass(isClan, disabled)} ${styles.button.borderLeft} ${isClan ? styles.techBase.clan : ''}`}
      >
        Clan
      </button>
    </div>
  );
}

function ComponentRow({ component, techBase, currentValue, onChange, disabled, isOdd }: ComponentRowProps) {
  const rowBg = isOdd ? styles.container.rowOdd : styles.container.rowEven;
  const opacity = disabled ? 'opacity-60' : '';
  const valueClass = currentValue === 'None' || currentValue === 'Not Selected' 
    ? styles.text.valueMuted 
    : styles.text.value;

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 ${rowBg} ${opacity}`}
      title={TECH_BASE_COMPONENT_DESCRIPTIONS[component]}
    >
      {/* Component Label */}
      <div className={`${styles.text.label} w-24 flex-shrink-0`}>
        {TECH_BASE_COMPONENT_LABELS[component]}
      </div>
      
      {/* Current Value */}
      <div className={`${valueClass} flex-1 text-center`}>
        {currentValue}
      </div>
      
      {/* Tech Base Toggle */}
      <div className="flex-shrink-0">
        <TechBaseSegmentedButton
          value={techBase}
          onChange={onChange}
          disabled={disabled}
          size="small"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

const COMPONENT_ORDER: TechBaseComponent[] = [
  TechBaseComponent.CHASSIS, TechBaseComponent.GYRO, TechBaseComponent.ENGINE, TechBaseComponent.HEATSINK,
  TechBaseComponent.TARGETING, TechBaseComponent.MYOMER, TechBaseComponent.MOVEMENT, TechBaseComponent.ARMOR,
];

export function TechBaseConfiguration({
  mode,
  components,
  componentValues = {},
  onModeChange,
  onComponentChange,
  readOnly = false,
  className = '',
}: TechBaseConfigurationProps) {
  const isMixed = mode === TechBaseMode.MIXED;
  const isIS = mode === TechBaseMode.INNER_SPHERE;
  const isClan = mode === TechBaseMode.CLAN;
  
  // Merge with defaults
  const values: IComponentValues = { ...DEFAULT_COMPONENT_VALUES, ...componentValues };

  return (
    <div className={`${styles.container.panel} ${className}`}>
      {/* Header */}
      <div className={styles.container.header}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={styles.text.title}>Configuration</h3>
            <p className={styles.text.subtitle}>Component settings and tech base</p>
          </div>
          
          {/* Mode Selector */}
          <div className={styles.container.buttonGroup}>
            <button
              type="button"
              onClick={() => onModeChange(TechBaseMode.INNER_SPHERE)}
              disabled={readOnly}
              title="All components use Inner Sphere technology"
              className={`${getModeButtonClass(isIS, readOnly)} ${isIS ? styles.techBase.innerSphere : ''}`}
            >
              Inner Sphere
            </button>
            <button
              type="button"
              onClick={() => onModeChange(TechBaseMode.CLAN)}
              disabled={readOnly}
              title="All components use Clan technology"
              className={`${getModeButtonClass(isClan, readOnly)} ${styles.button.borderLeft} ${isClan ? styles.techBase.clan : ''}`}
            >
              Clan
            </button>
            <button
              type="button"
              onClick={() => onModeChange(TechBaseMode.MIXED)}
              disabled={readOnly}
              title="Configure each component's tech base individually"
              className={`${getModeButtonClass(isMixed, readOnly)} ${styles.button.borderLeft} ${isMixed ? styles.techBase.mixed : ''}`}
            >
              Mixed
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <div className="w-24 flex-shrink-0">Component</div>
        <div className="flex-1 text-center">Selection</div>
        <div className="w-[88px] text-center flex-shrink-0">Tech Base</div>
      </div>

      {/* Component Rows */}
      <div className="divide-y divide-slate-700/50">
        {COMPONENT_ORDER.map((component, index) => (
          <ComponentRow
            key={component}
            component={component}
            techBase={components[component]}
            currentValue={values[component]}
            onChange={(techBase) => onComponentChange(component, techBase)}
            disabled={readOnly || !isMixed}
            isOdd={index % 2 === 1}
          />
        ))}
      </div>
    </div>
  );
}
