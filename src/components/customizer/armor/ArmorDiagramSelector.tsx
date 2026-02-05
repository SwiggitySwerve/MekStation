/**
 * Armor Diagram Design Selector
 *
 * UAT component for switching between armor diagram design variants.
 * Stores selection in localStorage for persistent testing.
 */

import React, { useState, useEffect } from 'react';

import { MechLocation } from '@/types/construction';

import { LocationArmorData } from './ArmorDiagram';
import {
  CleanTechDiagram,
  NeonOperatorDiagram,
  TacticalHUDDiagram,
  PremiumMaterialDiagram,
} from './variants';

export type DiagramVariant =
  | 'clean-tech'
  | 'neon-operator'
  | 'tactical-hud'
  | 'premium-material';

const STORAGE_KEY = 'mekstation-armor-diagram-variant';

const VARIANT_INFO: Record<
  DiagramVariant,
  { name: string; description: string }
> = {
  'clean-tech': {
    name: 'Clean Tech',
    description: 'Maximum readability, solid colors, stacked front/rear',
  },
  'neon-operator': {
    name: 'Neon Operator',
    description: 'Sci-fi glow, progress rings, toggle front/rear',
  },
  'tactical-hud': {
    name: 'Tactical HUD',
    description: 'Military feel, LED numbers, side-by-side views',
  },
  'premium-material': {
    name: 'Premium Material',
    description: 'Metallic textures, 3D layered plates',
  },
};

export interface ArmorDiagramSelectorProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  onAutoAllocate?: () => void;
  className?: string;
  /** Show variant selector UI (defaults to true for UAT) */
  showSelector?: boolean;
  /** Force a specific variant (overrides user selection) */
  forceVariant?: DiagramVariant;
}

/**
 * Get stored variant preference
 */
function getStoredVariant(): DiagramVariant {
  if (typeof window === 'undefined') return 'clean-tech';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in VARIANT_INFO) {
    return stored as DiagramVariant;
  }
  return 'clean-tech';
}

/**
 * Store variant preference
 */
function setStoredVariant(variant: DiagramVariant): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, variant);
  }
}

/**
 * UAT Armor Diagram with design variant selector
 */
export function ArmorDiagramSelector({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  onAutoAllocate,
  className = '',
  showSelector = true,
  forceVariant,
}: ArmorDiagramSelectorProps): React.ReactElement {
  const [variant, setVariant] = useState<DiagramVariant>('clean-tech');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load stored preference on mount
  useEffect(() => {
    if (!forceVariant) {
      setVariant(getStoredVariant());
    }
  }, [forceVariant]);

  // Handle variant change
  const handleVariantChange = (newVariant: DiagramVariant) => {
    setVariant(newVariant);
    setStoredVariant(newVariant);
    setIsDropdownOpen(false);
  };

  const activeVariant = forceVariant ?? variant;

  // Common props for all diagrams
  const diagramProps = {
    armorData,
    selectedLocation,
    unallocatedPoints,
    onLocationClick,
    onAutoAllocate,
    className: showSelector ? '' : className,
  };

  // Render the selected diagram variant
  const renderDiagram = () => {
    switch (activeVariant) {
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

  if (!showSelector) {
    return renderDiagram();
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Variant Selector */}
      <div className="bg-surface-base/50 border-border-theme rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div className="text-text-theme-secondary text-xs font-medium">
            UAT Design Testing
          </div>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-surface-raised hover:bg-surface-raised/80 flex items-center gap-2 rounded px-3 py-1.5 text-sm text-white transition-colors"
            >
              <span>{VARIANT_INFO[activeVariant].name}</span>
              <svg
                className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="bg-surface-raised border-border-theme-strong absolute right-0 z-50 mt-1 w-64 rounded-lg border shadow-xl">
                {(Object.keys(VARIANT_INFO) as DiagramVariant[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => handleVariantChange(v)}
                    className={`hover:bg-surface-base w-full px-4 py-3 text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      activeVariant === v ? 'bg-surface-base' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {VARIANT_INFO[v].name}
                      </span>
                      {activeVariant === v && (
                        <svg
                          className="h-4 w-4 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-text-theme-secondary mt-0.5 text-xs">
                      {VARIANT_INFO[v].description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Selected Diagram */}
      {renderDiagram()}
    </div>
  );
}

/**
 * Hook to get/set diagram variant preference
 */
export function useDiagramVariant(): [
  DiagramVariant,
  (v: DiagramVariant) => void,
] {
  const [variant, setVariant] = useState<DiagramVariant>('clean-tech');

  useEffect(() => {
    setVariant(getStoredVariant());
  }, []);

  const updateVariant = (newVariant: DiagramVariant) => {
    setVariant(newVariant);
    setStoredVariant(newVariant);
  };

  return [variant, updateVariant];
}
