/**
 * Modal Overlay Component
 * 
 * Reusable modal overlay with backdrop and centering.
 * 
 * @spec openspec/specs/confirmation-dialogs/spec.md
 */

import React, { useEffect, useRef } from 'react';

interface ModalOverlayProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Called when overlay is clicked or escape is pressed */
  onClose: () => void;
  /** Prevent closing (e.g., during operation) */
  preventClose?: boolean;
  /** Modal content */
  children: React.ReactNode;
  /** Additional CSS classes for the modal container */
  className?: string;
}

/**
 * Modal overlay with focus trapping
 */
export function ModalOverlay({
  isOpen,
  onClose,
  preventClose = false,
  children,
  className = '',
}: ModalOverlayProps): React.ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, preventClose]);
  
  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      };
      
      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();
      
      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventClose) {
      onClose();
    }
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`bg-surface-base rounded-lg border border-border-theme shadow-xl w-full max-h-[90vh] overflow-auto ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

