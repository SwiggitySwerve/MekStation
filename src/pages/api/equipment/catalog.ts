/**
 * Equipment Catalog API - Stub
 * Temporarily disabled while core specs are being implemented
 */
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(503).json({ 
    error: 'Service temporarily unavailable',
    message: 'Equipment Catalog API is being rebuilt with spec-driven architecture'
  })
}
