/**
 * Armor Diagram Preview Component
 *
 * Shows a preview of armor diagram designs with sample data.
 * Used in settings page to let users see design variants before selecting.
 */

import React, { useState, useMemo } from 'react';

import type { MechConfigType } from '@/types/construction/MechConfigType';

import { SchematicDiagram } from '@/components/armor/schematic';
import {
  ArmorDiagramVariant,
  ArmorDiagramMode,
} from '@/stores/useAppSettingsStore';
import { MechLocation } from '@/types/construction';
import {
  getSampleArmorData,
  SAMPLE_BIPED_ARMOR_DATA,
} from '@/utils/armor/armorDataRegistry';

import {
  CleanTechDiagram,
  NeonOperatorDiagram,
  TacticalHUDDiagram,
  PremiumMaterialDiagram,
  MegaMekDiagram,
} from './variants';

// Backward compatibility alias
const SAMPLE_ARMOR_DATA = SAMPLE_BIPED_ARMOR_DATA;

import {
  VARIANT_NAMES,
  VARIANT_DESCRIPTIONS,
  VARIANT_IDS,
  ALL_VARIANTS,
} from './shared/VariantConstants';

/**
 * Variant metadata
 * Note: These are independent visual styles for the armor diagram only,
 * not related to the global UI Theme setting.
 */
export const DIAGRAM_VARIANT_INFO: Record<
  ArmorDiagramVariant,
  { name: string; description: string; features: string[] }
> = {
  [VARIANT_IDS.STANDARD]: {
    name: VARIANT_NAMES[VARIANT_IDS.STANDARD],
    description: VARIANT_DESCRIPTIONS[VARIANT_IDS.STANDARD],
    features: [
      'Realistic mech silhouette',
      'Solid gradient fills',
      'Plain bold numbers',
      'Stacked front/rear',
    ],
  },
  [VARIANT_IDS.GLOW]: {
    name: VARIANT_NAMES[VARIANT_IDS.GLOW],
    description: VARIANT_DESCRIPTIONS[VARIANT_IDS.GLOW],
    features: [
      'Wireframe outline',
      'Glowing edge effects',
      'Progress ring indicators',
      'Stacked front/rear',
    ],
  },
  [VARIANT_IDS.HUD]: {
    name: VARIANT_NAMES[VARIANT_IDS.HUD],
    description: VARIANT_DESCRIPTIONS[VARIANT_IDS.HUD],
    features: [
      'Geometric shapes',
      'LED number display',
      'Tank-fill gauges',
      'Stacked front/rear',
    ],
  },
  [VARIANT_IDS.CHROMATIC]: {
    name: VARIANT_NAMES[VARIANT_IDS.CHROMATIC],
    description: VARIANT_DESCRIPTIONS[VARIANT_IDS.CHROMATIC],
    features: [
      'Realistic contour',
      'Metallic textures',
      'Circular badges',
      'Stacked front/rear',
    ],
  },
  [VARIANT_IDS.MEGAMEK]: {
    name: VARIANT_NAMES[VARIANT_IDS.MEGAMEK],
    description: VARIANT_DESCRIPTIONS[VARIANT_IDS.MEGAMEK],
    features: [
      'Classic beige/cream palette',
      'Layered shadow/fill/outline',
      'PDF record sheet proportions',
      'Dark text on light fills',
    ],
  },
};

interface ArmorDiagramPreviewProps {
  /** The variant to preview */
  variant: ArmorDiagramVariant;
  /** Optional: mech configuration type for preview */
  mechConfigType?: MechConfigType;
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
  mechConfigType = 'biped',
  compact = false,
  showLabel = false,
  onClick,
  isSelected = false,
  className = '',
}: ArmorDiagramPreviewProps): React.ReactElement {
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(
    null,
  );

  const handleLocationClick = (location: MechLocation) => {
    setSelectedLocation((prev) => (prev === location ? null : location));
  };

  // Get sample armor data for the mech configuration type
  const armorData = useMemo(
    () => getSampleArmorData(mechConfigType),
    [mechConfigType],
  );

  // Common props for all diagrams
  const diagramProps = {
    armorData,
    selectedLocation,
    unallocatedPoints: 12,
    onLocationClick: handleLocationClick,
    className: compact ? 'transform scale-90 origin-top' : '',
    mechConfigType,
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
      case 'megamek':
        return <MegaMekDiagram {...diagramProps} />;
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
          <div className="text-text-theme-secondary text-xs">
            {info.description}
          </div>
        </div>
      )}
      <div
        className={`overflow-hidden rounded-lg transition-all ${
          isSelected
            ? 'ring-accent ring-offset-surface-deep ring-2 ring-offset-2'
            : onClick
              ? 'hover:ring-offset-surface-deep hover:ring-2 hover:ring-slate-500 hover:ring-offset-2'
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
  return (
    <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${className}`}>
      {ALL_VARIANTS.map((variant) => (
        <div
          key={variant}
          className={`cursor-pointer overflow-hidden rounded-lg border-2 p-3 transition-all ${
            selectedVariant === variant
              ? 'border-accent bg-accent/5'
              : 'border-border-theme-subtle hover:border-border-theme bg-surface-base/30'
          }`}
          onClick={() => onSelectVariant(variant)}
        >
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">
                {DIAGRAM_VARIANT_INFO[variant].name}
              </div>
              <div className="text-text-theme-secondary text-xs">
                {DIAGRAM_VARIANT_INFO[variant].description}
              </div>
            </div>
            {selectedVariant === variant && (
              <div className="bg-accent flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full">
                <svg
                  className="h-3 w-3 text-white"
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
            <div className="absolute top-0 left-1/2 origin-top -translate-x-1/2 scale-50">
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
      <ul className="text-text-theme-secondary space-y-0.5 text-xs">
        {info.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="bg-accent h-1 w-1 rounded-full" />
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
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(
    null,
  );
  const modes: ArmorDiagramMode[] = ['schematic', 'silhouette'];

  const handleLocationClick = (location: MechLocation) => {
    setSelectedLocation((prev) => (prev === location ? null : location));
  };

  return (
    <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${className}`}>
      {modes.map((mode) => {
        const info = DIAGRAM_MODE_INFO[mode];
        const isSelected = selectedMode === mode;

        return (
          <div
            key={mode}
            className={`cursor-pointer overflow-hidden rounded-lg border-2 p-3 transition-all ${
              isSelected
                ? 'border-accent bg-accent/5'
                : 'border-border-theme-subtle hover:border-border-theme bg-surface-base/30'
            }`}
            onClick={() => onSelectMode(mode)}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-text-theme-primary text-sm font-medium">
                  {info.name}
                </div>
                <div className="text-text-theme-secondary text-xs">
                  {info.description}
                </div>
              </div>
              {isSelected && (
                <div className="bg-accent flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full">
                  <svg
                    className="h-3 w-3 text-white"
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
              <div className="absolute top-0 left-1/2 origin-top -translate-x-1/2 scale-50">
                {mode === 'schematic' ? (
                  <SchematicDiagram
                    armorData={SAMPLE_ARMOR_DATA}
                    selectedLocation={selectedLocation}
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
