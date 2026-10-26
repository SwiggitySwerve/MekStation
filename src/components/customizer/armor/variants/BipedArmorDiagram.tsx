import React, { useId, useState } from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import { MechLocation } from '@/types/construction';

import { ArmorDiagramInstructions, ArmorStatusLegend } from '../shared';
import { ArmorDiagramSvgFrame } from '../shared/ArmorDiagramSvgFrame';
import { getArmorStatusColor } from '../shared/ArmorFills';
import { ArmorLocationInteractionGroup } from '../shared/ArmorLocationInteractionGroup';
import {
  BIPED_ARMOR_LOCATIONS,
  type ConfigurableArmorDiagramProps,
} from '../shared/ArmorVariantRenderHelpers';
import { DiagramHeader } from '../shared/DiagramHeader';
import { BipedArmorSurface, BIPED_ARMOR_INK } from './BipedArmorSurface';
import { BIPED_ARMOR_PLATES } from './CleanTechBipedDiagram.geometry';

interface BipedArmorDiagramProps extends ConfigurableArmorDiagramProps {
  variant?: ArmorDiagramVariant;
}

export function BipedArmorDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  className = '',
  variant = 'clean-tech',
  unallocatedPoints,
}: BipedArmorDiagramProps): React.ReactElement {
  const [hovered, setHovered] = useState<MechLocation | null>(null);

  const gridId = useId();

  return (
    <div
      className={`bg-surface-base border-border-theme rounded-lg border p-4 ${className}`}
      data-armor-variant={variant}
    >
      <DiagramHeader title="Armor Allocation" />
      <p className="text-text-theme-secondary mb-2 text-center text-xs">
        Front view · rear armor shown inside torso
      </p>
      <ArmorDiagramSvgFrame
        viewBox="0 0 360 440"
        className="mx-auto w-full max-w-[360px] xl:max-w-[400px]"
      >
        <g
          fill="var(--text-secondary)"
          fontSize="14"
          textAnchor="middle"
          aria-hidden="true"
        >
          <text x="48" y="55">
            Right
          </text>
          <text x="312" y="55">
            Left
          </text>
        </g>
        <defs>
          <pattern
            id={gridId}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect
          x="8"
          y="8"
          width="344"
          height="424"
          fill={`url(#${gridId})`}
          opacity={variant === 'megamek' ? 0 : 0.32}
          aria-hidden="true"
        />
        <g
          fill="var(--surface-deep)"
          stroke="var(--border-subtle)"
          aria-hidden="true"
        >
          <path d="M163 74 H197 V104 H163 Z M136 207 H224 L238 250 H122 Z" />
          <path d="M55 127 H305 M129 294 H231" fill="none" strokeWidth="12" />
          <path d="M180 12 V428" fill="none" strokeDasharray="3 7" />
        </g>
        {BIPED_ARMOR_LOCATIONS.map((location) => {
          const plate = BIPED_ARMOR_PLATES[location];
          if (!plate) return null;
          const data = armorData.find((item) => item.location === location);
          const current = data?.current ?? 0;
          const maximum = data?.maximum ?? 0;
          const rear = data?.rear ?? 0;
          const showRear = plate.rearY !== undefined;
          const total = current + (showRear ? rear : 0);
          const selected = selectedLocation === location;
          const focused = hovered === location;
          const statusColor = getArmorStatusColor(total, maximum);
          const ratio =
            maximum > 0 ? Math.min(1, Math.max(0, total / maximum)) : 0;
          const displayColor = statusColor;
          const ink = BIPED_ARMOR_INK;
          return (
            <ArmorLocationInteractionGroup
              key={location}
              location={location}
              current={current}
              maximum={maximum}
              rear={rear}
              rearMaximum={data?.rearMaximum ?? 0}
              showRear={showRear}
              isSelected={selected}
              onClick={() => onLocationClick(location)}
              onHover={(active) => setHovered(active ? location : null)}
            >
              <title>{selected ? location + ' — selected' : location}</title>
              <BipedArmorSurface
                path={plate.path}
                location={location}
                variant={variant}
                current={total}
                maximum={maximum}
                selected={selected}
                focused={focused}
              />
              <circle
                data-armor-status={location}
                cx={plate.x + 25}
                cy={plate.y - 4}
                r="2.5"
                fill={statusColor}
                stroke="#0f172a"
                strokeWidth="0.75"
                pointerEvents="none"
              />
              <g
                textAnchor="middle"
                className={`pointer-events-none ${variant === 'tactical-hud' ? 'font-mono' : ''}`}
                fill={ink.primary}
              >
                {variant === 'premium-material' && (
                  <>
                    <rect
                      x={plate.x - 22}
                      y={plate.y + 3}
                      width="44"
                      height="26"
                      rx="6"
                      fill="#071a16"
                      fillOpacity="0.9"
                      stroke={statusColor}
                      strokeWidth="0.75"
                    />
                    {showRear && (
                      <rect
                        x={plate.x - 18}
                        y={plate.rearY! + 3}
                        width="36"
                        height="22"
                        rx="5"
                        fill="#071a16"
                        fillOpacity="0.9"
                        stroke={statusColor}
                        strokeWidth="0.75"
                      />
                    )}
                  </>
                )}
                <text
                  x={plate.x}
                  y={plate.y}
                  fontSize="14"
                  fontWeight="600"
                  style={
                    variant === 'premium-material'
                      ? {
                          paintOrder: 'stroke',
                          stroke: '#071a16',
                          strokeWidth: 2,
                        }
                      : undefined
                  }
                >
                  {plate.label}
                </text>
                <text
                  x={plate.x}
                  y={plate.y + 23}
                  fontSize="22"
                  fontWeight="700"
                >
                  {current}
                </text>
                {showRear ? (
                  <>
                    <path
                      d={`M${plate.x - 20} ${plate.rearY! - 19} h40`}
                      stroke={ink.secondary}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={plate.x}
                      y={plate.rearY}
                      fontSize="13"
                      fill={ink.secondary}
                    >
                      REAR
                    </text>
                    <text
                      x={plate.x}
                      y={plate.rearY! + 19}
                      fontSize="18"
                      fontWeight="600"
                    >
                      {rear}
                    </text>
                    <text
                      x={plate.x}
                      y={plate.y + 40}
                      fontSize="13"
                      fill={ink.secondary}
                    >
                      {total} / {maximum}
                    </text>
                  </>
                ) : location !== MechLocation.HEAD ? (
                  <text
                    x={plate.x}
                    y={plate.y + 40}
                    fontSize="14"
                    fill={ink.secondary}
                  >
                    / {maximum}
                  </text>
                ) : null}
                {!showRear && location !== MechLocation.HEAD && (
                  <>
                    <path
                      d={`M${plate.x - 18} ${plate.y + 51} h36`}
                      stroke="var(--surface-deep)"
                      strokeWidth="4"
                    />
                    <path
                      d={`M${plate.x - 18} ${plate.y + 51} h${36 * ratio}`}
                      stroke={displayColor}
                      strokeWidth="4"
                    />
                  </>
                )}
              </g>
            </ArmorLocationInteractionGroup>
          );
        })}
      </ArmorDiagramSvgFrame>
      <p className="text-text-theme-secondary mb-3 text-center text-xs">
        Torso totals include front and rear armor.
      </p>
      <div className="border-border-theme-subtle bg-surface-deep flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded border px-3 py-3">
        <div className="flex items-baseline gap-2 text-xs" aria-live="polite">
          <span
            className={
              unallocatedPoints < 0
                ? 'text-red-400'
                : 'text-text-theme-secondary'
            }
          >
            {unallocatedPoints < 0 ? 'Over allocated' : 'Unallocated:'}
          </span>
          <span className="text-text-theme-primary font-semibold tabular-nums">
            {Math.abs(unallocatedPoints)} points
          </span>
        </div>
        <ArmorStatusLegend className="mt-0! flex-wrap" />
      </div>
      <ArmorDiagramInstructions />
    </div>
  );
}
