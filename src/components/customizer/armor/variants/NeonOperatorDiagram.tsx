import React, { useState } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { GradientDefs } from '../shared/ArmorFills';
import { useResolvedLayout, getLayoutIdForConfig } from '../shared/layout';
import {
  NeonLocation,
  getLocationsForConfig,
} from './NeonOperatorDiagram.parts';

export interface NeonOperatorDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  unallocatedPoints: number;
  onLocationClick: (location: MechLocation) => void;
  className?: string;
  mechConfigType?: MechConfigType;
}

export function NeonOperatorDiagram({
  armorData,
  selectedLocation,
  unallocatedPoints,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: NeonOperatorDiagramProps): React.ReactElement {
  const [hoveredLocation, setHoveredLocation] = useState<MechLocation | null>(
    null,
  );

  const layoutId = getLayoutIdForConfig(mechConfigType, 'battlemech');
  const { getPosition, viewBox, bounds } = useResolvedLayout(layoutId);

  const getArmorData = (
    location: MechLocation,
  ): LocationArmorData | undefined => {
    return armorData.find((d) => d.location === location);
  };

  const locations = getLocationsForConfig(mechConfigType);

  return (
    <div
      className={`bg-surface-deep rounded-lg border border-cyan-900/50 p-4 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3
            className="text-lg font-semibold text-cyan-400"
            style={{ textShadow: '0 0 10px rgba(34, 211, 238, 0.5)' }}
          >
            ARMOR STATUS
          </h3>
          <ArmorDiagramQuickSettings />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={viewBox}
          className="mx-auto w-full max-w-[280px]"
          style={{ height: 'auto' }}
        >
          <GradientDefs />

          <rect
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.width}
            height={bounds.height}
            fill="url(#armor-scanlines)"
            opacity="0.3"
          />

          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;

            return (
              <NeonLocation
                key={loc}
                location={loc}
                position={position}
                data={getArmorData(loc)}
                isSelected={selectedLocation === loc}
                isHovered={hoveredLocation === loc}
                onClick={() => onLocationClick(loc)}
                onHover={(h) => setHoveredLocation(h ? loc : null)}
                configType={mechConfigType}
              />
            );
          })}

          {hoveredLocation &&
            (() => {
              const hoveredPos = getPosition(hoveredLocation);
              if (!hoveredPos) return null;
              return (
                <g className="pointer-events-none">
                  <circle
                    cx={hoveredPos.center.x}
                    cy={hoveredPos.center.y}
                    r={40}
                    fill="none"
                    stroke="rgba(34, 211, 238, 0.3)"
                    strokeWidth="1"
                    strokeDasharray="8 4"
                    className="animate-spin"
                    style={{ animationDuration: '8s' }}
                  />
                </g>
              );
            })()}
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full bg-green-500"
            style={{ boxShadow: '0 0 6px #22c55e' }}
          />
          <span className="text-text-theme-secondary">
            {Math.round(ARMOR_STATUS.HEALTHY.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full bg-amber-500"
            style={{ boxShadow: '0 0 6px #f59e0b' }}
          />
          <span className="text-text-theme-secondary">
            {Math.round(ARMOR_STATUS.MODERATE.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full bg-orange-500"
            style={{ boxShadow: '0 0 6px #f97316' }}
          />
          <span className="text-text-theme-secondary">
            {Math.round(ARMOR_STATUS.LOW.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full bg-red-500"
            style={{ boxShadow: '0 0 6px #ef4444' }}
          />
          <span className="text-text-theme-secondary">
            &lt;{Math.round(ARMOR_STATUS.LOW.min * 100)}%
          </span>
        </div>
        <div className="bg-surface-raised h-3 w-px" />
        <span
          className={`${unallocatedPoints < 0 ? 'text-red-400' : 'text-cyan-400'}`}
        >
          UNALLOC: {unallocatedPoints}
        </span>
      </div>

      <p className="mt-2 text-center text-xs text-cyan-500/70">
        SELECT TARGET LOCATION
      </p>
    </div>
  );
}
