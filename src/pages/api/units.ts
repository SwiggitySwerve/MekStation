import type { NextApiRequest, NextApiResponse } from 'next';
import mockUnits from '../../public/mockdata/mockUnits.json';

interface Unit {
  id: string;
  chassis: string;
  model: string;
  mass: number;
  tech_base: string;
  rules_level: number;
  era: string;
  type: string;
  source: string;
  data: any;
}

interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      page = '1',
      limit = '20',
      q: searchTerm = '',
      techBase = '',
      unit_type: unitType = '',
      weight_class: weightClass = '',
      has_quirk: hasQuirk = '',
      sortBy = 'chassis',
      sortOrder = 'asc'
    } = req.query;

    let filteredUnits: Unit[] = [...mockUnits];

    // Apply filters
    if (searchTerm) {
      const search = searchTerm.toString().toLowerCase();
      filteredUnits = filteredUnits.filter(unit => 
        unit.chassis.toLowerCase().includes(search) ||
        unit.model.toLowerCase().includes(search)
      );
    }

    if (techBase) {
      filteredUnits = filteredUnits.filter(unit => 
        unit.tech_base === techBase
      );
    }

    if (unitType) {
      filteredUnits = filteredUnits.filter(unit => 
        unit.type === unitType
      );
    }

    if (weightClass) {
      const weightRanges: { [key: string]: [number, number] } = {
        'light': [20, 35],
        'medium': [40, 55],
        'heavy': [60, 75],
        'assault': [80, 100]
      };
      
      const range = weightRanges[weightClass.toString()];
      if (range) {
        filteredUnits = filteredUnits.filter(unit => 
          unit.mass >= range[0] && unit.mass <= range[1]
        );
      }
    }

    // Apply sorting
    filteredUnits.sort((a, b) => {
      const aValue = a[sortBy as keyof Unit];
      const bValue = b[sortBy as keyof Unit];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    // Apply pagination
    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const totalItems = filteredUnits.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedUnits = filteredUnits.slice(startIndex, endIndex);

    const response: PaginatedResponse<Unit> = {
      items: paginatedUnits,
      totalItems,
      totalPages,
      currentPage: pageNum,
      pageSize: limitNum
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
