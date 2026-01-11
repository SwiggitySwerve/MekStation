/**
 * Armor Diagram Preview Component
 *
 * Shows a preview of armor diagram designs with sample data.
 * Used in settings page to let users see design variants before selecting.
 */

import React, { useState } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from './ArmorDiagram';
import {
  CleanTechDiagram,
  NeonOperatorDiagram,
  TacticalHUDDiagram,
  PremiumMaterialDiagram,
} from './variants';
import { SchematicDiagram } from '@/components/armor/schematic';
import { ArmorDiagramVariant, ArmorDiagramMode } from '@/stores/useAppSettingsStore';

/**
 * Sample armor data for preview
 * Represents a typical 75-ton mech with varied armor allocation
 */
const SAMPLE_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 35, maximum: 47, rear: 12, rearMaximum: 23 },
  { location: MechLocation.LEFT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
  { location: MechLocation.RIGHT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
  { location: MechLocation.LEFT_ARM, current: 20, maximum: 24 },
  { location: MechLocation.RIGHT_ARM, current: 20, maximum: 24 },
  { location: MechLocation.LEFT_LEG, current: 28, maximum: 32 },
  { location: MechLocation.RIGHT_LEG, current: 28, maximum: 32 },
];

/**
 * Variant metadata
 * Note: These are independent visual styles for the armor diagram only,
 * not related to the global UI Theme setting.
 */
export const DIAGRAM_VARIANT_INFO: Record<
  ArmorDiagramVariant,
  { name: string; description: string; features: string[] }
> = {
  'clean-tech': {
    name: 'Standard',
    description: 'Clean design with solid colors',
    features: [
      'Realistic mech silhouette',
      'Solid gradient fills',
      'Plain bold numbers',
      'Stacked front/rear',
    ],
  },
  'neon-operator': {
    name: 'Glow Effects',
    description: 'Sci-fi aesthetic with neon lighting',
    features: [
      'Wireframe outline',
      'Glowing edge effects',
      'Progress ring indicators',
      'Stacked front/rear',
    ],
  },
  'tactical-hud': {
    name: 'LED Display',
    description: 'Military-style LED readouts',
    features: [
      'Geometric shapes',
      'LED number display',
      'Tank-fill gauges',
      'Stacked front/rear',
    ],
  },
  'premium-material': {
    name: 'Metallic',
    description: 'Chrome textures with 3D depth',
    features: [
      'Realistic contour',
      'Metallic textures',
      'Circular badges',
      'Stacked front/rear',
    ],
  },
};

interface ArmorDiagramPreviewProps {
  /** The variant to preview */
  variant: ArmorDiagramVariant;
  /** Optional: compact mode (smaller size) */
  compact?: boolean;
  /** Optional: show variant label */
  showLabel?: boolean;
  /** Optional: onClick handler for selection */
  onClick?: () => void;
  /** Optional: is this variant selected */
  isSelected?: boolean;
  /** Optional: additional className */
  className?: string;
}

/**
 * Single diagram preview with sample data
 */
export function ArmorDiagramPreview({
  variant,
  compact = false,
  showLabel = false,
  onClick,
  isSelected = false,
  className = '',
}: ArmorDiagramPreviewProps): React.ReactElement {
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(null);

  const handleLocationClick = (location: MechLocation) => {
    setSelectedLocation((prev) => (prev === location ? null : location));
  };

  // Common props for all diagrams
  const diagramProps = {
    armorData: SAMPLE_ARMOR_DATA,
    selectedLocation,
    unallocatedPoints: 12,
    onLocationClick: handleLocationClick,
    className: compact ? 'transform scale-90 origin-top' : '',
  };

  const renderDiagram = () => {
    switch (variant) {
      case 'clean-tech':
        return <CleanTechDiagram {...diagramProps} />;
      case 'neon-operator':
        return <NeonOperatorDiagram {...diagramProps} />;
      case 'tactical-hud':
        return <TacticalHUDDiagram {...diagramProps} />;
      case 'premium-material':
        return <PremiumMaterialDiagram {...diagramProps} />;
      default:
        return <CleanTechDiagram {...diagramProps} />;
    }
  };

  const info = DIAGRAM_VARIANT_INFO[variant];

  return (
    <div
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {showLabel && (
        <div className="mb-2">
          <div className="text-sm font-medium text-white">{info.name}</div>
          <div className="text-xs text-text-theme-secondary">{info.description}</div>
        </div>
      )}
      <div
        className={`rounded-lg overflow-hidden transition-all ${
          isSelected
            ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface-deep'
            : onClick
            ? 'hover:ring-2 hover:ring-slate-500 hover:ring-offset-2 hover:ring-offset-surface-deep'
            : ''
        }`}
      >
        {renderDiagram()}
      </div>
    </div>
  );
}

interface ArmorDiagramGridPreviewProps {
  /** Currently selected variant */
  selectedVariant: ArmorDiagramVariant;
  /** Callback when a variant is selected */
  onSelectVariant: (variant: ArmorDiagramVariant) => void;
  /** Optional: className */
  className?: string;
}

/**
 * Grid showing all diagram variants for selection
 */
export function ArmorDiagramGridPreview({
  selectedVariant,
  onSelectVariant,
  className = '',
}: ArmorDiagramGridPreviewProps): React.ReactElement {
  const variants: ArmorDiagramVariant[] = [
    'clean-tech',
    'neon-operator',
    'tactical-hud',
    'premium-material',
  ];

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}>
      {variants.map((variant) => (
        <div
          key={variant}
          className={`p-3 rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
            selectedVariant === variant
              ? 'border-accent bg-accent/5'
              : 'border-border-theme-subtle hover:border-border-theme bg-surface-base/30'
          }`}
          onClick={() => onSelectVariant(variant)}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium text-white">
                {DIAGRAM_VARIANT_INFO[variant].name}
              </div>
              <div className="text-xs text-text-theme-secondary">
                {DIAGRAM_VARIANT_INFO[variant].description}
              </div>
            </div>
            {selectedVariant === variant && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
          {/* Container sized to fit scaled content: ~320px * 0.5 = 160px wide, ~500px * 0.5 = 250px tall */}
          <div className="relative h-[280px] overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 origin-top scale-50">
              <ArmorDiagramPreview variant={variant} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Feature list for a variant
 */
export function ArmorDiagramFeatureList({
  variant,
}: {
  variant: ArmorDiagramVariant;
}): React.ReactElement {
  const info = DIAGRAM_VARIANT_INFO[variant];

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-white">{info.name}</div>
      <ul className="text-xs text-text-theme-secondary space-y-0.5">
        {info.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-accent" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mode metadata
 */
export const DIAGRAM_MODE_INFO: Record<
  ArmorDiagramMode,
  { name: string; description: string; features: string[] }
> = {
  schematic: {
    name: 'Schematic',
    description: 'Grid-based layout with anatomical positioning',
    features: [
      'CSS grid layout',
      'Color-coded health bars',
      'Front/rear split display',
      'Desktop and mobile layouts',
    ],
  },
  silhouette: {
    name: 'Silhouette',
    description: 'SVG mech outline with visual styling',
    features: [
      'Realistic mech silhouette',
      'Multiple style variants',
      'Interactive hover states',
      'Visual armor fill indicators',
    ],
  },
};

interface ArmorDiagramModePreviewProps {
  /** Currently selected mode */
  selectedMode: ArmorDiagramMode;
  /** Callback when a mode is selected */
  onSelectMode: (mode: ArmorDiagramMode) => void;
  /** Optional: className */
  className?: string;
}

/**
 * Side-by-side mode preview for selection
 */
export function ArmorDiagramModePreview({
  selectedMode,
  onSelectMode,
  className = '',
}: ArmorDiagramModePreviewProps): React.ReactElement {
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(null);
  const modes: ArmorDiagramMode[] = ['schematic', 'silhouette'];

  const handleLocationClick = (location: MechLocation) => {
    setSelectedLocation((prev) => (prev === location ? null : location));
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}>
      {modes.map((mode) => {
        const info = DIAGRAM_MODE_INFO[mode];
        const isSelected = selectedMode === mode;

        return (
          <div
            key={mode}
            className={`p-3 rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
              isSelected
                ? 'border-accent bg-accent/5'
                : 'border-border-theme-subtle hover:border-border-theme bg-surface-base/30'
            }`}
            onClick={() => onSelectMode(mode)}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-text-theme-primary">
                  {info.name}
                </div>
                <div className="text-xs text-text-theme-secondary">
                  {info.description}
                </div>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            {/* Preview container */}
            <div className="relative h-[280px] overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 origin-top scale-50">
                {mode === 'schematic' ? (
                  <SchematicDiagram
                    armorData={SAMPLE_ARMOR_DATA}
                    selectedLocation={selectedLocation}
                    unallocatedPoints={12}
                    onLocationClick={handleLocationClick}
                  />
                ) : (
                  <CleanTechDiagram
                    armorData={SAMPLE_ARMOR_DATA}
                    selectedLocation={selectedLocation}
                    unallocatedPoints={12}
                    onLocationClick={handleLocationClick}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
