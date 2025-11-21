import type { NextApiRequest, NextApiResponse } from 'next';
import mockEquipmentEras from '../../../public/mockdata/mockEquipmentEras.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(mockEquipmentEras);
  } catch (error) {
    console.error('Error fetching equipment eras:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
