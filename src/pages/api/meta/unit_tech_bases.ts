import type { NextApiRequest, NextApiResponse } from 'next';
import mockUnitTechBases from '../../../public/mockdata/mockUnitTechBases.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(mockUnitTechBases);
  } catch (error) {
    console.error('Error fetching unit tech bases:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
