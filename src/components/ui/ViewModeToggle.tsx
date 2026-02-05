/**
 * ViewModeToggle Component
 * Three-button toggle for switching between list, table, and grid views.
 * Inspired by COMP/CON's view mode switcher.
 */
import React from 'react';

export type ViewMode = 'list' | 'table' | 'grid';

interface ViewModeToggleProps {
  /** Current view mode */
  mode: ViewMode;
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void;
  /** Optional className for the container */
  className?: string;
}

interface ViewModeButtonProps {
  mode: ViewMode;
  currentMode: ViewMode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ViewModeButton({
  mode,
  currentMode,
  onClick,
  icon,
  label,
}: ViewModeButtonProps): React.ReactElement {
  const isActive = mode === currentMode;

  return (
    <button
      onClick={onClick}
      aria-label={`Switch to ${label} view`}
      aria-pressed={isActive}
      className={`rounded p-2 transition-all duration-150 ${
        isActive
          ? 'bg-accent/20 text-accent border-accent/30 border'
          : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised/50 border border-transparent'
      } `}
    >
      {icon}
    </button>
  );
}

// Icons for each view mode
const ListIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
    />
  </svg>
);

const TableIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
    />
  </svg>
);

const GridIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
    />
  </svg>
);

export function ViewModeToggle({
  mode,
  onChange,
  className = '',
}: ViewModeToggleProps): React.ReactElement {
  return (
    <div
      className={`bg-surface-base/50 border-border-theme-subtle/50 inline-flex items-center gap-1 rounded-lg border p-1 ${className}`}
      role="group"
      aria-label="View mode selection"
    >
      <ViewModeButton
        mode="list"
        currentMode={mode}
        onClick={() => onChange('list')}
        icon={<ListIcon />}
        label="list"
      />
      <ViewModeButton
        mode="table"
        currentMode={mode}
        onClick={() => onChange('table')}
        icon={<TableIcon />}
        label="table"
      />
      <ViewModeButton
        mode="grid"
        currentMode={mode}
        onClick={() => onChange('grid')}
        icon={<GridIcon />}
        label="grid"
      />
    </div>
  );
}

export default ViewModeToggle;
