export const trayStyles = {
  padding: {
    row: 'px-2',
    header: 'px-3',
  },
  text: {
    primary: 'text-xs',
    secondary: 'text-[10px]',
    tertiary: 'text-[9px]',
  },
  gap: 'gap-1.5',
  row: 'h-7 flex items-center',
  equipmentRow:
    'px-2 h-7 flex items-center gap-1.5 transition-all group rounded-md border border-border-theme-subtle/30 my-0.5',
  categoryRow: 'px-2 h-7 bg-surface-base/50 flex items-center gap-1.5',
  sectionRow:
    'w-full h-7 flex items-center justify-between px-2 gap-1.5 hover:bg-surface-raised/50 transition-colors bg-surface-raised/30',
  categoryDot: 'w-2 h-2 rounded-sm',
  actionButton: 'opacity-0 group-hover:opacity-100 transition-opacity px-0.5',
} as const;
