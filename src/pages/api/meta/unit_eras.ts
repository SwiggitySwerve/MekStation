import type { NextApiRequest, NextApiResponse } from 'next';
import mockUnitEras from '../../../public/mockdata/mockUnitEras.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(mockUnitEras);
  } catch (error) {
    console.error('Error fetching unit eras:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
