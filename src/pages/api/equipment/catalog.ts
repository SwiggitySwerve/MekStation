import type { NextApiRequest, NextApiResponse } from 'next';
import { EquipmentGateway, EquipmentSearchCriteria } from '../../../services/equipment/EquipmentGateway';
import { TechBase, TechBaseUtil } from '../../../types/core/TechBase';

// Legacy interface for API compatibility
interface EquipmentVariant {
  id: string;
  template_id?: number;
  tech_base: string;
  variant_name: string;
  internal_id?: string;
  weight_tons: number;
  critical_slots: number;
  damage?: number | null;
  heat_generated?: number | null;
  range_short?: number | null;
  range_medium?: number | null;
  range_long?: number | null;
  range_extreme?: number | null;
  minimum_range?: number | null;
  ammo_per_ton?: number | null;
  cost_cbills?: number | null;
  battle_value?: number | null;
  introduction_year: number;
  extinction_year?: number;
  reintroduction_year?: number;
  availability_rating?: string;
  special_rules?: string[];
  restrictions?: string[];
  era_category?: string;
  rules_level: string;
  source_book?: string;
  page_reference?: string;
  is_omnipod: boolean;
  requires_ammo: boolean;
  ammo_type?: string;
  template_name?: string;
  base_type?: string;
  category_name: string;
  sub_category?: string;
  description?: string;
}

interface CatalogResponse {
  items: EquipmentVariant[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = 1,
      pageSize = 25,
      search,
      tech_base,
      category,
      rules_level,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query as {
      page?: string | number;
      pageSize?: string | number;
      search?: string;
      tech_base?: string;
      category?: string;
      rules_level?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    // Tech base is required - default to Inner Sphere if not provided
    const techBase: TechBase = tech_base === 'Clan' ? 'Clan' : 'Inner Sphere';

    // Build search criteria
    const searchCriteria: EquipmentSearchCriteria = {
      techBase,
      text: search,
      page: parseInt(page as string, 10) || 1,
      pageSize: Math.min(parseInt(pageSize as string, 10) || 25, 100),
      sortBy,
      sortOrder: sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc'
    };

    // Add category filter if provided
    if (category) {
      searchCriteria.category = [category];
    }

    // Add rules level filter if provided
    if (rules_level) {
      const validRulesLevels = ['Introductory', 'Standard', 'Advanced', 'Experimental'];
      if (validRulesLevels.includes(rules_level)) {
        searchCriteria.rulesLevel = [rules_level];
      }
    }

    // Get equipment data from gateway
    const result = EquipmentGateway.search(searchCriteria);

    // Convert service response to API format for compatibility
    const items: EquipmentVariant[] = result.items.map(item => ({
      id: item.id,
      tech_base: item.techBase,
      variant_name: item.name,
      weight_tons: item.weight,
      critical_slots: item.crits,
      damage: item.damage ?? null,
      heat_generated: item.heat ?? null,
      range_short: item.rangeShort ?? null,
      range_medium: item.rangeMedium ?? null,
      range_long: item.rangeLong ?? null,
      range_extreme: item.rangeExtreme ?? null,
      minimum_range: item.minRange ?? null,
      ammo_per_ton: item.ammoPerTon ?? null,
      cost_cbills: item.cost ?? null,
      battle_value: item.battleValue ?? null,
      introduction_year: item.introductionYear,
      rules_level: item.rulesLevel,
      is_omnipod: false, // Not tracked in new system
      requires_ammo: item.requiresAmmo,
      category_name: item.category,
      base_type: item.baseType,
      description: item.description,
      special_rules: item.special || [],
      source_book: item.sourceBook,
      page_reference: item.pageReference
    }));

    const response: CatalogResponse = {
      items,
      totalItems: result.totalCount,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      pageSize: result.pageSize,
      sortBy: searchCriteria.sortBy || 'name',
      sortOrder: searchCriteria.sortOrder || 'asc'
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('Error fetching equipment catalog:', error);
    return res.status(500).json({
      message: 'Error fetching equipment catalog',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
