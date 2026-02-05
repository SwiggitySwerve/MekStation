/**
 * Shared Styles for Customizer Components
 *
 * Centralized style constants to reduce repetition across tab components.
 * Follow the pattern established in TechBaseConfiguration.tsx.
 *
 * Usage:
 *   import { customizerStyles as cs } from '../styles';
 *   <div className={cs.panel.main}>...</div>
 */

// =============================================================================
// Panel Styles
// =============================================================================

const panel = {
  /** Main content panel - bg-surface-base with border */
  main: 'bg-surface-base rounded-lg border border-border-theme-subtle p-4',

  /** Compact summary bar at top of tabs */
  summary:
    'bg-surface-base/50 rounded-lg border border-border-theme-subtle px-4 py-2',

  /** Read-only notice panel */
  notice:
    'bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-blue-300 text-sm',

  /** Empty state placeholder */
  empty: 'text-center py-8 text-text-theme-secondary',
} as const;

// =============================================================================
// Text Styles
// =============================================================================

const text = {
  /** Section/panel title */
  sectionTitle: 'text-lg font-semibold text-white mb-4',

  /** Form field label */
  label: 'text-sm text-text-theme-secondary',

  /** Secondary/helper text */
  secondary: 'text-xs text-text-theme-secondary',

  /** Stat value - white */
  value: 'font-medium text-white',

  /** Highlighted stat value - accent */
  valueHighlight: 'font-medium text-accent',

  /** Positive value - green */
  valuePositive: 'font-medium text-green-400',

  /** Negative/error value - red */
  valueNegative: 'font-medium text-red-400',

  /** Warning value - amber (kept for semantic warning indication) */
  valueWarning: 'font-medium text-amber-400',
} as const;

// =============================================================================
// Input Styles
// =============================================================================

const input = {
  /** Base input styles (without width) */
  base: 'px-3 py-2 bg-surface-raised border border-border-theme rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent',

  /** Full-width input */
  full: 'w-full px-3 py-2 bg-surface-raised border border-border-theme rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent',

  /** Compact input (smaller padding) */
  compact:
    'px-2 py-1.5 bg-surface-raised border border-border-theme rounded text-white text-sm',

  /** Full-width compact input */
  fullCompact:
    'w-full px-2 py-1.5 bg-surface-raised border border-border-theme rounded text-white text-sm',

  /** Centered number input (for stepper controls) */
  number:
    'px-2 py-1 bg-surface-raised border border-border-theme text-white text-sm text-center',

  /** Hide number input spinners - append to number inputs */
  noSpinners:
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
} as const;

// =============================================================================
// Select Styles
// =============================================================================

const select = {
  /** Full-width select */
  full: 'w-full px-3 py-2 bg-surface-raised border border-border-theme rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent',

  /** Compact select (smaller padding) */
  compact:
    'w-full px-2 py-1.5 bg-surface-raised border border-border-theme rounded text-white text-sm',

  /** Inline select (no full width) */
  inline:
    'px-2 py-1.5 bg-surface-raised border border-border-theme rounded text-white text-sm',
} as const;

// =============================================================================
// Button Styles
// =============================================================================

const button = {
  /** Stepper button (increment/decrement) - small */
  stepper:
    'px-2 py-1 bg-surface-raised hover:bg-surface-raised-hover disabled:opacity-50 disabled:cursor-not-allowed rounded border border-border-theme text-white text-sm',

  /** Stepper button - medium */
  stepperMd:
    'px-3 py-2 bg-surface-raised hover:bg-surface-raised-hover disabled:opacity-50 disabled:cursor-not-allowed rounded border border-border-theme text-white text-sm',

  /** Left stepper in grouped control */
  stepperLeft:
    'px-2 py-1 bg-surface-raised hover:bg-surface-raised-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-l border border-border-theme text-white text-sm',

  /** Right stepper in grouped control */
  stepperRight:
    'px-2 py-1 bg-surface-raised hover:bg-surface-raised-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-r border border-border-theme text-white text-sm',

  /** Primary action button - blue */
  action:
    'px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors',

  /** Full-width action button */
  actionFull:
    'flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium transition-colors',
} as const;

// =============================================================================
// Layout Styles
// =============================================================================

