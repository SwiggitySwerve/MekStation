import type { NextApiRequest, NextApiResponse } from 'next';
import mockEquipmentTechBases from '../../../public/mockdata/mockEquipmentTechBases.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(mockEquipmentTechBases);
  } catch (error) {
    console.error('Error fetching equipment tech bases:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
