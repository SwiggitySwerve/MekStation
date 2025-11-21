import type { NextApiRequest, NextApiResponse } from 'next';
import mockEquipment from '../../public/mockdata/mockEquipment.json';

interface Equipment {
  id: string;
  name: string;
  type: string;
  tech_base: string;
  era: string;
  description?: string;
  data: {
    Category: string;
    Heat?: number;
    Damage?: number | string;
    Range?: string;
    Dissipation?: number;
    Shots?: number;
    Tonnage?: number;
  };
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
      type_array: typeArray = '',
      tech_base_array: techBaseArray = '',
      era_array: eraArray = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    let filteredEquipment: Equipment[] = [...mockEquipment];

    // Apply filters
    if (searchTerm) {
      const search = searchTerm.toString().toLowerCase();
      filteredEquipment = filteredEquipment.filter(equipment => 
        equipment.name.toLowerCase().includes(search) ||
        equipment.description?.toLowerCase().includes(search)
      );
    }

    if (typeArray) {
      const types = typeArray.toString().split(',');
      filteredEquipment = filteredEquipment.filter(equipment => 
        types.includes(equipment.type)
      );
    }

    if (techBaseArray) {
      const techBases = techBaseArray.toString().split(',');
      filteredEquipment = filteredEquipment.filter(equipment => 
        techBases.includes(equipment.tech_base)
      );
    }

    if (eraArray) {
      const eras = eraArray.toString().split(',');
      filteredEquipment = filteredEquipment.filter(equipment => 
        eras.includes(equipment.era)
      );
    }

    // Apply sorting
    filteredEquipment.sort((a, b) => {
      const aValue = a[sortBy as keyof Equipment];
      const bValue = b[sortBy as keyof Equipment];
      
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
    const totalItems = filteredEquipment.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEquipment = filteredEquipment.slice(startIndex, endIndex);

    const response: PaginatedResponse<Equipment> = {
      items: paginatedEquipment,
      totalItems,
      totalPages,
      currentPage: pageNum,
      pageSize: limitNum
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
