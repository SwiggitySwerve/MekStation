import React from 'react';

import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';
import { MechLocation } from '@/types/construction';

import type { LocationArmorValues } from './LocationTypes';

import {
  CleanTechLocationContent,
  NeonLocationContent,
} from './LocationInteraction';
import {
  TacticalLocationContent,
  PremiumLocationContent,
  MegaMekLocationContent,
} from './LocationValidation';
import { LocationPosition } from './MechSilhouette';

export type { LocationArmorValues } from './LocationTypes';

export interface VariantLocationProps {
  location: MechLocation;
  label: string;
  pos: LocationPosition;
  data: LocationArmorValues;
  showRear: boolean;
  isSelected: boolean;
  isHovered: boolean;
  variant: ArmorDiagramVariant;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

export function VariantLocation({
  location,
  label,
  pos,
  data,
  showRear,
  isSelected,
  isHovered,
  variant,
  onClick,
  onHover,
}: VariantLocationProps): React.ReactElement {
  const { current, maximum, rear = 0, rearMaximum = 1 } = data;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location} armor: ${current} of ${maximum}${showRear ? `, rear: ${rear} of ${rearMaximum}` : ''}`}
      aria-pressed={isSelected}
      className="cursor-pointer focus:outline-none"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      {variant === 'clean-tech' && (
        <CleanTechLocationContent
          pos={pos}
          data={data}
          showRear={showRear}
          label={label}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      )}
      {variant === 'neon-operator' && (
        <NeonLocationContent
          pos={pos}
          data={data}
          showRear={showRear}
          label={label}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      )}
      {variant === 'tactical-hud' && (
        <TacticalLocationContent
          pos={pos}
          data={data}
          showRear={showRear}
          label={label}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      )}
      {variant === 'premium-material' && (
        <PremiumLocationContent
          pos={pos}
          data={data}
          showRear={showRear}
          label={label}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      )}
      {variant === 'megamek' && (
        <MegaMekLocationContent
          pos={pos}
          data={data}
          showRear={showRear}
          label={label}
          isSelected={isSelected}
          isHovered={isHovered}
        />
      )}
    </g>
  );
}
