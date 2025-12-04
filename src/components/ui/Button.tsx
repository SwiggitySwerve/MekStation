/**
 * Button Component
 * Reusable button component with multiple variants and states.
 */
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'pagination' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-amber-600 hover:bg-amber-500 text-white border-transparent',
  secondary: 'bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300',
  ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white border-transparent',
  pagination: 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600',
  danger: 'bg-red-600 hover:bg-red-500 text-white border-transparent',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps): React.ReactElement {
  const baseClasses = 'rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}

// Pagination button group helper
interface PaginationButtonsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationButtons({ currentPage, totalPages, onPageChange }: PaginationButtonsProps): React.ReactElement | null {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="pagination"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        First
      </Button>
      <Button
        variant="pagination"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        Prev
      </Button>
      <span className="px-4 py-2 text-slate-400">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="pagination"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
      <Button
        variant="pagination"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        Last
      </Button>
    </div>
  );
}

export default Button;

