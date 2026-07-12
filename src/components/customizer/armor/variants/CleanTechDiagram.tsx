/**
 * Clean Tech Armor Diagram
 *
 * Design Philosophy: Maximum readability and usability
 * - Realistic mech contour silhouette
 * - Solid gradient fills based on armor status
 * - Plain bold numbers for armor values
 * - Color + small text for capacity indication
 * - Stacked front/rear display
 * - Simple border highlight on interaction
 *
 * Uses the Layout Engine for constraint-based positioning.
 */

import React from 'react';

import type { MechConfigType } from '@/types/construction/MechConfigType';

import type { ConfigurableArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { ArmorStatusLegend, ArmorDiagramInstructions } from '../shared';
import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import { GradientDefs } from '../shared/ArmorFills';
import {
  getArmorLocationsForConfig,
  renderArmorLocationStates,
  useArmorVariantLayout,
} from '../shared/ArmorVariantRenderHelpers';
import { DiagramHeader } from '../shared/DiagramHeader';
import { CleanTechLocation } from './CleanTechDiagram.location';

export interface CleanTechDiagramProps extends ConfigurableArmorDiagramProps {
  /** Mech configuration type for layout selection */
  mechConfigType?: MechConfigType;
}

export function CleanTechDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: CleanTechDiagramProps): React.ReactElement {
  const { hoveredLocation, setHoveredLocation, getPosition, viewBox, bounds } =
    useArmorVariantLayout(mechConfigType, 'battlemech');
  // Get locations based on mech configuration type
  const locations = getArmorLocationsForConfig(mechConfigType);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle rounded-lg border p-4 ${className}`}
    >
      <DiagramHeader title="Armor Allocation" />

      {/* Diagram - uses auto-calculated viewBox from layout engine */}
      <ArmorDiagramSvgFrame viewBox={viewBox}>
        <GradientDefs />

        {/* Background grid pattern */}
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="url(#armor-grid)"
          opacity="0.5"
        />

        {/* Render all locations using layout engine positions */}
        {renderArmorLocationStates(
          locations,
          getPosition,
          armorData,
          selectedLocation,
          hoveredLocation,
          (loc, renderState) => (
            <CleanTechLocation
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
