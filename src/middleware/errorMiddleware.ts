import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API error response handler middleware
 * 
 * This middleware wraps an API handler to catch errors and return appropriate responses.
 * It also provides standardized logging for API errors.
 * 
 * @param handler - The Next.js API handler function
 * @returns A wrapped handler that includes error handling
 */
export function withErrorHandling(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (error: any) {
      console.error(`API Error in ${req.url}:`, error);
      
      // Handle JSON parse errors specifically
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return res.status(400).json({
          message: 'Invalid JSON in request body',
          error: error.message,
        });
      }
      
      // Handle database connection errors
      if (error.code === 'SQLITE_CANTOPEN') {
        return res.status(500).json({
          message: 'Database connection error',
          error: 'Could not open the database file',
        });
      }
      
      // Handle general database errors
      if (error.code && error.code.startsWith('SQLITE_')) {
        return res.status(500).json({
          message: 'Database error',
          error: error.message,
        });
      }
      
      // Handle all other errors
      const statusCode = error.statusCode || 500;
      const message = error.message || 'Internal Server Error';
      
      return res.status(statusCode).json({
        message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  };
}
