/**
 * Armor Diagram Preview Component
 *
 * Shows a preview of armor diagram designs with sample data.
 * Used in settings page to let users see design variants before selecting.
 */

import React, { useState, useMemo } from 'react';
import { MechLocation } from '@/types/construction';
import { LocationArmorData } from './ArmorDiagram';
import {
  CleanTechDiagram,
  NeonOperatorDiagram,
  TacticalHUDDiagram,
  PremiumMaterialDiagram,
  MegaMekDiagram,
} from './variants';
import { SchematicDiagram } from '@/components/armor/schematic';
import { ArmorDiagramVariant, ArmorDiagramMode } from '@/stores/useAppSettingsStore';
import { MechConfigType } from './shared/layout/useResolvedLayout';

/**
 * Sample armor data for different mech configurations
 */
const SAMPLE_BIPED_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 35, maximum: 47, rear: 12, rearMaximum: 23 },
  { location: MechLocation.LEFT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
  { location: MechLocation.RIGHT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
  { location: MechLocation.LEFT_ARM, current: 20, maximum: 24 },
  { location: MechLocation.RIGHT_ARM, current: 20, maximum: 24 },
  { location: MechLocation.LEFT_LEG, current: 28, maximum: 32 },
  { location: MechLocation.RIGHT_LEG, current: 28, maximum: 32 },
];

const SAMPLE_QUAD_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 38, maximum: 50, rear: 14, rearMaximum: 25 },
  { location: MechLocation.LEFT_TORSO, current: 26, maximum: 34, rear: 10, rearMaximum: 17 },
  { location: MechLocation.RIGHT_TORSO, current: 26, maximum: 34, rear: 10, rearMaximum: 17 },
  { location: MechLocation.FRONT_LEFT_LEG, current: 22, maximum: 28 },
  { location: MechLocation.FRONT_RIGHT_LEG, current: 22, maximum: 28 },
  { location: MechLocation.REAR_LEFT_LEG, current: 22, maximum: 28 },
  { location: MechLocation.REAR_RIGHT_LEG, current: 22, maximum: 28 },
];

const SAMPLE_TRIPOD_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 40, maximum: 52, rear: 15, rearMaximum: 26 },
  { location: MechLocation.LEFT_TORSO, current: 28, maximum: 36, rear: 10, rearMaximum: 18 },
  { location: MechLocation.RIGHT_TORSO, current: 28, maximum: 36, rear: 10, rearMaximum: 18 },
  { location: MechLocation.LEFT_ARM, current: 22, maximum: 26 },
  { location: MechLocation.RIGHT_ARM, current: 22, maximum: 26 },
  { location: MechLocation.LEFT_LEG, current: 26, maximum: 32 },
  { location: MechLocation.RIGHT_LEG, current: 26, maximum: 32 },
  { location: MechLocation.CENTER_LEG, current: 30, maximum: 36 },
];

const SAMPLE_LAM_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 8, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 28, maximum: 35, rear: 10, rearMaximum: 17 },
  { location: MechLocation.LEFT_TORSO, current: 20, maximum: 26, rear: 7, rearMaximum: 13 },
  { location: MechLocation.RIGHT_TORSO, current: 20, maximum: 26, rear: 7, rearMaximum: 13 },
  { location: MechLocation.LEFT_ARM, current: 16, maximum: 20 },
  { location: MechLocation.RIGHT_ARM, current: 16, maximum: 20 },
  { location: MechLocation.LEFT_LEG, current: 22, maximum: 26 },
  { location: MechLocation.RIGHT_LEG, current: 22, maximum: 26 },
];

const SAMPLE_QUADVEE_ARMOR_DATA: LocationArmorData[] = [
  { location: MechLocation.HEAD, current: 9, maximum: 9 },
  { location: MechLocation.CENTER_TORSO, current: 42, maximum: 54, rear: 16, rearMaximum: 27 },
  { location: MechLocation.LEFT_TORSO, current: 28, maximum: 36, rear: 11, rearMaximum: 18 },
  { location: MechLocation.RIGHT_TORSO, current: 28, maximum: 36, rear: 11, rearMaximum: 18 },
  { location: MechLocation.FRONT_LEFT_LEG, current: 24, maximum: 30 },
  { location: MechLocation.FRONT_RIGHT_LEG, current: 24, maximum: 30 },
  { location: MechLocation.REAR_LEFT_LEG, current: 24, maximum: 30 },
  { location: MechLocation.REAR_RIGHT_LEG, current: 24, maximum: 30 },
];

/**
 * Get sample armor data for a mech configuration type
 */
function getSampleArmorData(configType: MechConfigType): LocationArmorData[] {
  switch (configType) {
    case 'quad':
      return SAMPLE_QUAD_ARMOR_DATA;
    case 'tripod':
      return SAMPLE_TRIPOD_ARMOR_DATA;
    case 'lam':
      return SAMPLE_LAM_ARMOR_DATA;
    case 'quadvee':
      return SAMPLE_QUADVEE_ARMOR_DATA;
    case 'biped':
    default:
      return SAMPLE_BIPED_ARMOR_DATA;
  }
}

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
  const [selectedLocation, setSelectedLocation] = useState<MechLocation | null>(null);

  const handleLocationClick = (location: MechLocation) => {
    setSelectedLocation((prev) => (prev === location ? null : location));
  };

  // Get sample armor data for the mech configuration type
  const armorData = useMemo(() => getSampleArmorData(mechConfigType), [mechConfigType]);

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

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}>
      {ALL_VARIANTS.map((variant) => (
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
