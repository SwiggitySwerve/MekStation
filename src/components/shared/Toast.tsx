/**
 * Toast Notification Component
 *
 * Simple toast notifications with auto-dismiss for success, error, warning, and info messages.
 * Provides visual feedback for user actions and system events.
 *
 * @module components/shared/Toast
 */

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Toast notification variant
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification configuration
 */
export interface ToastConfig {
  /** Unique identifier */
  id: string;
  /** Toast message */
  message: string;
  /** Toast variant/type */
  variant: ToastVariant;
  /** Auto-dismiss duration in ms (default: 3000) */
  duration?: number;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast context value
 */
interface ToastContextValue {
  /** Show a toast notification */
  showToast: (config: Omit<ToastConfig, 'id'>) => void;
  /** Dismiss a specific toast */
  dismissToast: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default auto-dismiss duration in milliseconds
 */
const DEFAULT_DURATION = 3000;

/**
 * Variant-specific styling
 */
const VARIANT_STYLES: Record<ToastVariant, {
  bg: string;
  border: string;
  text: string;
  icon: string;
}> = {
  success: {
    bg: 'bg-green-900/90',
    border: 'border-green-600',
    text: 'text-green-100',
    icon: 'text-green-400',
  },
  error: {
    bg: 'bg-red-900/90',
    border: 'border-red-600',
    text: 'text-red-100',
    icon: 'text-red-400',
  },
  warning: {
    bg: 'bg-amber-900/90',
    border: 'border-amber-600',
    text: 'text-amber-100',
    icon: 'text-amber-400',
  },
  info: {
    bg: 'bg-blue-900/90',
    border: 'border-blue-600',
    text: 'text-blue-100',
    icon: 'text-blue-400',
  },
};

/**
 * Variant icons
 */
const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// =============================================================================
// Context
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast functionality
 *
 * @returns Toast context with showToast, dismissToast, dismissAll functions
 * @throws Error if used outside of ToastProvider
 *
 * @example
 * ```tsx
 * const { showToast } = useToast();
 *
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *     showToast({ message: 'Saved successfully!', variant: 'success' });
 *   } catch (err) {
 *     showToast({ message: 'Failed to save', variant: 'error' });
 *   }
 * };
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Individual toast notification
 */
function Toast({
  config,
  onDismiss,
}: {
  config: ToastConfig;
  onDismiss: () => void;
}): React.ReactElement {
  const [isExiting, setIsExiting] = useState(false);
  const styles = VARIANT_STYLES[config.variant];
  const icon = VARIANT_ICONS[config.variant];

  // Handle dismiss with exit animation
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 200); // Match animation duration
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    const duration = config.duration ?? DEFAULT_DURATION;
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [config.duration, handleDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        min-w-[280px] max-w-[400px]
        ${styles.bg} ${styles.border}
        transform transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {icon}
      </div>

      {/* Message */}
      <div className={`flex-1 text-sm font-medium ${styles.text}`}>
        {config.message}
      </div>

      {/* Action button (optional) */}
      {config.action && (
        <button
          onClick={() => {
            config.action?.onClick();
            handleDismiss();
          }}
          className={`flex-shrink-0 px-2 py-1 text-sm font-medium rounded hover:bg-white/10 transition-colors ${styles.text}`}
        >
          {config.action.label}
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={`flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors ${styles.text}`}
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Toast container - renders all active toasts
 */
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastConfig[];
  onDismiss: (id: string) => void;
}): React.ReactElement | null {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast config={toast} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
}

/**
 * Toast provider component
 *
 * Wrap your app with this to enable toast notifications.
 *
 * @example
 * ```tsx
 * // In _app.tsx or layout.tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * // In any child component
 * const { showToast } = useToast();
 * showToast({ message: 'Hello!', variant: 'info' });
 * ```
 */
export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const showToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...config, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = {
    showToast,
    dismissToast,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a standalone toast instance for use outside React components
 * Note: This requires the ToastProvider to be mounted in the app
 */
let toastRef: ToastContextValue | null = null;

/**
 * Set the toast reference for standalone usage
 * Call this from within a component that has access to the toast context
 */
export function setToastRef(ref: ToastContextValue): void {
  toastRef = ref;
}

/**
 * Show a toast from outside React components
 * Requires setToastRef to have been called
 */
export function toast(config: Omit<ToastConfig, 'id'>): void {
  if (toastRef) {
    toastRef.showToast(config);
  } else {
    console.warn('Toast: No toast provider found. Make sure ToastProvider is mounted.');
  }
}

/**
 * Convenience helpers for common toast types
 */
export const toastHelpers = {
  success: (message: string, duration?: number) =>
    toast({ message, variant: 'success', duration }),
  error: (message: string, duration?: number) =>
    toast({ message, variant: 'error', duration }),
  warning: (message: string, duration?: number) =>
    toast({ message, variant: 'warning', duration }),
  info: (message: string, duration?: number) =>
    toast({ message, variant: 'info', duration }),
};

export default Toast;
