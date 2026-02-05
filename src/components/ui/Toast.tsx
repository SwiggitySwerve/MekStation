/**
 * Toast Component
 * Simple toast notification system for displaying transient messages.
 */
import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';

// =============================================================================
// Types
// =============================================================================

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  /** Unique identifier */
  id: string;
  /** Message to display */
  message: string;
  /** Toast type/variant */
  variant: ToastVariant;
  /** Duration in milliseconds (0 = persistent) */
  duration: number;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  action?: Toast['action'];
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// =============================================================================
// Context
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// Provider
// =============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  /** Maximum number of toasts to display */
  maxToasts?: number;
  /** Default duration in milliseconds */
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = {
        id,
        message: options.message,
        variant: options.variant ?? 'info',
        duration: options.duration ?? defaultDuration,
        action: options.action,
      };

      setToasts((prev) => {
        // Remove oldest if at max
        const updated = prev.length >= maxToasts ? prev.slice(1) : prev;
        return [...updated, toast];
      });

      return id;
    },
    [defaultDuration, maxToasts],
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// Toast Container
// =============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({
  toasts,
  onRemove,
}: ToastContainerProps): React.ReactElement | null {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// =============================================================================
// Toast Item
// =============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const variantStyles: Record<
  ToastVariant,
  { bg: string; border: string; icon: React.ReactElement }
> = {
  info: {
    bg: 'bg-surface-raised',
    border: 'border-cyan-500/40',
    icon: (
      <svg
        className="h-5 w-5 text-cyan-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  success: {
    bg: 'bg-surface-raised',
    border: 'border-emerald-500/40',
    icon: (
      <svg
        className="h-5 w-5 text-emerald-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-surface-raised',
    border: 'border-amber-500/40',
    icon: (
      <svg
        className="h-5 w-5 text-amber-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
  error: {
    bg: 'bg-surface-raised',
    border: 'border-red-500/40',
    icon: (
      <svg
        className="h-5 w-5 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

function ToastItem({ toast, onRemove }: ToastItemProps): React.ReactElement {
  const [isExiting, setIsExiting] = useState(false);
  const styles = variantStyles[toast.variant];

  useEffect(() => {
    if (toast.duration <= 0) return;

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, toast.duration - 300); // Start exit animation before removal

    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      className={`pointer-events-auto max-w-[420px] min-w-[320px] rounded-lg p-4 shadow-lg ${styles.bg} border ${styles.border} transform transition-all duration-200 ease-out ${
        isExiting
          ? 'translate-x-4 opacity-0'
          : 'animate-in slide-in-from-right-4 translate-x-0 opacity-100'
      } `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5 flex-shrink-0">{styles.icon}</div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-text-theme-primary text-sm">{toast.message}</p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="hover:bg-surface-base/50 text-text-theme-muted hover:text-text-theme-secondary flex-shrink-0 rounded p-1 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Simple hook for showing toasts without provider check.
 * Returns no-op functions if provider is not available.
 */
export function useToastSafe(): Omit<ToastContextValue, 'toasts'> {
  const context = useContext(ToastContext);

  if (!context) {
    return {
      addToast: () => '',
      removeToast: () => {},
      clearToasts: () => {},
    };
  }

  return {
    addToast: context.addToast,
    removeToast: context.removeToast,
    clearToasts: context.clearToasts,
  };
}

export default ToastProvider;
