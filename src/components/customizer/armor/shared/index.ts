/**
 * Shared Armor Diagram Components
 */

export { DiagramHeader, type DiagramHeaderProps } from './DiagramHeader';

// Re-export from canonical location (src/components/armor/shared/)
export {
  ArmorStatusLegend,
  ArmorDiagramInstructions,
  type ArmorStatusLegendProps,
} from '@/components/armor/shared/ArmorStatusLegend';

// Re-export existing shared modules
export * from './MechSilhouette';
export * from './ArmorFills';
export * from './VariantStyles';
export * from './VariantLocationRenderer';