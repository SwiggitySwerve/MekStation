import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAInstallResult {
  /** Whether the PWA install prompt is available */
  canInstall: boolean;
  /** Whether the PWA is already installed */
  isInstalled: boolean;
  /** Trigger the PWA install prompt */
  promptInstall: () => Promise<boolean>;
  /** Whether the app is running in standalone mode (installed PWA) */
  isStandalone: boolean;
}

/**
 * Hook to manage PWA installation prompts
 *
 * Captures the beforeinstallprompt event and provides a method to trigger
 * the install prompt on user interaction.
 *
 * @example
 * ```tsx
 * const { canInstall, promptInstall, isInstalled } = usePWAInstall();
 *
 * if (canInstall && !isInstalled) {
 *   return <button onClick={promptInstall}>Install App</button>;
 * }
 * ```
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      // matchMedia might not be available in test environments
      const matchMediaSupported = typeof window.matchMedia === 'function';
      const standalone =
        (matchMediaSupported && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the default browser prompt
      event.preventDefault();
      // Store the event for later use
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    // Listen for successful app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Also check display-mode changes (if matchMedia is available)
    let mediaQuery: MediaQueryList | null = null;
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setIsStandalone(event.matches);
      if (event.matches) {
        setIsInstalled(true);
      }
    };

    if (typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(display-mode: standalone)');
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPromptEvent) {
      return false;
    }

    // Show the install prompt
    await installPromptEvent.prompt();

    // Wait for the user's choice
    const { outcome } = await installPromptEvent.userChoice;

    // Clear the stored event (can only be used once)
    setInstallPromptEvent(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }

    return false;
  }, [installPromptEvent]);

  return {
    canInstall: installPromptEvent !== null,
    isInstalled,
    promptInstall,
    isStandalone,
  };
}

export default usePWAInstall;
