/**
 * Shared Armor Diagram Components
 */

export { DiagramHeader, type DiagramHeaderProps } from './DiagramHeader';
export {
  ArmorStatusLegend,
  ArmorDiagramInstructions,
  type ArmorStatusLegendProps,
} from './ArmorStatusLegend';

// Re-export existing shared modules
export * from './MechSilhouette';
export * from './ArmorFills';
export * from './VariantStyles';
export * from './VariantLocationRenderer';