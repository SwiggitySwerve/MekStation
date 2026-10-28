import React from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import { BipedArmorSurface } from './variants/BipedArmorSurface';
import {
  BLUEPRINT_FRONT_PLATES,
  BLUEPRINT_FRONT_VIEWBOX,
} from './variants/BlueprintArmorDiagram.geometry';
import blueprintStyles from './variants/BlueprintArmorDiagram.module.css';
import {
  BIPED_ARMOR_PLATES,
  BIPED_ARMOR_VIEWBOX,
} from './variants/CleanTechBipedDiagram.geometry';

interface VariantThumbnailProps {
  variant: ArmorDiagramVariant;
  className?: string;
}

export function VariantThumbnail({
  variant,
  className = '',
}: VariantThumbnailProps): React.ReactElement {
  // Standard draws the Blueprint record-sheet outline.
  if (variant === 'clean-tech') {
    return (
      <svg
        viewBox={BLUEPRINT_FRONT_VIEWBOX}
        className={`h-[46px] w-12 shrink-0 ${className}`}
        aria-label={`${variant} style preview`}
        role="img"
      >
        {BLUEPRINT_FRONT_PLATES.map((plate) => (
          <path
            key={plate.location}
            d={plate.path}
            className={blueprintStyles.thumbnailPlate}
          />
        ))}
      </svg>
    );
  }
  return (
    <svg
      viewBox={BIPED_ARMOR_VIEWBOX}
      className={`h-[46px] w-12 shrink-0 ${className}`}
      aria-label={`${variant} style preview`}
      role="img"
    >
      {Object.entries(BIPED_ARMOR_PLATES).map(([location, plate]) => (
        <BipedArmorSurface
          key={location}
          path={plate.path}
          variant={variant}
          current={1}
          maximum={1}
          preview
        />
      ))}
    </svg>
  );
}
