import React from 'react';

import type { MechConfigType } from '@/types/construction/MechConfigType';

import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

import type { ConfigurableArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { ArmorDiagramQuickSettings } from '../ArmorDiagramQuickSettings';
import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import { GradientDefs } from '../shared/ArmorFills';
import {
  renderArmorLocationStates,
  useArmorVariantLayout,
} from '../shared/ArmorVariantRenderHelpers';
import {
  NeonLocation,
  getLocationsForConfig,
} from './NeonOperatorDiagram.parts';

export interface NeonOperatorDiagramProps extends ConfigurableArmorDiagramProps {
  mechConfigType?: MechConfigType;
}

export function NeonOperatorDiagram(
  props: NeonOperatorDiagramProps,
): React.ReactElement {
  const { armorData, selectedLocation, unallocatedPoints } = props;
  const { onLocationClick, className = '', mechConfigType = 'biped' } = props;
  const { hoveredLocation, setHoveredLocation, getPosition, viewBox, bounds } =
    useArmorVariantLayout(mechConfigType, 'battlemech');
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

      <ArmorDiagramSvgFrame viewBox={viewBox}>
        <GradientDefs />

        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="url(#armor-scanlines)"
          opacity="0.3"
        />

        {renderArmorLocationStates(
          locations,
          getPosition,
          armorData,
          selectedLocation,
          hoveredLocation,
          (loc, renderState) => (
            <NeonLocation
              key={loc}
              {...renderState}
              onClick={() => onLocationClick(loc)}
              onHover={(h) => setHoveredLocation(h ? loc : null)}
              configType={mechConfigType}
            />
          ),
        )}

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
      </ArmorDiagramSvgFrame>

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
