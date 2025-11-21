import type { NextApiRequest, NextApiResponse } from 'next';

interface CustomVariantDetail {
  id: number;
  base_unit_id: number;
  variant_name: string;
  notes?: string | null;
  custom_data: any;
  created_at: string;
  updated_at: string;
}

// Mock data for variant details
const mockVariantDetails: { [key: string]: CustomVariantDetail } = {
  '1': {
    id: 1,
    base_unit_id: 100,
    variant_name: "Prime Configuration",
    notes: "Standard OmniMech configuration",
    custom_data: {
      loadout: [
        { name: "ER PPC", location: "RA", slots: 3, weight: 7 },
        { name: "ER Medium Laser", location: "LA", slots: 1, weight: 1 },
        { name: "ER Medium Laser", location: "RT", slots: 1, weight: 1 }
      ],
      criticals: {
        "RA": ["ER PPC", "ER PPC", "ER PPC"],
        "LA": ["ER Medium Laser"],
        "RT": ["ER Medium Laser"]
      }
    },
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z"
  },
  '2': {
    id: 2,
    base_unit_id: 100,
    variant_name: "Alpha Configuration",
    notes: "Long-range fire support variant",
    custom_data: {
      loadout: [
        { name: "Gauss Rifle", location: "RA", slots: 7, weight: 15 },
        { name: "ER Medium Laser", location: "LA", slots: 1, weight: 1 }
      ],
      criticals: {
        "RA": ["Gauss Rifle", "Gauss Rifle", "Gauss Rifle", "Gauss Rifle", "Gauss Rifle", "Gauss Rifle", "Gauss Rifle"],
        "LA": ["ER Medium Laser"]
      }
    },
    created_at: "2023-01-02T00:00:00Z",
    updated_at: "2023-01-02T00:00:00Z"
  },
  '3': {
    id: 3,
    base_unit_id: 100,
    variant_name: "Beta Configuration",
    notes: "Close combat specialist",
    custom_data: {
      loadout: [
        { name: "Ultra AC/20", location: "RA", slots: 10, weight: 15 },
        { name: "Medium Laser", location: "LA", slots: 1, weight: 1 },
        { name: "Medium Laser", location: "RT", slots: 1, weight: 1 }
      ],
      criticals: {
        "RA": ["Ultra AC/20", "Ultra AC/20", "Ultra AC/20", "Ultra AC/20", "Ultra AC/20", "Ultra AC/20", "Ultra AC/20", "Ultra AC/20", "Ultra AC/20", "Ultra AC/20"],
        "LA": ["Medium Laser"],
        "RT": ["Medium Laser"]
      }
    },
    created_at: "2023-01-03T00:00:00Z",
    updated_at: "2023-01-03T00:00:00Z"
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { variantId } = req.query;
    
    if (!variantId || typeof variantId !== 'string') {
      return res.status(400).json({ message: 'Variant ID is required' });
    }
    
    const variant = mockVariantDetails[variantId];
    
    if (!variant) {
      return res.status(404).json({ message: 'Variant not found' });
    }
    
    res.status(200).json({ variant });
  } catch (error) {
    console.error('Error fetching variant details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
