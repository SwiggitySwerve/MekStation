/**
 * Barrel export for the SPAPicker module.
 *
 * Phase 5 consumers import via `@/components/spa/SPAPicker`. Internals
 * (subcomponents, stub designation registry) are exported too so Wave
 * 2a/2b can compose alternate layouts on top of the same primitives.
 */

export { SPAPicker, default } from './SPAPicker';
export { CategoryTabs } from './CategoryTabs';
export { SearchInput } from './SearchInput';
export { SourceFilters } from './SourceFilters';
export { SPAItem } from './SPAItem';
export {
  getDesignationOptions,
  SPA_ALL_SOURCES,
  SPA_CATEGORY_COLORS,
  SPA_CATEGORY_LABELS,
} from './types';
export type { SPADesignation, SPAPickerMode, SPAPickerProps } from './types';
