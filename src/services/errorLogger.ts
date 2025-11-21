/**
 * Utility for consistent error logging and handling in API routes
 */

/**
 * Log an API error with consistent formatting
 * @param endpoint - The API endpoint where the error occurred
 * @param error - The error object
 * @param additionalInfo - Optional additional information about the context
 */
export function logApiError(endpoint: string, error: any, additionalInfo?: any): void {
  console.error(`[API Error] ${endpoint}: ${error.message || 'Unknown error'}`);
  
  if (error.stack && process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
  
  if (additionalInfo) {
    console.error('Additional context:', additionalInfo);
  }
}

/**
 * Format an API error response with consistent structure
 * @param error - The error object
 * @param defaultMessage - Default message to use if the error doesn't have one
 * @returns A formatted error object suitable for API responses
 */
export function formatApiError(error: any, defaultMessage = 'An unexpected error occurred'): any {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return {
      message: 'Invalid JSON data',
      error: error.message,
      status: 400
    };
  }
  
  // Handle database-specific errors
  if (error.code && error.code.startsWith('SQLITE_')) {
    return {
      message: 'Database error',
      error: error.message,
      code: error.code,
      status: 500
    };
  }
  
  // Generic error response
  return {
    message: error.message || defaultMessage,
    error: isDev ? error.stack : undefined,
    status: error.statusCode || 500
  };
}

/**
 * Helper function to safely parse JSON with error handling
 * @param jsonString - The string to parse as JSON
 * @param defaultValue - Default value to return if parsing fails
 * @returns The parsed value or the default
 */
export function safeParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logApiError('JSON parsing', error, { invalidJson: jsonString });
    return defaultValue;
  }
}





