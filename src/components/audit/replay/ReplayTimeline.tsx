/**
 * ReplayTimeline Component
 * Horizontal timeline scrubber with event markers and seek functionality.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useCallback, useRef, useState } from 'react';
import { type IEventMarker } from '@/hooks/audit';
import { EventCategory } from '@/types/events';

// =============================================================================
// Types
// =============================================================================

export interface ReplayTimelineProps {
  /** Current progress (0-1) */
  progress: number;
  /** Event markers to display on timeline */
  markers: readonly IEventMarker[];
  /** Seek handler - called with progress value (0-1) */
  onSeek: (progress: number) => void;
  /** Current sequence number for display */
  currentSequence: number;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Category Colors
// =============================================================================

const CATEGORY_COLORS: Record<EventCategory, string> = {
  [EventCategory.Game]: 'bg-amber-500',
  [EventCategory.Campaign]: 'bg-cyan-500',
  [EventCategory.Pilot]: 'bg-emerald-500',
  [EventCategory.Repair]: 'bg-violet-500',
  [EventCategory.Award]: 'bg-rose-500',
  [EventCategory.Meta]: 'bg-slate-400',
};

const CATEGORY_HOVER_COLORS: Record<EventCategory, string> = {
  [EventCategory.Game]: 'hover:bg-amber-400',
  [EventCategory.Campaign]: 'hover:bg-cyan-400',
  [EventCategory.Pilot]: 'hover:bg-emerald-400',
  [EventCategory.Repair]: 'hover:bg-violet-400',
  [EventCategory.Award]: 'hover:bg-rose-400',
  [EventCategory.Meta]: 'hover:bg-slate-300',
};

// =============================================================================
// Component
// =============================================================================

export function ReplayTimeline({
  progress,
  markers,
  onSeek,
  currentSequence,
  className = '',
}: ReplayTimelineProps): React.ReactElement {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState<IEventMarker | null>(null);

  // Calculate progress from mouse position
  const calculateProgress = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, x / rect.width));
    return newProgress;
  }, []);

  // Handle mouse down on track
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const newProgress = calculateProgress(e.clientX);
    onSeek(newProgress);
  }, [calculateProgress, onSeek]);

  // Handle mouse move while dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const newProgress = calculateProgress(e.clientX);
    onSeek(newProgress);
  }, [isDragging, calculateProgress, onSeek]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredMarker(null);
  }, []);

  // Handle click on timeline track
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const newProgress = calculateProgress(e.clientX);
    onSeek(newProgress);
  }, [calculateProgress, onSeek]);

  // Handle marker click
  const handleMarkerClick = useCallback((e: React.MouseEvent, marker: IEventMarker) => {
    e.stopPropagation();
    onSeek(marker.position);
  }, [onSeek]);

  return (
    <div className={`relative ${className}`}>
      {/* Timeline Track */}
      <div
        ref={trackRef}
        className={`
          relative h-8 bg-surface-base/60 rounded-lg border border-border-theme-subtle
          cursor-pointer select-none overflow-hidden
          transition-all duration-150
          ${isDragging ? 'ring-2 ring-accent/30' : 'hover:bg-surface-base/80'}
        `}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleTrackClick}
        role="slider"
        aria-label="Timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        {/* Progress Fill */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/40 to-accent/60 transition-all duration-75"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Event Markers */}
        <div className="absolute inset-0 flex items-center">
          {markers.map((marker) => {
            const isCurrentEvent = marker.sequence === currentSequence;
            const categoryColor = CATEGORY_COLORS[marker.category] || CATEGORY_COLORS[EventCategory.Meta];
            const hoverColor = CATEGORY_HOVER_COLORS[marker.category] || CATEGORY_HOVER_COLORS[EventCategory.Meta];

            return (
              <div
                key={marker.id}
                className={`
                  absolute w-1.5 rounded-full cursor-pointer transition-all duration-150
                  ${categoryColor} ${hoverColor}
                  ${isCurrentEvent ? 'h-6 ring-2 ring-white/50 shadow-lg' : 'h-3 opacity-70 hover:opacity-100 hover:h-5'}
                `}
                style={{ left: `${marker.position * 100}%`, transform: 'translateX(-50%)' }}
                onClick={(e) => handleMarkerClick(e, marker)}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
                title={marker.label}
              />
            );
          })}
        </div>

        {/* Current Position Indicator (Playhead) */}
        <div
          className={`
            absolute top-0 bottom-0 w-0.5 bg-white shadow-lg
            transition-all duration-75
            ${isDragging ? 'w-1' : ''}
          `}
          style={{ left: `${progress * 100}%`, transform: 'translateX(-50%)' }}
        >
          {/* Playhead Handle */}
          <div
            className={`
              absolute -top-1 left-1/2 -translate-x-1/2
              w-3 h-3 bg-white rounded-full shadow-md border-2 border-accent
              transition-transform duration-150
              ${isDragging ? 'scale-125' : 'hover:scale-110'}
            `}
          />
        </div>
      </div>

      {/* Marker Tooltip */}
      {hoveredMarker && (
        <div
          className="absolute -top-10 bg-surface-raised/95 backdrop-blur-sm border border-border-theme-subtle rounded-md px-2 py-1 text-xs text-text-theme-primary shadow-xl z-10 whitespace-nowrap pointer-events-none"
          style={{
            left: `${hoveredMarker.position * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-medium">{hoveredMarker.type}</span>
          <span className="text-text-theme-muted ml-1.5">#{hoveredMarker.sequence}</span>
        </div>
      )}

      {/* Time/Progress Indicators */}
      <div className="flex justify-between mt-1 text-xs text-text-theme-muted">
        <span>Start</span>
        <span className="font-mono">
          {Math.round(progress * 100)}%
          <span className="text-text-theme-secondary ml-2">Seq #{currentSequence}</span>
        </span>
        <span>End</span>
      </div>
    </div>
  );
}

export default ReplayTimeline;
