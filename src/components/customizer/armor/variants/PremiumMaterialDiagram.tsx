import React from 'react';

import type { MechConfigType } from '@/types/construction/MechConfigType';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

import type { ConfigurableArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import { GradientDefs } from '../shared/ArmorFills';
import {
  getArmorLocationsForConfig,
  renderArmorLocationStates,
  useArmorVariantLayout,
} from '../shared/ArmorVariantRenderHelpers';
import { PremiumLocation } from './PremiumMaterialDiagram.parts';

export interface PremiumMaterialDiagramProps extends ConfigurableArmorDiagramProps {
  mechConfigType?: MechConfigType;
}

export function PremiumMaterialDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  mechConfigType = 'biped',
}: PremiumMaterialDiagramProps): React.ReactElement {
  const { hoveredLocation, setHoveredLocation, getPosition, viewBox, bounds } =
    useArmorVariantLayout(mechConfigType, 'battlemech');
  const locations = getArmorLocationsForConfig(mechConfigType);

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

      <ArmorDiagramSvgFrame viewBox={viewBox}>
        <GradientDefs />

        <ellipse
          cx={bounds.minX + bounds.width / 2}
          cy={bounds.minY + bounds.height / 2}
          rx={bounds.width * 0.4}
          ry={bounds.height * 0.4}
          fill="url(#armor-gradient-selected)"
          opacity="0.03"
        />

        {renderArmorLocationStates(
          locations,
          getPosition,
          armorData,
          selectedLocation,
          hoveredLocation,
          (loc, renderState) => (
            <PremiumLocation
              key={loc}
              {...renderState}
              onClick={() => onLocationClick(loc)}
              onHover={(hovered) => setHoveredLocation(hovered ? loc : null)}
              configType={mechConfigType}
            />
          ),
        )}
      </ArmorDiagramSvgFrame>

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
