/**
 * Modal Overlay Component
 *
 * @spec openspec/specs/confirmation-dialogs/spec.md
 */

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalOverlayProps {
  fullScreen?: boolean;
  /** Center this dialog in the native top layer; fullScreen retains precedence. */
  topLayer?: boolean;
  isOpen: boolean;
  onClose: () => void;
  preventClose?: boolean;
  children: React.ReactNode;
  className?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const bodyScrollLocks = new WeakMap<
  HTMLElement,
  { count: number; overflow: string }
>();

function acquireBodyScrollLock(): () => void {
  const body = document.body;
  let lock = bodyScrollLocks.get(body);
  if (!lock) {
    lock = { count: 0, overflow: body.style.overflow };
    bodyScrollLocks.set(body, lock);
  }
  lock.count += 1;
  body.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.count -= 1;
    if (lock.count === 0) {
      body.style.overflow = lock.overflow;
      bodyScrollLocks.delete(body);
    }
  };
}

function focusableElements(modal: HTMLElement, native: boolean): HTMLElement[] {
  return Array.from(
    modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]',
    ),
  ).filter((element) => {
    const style = getComputedStyle(element);
    return (
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      (!native || element.getClientRects().length > 0)
    );
  });
}

function trapFocus(
  event: React.KeyboardEvent<HTMLElement>,
  native: boolean,
): void {
  if (event.key !== 'Tab') return;
  const focusable = focusableElements(event.currentTarget, native);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first) {
    event.preventDefault();
    event.currentTarget.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function useModalLifecycle<T extends HTMLElement>(
  modalRef: React.RefObject<T | null>,
  isOpen: boolean,
  native: boolean,
): void {
  useLayoutEffect(() => {
    const modal = modalRef.current;
    if (!isOpen || !modal) return;
    const opener = document.activeElement;
    const releaseScroll = acquireBodyScrollLock();
    try {
      if (native && modal instanceof HTMLDialogElement) modal.showModal();
      (focusableElements(modal, native)[0] ?? modal).focus();
    } catch (error) {
      releaseScroll();
      throw error;
    }
    return () => {
      if (native && modal instanceof HTMLDialogElement) modal.close();
      releaseScroll();
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        opener.getClientRects().length > 0 &&
        Array.from(document.querySelectorAll('dialog[open]')).every(
          (remaining) => remaining.contains(opener),
        )
      ) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [isOpen, modalRef, native]);
}

function CenteredModalOverlay({
  isOpen,
  onClose,
  preventClose = false,
  children,
  className = '',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalOverlayProps): React.ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);
  useModalLifecycle(modalRef, isOpen, false);
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !preventClose &&
        modalRef.current?.contains(document.activeElement) &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, preventClose]);
  if (!isOpen) return null;
  return (
    <div
      className="bg-surface-deep/80 fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && !preventClose) onClose();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`bg-surface-base border-border-theme max-h-[90vh] w-full overflow-auto rounded-lg border shadow-xl ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            if (!preventClose) onClose();
          } else trapFocus(event, false);
        }}
      >
        {children}
      </div>
    </div>
  );
}

function NativeModal({
  fullScreen = false,
  onClose,
  preventClose = false,
  children,
  className = '',
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalOverlayProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useModalLifecycle(dialogRef, true, true);
  if (typeof document === 'undefined') return null;
  const layout = fullScreen
    ? 'bg-surface-deep fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 p-0 text-inherit'
    : 'bg-surface-base border-border-theme fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-lg border p-0 text-inherit shadow-xl backdrop:bg-surface-deep/80';
  return createPortal(
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-modal="true"
      className={`${layout} ${className}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (fullScreen || preventClose || event.target !== event.currentTarget)
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        trapFocus(event, true);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!preventClose) onClose();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}

export function ModalOverlay(
  props: ModalOverlayProps,
): React.ReactElement | null {
  if (props.fullScreen || props.topLayer) {
    return props.isOpen ? <NativeModal {...props} /> : null;
  }
  return <CenteredModalOverlay {...props} />;
}
