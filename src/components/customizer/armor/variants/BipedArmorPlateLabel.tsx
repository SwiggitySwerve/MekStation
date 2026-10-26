import React from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import { MechLocation } from '@/types/construction';

import type { IArmorFaceMaximums } from '../shared/ArmorFaceMaximums';
import type { BipedArmorPlate } from './CleanTechBipedDiagram.geometry';

import { BIPED_ARMOR_INK } from './BipedArmorSurface';

/**
 * Text sizes in viewBox units. The diagram renders at roughly 0.85-1.1 px per
 * unit on a phone, so 14 units is the floor that keeps every label at or above
 * 12 rendered px.
 */
const FONT = {
  label: 16,
  headLabel: 14,
  headValue: 24,
  torsoValue: 22,
  limbValue: 26,
  limbMaximum: 15,
  secondary: 14,
} as const;

/** Baseline offsets below `plate.y` for the lines inside a torso plate. */
const TORSO_LINE = { front: 30, rear: 56 } as const;

const PREMIUM_BACKING = {
  fill: '#071a16',
  fillOpacity: 0.9,
  strokeWidth: 0.75,
} as const;

interface BipedArmorPlateLabelProps {
  readonly plate: BipedArmorPlate;
  readonly location: MechLocation;
  readonly variant: ArmorDiagramVariant;
  readonly current: number;
  readonly rear: number;
  readonly maximum: number;
  /** Each face's current maximum, from the shared face-maximum helper. */
  readonly faceMaximums: IArmorFaceMaximums;
  readonly statusColor: string;
  /** Allocated share of the location maximum, 0-1. */
  readonly ratio: number;
}

/**
 * The text drawn inside one biped armor plate: location name, the front value
 * over its face maximum and, on torsos, a smaller "R" line for rear armor.
 */
export function BipedArmorPlateLabel({
  plate,
  location,
  variant,
  current,
  rear,
  maximum,
  faceMaximums,
  statusColor,
  ratio,
}: BipedArmorPlateLabelProps): React.ReactElement {
  const ink = BIPED_ARMOR_INK;
  const isPremium = variant === 'premium-material';
  const isHead = location === MechLocation.HEAD;
  const hasRear = plate.hasRear === true;
  const backing = {
    fill: PREMIUM_BACKING.fill,
    fillOpacity: PREMIUM_BACKING.fillOpacity,
    stroke: statusColor,
    strokeWidth: PREMIUM_BACKING.strokeWidth,
  };

  return (
    <g
      textAnchor="middle"
      className={`pointer-events-none ${variant === 'tactical-hud' ? 'font-mono' : ''}`}
      fill={ink.primary}
    >
      {isPremium && hasRear && (
        <rect
          x={plate.x - 32}
          y={plate.y - 17}
          width="64"
          height="78"
          rx="6"
          {...backing}
        />
      )}
      {isPremium && isHead && (
        <rect
          x={plate.x - 24}
          y={plate.y + 6}
          width="48"
          height="26"
          rx="6"
          {...backing}
        />
      )}
      {isPremium && !hasRear && !isHead && (
        <rect
          x={plate.x - 24}
          y={plate.y + 4}
          width="48"
          height="30"
          rx="6"
          {...backing}
        />
      )}
      <text
        x={plate.x}
        y={plate.y}
        fontSize={isHead ? FONT.headLabel : FONT.label}
        fontWeight="700"
        style={
          isPremium
            ? { paintOrder: 'stroke', stroke: '#071a16', strokeWidth: 2 }
            : undefined
        }
      >
        {plate.label}
      </text>
      {hasRear ? (
        <>
          <text
            x={plate.x}
            y={plate.y + TORSO_LINE.front}
            fontSize={FONT.torsoValue}
            fontWeight="700"
            data-armor-face="front"
            data-armor-face-location={location}
          >
            {current}
            <tspan
              fontSize={FONT.secondary}
              fontWeight="600"
              fill={ink.secondary}
            >
              /{faceMaximums.front}
            </tspan>
          </text>
          <text
            x={plate.x}
            y={plate.y + TORSO_LINE.rear}
            fontSize={FONT.secondary}
            fontWeight="600"
            fill={ink.secondary}
            data-armor-face="rear"
            data-armor-face-location={location}
          >
            <tspan>{'R '}</tspan>
            {rear}/{faceMaximums.rear}
          </text>
        </>
      ) : isHead ? (
        <text
          x={plate.x}
          y={plate.y + 25}
          fontSize={FONT.headValue}
          fontWeight="700"
        >
          {current}
          <tspan
            fontSize={FONT.secondary}
            fontWeight="600"
            fill={ink.secondary}
          >
            /{maximum}
          </tspan>
        </text>
      ) : (
        <>
          <text
            x={plate.x}
            y={plate.y + 26}
            fontSize={FONT.limbValue}
            fontWeight="700"
          >
            {current}
          </text>
          <text
            x={plate.x}
            y={plate.y + 44}
            fontSize={FONT.limbMaximum}
            fontWeight="600"
            fill={ink.secondary}
          >
            /{maximum}
          </text>
          <path
            d={`M${plate.x - 18} ${plate.y + 54} h36`}
            stroke="var(--surface-deep)"
            strokeWidth="4"
          />
          <path
            d={`M${plate.x - 18} ${plate.y + 54} h${36 * ratio}`}
            stroke={statusColor}
            strokeWidth="4"
          />
        </>
      )}
    </g>
  );
}
