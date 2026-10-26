import React, { useState, useRef, useEffect } from 'react';
/**
 * Unit Tab Component
 *
 * Individual tab with name, modification indicator, and close button.
 *
 * The unsaved-changes dot marks background tabs only: the active unit's save
 * state is on the Save button (its dot, label and description), so the
 * header never shows two unexplained dots for the same fact. On phones the
 * name wraps onto a second line inside the tab instead of truncating.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import { AppIcon } from '@/components/ui/AppIcon';

import type { TabDisplayInfo } from './tabTypes';

import { TechBaseBadge } from '../shared/TechBaseBadge';

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
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const reveal = (): void => {
      tabRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    const tablist = tabRef.current?.parentElement;
    if (tablist) observer.observe(tablist);
    return () => observer.disconnect();
  }, [isActive, tab.name]);

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

  return (
    <div
      ref={tabRef}
      className={`group flex min-h-11 max-w-[220px] min-w-[140px] shrink-0 items-center gap-1 rounded-t border-b-2 pl-2 transition-colors lg:max-w-[320px] ${isActive ? 'max-sm:w-full max-sm:max-w-full' : ''} ${
        isActive
          ? 'border-accent bg-surface-raised text-text-theme-primary'
          : 'text-text-theme-secondary [@media(hover:hover)]:hover:text-text-theme-primary border-transparent bg-transparent'
      } `}
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
            className="bg-surface-raised text-text-theme-primary focus-visible:ring-accent w-full rounded px-1 py-0.5 text-sm outline-none focus-visible:ring-2"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.name}
            tabIndex={isActive ? 0 : -1}
            title={`${tab.name} · Double-click to rename`}
            onClick={onSelect}
            onDoubleClick={handleDoubleClick}
            className="focus-visible:outline-accent flex min-h-11 w-full min-w-0 items-center gap-2 rounded text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-[-2px] max-sm:!px-0 max-sm:!py-0 max-sm:leading-4"
          >
            <span
              data-unit-tab-name
              className="min-w-0 truncate max-sm:line-clamp-2 max-sm:text-[13px] max-sm:leading-4 max-sm:font-medium max-sm:break-words max-sm:whitespace-normal"
            >
              {tab.name}
            </span>
            {tab.techBaseMode && (
              <TechBaseBadge
                techBaseMode={tab.techBaseMode}
                className="shrink-0 !px-1 !py-0 !text-[10px]"
              />
            )}
          </button>
        )}
      </div>

      {/* Modified indicator: background tabs only (see above). */}
      {tab.isModified && !isActive && !isEditing && (
        <span
          role="img"
          aria-label="Changes not saved to library"
          title="Changes not saved to library"
          data-unsaved-dot
          className="bg-accent h-2 w-2 flex-shrink-0 rounded-full"
        />
      )}

      {/* Close button - Chrome style, larger on touch */}
      {canClose && !isEditing && (
        <button
          onClick={handleCloseClick}
          className="text-text-theme-secondary hover:bg-surface-raised-hover hover:text-text-theme-primary flex h-11 w-11 shrink-0 items-center justify-center rounded !p-0 transition-colors"
          title="Close (Ctrl+W)"
          aria-label={`Close ${tab.name}`}
        >
          <AppIcon name="close" size="inline" />
        </button>
      )}
    </div>
  );
}
