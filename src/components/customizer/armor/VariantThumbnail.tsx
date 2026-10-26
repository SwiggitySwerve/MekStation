import React from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import { BipedArmorSurface } from './variants/BipedArmorSurface';
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
