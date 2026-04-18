/**
 * Barrel export for the Phase 5 Wave 3 SPA display components.
 *
 * The pilot mech card, pilot detail page, and record-sheet preview all
 * import from this file so the trio of badge primitives can evolve
 * together. The picker family (browse/purchase modal) lives at
 * `@/components/spa/SPAPicker` and is intentionally kept separate — the
 * display components are read-only and have no dependency on the picker.
 */

export { SPABadge, default as SPABadgeDefault } from './SPABadge';
export type { SPABadgeProps, SPABadgeVariant } from './SPABadge';
export { SPAList } from './SPAList';
export type { SPAListProps, ISPAListEntry } from './SPAList';
export { SPATooltip } from './SPATooltip';
export { formatDesignation, formatSPALine } from './formatDesignation';
