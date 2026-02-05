import type { NextApiRequest, NextApiResponse } from 'next';

import { ALL_ERAS } from '@/types/enums/Era';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(ALL_ERAS);
  } catch (error) {
    console.error('Error fetching equipment eras:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
