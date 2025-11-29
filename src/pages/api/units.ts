/**
 * Units API - Stub
 * Temporarily disabled while core specs are being implemented
 */
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(503).json({ 
    error: 'Service temporarily unavailable',
    message: 'Units API is being rebuilt with spec-driven architecture'
  })
}
