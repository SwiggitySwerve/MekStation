import type { RefObject } from 'react';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { GamePhase, ILayoutConfig } from '@/types/gameplay';

import { DEFAULT_LAYOUT_CONFIG, getLayoutForPhase } from '@/types/gameplay';

export function useGameplayLayoutPanelState(phase: GamePhase): {
  readonly layout: ILayoutConfig;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly startDragging: () => void;
  readonly handleEventLogCollapsedChange: (collapsed: boolean) => void;
} {
  const [layout, setLayout] = useState<ILayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const phaseLayout = getLayoutForPhase(phase);
    setLayout((prev) => ({ ...prev, ...phaseLayout }));
  }, [phase]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, percentage));
      setLayout((prev) => ({ ...prev, mapPanelWidth: clamped }));
    },
    [isDragging],
  );
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const startDragging = useCallback(() => {
    setIsDragging(true);
  }, []);
  const handleEventLogCollapsedChange = useCallback((collapsed: boolean) => {
    setLayout((prev) => ({ ...prev, eventLogCollapsed: collapsed }));
  }, []);

  return {
    layout,
    containerRef,
    startDragging,
    handleEventLogCollapsedChange,
  };
}
