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
import { TacticalLocation } from './TacticalHUDDiagram.parts';

export interface TacticalHUDDiagramProps extends ConfigurableArmorDiagramProps {
  mechConfigType?: MechConfigType;
}

export function TacticalHUDDiagram(
  props: TacticalHUDDiagramProps,
): React.ReactElement {
  const { armorData, selectedLocation, unallocatedPoints } = props;
  const { onLocationClick, className = '', mechConfigType = 'biped' } = props;
  const { hoveredLocation, setHoveredLocation, getPosition, viewBox, bounds } =
    useArmorVariantLayout(mechConfigType, 'geometric');
  const isOverAllocated = unallocatedPoints < 0;
  const locations = getArmorLocationsForConfig(mechConfigType);

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

      <ArmorDiagramSvgFrame
        viewBox={viewBox}
        className="mx-auto w-full max-w-[300px]"
      >
        <GradientDefs />

        {renderArmorLocationStates(
          locations,
          getPosition,
          armorData,
          selectedLocation,
          hoveredLocation,
          (loc, renderState) => (
            <TacticalLocation
              key={loc}
              {...renderState}
              onClick={() => onLocationClick(loc)}
              onHover={(hovered) => setHoveredLocation(hovered ? loc : null)}
              configType={mechConfigType}
            />
          ),
        )}

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
      </ArmorDiagramSvgFrame>

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
