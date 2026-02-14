/**
 * Unit Tab Component
 *
 * Individual tab with name, modification indicator, and close button.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React, { useState, useRef, useEffect } from 'react';

import type { TabDisplayInfo } from './tabTypes';

interface UnitTabProps {
  /** Tab data */
  tab: TabDisplayInfo;
  /** Is this the active tab */
  isActive: boolean;
  /** Can this tab be closed */
  canClose: boolean;
  /** Called when tab is clicked */
  onSelect: () => void;
  /** Called when close button is clicked */
  onClose: () => void;
  /** Called when tab is renamed */
  onRename: (name: string) => void;
}

/**
 * Individual unit tab component
 */
export function UnitTab({
  tab,
  isActive,
  canClose,
  onSelect,
  onClose,
  onRename,
}: UnitTabProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditName(tab.name);
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const submitRename = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== tab.name) {
      onRename(trimmedName);
    }
    setIsEditing(false);
  };

  const cancelRename = () => {
    setEditName(tab.name);
    setIsEditing(false);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  // Truncate long names
  const displayName =
    tab.name.length > 48 ? tab.name.substring(0, 45) + '...' : tab.name;

  return (
    <div
      className={`group min-h-touch flex max-w-[160px] min-w-[100px] cursor-pointer items-center gap-2 border-b-2 px-3 py-2 transition-colors sm:min-h-0 sm:max-w-[200px] sm:min-w-[120px] sm:py-2 ${
        isActive
          ? 'border-blue-500 bg-slate-700 text-slate-100'
          : 'border-transparent bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
      } `}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {/* Tab name or input */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={handleKeyDown}
            className="w-full rounded bg-slate-600 px-1 py-0.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="block truncate text-sm">{displayName}</span>
        )}
      </div>

      {/* Modified indicator */}
      {tab.isModified && !isEditing && (
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"
          title="Unsaved changes"
        />
      )}

      {/* Close button - Chrome style, larger on touch */}
      {canClose && !isEditing && (
        <button
          onClick={handleCloseClick}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm leading-none text-slate-400 transition-all duration-100 hover:bg-slate-500 hover:text-white sm:h-[18px] sm:w-[18px] sm:text-xs"
          title="Close (Ctrl+W)"
        >
          ×
        </button>
      )}
    </div>
  );
}
