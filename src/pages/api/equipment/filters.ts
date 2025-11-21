import type { NextApiRequest, NextApiResponse } from 'next';
import { EquipmentGateway } from '../../../services/equipment/EquipmentGateway';
import { TechBaseUtil } from '../../../types/core/TechBase';

interface FilterOptions {
  categories: string[];
  techBases: string[];
  rulesLevels: string[];
}

export default function handler(req: NextApiRequest, res: NextApiResponse<FilterOptions>) {
  try {
    // Get categories for Inner Sphere (union with Clan will give all categories)
    const isCategories = EquipmentGateway.getCategories('Inner Sphere');
    const clanCategories = EquipmentGateway.getCategories('Clan');
    const categories = Array.from(new Set([...isCategories, ...clanCategories])).sort();

    // Get tech bases
    const techBases = TechBaseUtil.all();

    // Get rules levels (fixed list)
    const rulesLevels = ['Introductory', 'Standard', 'Advanced', 'Experimental'];

    return res.status(200).json({
      categories,
      techBases: techBases.map(tb => TechBaseUtil.toCode(tb)),
      rulesLevels
    });

  } catch (error: any) {
    console.error('Error fetching equipment filters:', error);
    return res.status(500).json({
      categories: [],
      techBases: [],
      rulesLevels: []
    });
  }
}
