/**
 * Desktop Settings Context
 *
 * Provides context for managing the desktop settings dialog state
 * and handling menu commands from the Electron main process.
 *
 * Usage:
 * 1. Wrap your app with <DesktopSettingsProvider>
 * 2. Use useDesktopSettingsDialog() to get open/close functions
 * 3. The provider automatically handles menu commands
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

import { DesktopSettingsDialog } from './DesktopSettingsDialog';
import { useElectron, MenuCommand, isElectron } from './useElectron';

// Context types
interface DesktopSettingsContextType {
  /** Whether the settings dialog is currently open */
  isSettingsOpen: boolean;
  /** Open the settings dialog */
  openSettings: () => void;
  /** Close the settings dialog */
  closeSettings: () => void;
  /** Whether we're running in Electron */
  isDesktop: boolean;
}

// Context
const DesktopSettingsContext = createContext<DesktopSettingsContextType | null>(
  null,
);

// Provider props
interface DesktopSettingsProviderProps {
  children: ReactNode;
}

/**
 * Desktop Settings Provider
 *
 * Provides desktop settings context and renders the settings dialog.
 * Handles menu commands from the Electron main process.
 */
export function DesktopSettingsProvider({
  children,
}: DesktopSettingsProviderProps): React.ReactElement {
  const api = useElectron();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Open/close settings dialog
  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Handle menu commands from main process
  useEffect(() => {
    if (!api) return;

    const handleMenuCommand = (command: MenuCommand) => {
      switch (command) {
        case 'file:preferences':
          openSettings();
          break;
        // Other menu commands can be handled here or in specific components
      }
    };

    api.onMenuCommand(handleMenuCommand);

    // Also listen for direct open-settings event
    api.onOpenSettings(() => {
      openSettings();
    });

    return () => {
      api.removeAllListeners('menu:command');
      api.removeAllListeners('app:open-settings');
    };
  }, [api, openSettings]);

  const contextValue: DesktopSettingsContextType = {
    isSettingsOpen,
    openSettings,
    closeSettings,
    isDesktop: isElectron(),
  };

  return (
    <DesktopSettingsContext.Provider value={contextValue}>
      {children}
      {/* Render the settings dialog */}
      <DesktopSettingsDialog isOpen={isSettingsOpen} onClose={closeSettings} />
    </DesktopSettingsContext.Provider>
  );
}

/**
 * Hook to access desktop settings dialog controls
 */
export function useDesktopSettingsDialog(): DesktopSettingsContextType {
  const context = useContext(DesktopSettingsContext);

  if (!context) {
    // Return a safe fallback for non-provider usage
    return {
      isSettingsOpen: false,
      openSettings: () => {},
      closeSettings: () => {},
      isDesktop: false,
    };
  }

  return context;
}
