/**
 * Health Check API Endpoint
 * 
 * Used by Docker health checks and load balancers to verify
 * the application is running and healthy.
 * 
 * Returns:
 * - 200 OK with status information when healthy
 * - 503 Service Unavailable when unhealthy
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface IHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    server: 'ok' | 'error';
    memory: 'ok' | 'warning' | 'error';
  };
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

// Track server start time
const startTime = Date.now();

// Memory thresholds (in bytes)
const MEMORY_WARNING_THRESHOLD = 500 * 1024 * 1024; // 500MB
const MEMORY_ERROR_THRESHOLD = 900 * 1024 * 1024; // 900MB

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IHealthResponse>
): void {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end();
    return;
  }

  try {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    
    // Determine memory status
    let memoryStatus: 'ok' | 'warning' | 'error' = 'ok';
    if (heapUsed > MEMORY_ERROR_THRESHOLD) {
      memoryStatus = 'error';
    } else if (heapUsed > MEMORY_WARNING_THRESHOLD) {
      memoryStatus = 'warning';
    }

    const isHealthy = memoryStatus !== 'error';
    
    const response: IHealthResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        server: 'ok',
        memory: memoryStatus,
      },
      memoryUsage: {
        heapUsed: Math.round(heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      },
    };

    // Set appropriate status code
    const statusCode = isHealthy ? 200 : 503;
    
    // Set cache headers to prevent caching of health status
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    
    res.status(statusCode).json(response);
  } catch {
    // If we can't even check health, we're definitely unhealthy
    const errorResponse: IHealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        server: 'error',
        memory: 'error',
      },
    };
    
    res.status(503).json(errorResponse);
  }
}
