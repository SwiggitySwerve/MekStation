/**
 * Error Boundary Component - Comprehensive error handling for BattleTech Customizer
 * Implements the documented error handling patterns
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  canRecover: boolean
  recoveryAttempts: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRecoveryAttempts?: number
  componentName?: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private static readonly MAX_RECOVERY_ATTEMPTS = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      canRecover: true,
      recoveryAttempts: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // CRITICAL: Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // CRITICAL: Determine if error is recoverable
    const canRecover = ErrorBoundary.isRecoverableError(error)
    
    return {
      hasError: true,
      error,
      errorId,
      canRecover,
      recoveryAttempts: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // CRITICAL: Log error for debugging
    console.error(`[ErrorBoundary] Error caught in ${this.props.componentName || 'component'}:`, error)
    console.error('[ErrorBoundary] Error info:', errorInfo)
    
    // CRITICAL: Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // CRITICAL: Log error with unique ID for tracking
    this.logError(error, errorInfo)
    
    // CRITICAL: Update state with error info
    this.setState({
      errorInfo,
      canRecover: ErrorBoundary.isRecoverableError(error)
    })
  }

  private static isRecoverableError(error: Error): boolean {
    // CRITICAL: Determine if error is recoverable based on error type
    const recoverableErrors = [
      'TypeError',
      'ReferenceError',
      'RangeError'
    ]
    
    const nonRecoverableErrors = [
      'SyntaxError',
      'URIError'
    ]
    
    // CRITICAL: Check error name
    if (nonRecoverableErrors.includes(error.name)) {
      return false
    }
    
    // CRITICAL: Check error message for specific patterns
    const nonRecoverablePatterns = [
      'Maximum call stack size exceeded',
      'Out of memory',
      'Invalid JSON',
      'Unexpected token'
    ]
    
    const errorMessage = error.message.toLowerCase()
    if (nonRecoverablePatterns.some(pattern => errorMessage.includes(pattern.toLowerCase()))) {
      return false
    }
    
    return true
  }

  private logError(error: Error, errorInfo: ErrorInfo): void {
    // CRITICAL: Log error with comprehensive information
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      componentName: this.props.componentName || 'Unknown',
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      recoveryAttempts: this.state.recoveryAttempts
    }
    
    // CRITICAL: Send to error logging service (if available)
    try {
      // This would integrate with an error logging service
      console.error('[ErrorBoundary] Error log:', errorLog)
      
      // CRITICAL: Store in localStorage for debugging
      const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]')
      errorLogs.push(errorLog)
      
      // CRITICAL: Keep only last 10 errors
      if (errorLogs.length > 10) {
        errorLogs.splice(0, errorLogs.length - 10)
      }
      
      localStorage.setItem('errorLogs', JSON.stringify(errorLogs))
    } catch (logError) {
      console.error('[ErrorBoundary] Failed to log error:', logError)
    }
  }

  private handleRecovery = (): void => {
    const maxAttempts = this.props.maxRecoveryAttempts || ErrorBoundary.MAX_RECOVERY_ATTEMPTS
    
    if (this.state.recoveryAttempts >= maxAttempts) {
      console.error('[ErrorBoundary] Maximum recovery attempts reached')
      this.setState({ canRecover: false })
      return
    }
    
    console.log(`[ErrorBoundary] Attempting recovery (attempt ${this.state.recoveryAttempts + 1})`)
    
    // CRITICAL: Attempt recovery by resetting state
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      recoveryAttempts: prevState.recoveryAttempts + 1
    }))
  }

  private handleReset = (): void => {
    console.log('[ErrorBoundary] Resetting component state')
    
    // CRITICAL: Reset to initial state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      canRecover: true,
      recoveryAttempts: 0
    })
  }

  private handleReportError = (): void => {
    // CRITICAL: Generate error report for user
    const errorReport = {
      errorId: this.state.errorId,
      componentName: this.props.componentName || 'Unknown',
      errorMessage: this.state.error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    // CRITICAL: Copy error report to clipboard
    try {
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      alert('Error report copied to clipboard. Please include this in your bug report.')
    } catch (clipboardError) {
      console.error('[ErrorBoundary] Failed to copy error report:', clipboardError)
      alert('Failed to copy error report. Please take a screenshot of this error.')
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // CRITICAL: Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      // CRITICAL: Default error UI
      return (
        <div className="error-boundary bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">
                Something went wrong
              </h3>
              <p className="text-sm text-red-600">
                Error ID: {this.state.errorId}
              </p>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-red-700">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {this.props.componentName && (
              <p className="text-xs text-red-600 mt-1">
                Component: {this.props.componentName}
              </p>
            )}
          </div>
          
          <div className="flex space-x-3">
            {this.state.canRecover && (
              <button
                onClick={this.handleRecovery}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Try Again ({this.state.recoveryAttempts + 1}/{this.props.maxRecoveryAttempts || ErrorBoundary.MAX_RECOVERY_ATTEMPTS})
              </button>
            )}
            
            <button
              onClick={this.handleReset}
              className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
            
            <button
              onClick={this.handleReportError}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Report Error
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="text-sm text-red-600 cursor-pointer">
                Show Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-red-800 bg-red-100 p-2 rounded overflow-auto max-h-40">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }
    
    return this.props.children
  }
}

// CRITICAL: Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary
        componentName={Component.displayName || Component.name}
        {...errorBoundaryProps}
      >
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// CRITICAL: Hook for error boundary context
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)
  
  const handleError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    console.error('[useErrorBoundary] Error caught:', error, errorInfo)
    setError(error)
  }, [])
  
  const clearError = React.useCallback(() => {
    setError(null)
  }, [])
  
  return {
    error,
    handleError,
    clearError,
    hasError: error !== null
  }
} 