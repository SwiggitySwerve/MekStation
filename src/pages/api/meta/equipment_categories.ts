import type { NextApiRequest, NextApiResponse } from 'next';

import { EquipmentCategory } from '@/types/equipment';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const categories = Object.values(EquipmentCategory);
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching equipment categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
