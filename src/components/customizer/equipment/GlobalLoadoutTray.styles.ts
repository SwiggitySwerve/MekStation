export const trayStyles = {
  padding: {
    row: 'px-2',
    header: 'px-3',
  },
  text: {
    primary: 'text-[13px]',
    secondary: 'text-xs',
    tertiary: 'text-xs',
  },
  gap: 'gap-1.5',
  row: 'h-7 flex items-center',
  // Neutral raised card; category shows only as the left accent bar.
  equipmentSurface:
    'bg-surface-raised/60 border-border-theme-subtle text-text-theme-primary rounded-md border border-l-4 border-solid',
  equipmentRow:
    'pl-2 min-h-11 flex items-stretch gap-1.5 transition-colors group my-0.5 hover:bg-surface-raised',
  categoryRow: 'bg-surface-base/50 flex h-8 items-center gap-1.5 px-2',
  sectionRow:
    'bg-surface-raised/30 hover:bg-surface-raised/50 flex min-h-11 w-full items-center justify-between gap-1.5 px-2 text-left transition-colors',
  // Empty, collapsed sections (nothing to show) read as a quiet header only.
  sectionRowQuiet:
    'hover:bg-surface-raised/40 flex min-h-11 w-full items-center justify-between gap-1.5 bg-transparent px-2 text-left transition-colors',
  // One trailing 44px cell holds the row action (remove or expand chevron).
  rowActionCell:
    'border-border-theme-subtle/30 ml-1 flex min-h-11 w-11 flex-shrink-0 items-center justify-center border-l',
  categoryDot: 'w-2 h-2 rounded-sm',
  actionButton: 'opacity-0 group-hover:opacity-100 transition-opacity px-0.5',
} as const;
