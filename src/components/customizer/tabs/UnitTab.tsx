/**
 * Unit Tab Component
 * 
 * Individual tab with name, modification indicator, and close button.
 * 
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React, { useState, useRef, useEffect } from 'react';
import { TabDisplayInfo } from './TabBar';

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
  const displayName = tab.name.length > 48 ? tab.name.substring(0, 45) + '...' : tab.name;
  
  return (
    <div
      className={`
        group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] cursor-pointer
        border-b-2 transition-colors
        ${isActive 
          ? 'bg-slate-700 text-slate-100 border-blue-500' 
          : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700/50 hover:text-slate-300'
        }
      `}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {/* Tab name or input */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-600 text-white px-1 py-0.5 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="block truncate text-sm">{displayName}</span>
        )}
      </div>
      
      {/* Modified indicator */}
      {tab.isModified && !isEditing && (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500" title="Unsaved changes" />
      )}
      
      {/* Close button - Chrome style */}
      {canClose && !isEditing && (
        <button
          onClick={handleCloseClick}
          className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-500 hover:text-white transition-all duration-100 text-xs leading-none"
          title="Close (Ctrl+W)"
        >
          ×
        </button>
      )}
    </div>
  );
}

