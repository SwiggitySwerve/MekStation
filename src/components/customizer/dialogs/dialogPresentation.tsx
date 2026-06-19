import React from 'react';

import { customizerStyles as cs } from '../styles';

type IconProps = {
  className?: string;
};

export function CloseIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      className={className}
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
  );
}

export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export function ErrorIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function WarningIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      className={className}
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
  );
}

export function SpinnerIcon({ className = 'h-5 w-5 animate-spin' }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function DialogCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className={cs.dialog.closeBtn}>
      <CloseIcon />
    </button>
  );
}

export function DialogErrorMessage({ message }: { message: string }) {
  return (
    <div className={cs.dialog.errorPanel}>
      <div className="flex items-center gap-2 text-red-400">
        <ErrorIcon className="h-5 w-5" />
        {message}
      </div>
    </div>
  );
}

export function DialogLoadingState({ label }: { label: string }) {
  return (
    <div className="text-text-theme-secondary flex items-center justify-center gap-2 py-4">
      <SpinnerIcon />
      {label}
    </div>
  );
}
