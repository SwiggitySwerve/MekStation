import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Unit type categories - canonical list of unit types supported by the system.
 * These match the folder structure in megameklab data files.
 */
const UNIT_CATEGORIES = [
  'meks',
  'vehicles',
  'infantry',
  'battlearmor',
  'ge',
  'fighters',
  'dropships',
  'warship',
  'protomeks',
  'convfighter',
  'smallcraft',
  'spacestation',
  'jumpships',
  'handheld',
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.status(200).json(UNIT_CATEGORIES);
  } catch (error) {
    console.error('Error fetching unit categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
