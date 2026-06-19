import type { SvgDataAttributes } from './HexCell.overlayAttributes';

export interface ElevationStackAttributeState {
  readonly capped: boolean;
  readonly effectiveHeight: number;
  readonly overflowLayerCount: number;
  readonly renderedLayerCount: number;
}

export interface ElevationStackAttributeOptions {
  readonly elevationStackMetrics: ElevationStackAttributeState;
}

export function buildElevationStackAttributes({
  elevationStackMetrics,
}: ElevationStackAttributeOptions): SvgDataAttributes {
  return {
    'data-elevation-layers':
      elevationStackMetrics.renderedLayerCount || undefined,
    'data-elevation-effective-height':
      elevationStackMetrics.effectiveHeight || undefined,
    'data-elevation-rendered-layers':
      elevationStackMetrics.renderedLayerCount || undefined,
    'data-elevation-stack-capped': elevationStackMetrics.capped
      ? 'true'
      : undefined,
    'data-elevation-stack-overflow': elevationStackMetrics.capped
      ? elevationStackMetrics.overflowLayerCount
      : undefined,
  };
}
