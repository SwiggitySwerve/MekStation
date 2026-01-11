/**
 * Action Sheet Component
 *
 * Mobile-optimized slide-up action menu from the bottom of the screen.
 * Provides a list of contextual actions with optional danger styling
 * for destructive operations.
 *
 * @spec openspec/changes/pwa-implementation-tasks.md - Phase 3.4
 */

import React, { useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ActionSheetItem {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Optional icon (emoji or component) */
  icon?: React.ReactNode;
  /** Whether this is a destructive action (styled in red) */
  danger?: boolean;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Callback when action is selected */
  onSelect: () => void;
}

interface ActionSheetProps {
  /** Whether the action sheet is visible */
  isOpen: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
  /** Title displayed at the top of the sheet */
  title?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Action items to display */
  actions: ActionSheetItem[];
  /** Whether to show a cancel button (default: true) */
  showCancel?: boolean;
  /** Custom cancel button label */
  cancelLabel?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Animation duration in milliseconds */
const ANIMATION_DURATION = 200;

// =============================================================================
// Main Component
// =============================================================================

/**
 * Action Sheet - Mobile-optimized contextual action menu
 *
 * Slides up from the bottom with a backdrop that dismisses on tap.
 * Supports multiple action items with optional danger styling.
 *
 * @example
 * ```tsx
 * <ActionSheet
 *   isOpen={showActions}
 *   onClose={() => setShowActions(false)}
 *   title="Equipment Actions"
 *   actions={[
 *     { id: 'assign', label: 'Assign to Location', onSelect: handleAssign },
 *     { id: 'remove', label: 'Remove', danger: true, onSelect: handleRemove },
 *   ]}
 * />
 * ```
 */
export function ActionSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  actions,
  showCancel = true,
  cancelLabel = 'Cancel',
}: ActionSheetProps): React.ReactElement | null {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else if (isVisible) {
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle action selection
  const handleActionSelect = useCallback(
    (action: ActionSheetItem) => {
      if (action.disabled) return;
      action.onSelect();
      onClose();
    },
    [onClose]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-end justify-center
        transition-opacity duration-200
        ${isAnimating ? 'bg-black/50' : 'bg-transparent'}
      `}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Action sheet'}
    >
      {/* Action Sheet Container */}
      <div
        ref={sheetRef}
        className={`
          w-full max-w-lg bg-surface-base rounded-t-2xl
          transform transition-transform duration-200 ease-out
          ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="px-4 py-3 border-b border-border-theme text-center">
            {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
            {subtitle && <p className="text-sm text-text-theme-secondary mt-0.5">{subtitle}</p>}
          </div>
        )}

        {/* Action Items */}
        <div className="py-2">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionSelect(action)}
              disabled={action.disabled}
              className={`
                w-full px-4 py-3 flex items-center gap-3
                text-left transition-colors min-h-[48px]
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-surface-raised'}
                ${action.danger ? 'text-red-400' : 'text-white'}
                ${index > 0 ? 'border-t border-border-theme/50' : ''}
              `}
            >
              {action.icon && (
                <span className="flex-shrink-0 w-6 text-center">{action.icon}</span>
              )}
              <span className="flex-1 text-base">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        {showCancel && (
          <>
            <div className="h-2 bg-surface-deep/50" />
            <button
              onClick={onClose}
              className="w-full px-4 py-3 text-center text-base font-medium text-text-theme-primary
                         bg-surface-base active:bg-surface-raised transition-colors min-h-[48px]"
            >
              {cancelLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ActionSheet;
