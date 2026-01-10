/**
 * Adaptive DnD Provider Component
 *
 * Provides React DnD context with automatic backend selection based on device type.
 * Uses TouchBackend for touch devices and HTML5Backend for desktop.
 * Supports hybrid devices (touchscreen laptops) with enableMouseEvents.
 *
 * NOTE: This component requires `react-dnd-touch-backend` package to be installed:
 *   npm install react-dnd-touch-backend
 *
 * @see https://react-dnd.github.io/react-dnd/docs/backends/touch
 */

import React, { useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDeviceType } from '@/hooks/useDeviceType';

// NOTE: TouchBackend import - requires react-dnd-touch-backend package
// Uncomment when package is installed:
// import { TouchBackend } from 'react-dnd-touch-backend';

interface DndProviderAdaptiveProps {
  /** Child components that require DnD context */
  children: React.ReactNode;
  /** Force a specific backend (for testing or override) */
  forceBackend?: 'html5' | 'touch';
  /** Enable mouse events when using touch backend (for hybrid devices) */
  enableMouseEvents?: boolean;
  /** Touch backend delay in milliseconds (default: 0, use higher for scroll disambiguation) */
  delayTouchStart?: number;
}

/**
 * Adaptive DnD provider that automatically selects the appropriate backend.
 *
 * - Uses TouchBackend when touch capability is detected
 * - Uses HTML5Backend for desktop/mouse-only devices
 * - Enables mouse events for hybrid devices (e.g., touchscreen laptops)
 *
 * @example
 * ```tsx
 * <DndProviderAdaptive>
 *   <MyDraggableComponents />
 * </DndProviderAdaptive>
 * ```
 */
export function DndProviderAdaptive({
  children,
  forceBackend,
  enableMouseEvents = true,
  delayTouchStart = 0,
}: DndProviderAdaptiveProps): React.ReactElement {
  const { isTouch, hasMouse } = useDeviceType();

  // Determine which backend to use
  const useTouch = forceBackend === 'touch' || (forceBackend !== 'html5' && isTouch);

  // Configure backend options
  const backendConfig = useMemo(() => {
    if (useTouch) {
      // TouchBackend configuration
      // NOTE: When react-dnd-touch-backend is installed, use:
      // return {
      //   backend: TouchBackend,
      //   options: {
      //     enableMouseEvents: enableMouseEvents && hasMouse,
      //     delayTouchStart,
      //     // Ignore right-click for context menu support
      //     ignoreContextMenu: true,
      //   },
      // };

      // Fallback to HTML5Backend until touch backend is installed
      console.warn(
        'DndProviderAdaptive: Touch device detected but react-dnd-touch-backend not installed. ' +
          'Run: npm install react-dnd-touch-backend'
      );
      return {
        backend: HTML5Backend,
        options: {},
      };
    }

    // HTML5Backend for desktop
    return {
      backend: HTML5Backend,
      options: {},
    };
  }, [useTouch, enableMouseEvents, hasMouse, delayTouchStart]);

  return (
    <DndProvider backend={backendConfig.backend} options={backendConfig.options}>
      {children}
    </DndProvider>
  );
}

export default DndProviderAdaptive;
