/**
 * MegaMek Armor Diagram
 *
 * Design Philosophy: Authentic MegaMek record sheet appearance
 * - Layered rendering: shadow → fill → outline for depth
 * - Detailed mech silhouette with hand actuators and knee joints
 * - Classic record sheet proportions and styling
 * - Clean, professional appearance matching PDF output
 *
 * Uses the Layout Engine for constraint-based positioning.
 */

import React from 'react';

import type { MechConfigType } from '@/types/construction/MechConfigType';

import type { ConfigurableArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { ArmorStatusLegend, ArmorDiagramInstructions } from '../shared';
import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import {
  getArmorLocationsForConfig,
  renderArmorLocationStates,
  useArmorVariantLayout,
} from '../shared/ArmorVariantRenderHelpers';
import { DiagramHeader } from '../shared/DiagramHeader';
import { MegaMekLocation } from './MegaMekDiagram.location';

export interface MegaMekDiagramProps extends ConfigurableArmorDiagramProps {
  /** Mech configuration type for layout selection */
  mechConfigType?: MechConfigType;
}

export function MegaMekDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: MegaMekDiagramProps): React.ReactElement {
  const { hoveredLocation, setHoveredLocation, getPosition, viewBox, bounds } =
    useArmorVariantLayout(mechConfigType, 'megamek');
  // Get locations based on mech configuration type
  const locations = getArmorLocationsForConfig(mechConfigType);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
    >
      <DiagramHeader title="Armor Allocation" />

      {/* Diagram - uses auto-calculated viewBox from layout engine */}
      <ArmorDiagramSvgFrame viewBox={viewBox}>
        <defs>
          {/* Grid pattern for background */}
          <pattern
            id="megamek-grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Background */}
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="url(#megamek-grid)"
        />

        {/* Render all locations using layout engine positions */}
        {renderArmorLocationStates(
          locations,
          getPosition,
          armorData,
          selectedLocation,
          hoveredLocation,
          (loc, renderState) => (
            <MegaMekLocation
              key={loc}
              {...renderState}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
              configType={mechConfigType}
            />
          ),
        )}
      </ArmorDiagramSvgFrame>

      <ArmorStatusLegend />
      <ArmorDiagramInstructions />
    </div>
  );
}
