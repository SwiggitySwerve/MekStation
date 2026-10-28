import React, { useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import { trayStyles } from './GlobalLoadoutTray.styles';

interface AllocationSectionProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  titleColor?: string;
  isDropZone?: boolean;
  /** Short tooltip and drag-over label describing what dropping here does. */
  dropLabel?: string;
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
  dropLabel = 'Drop here',
  onDrop,
}: AllocationSectionProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (event: React.DragEvent) => {
    if (!isDropZone) {
      return;
    }
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!isDropZone) {
      return;
    }
    event.preventDefault();
    setIsDragOver(false);
    const equipmentId = event.dataTransfer.getData('text/equipment-id');
    if (equipmentId && onDrop) {
      onDrop(equipmentId);
    }
  };

  // An empty, collapsed section is just a quiet header; it still accepts
  // drops because the drag handlers live on the whole section.
  const isQuiet = count === 0 && !isExpanded && !isDragOver;

  return (
    <section
      className={`border-border-theme border-b transition-colors ${
        isDragOver ? 'ring-accent bg-accent/10 ring-2 ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        title={isDropZone ? dropLabel : undefined}
        className={`${isQuiet ? trayStyles.sectionRowQuiet : trayStyles.sectionRow} focus-visible:ring-text-theme-primary focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset`}
      >
        <span
          className={`${trayStyles.text.primary} min-w-0 truncate font-medium ${
            isDragOver ? 'text-accent' : titleColor
          }`}
        >
          {isDragOver ? dropLabel : title}
        </span>
        <span className={`flex shrink-0 items-center ${trayStyles.gap}`}>
          <span
            className={`${trayStyles.text.secondary} text-text-theme-secondary tabular-nums`}
          >
            {count}
          </span>
          <AppIcon
            name="chevron-down"
            size="inline"
            className={`text-text-theme-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {isExpanded && <div>{children}</div>}
    </section>
  );
}
