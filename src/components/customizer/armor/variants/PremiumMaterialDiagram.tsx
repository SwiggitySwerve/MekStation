import React, { useState } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { MechConfigType } from '@/types/construction/MechConfigType';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { GradientDefs } from '../shared/ArmorFills';
import { useResolvedLayout, getLayoutIdForConfig } from '../shared/layout';
import { PremiumLocation } from './PremiumMaterialDiagram.parts';

export interface PremiumMaterialDiagramProps {
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

export function PremiumMaterialDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: PremiumMaterialDiagramProps): React.ReactElement {
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
      className={`rounded-xl border p-5 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderColor: '#334155',
      }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-200">
            Armor Configuration
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

          <ellipse
            cx={bounds.minX + bounds.width / 2}
            cy={bounds.minY + bounds.height / 2}
            rx={bounds.width * 0.4}
            ry={bounds.height * 0.4}
            fill="url(#armor-gradient-selected)"
            opacity="0.03"
          />

          {locations.map((loc) => {
            const position = getPosition(loc);
            if (!position) return null;

            return (
              <PremiumLocation
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
        </svg>
      </div>

      <div className="mt-5 flex justify-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
          <span className="text-text-theme-secondary text-xs">
            {Math.round(ARMOR_STATUS.HEALTHY.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
          <span className="text-text-theme-secondary text-xs">
            {Math.round(ARMOR_STATUS.MODERATE.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/30" />
          <span className="text-text-theme-secondary text-xs">
            {Math.round(ARMOR_STATUS.LOW.min * 100)}%+
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
          <span className="text-text-theme-secondary text-xs">
            &lt;{Math.round(ARMOR_STATUS.LOW.min * 100)}%
          </span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Tap any plate to adjust armor values
      </p>
    </div>
  );
}
