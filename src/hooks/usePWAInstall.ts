/**
 * usePWAInstall Hook
 *
 * Manages PWA installation prompt and state.
 * Handles the beforeinstallprompt event for "Add to Home Screen" functionality.
 *
 * @example
 * const { canInstall, isInstalled, promptInstall } = usePWAInstall();
 * if (canInstall) {
 *   return <button onClick={promptInstall}>Install App</button>;
 * }
 */

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface PWAInstallState {
  /** True if the install prompt can be shown */
  canInstall: boolean;
  /** True if the app is already installed as PWA */
  isInstalled: boolean;
  /** True if the install prompt is currently showing */
  isPrompting: boolean;
  /** Trigger the install prompt */
  promptInstall: () => Promise<boolean>;
  /** Dismiss the install prompt */
  dismissInstall: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  // Check if app is installed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsInstalled(isStandalone);

    // Listen for display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsInstalled(event.matches);
    };

    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Prompt the user to install the PWA
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    setIsPrompting(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's choice
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt since it can only be used once
      setDeferredPrompt(null);
      setIsPrompting(false);

      return outcome === 'accepted';
    } catch {
      setIsPrompting(false);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss the install option (user doesn't want to see it)
  const dismissInstall = useCallback(() => {
    setDeferredPrompt(null);
    // Optionally store in localStorage to not show again for a while
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  }, []);

  return {
    canInstall: deferredPrompt !== null && !isInstalled,
    isInstalled,
    isPrompting,
    promptInstall,
    dismissInstall,
  };
}

export default usePWAInstall;
