import React from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import { MechLocation } from '@/types/construction';

import { BIPED_ARMOR_INK } from './BipedArmorSurface';
import {
  BIPED_PLATE_STACK as STACK,
  type BipedArmorPlate,
} from './CleanTechBipedDiagram.geometry';

/**
 * Text sizes in viewBox units. On a 390px phone the diagram renders at about
 * 0.83 px per unit (the viewBox is 420 units wide and the figure's height is
 * capped to keep the footer above the Loadout bar), so the 17-unit "/max"
 * denominators, face split line and abbreviations render at about 14 px.
 */
const FONT = {
  abbreviation: 17,
  value: 22,
  maximum: 17,
} as const;

/** Half-width of the limb fill bar. */
const BAR_HALF_WIDTH = 18;

const PREMIUM_BACKING = {
  fill: '#071a16',
  fillOpacity: 0.9,
  strokeWidth: 0.75,
} as const;

interface BipedArmorPlateLabelProps {
  readonly plate: BipedArmorPlate;
  readonly location: MechLocation;
  readonly variant: ArmorDiagramVariant;
  /** Front armor allocated. */
  readonly current: number;
  /** Rear armor allocated (torsos only). */
  readonly rear: number;
  /** Whole-location maximum, shared by front and rear. */
  readonly maximum: number;
  readonly statusColor: string;
  /** Allocated share of the location maximum, 0-1. */
  readonly ratio: number;
}

/**
 * The text drawn inside one biped armor plate. Every location uses the same
 * stack, centred on the plate: the abbreviation, the location's armor in bold
 * with its one "/max" muted on the same baseline and, on torsos, a muted
 * "F47·R14" line splitting that total (the widest line a torso plate holds
 * at the phone text size). Front and rear share the location
 * maximum, so torsos never show a per-side maximum a player could add up.
 */
export function BipedArmorPlateLabel({
  plate,
  location,
  variant,
  current,
  rear,
  maximum,
  statusColor,
  ratio,
}: BipedArmorPlateLabelProps): React.ReactElement {
  const ink = BIPED_ARMOR_INK;
  const isPremium = variant === 'premium-material';
  const isHead = location === MechLocation.HEAD;
  const hasRear = plate.hasRear === true;
  const hasBar = !hasRear && !isHead;
  const shown = hasRear ? current + rear : current;
  const backing = {
    fill: PREMIUM_BACKING.fill,
    fillOpacity: PREMIUM_BACKING.fillOpacity,
    stroke: statusColor,
    strokeWidth: PREMIUM_BACKING.strokeWidth,
  };
  const backingHeight = hasRear ? 54 : 30;
  const backingHalfWidth = hasRear ? 38 : 34;

  return (
    <g
      textAnchor="middle"
      className={`pointer-events-none ${variant === 'tactical-hud' ? 'font-mono' : ''}`}
      fill={ink.primary}
    >
      {isPremium && (
        <rect
          x={plate.x - backingHalfWidth}
          y={plate.y + STACK.value - 22}
          width={backingHalfWidth * 2}
          height={backingHeight}
          rx="6"
          {...backing}
        />
      )}
      <text
        x={plate.x}
        y={plate.y}
        fontSize={FONT.abbreviation}
        fontWeight="700"
        letterSpacing="1.2"
        fill={ink.secondary}
        style={
          isPremium
            ? { paintOrder: 'stroke', stroke: '#071a16', strokeWidth: 2 }
            : undefined
        }
      >
        {plate.label}
      </text>
      <text
        x={plate.x}
        y={plate.y + STACK.value}
        fontSize={FONT.value}
        fontWeight="700"
        data-armor-total-location={hasRear ? location : undefined}
      >
        {shown}
        <tspan fontSize={FONT.maximum} fontWeight="600" fill={ink.secondary}>
          /{maximum}
        </tspan>
      </text>
      {hasRear && (
        <text
          x={plate.x}
          y={plate.y + STACK.rear}
          fontSize={FONT.maximum}
          fontWeight="600"
          fill={ink.secondary}
        >
          <tspan data-armor-face="front" data-armor-face-location={location}>
            F{current}
          </tspan>
          <tspan>{'\u00b7'}</tspan>
          <tspan data-armor-face="rear" data-armor-face-location={location}>
            R{rear}
          </tspan>
        </text>
      )}
      {hasBar && (
        <>
          <path
            d={`M${plate.x - BAR_HALF_WIDTH} ${plate.y + STACK.bar} h${BAR_HALF_WIDTH * 2}`}
            stroke="var(--surface-deep)"
            strokeWidth="4"
          />
          <path
            d={`M${plate.x - BAR_HALF_WIDTH} ${plate.y + STACK.bar} h${BAR_HALF_WIDTH * 2 * ratio}`}
            stroke={statusColor}
            strokeWidth="4"
          />
        </>
      )}
    </g>
  );
}
