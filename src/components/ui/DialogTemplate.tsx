/**
 * Dialog Template Component
 *
 * Reusable dialog wrapper with standardized header, content, and footer slots.
 * Wraps ModalOverlay for consistent dialog styling across the application.
 *
 * @example
 * ```tsx
 * <DialogTemplate
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Save Unit"
 *   subtitle="Enter a unique name"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
 *       <Button variant="primary" onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </DialogTemplate>
 * ```
 */
import React from 'react';
import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { cs } from '@/components/customizer/styles';

export interface DialogTemplateProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Called when dialog should close (backdrop click, escape key, close button) */
  onClose: () => void;
  /** Dialog title displayed in header */
  title: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Optional footer content (typically action buttons) */
  footer?: React.ReactNode;
  /** Additional CSS classes for the modal container */
  className?: string;
  /** Prevent closing via backdrop/escape (e.g., during async operation) */
  preventClose?: boolean;
  /** Hide the close button in header */
  hideCloseButton?: boolean;
  /** Custom aria-labelledby ID (defaults to auto-generated) */
  ariaLabelledBy?: string;
  /** Custom aria-describedby ID */
  ariaDescribedBy?: string;
}

/**
 * Dialog template with standardized header, content, and footer layout.
 *
 * Features:
 * - Focus trapping (via ModalOverlay)
 * - Escape key to close (via ModalOverlay)
 * - Backdrop click to close (via ModalOverlay)
 * - Standardized header with title and close button
 * - Optional subtitle
 * - Content area with proper spacing
 * - Optional footer for action buttons
 * - Accessible aria attributes
 */
export function DialogTemplate({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = 'w-full max-w-lg mx-4',
  preventClose = false,
  hideCloseButton = false,
  ariaLabelledBy,
  ariaDescribedBy,
}: DialogTemplateProps): React.ReactElement | null {
  // Generate stable IDs for accessibility
  const titleId = ariaLabelledBy || `dialog-title-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const subtitleId = subtitle ? `dialog-subtitle-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      preventClose={preventClose}
      className={className}
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <div>
          <h3 id={titleId} className={cs.dialog.headerTitle}>
            {title}
          </h3>
          {subtitle && (
            <p id={subtitleId} className={cs.dialog.headerSubtitle}>
              {subtitle}
            </p>
          )}
        </div>
        {!hideCloseButton && (
          <button
            onClick={onClose}
            className={cs.dialog.closeBtn}
            aria-label="Close dialog"
            disabled={preventClose}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className={cs.dialog.content}
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy || subtitleId}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && <div className={cs.dialog.footer}>{footer}</div>}
    </ModalOverlay>
  );
}

export default DialogTemplate;
