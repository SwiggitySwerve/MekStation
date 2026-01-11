/**
 * Critical Slot Toolbar Component
 * 
 * Toolbar with auto-mode toggles and manual actions.
 * 
 * @spec openspec/specs/critical-slots-display/spec.md
 */

import React from 'react';

interface CriticalSlotToolbarProps {
  /** Auto-fill unhittables toggle state */
  autoFillUnhittables: boolean;
  /** Show placement preview toggle state */
  showPlacementPreview: boolean;
  /** Toggle auto-fill */
  onAutoFillToggle: () => void;
  /** Toggle preview */
  onPreviewToggle: () => void;
  /** Toolbar action handler */
  onAction: (action: 'fill' | 'compact' | 'sort' | 'reset') => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Toolbar for critical slot management
 */
export function CriticalSlotToolbar({
  autoFillUnhittables,
  showPlacementPreview,
  onAutoFillToggle,
  onPreviewToggle,
  onAction,
  className = '',
}: CriticalSlotToolbarProps): React.ReactElement {
  return (
    <div className={`flex items-center justify-between px-3 py-2 ${className}`}>
      {/* Auto-mode toggles */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoFillUnhittables}
            onChange={onAutoFillToggle}
            className="w-4 h-4 rounded border-border-theme bg-surface-raised text-accent focus:ring-accent focus:ring-offset-surface-base"
          />
          <span>Auto Fill</span>
        </label>
        
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showPlacementPreview}
            onChange={onPreviewToggle}
            className="w-4 h-4 rounded border-border-theme bg-surface-raised text-accent focus:ring-accent focus:ring-offset-surface-base"
          />
          <span>Preview</span>
        </label>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <ToolbarButton
          label="Fill"
          title="Fill empty slots with unhittables"
          onClick={() => onAction('fill')}
        />
        <ToolbarButton
          label="Compact"
          title="Compact equipment to top of locations"
          onClick={() => onAction('compact')}
        />
        <ToolbarButton
          label="Sort"
          title="Sort equipment by size"
          onClick={() => onAction('sort')}
        />
        <ToolbarButton
          label="Reset"
          title="Remove all placed equipment"
          onClick={() => onAction('reset')}
          variant="danger"
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  title: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function ToolbarButton({ label, title, onClick, variant = 'default' }: ToolbarButtonProps) {
  const colorClasses = variant === 'danger'
    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30'
    : 'text-text-theme-secondary hover:text-white hover:bg-surface-raised';
  
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${colorClasses}`}
    >
      {label}
    </button>
  );
}

