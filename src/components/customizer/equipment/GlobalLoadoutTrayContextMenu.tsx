import React, { useEffect, useRef } from 'react';

import { MechLocation } from '@/types/construction';

import { trayStyles } from './GlobalLoadoutTray.styles';
import {
  AvailableLocation,
  LoadoutEquipmentItem,
} from './GlobalLoadoutTray.types';

interface ContextMenuProps {
  x: number;
  y: number;
  item: LoadoutEquipmentItem;
  availableLocations: AvailableLocation[];
  onQuickAssign: (location: MechLocation) => void;
  onUnassign: () => void;
  onClose: () => void;
}

export function GlobalLoadoutTrayContextMenu({
  x,
  y,
  item,
  availableLocations,
  onQuickAssign,
  onUnassign,
  onClose,
}: ContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);
  const validLocations = availableLocations.filter((loc) => loc.canFit);

  return (
    <div
      ref={menuRef}
      className="bg-surface-base border-border-theme fixed z-50 min-w-[200px] rounded-lg border py-1 shadow-xl"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div
        className={`${trayStyles.padding.header} border-border-theme-subtle border-b py-1.5 ${trayStyles.text.primary} text-text-theme-secondary`}
      >
        {item.name} ({item.criticalSlots} slot{' '}
        {item.criticalSlots !== 1 ? 's' : ''})
      </div>

      {item.isAllocated && (
        <>
          <button
            onClick={() => {
              onUnassign();
              onClose();
            }}
            className={`w-full text-left ${trayStyles.padding.header} py-1.5 ${trayStyles.text.primary} text-accent hover:bg-surface-raised transition-colors`}
          >
            Unassign from {item.location}
          </button>
          <div className="border-border-theme-subtle my-1 border-t" />
        </>
      )}

      {!item.isAllocated && validLocations.length > 0 && (
        <>
          <div
            className={`${trayStyles.padding.header} py-1 ${trayStyles.text.secondary} tracking-wider text-slate-500 uppercase`}
          >
            Quick Assign
          </div>
          {validLocations.map((loc) => (
            <button
              key={loc.location}
              onClick={() => {
                onQuickAssign(loc.location);
                onClose();
              }}
              className={`w-full text-left ${trayStyles.padding.header} py-1.5 ${trayStyles.text.primary} hover:bg-surface-raised flex items-center justify-between gap-3 whitespace-nowrap text-slate-200 transition-colors`}
            >
              <span className="flex-shrink-0">Add to {loc.label}</span>
              <span
                className={`text-slate-500 ${trayStyles.text.secondary} flex-shrink-0`}
              >
                {loc.availableSlots} free
              </span>
            </button>
          ))}
        </>
      )}

      {!item.isAllocated && validLocations.length === 0 && (
        <div
          className={`${trayStyles.padding.header} py-2 ${trayStyles.text.primary} text-slate-500 italic`}
        >
          No locations with {item.criticalSlots} contiguous slots
        </div>
      )}
    </div>
  );
}
