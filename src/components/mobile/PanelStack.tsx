import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { useNavigationStore } from '../../stores/navigationStore';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';

interface PanelProps {
  id: string;
  children: ReactNode;
}

interface PanelInternalProps extends PanelProps {
  isActive: boolean;
  isPrevious: boolean;
  isNext: boolean;
  direction: 'forward' | 'backward' | null;
}

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
export function Panel({ id, children }: PanelProps): React.ReactElement {
  return <>{children}</>;
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
  const [shouldRender, setShouldRender] = useState(isActive);

  // Render panel if it's active, previous, or next (for transitions)
  useEffect(() => {
    if (isActive || isPrevious || isNext) {
      setShouldRender(true);
    } else {
      // Delay unmount to allow transition to complete
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, isPrevious, isNext]);

  if (!shouldRender) {
    return null;
  }

  // Calculate transform based on state and direction
  let transform = 'translateX(0)';
  let zIndex = 0;
  let visibility: 'visible' | 'hidden' = 'hidden';

  if (isActive) {
    // Current panel - fully visible
    transform = 'translateX(0)';
    zIndex = 10;
    visibility = 'visible';
  } else if (isPrevious && direction === 'backward') {
    // Previous panel sliding in from left during back navigation
    transform = 'translateX(-100%)';
    zIndex = 10;
    visibility = 'visible';
  } else if (isPrevious) {
    // Previous panel, off-screen to the left
    transform = 'translateX(-100%)';
    zIndex = 5;
    visibility = 'visible';
  } else if (isNext && direction === 'forward') {
    // Next panel sliding in from right during forward navigation
    transform = 'translateX(100%)';
    zIndex = 10;
    visibility = 'visible';
  } else if (isNext) {
    // Next panel, off-screen to the right
    transform = 'translateX(100%)';
    zIndex = 5;
    visibility = 'visible';
  }

  return (
    <div
      ref={panelRef}
      data-panel-id={id}
      className="fixed inset-0 w-full h-full bg-white dark:bg-gray-900"
      style={{
        transform,
        zIndex,
        visibility,
        transition: 'transform 300ms ease-in-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}

interface PanelStackProps {
  children: ReactNode;
  className?: string;
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
  const { isMobile } = useDeviceCapabilities();
  const { currentPanel, history, currentIndex } = useNavigationStore();
  const [direction, setDirection] = useState<'forward' | 'backward' | null>(
    null
  );
  const previousIndexRef = useRef<number>(currentIndex);

  // Detect navigation direction
  useEffect(() => {
    if (currentIndex !== previousIndexRef.current) {
      setDirection(currentIndex > previousIndexRef.current ? 'forward' : 'backward');
      previousIndexRef.current = currentIndex;

      // Clear direction after transition
      const timer = setTimeout(() => {
        setDirection(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // Extract panel children
  const panelChildren = React.Children.toArray(children).filter(
    (child): child is React.ReactElement => {
      return React.isValidElement(child) && child.type === Panel;
    }
  );

  // Create map of panel IDs to elements
  const panelMap = new Map<string, ReactNode>();
  panelChildren.forEach((child) => {
    const panelId = child.props.id;
    if (panelId) {
      panelMap.set(panelId, child.props.children);
    }
  });

  // Get current, previous, and next panel IDs
  const currentPanelId = currentPanel;
  const previousPanelId =
    currentIndex > 0 ? history[currentIndex - 1].id : null;
  const nextPanelId =
    currentIndex < history.length - 1 ? history[currentIndex + 1].id : null;

  return (
    <div className={`md:hidden ${className}`.trim()}>
      {panelMap.has(currentPanelId) && (
        <PanelInternal
          id={currentPanelId}
          isActive={true}
          isPrevious={false}
          isNext={false}
          direction={direction}
        >
          {panelMap.get(currentPanelId)}
        </PanelInternal>
      )}
      {previousPanelId && panelMap.has(previousPanelId) && (
        <PanelInternal
          id={previousPanelId}
          isActive={false}
          isPrevious={true}
          isNext={false}
          direction={direction}
        >
          {panelMap.get(previousPanelId)}
        </PanelInternal>
      )}
      {nextPanelId && panelMap.has(nextPanelId) && (
        <PanelInternal
          id={nextPanelId}
          isActive={false}
          isPrevious={false}
          isNext={true}
          direction={direction}
        >
          {panelMap.get(nextPanelId)}
        </PanelInternal>
      )}
    </div>
  );
}
