import React, { useState } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { GradientDefs } from '../shared/ArmorFills';
import { useResolvedLayout, getLayoutIdForConfig } from '../shared/layout';
import { TacticalLocation } from './TacticalHUDDiagram.parts';

export interface TacticalHUDDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
  mechConfigType?: MechConfigType;
}

function getLocationsForConfig(configType: MechConfigType): MechLocation[] {
  switch (configType) {
    case 'quad':
    case 'quadvee':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
    case 'tripod':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
    case 'lam':
    case 'biped':
    default:
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
  }
}

export function TacticalHUDDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: TacticalHUDDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );

  const layoutId = getLayoutIdForConfig(mechConfigType, 'geometric');
  const { getPosition, viewBox, bounds } = useResolvedLayout(layoutId);

  const getArmorData = (
    location: MechLocation,
  ): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const isOverAllocated = unallocatedPoints < 0;
  const locations = getLocationsForConfig(mechConfigType);

  return (
    <div
      className={`bg-surface-deep border-border-theme-subtle rounded-lg border p-4 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <h3 className="font-mono text-sm font-bold tracking-wider text-slate-300">
            ARMOR DIAGNOSTIC
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={viewBox}
          className="mx-auto w-full max-w-[300px]"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;

            return (
              <TacticalLocation
                key={loc}
                location={loc}
                position={position}
                data={getArmorData(loc)}
                isSelected={selectedLocation === loc}
                isHovered={hoveredLocation === loc}
                onClick={() => onLocationClick(loc)}
                onHover={(hovered) => setHoveredLocation(hovered ? loc : null)}
                configType={mechConfigType}
              />
            );
          })}

          <line
            x1={bounds.minX}
            y1="0"
            x2={bounds.maxX}
            y2="0"
            stroke="#22d3ee"
            strokeWidth="1"
            opacity="0.3"
          >
            <animate
              attributeName="y1"
              values={`${bounds.minY};${bounds.maxY};${bounds.minY}`}
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y2"
              values={`${bounds.minY};${bounds.maxY};${bounds.minY}`}
              dur="4s"
              repeatCount="indefinite"
            />
          </line>
        </svg>
      </div>

      <div className="mt-3 flex justify-center gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-green-500" />
          <span className="text-text-theme-muted">
            {Math.round(ARMOR_STATUS.HEALTHY.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
          <span className="text-text-theme-muted">
            {Math.round(ARMOR_STATUS.MODERATE.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
          <span className="text-text-theme-muted">
            {Math.round(ARMOR_STATUS.LOW.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          <span className="text-text-theme-muted">
            &lt;{Math.round(ARMOR_STATUS.LOW.min * 100)}%
          </span>
        </div>
      </div>

      <div className="bg-surface-base/50 mt-3 flex items-center justify-between rounded px-2 py-1.5 font-mono text-xs">
        <div className="flex items-center gap-4">
          <span className="text-text-theme-muted">STATUS:</span>
          <span className={isOverAllocated ? 'text-red-400' : 'text-green-400'}>
            {isOverAllocated ? 'OVERALLOC' : 'NOMINAL'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-theme-muted">AVAIL:</span>
          <span
            className={unallocatedPoints < 0 ? 'text-red-400' : 'text-cyan-400'}
          >
            {unallocatedPoints}
          </span>
        </div>
      </div>

      <p className="mt-2 text-center font-mono text-xs text-slate-600">
        SELECT LOCATION TO MODIFY
      </p>
    </div>
  );
}
