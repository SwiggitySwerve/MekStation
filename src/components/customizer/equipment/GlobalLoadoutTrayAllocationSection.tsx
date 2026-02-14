import React, { useState } from 'react';

import { trayStyles } from './GlobalLoadoutTray.styles';

interface AllocationSectionProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  titleColor?: string;
  isDropZone?: boolean;
  onDrop?: (equipmentId: string) => void;
}

export function GlobalLoadoutTrayAllocationSection({
  title,
  count,
  isExpanded,
  onToggle,
  children,
  titleColor = 'text-text-theme-secondary',
  isDropZone = false,
  onDrop,
}: AllocationSectionProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDropZone) {
      return;
    }
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isDropZone) {
      return;
    }
    e.preventDefault();
    setIsDragOver(false);
    const equipmentId = e.dataTransfer.getData('text/equipment-id');
    if (equipmentId && onDrop) {
      onDrop(equipmentId);
    }
  };

  return (
    <div
      className={`border-border-theme border-b transition-all ${isDragOver ? 'ring-accent bg-accent/20 ring-2 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button onClick={onToggle} className={trayStyles.sectionRow}>
        <span
          className={`${trayStyles.text.primary} font-medium ${titleColor}`}
        >
          {title}
        </span>
        <span className={`flex items-center ${trayStyles.gap}`}>
          <span
            className={`${trayStyles.text.secondary} text-text-theme-secondary`}
          >
            ({count})
          </span>
          <span
            className={`${trayStyles.text.tertiary} text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </span>
      </button>
      {isExpanded && <div>{children}</div>}
    </div>
  );
}
