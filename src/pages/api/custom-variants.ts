import type { NextApiRequest, NextApiResponse } from 'next';

interface CustomVariantListItem {
  id: number;
  base_unit_id: number;
  variant_name: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Mock data for custom variants
const mockCustomVariants: CustomVariantListItem[] = [
  {
    id: 1,
    base_unit_id: 100,
    variant_name: "Prime Configuration",
    notes: "Standard OmniMech configuration",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z"
  },
  {
    id: 2,
    base_unit_id: 100,
    variant_name: "Alpha Configuration",
    notes: "Long-range fire support variant",
    created_at: "2023-01-02T00:00:00Z",
    updated_at: "2023-01-02T00:00:00Z"
  },
  {
    id: 3,
    base_unit_id: 100,
    variant_name: "Beta Configuration",
    notes: "Close combat specialist",
    created_at: "2023-01-03T00:00:00Z",
    updated_at: "2023-01-03T00:00:00Z"
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { baseUnitId, variantName } = req.query;
      
      let filteredVariants = mockCustomVariants;
      
      if (baseUnitId) {
        filteredVariants = filteredVariants.filter(variant => 
          variant.base_unit_id === parseInt(baseUnitId.toString())
        );
      }
      
      if (variantName) {
        filteredVariants = filteredVariants.filter(variant => 
          variant.variant_name.toLowerCase().includes(variantName.toString().toLowerCase())
        );
      }
      
      res.status(200).json({ items: filteredVariants });
    } catch (error) {
      console.error('Error fetching custom variants:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { baseUnitId, variantName, notes, customData } = req.body;
      
      // Mock creation of new variant
      const newVariant: CustomVariantListItem = {
        id: mockCustomVariants.length + 1,
        base_unit_id: baseUnitId,
        variant_name: variantName,
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockCustomVariants.push(newVariant);
      
      res.status(201).json({ variant: newVariant });
    } catch (error) {
      console.error('Error creating custom variant:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
