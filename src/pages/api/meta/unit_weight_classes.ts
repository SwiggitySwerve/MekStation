import type { NextApiRequest, NextApiResponse } from 'next';

import { STANDARD_WEIGHT_CLASSES } from '@/types/enums/WeightClass';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(STANDARD_WEIGHT_CLASSES);
  } catch (error) {
    console.error('Error fetching unit weight classes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
