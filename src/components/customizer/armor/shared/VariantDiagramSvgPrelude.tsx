import React from 'react';

import type { ArmorDiagramVariant } from '@/stores/useCustomizerSettingsStore';

import { GradientDefs } from './ArmorFills';
import { VariantSVGDecorations } from './VariantStyles';

interface VariantDiagramSvgPreludeProps {
  variant: ArmorDiagramVariant;
  height?: number;
}

export function VariantDiagramSvgPrelude({
  variant,
  height = 280,
}: VariantDiagramSvgPreludeProps): React.ReactElement {
  return (
    <>
      <GradientDefs />
      <VariantSVGDecorations variant={variant} width={300} height={height} />
    </>
  );
}
