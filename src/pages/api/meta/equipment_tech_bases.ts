import type { NextApiRequest, NextApiResponse } from 'next';

import { ALL_TECH_BASES } from '@/types/enums/TechBase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(ALL_TECH_BASES);
  } catch (error) {
    console.error('Error fetching equipment tech bases:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
