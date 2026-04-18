/**
 * SPA designation barrel — Wave 2b.
 *
 * Public surface for the designation registry + combat predicate.
 * Consumers import from `@/lib/spa/designation` rather than the per-file
 * paths so a future restructuring (e.g. splitting weapon types into a
 * data file) doesn't ripple through the call sites.
 */

export {
  applyDesignation,
  isNonDesignatedTarget,
  type IDesignationAttackContext,
} from './applyDesignation';
export {
  getDesignationOptions,
  getOptionsForKind,
  isDeferredDesignationType,
  type IDesignationOption,
  type IDesignationOptionSet,
} from './getDesignationOptions';