const layout = {
  /** Tab content container with responsive padding */
  tabContent: 'space-y-4 p-2 sm:p-4',

  /** Two-column grid - stacks on mobile, side-by-side on md+ */
  twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-4',

  /** Two-column grid with larger gap */
  twoColumnWide: 'grid grid-cols-1 md:grid-cols-2 gap-6',

  /**
   * Two-column grid for sidebar-adjacent layouts.
   * Uses lg breakpoint instead of md because sidebar reduces available width.
   * Use this when the loadout sidebar is visible.
   */
  twoColumnSidebar: 'grid grid-cols-1 lg:grid-cols-2 gap-4',

  /** Three-column grid - stacks on mobile, side-by-side on sm+ */
  threeColumn: 'grid grid-cols-1 sm:grid-cols-3 gap-3',

  /** Vertical form fields */
  formStack: 'space-y-3',

  /** Field with label above */
  field: 'space-y-1',

  /** Flex row with items centered */
  row: 'flex items-center',

  /** Flex row with gap */
  rowGap: 'flex items-center gap-2',

  /** Flex row spaced between */
  rowBetween: 'flex items-center justify-between',

  /** Summary stat row */
  statRow: 'flex items-center gap-2',

  /** Divider/separator */
  divider: 'pt-3 mt-1 border-t border-border-theme-subtle',

  /** Vertical divider */
  dividerV: 'pl-4 border-l border-border-theme',

  /** Flex container that can shrink - prevents content overflow */
  shrinkable: 'min-w-0 flex-shrink',

  /** Full-height flex column with overflow handling */
  flexColumn: 'flex flex-col min-h-0 overflow-hidden',
} as const;

// =============================================================================
// Dialog Styles
// =============================================================================

const dialog = {
  /** Dialog header row */
  header: 'dialog-header',

  /** Dialog header title */
  headerTitle: 'dialog-header-title',

  /** Dialog header subtitle */
  headerSubtitle: 'dialog-header-subtitle',

  /** Dialog content area */
  content: 'dialog-content',

  /** Dialog footer with right-aligned buttons */
  footer: 'dialog-footer',

  /** Dialog footer with space-between */
  footerBetween: 'dialog-footer-between',

  /** Close button (X) */
  closeBtn: 'dialog-close-btn',

  /** Primary action button (blue) */
  btnPrimary: 'dialog-btn-primary',

  /** Secondary action button (slate) */
  btnSecondary: 'dialog-btn-secondary',

  /** Ghost/text button */
  btnGhost: 'dialog-btn-ghost',

  /** Warning action button (amber) */
  btnWarning: 'dialog-btn-warning',

  /** Danger action button (red) */
  btnDanger: 'dialog-btn-danger',

  /** Standard text input */
  input: 'dialog-input',

  /** Search input with left icon space */
  inputSearch: 'dialog-input-search',

  /** Filter/dropdown select */
  selectFilter: 'dialog-select',

  /** Table wrapper */
  table: 'dialog-table',

  /** Table header row */
  tableHeader: 'dialog-table-header',

  /** Table body */
  tableBody: 'dialog-table-body',

  /** Table row (hoverable) */
  tableRow: 'dialog-table-row',

  /** Table row selected state */
  tableRowSelected: 'dialog-table-row-selected',

  /** Info panel (slate background) */
  infoPanel: 'dialog-info-panel',

  /** Warning panel (amber tint) */
  warningPanel: 'dialog-warning-panel',

  /** Error panel (red tint) */
  errorPanel: 'dialog-error-panel',

  /** Success panel (green tint) */
  successPanel: 'dialog-success-panel',

  /** Loading state container */
  loading: 'dialog-loading',

  /** Empty state container */
  empty: 'dialog-empty',

  /** Empty state icon */
  emptyIcon: 'dialog-empty-icon',

  /** Drop zone for file uploads */
  dropzone: 'dialog-dropzone',

  /** Drop zone active state */
  dropzoneActive: 'dialog-dropzone-active',

  /** Warning icon container */
  warningIcon: 'dialog-warning-icon',
} as const;

// =============================================================================
// Filter/Toolbar Styles
// =============================================================================

const filter = {
  /** Filter bar container */
  bar: 'filter-bar',

  /** Filter input wrapper */
  input: 'filter-input',

  /** Filter select dropdown */
  select: 'filter-select',

  /** Clear filters button */
  clearBtn: 'filter-clear-btn',
} as const;

// =============================================================================
// Combined Export
// =============================================================================

/**
 * Customizer component styles
 *
 * @example
 * import { customizerStyles as cs } from '../styles';
 *
 * <div className={cs.panel.main}>
 *   <h3 className={cs.text.sectionTitle}>Title</h3>
 *   <div className={cs.layout.field}>
 *     <label className={cs.text.label}>Field</label>
 *     <input className={cs.input.full} />
 *   </div>
 * </div>
 *
 * // Dialog example:
 * <div className={cs.dialog.header}>
 *   <h3 className={cs.dialog.headerTitle}>Title</h3>
 *   <button className={cs.dialog.closeBtn}>X</button>
 * </div>
 */
export const customizerStyles = {
  panel,
  text,
  input,
  select,
  button,
  layout,
  dialog,
  filter,
} as const;

// Convenient alias
export { customizerStyles as cs };

// Individual exports for selective imports
export { panel, text, input, select, button, layout, dialog, filter };
