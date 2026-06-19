import React, { ReactNode, useRef, useEffect, useState } from 'react';

import { useDeviceType } from '@/hooks/useDeviceType';
import { useNavigationSelector } from '@/stores/useNavigationStore';

interface PanelProps {
  id: string;
  children: ReactNode;
}

type PanelDirection = 'forward' | 'backward' | null;
type PanelPlacement = 'active' | 'previous' | 'next';

interface PanelInternalProps extends PanelProps {
  isActive: boolean;
  isPrevious: boolean;
  isNext: boolean;
  direction: PanelDirection;
}

interface PanelPresentation {
  transform: string;
  zIndex: number;
  visibility: 'visible' | 'hidden';
}

interface PanelHistoryEntry {
  id: string;
}

interface AdjacentPanelIds {
  currentPanelId: string;
  previousPanelId: string | null;
  nextPanelId: string | null;
}

interface PanelSlot {
  id: string | null;
  placement: PanelPlacement;
}

interface PanelSlotRendererProps {
  slot: PanelSlot;
  panelMap: Map<string, ReactNode>;
  direction: PanelDirection;
}

interface PanelStackProps {
  children: ReactNode;
  className?: string;
}

const PANEL_TRANSITION_MS = 300;
const PANEL_TRANSITION = 'transform 300ms ease-in-out';

/**
 * Individual panel component for PanelStack
 *
 * Wraps content to be managed by PanelStack navigation.
 *
 * @example
 * ```tsx
 * <Panel id="catalog">
 *   <UnitCatalog />
 * </Panel>
 * ```
 */
export function Panel({ id: _id, children }: PanelProps): React.ReactElement {
  return <>{children}</>;
}

function shouldKeepPanelMounted({
  isActive,
  isPrevious,
  isNext,
}: Pick<PanelInternalProps, 'isActive' | 'isPrevious' | 'isNext'>): boolean {
  return isActive || isPrevious || isNext;
}

function getPanelPresentation({
  isActive,
  isPrevious,
  isNext,
  direction,
}: Omit<PanelInternalProps, 'id' | 'children'>): PanelPresentation {
  if (isActive) {
    return {
      transform: 'translateX(0)',
      zIndex: 10,
      visibility: 'visible',
    };
  }

  if (isPrevious) {
    return {
      transform: 'translateX(-100%)',
      zIndex: direction === 'backward' ? 10 : 5,
      visibility: 'visible',
    };
  }

  if (isNext) {
    return {
      transform: 'translateX(100%)',
      zIndex: direction === 'forward' ? 10 : 5,
      visibility: 'visible',
    };
  }

  return {
    transform: 'translateX(0)',
    zIndex: 0,
    visibility: 'hidden',
  };
}

function useRenderDuringTransition({
  isActive,
  isPrevious,
  isNext,
}: Pick<PanelInternalProps, 'isActive' | 'isPrevious' | 'isNext'>): boolean {
  const [shouldRender, setShouldRender] = useState(isActive);

  useEffect(() => {
    if (shouldKeepPanelMounted({ isActive, isPrevious, isNext })) {
      setShouldRender(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setShouldRender(false);
    }, PANEL_TRANSITION_MS);

    return () => clearTimeout(timer);
  }, [isActive, isPrevious, isNext]);

  return shouldRender;
}

