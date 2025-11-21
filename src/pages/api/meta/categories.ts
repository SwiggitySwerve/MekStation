import type { NextApiRequest, NextApiResponse } from 'next';
import mockUnitCategories from '../../../public/mockdata/mockUnitCategories.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(mockUnitCategories);
  } catch (error) {
    console.error('Error fetching unit categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