function useNavigationDirection(currentIndex: number): PanelDirection {
  const [direction, setDirection] = useState<PanelDirection>(null);
  const previousIndexRef = useRef<number>(currentIndex);

  useEffect(() => {
    if (currentIndex === previousIndexRef.current) {
      return undefined;
    }

    setDirection(
      currentIndex > previousIndexRef.current ? 'forward' : 'backward',
    );
    previousIndexRef.current = currentIndex;

    const timer = setTimeout(() => {
      setDirection(null);
    }, PANEL_TRANSITION_MS);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  return direction;
}

function isPanelElement(
  child: ReactNode,
): child is React.ReactElement<PanelProps> {
  return React.isValidElement(child) && child.type === Panel;
}

function getPanelMap(children: ReactNode): Map<string, ReactNode> {
  const panelMap = new Map<string, ReactNode>();

  React.Children.toArray(children)
    .filter(isPanelElement)
    .forEach((child) => {
      const panelId = child.props.id;

      if (panelId) {
        panelMap.set(panelId, child.props.children);
      }
    });

  return panelMap;
}

function getPanelIdAt(
  history: PanelHistoryEntry[],
  index: number,
): string | null {
  return history[index]?.id ?? null;
}

function getAdjacentPanelIds({
  history,
  currentIndex,
  currentPanel,
}: {
  history: PanelHistoryEntry[];
  currentIndex: number;
  currentPanel: string;
}): AdjacentPanelIds {
  return {
    currentPanelId: currentPanel,
    previousPanelId: getPanelIdAt(history, currentIndex - 1),
    nextPanelId: getPanelIdAt(history, currentIndex + 1),
  };
}

function buildPanelSlots({
  currentPanelId,
  previousPanelId,
  nextPanelId,
}: AdjacentPanelIds): PanelSlot[] {
  return [
    { id: currentPanelId, placement: 'active' },
    { id: previousPanelId, placement: 'previous' },
    { id: nextPanelId, placement: 'next' },
  ];
}

function PanelSlotRenderer({
  slot,
  panelMap,
  direction,
}: PanelSlotRendererProps): React.ReactElement | null {
  if (!slot.id || !panelMap.has(slot.id)) {
    return null;
  }

  return (
    <PanelInternal
      id={slot.id}
      isActive={slot.placement === 'active'}
      isPrevious={slot.placement === 'previous'}
      isNext={slot.placement === 'next'}
      direction={direction}
    >
      {panelMap.get(slot.id)}
    </PanelInternal>
  );
}

/**
 * Panel internal component with animation state
 */
function PanelInternal({
  id,
  children,
  isActive,
  isPrevious,
  isNext,
  direction,
}: PanelInternalProps): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldRender = useRenderDuringTransition({
    isActive,
    isPrevious,
    isNext,
  });

  if (!shouldRender) {
    return null;
  }

  const presentation = getPanelPresentation({
    isActive,
    isPrevious,
    isNext,
    direction,
  });

  return (
    <div
      ref={panelRef}
      data-panel-id={id}
      className="fixed inset-0 h-full w-full bg-white dark:bg-gray-900"
      style={{
        ...presentation,
        transition: PANEL_TRANSITION,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}

/**
 * PanelStack component for mobile panel navigation
 *
 * Manages stackable full-screen panels with slide transitions.
 * Only visible on mobile viewports (< 768px).
 *
 * Automatically uses navigation store to determine active panel
 * and animates transitions using GPU-accelerated transforms.
 *
 * @example
 * ```tsx
 * <PanelStack>
 *   <Panel id="catalog">
 *     <UnitCatalog />
 *   </Panel>
 *   <Panel id="editor">
 *     <MechEditor />
 *   </Panel>
 * </PanelStack>
 * ```
 */
export function PanelStack({
  children,
  className = '',
}: PanelStackProps): React.ReactElement | null {
  const { isMobile } = useDeviceType();
  const currentPanel = useNavigationSelector((state) => state.currentPanel);
  const history = useNavigationSelector((state) => state.history);
  const currentIndex = useNavigationSelector((state) => state.currentIndex);
  const direction = useNavigationDirection(currentIndex);

  if (!isMobile) {
    return null;
  }

  const panelMap = getPanelMap(children);
  const adjacentPanelIds = getAdjacentPanelIds({
    history,
    currentIndex,
    currentPanel,
  });

  return (
    <div className={`md:hidden ${className}`.trim()}>
      {buildPanelSlots(adjacentPanelIds).map((slot) => (
        <PanelSlotRenderer
          key={`${slot.placement}:${slot.id ?? 'empty'}`}
          slot={slot}
          panelMap={panelMap}
          direction={direction}
        />
      ))}
    </div>
  );
}
