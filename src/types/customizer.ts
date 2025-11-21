// Content for battletech-editor-app/types/customizer.ts

    export interface CriticalLocation {
      location: string; // e.g., "Head", "Center Torso"
      slots: string[]; // Array representing each slot, equipment name or "-Empty-"
    }

    export interface UnitEquipmentItem {
      item_name: string;
      item_type: string;
      location: string;
      rear_facing?: boolean;
      turret_mounted?: boolean;
      // Add other relevant fields from commonUnitSchema.json weapons_and_equipment
      // For example, specific weapon stats if needed for deeper comparison
      // heat?: number;
      // damage?: string | number;
    }

    export interface CustomizableUnitData {
      chassis: string;
      model: string;
      mass: number;
      tech_base: string;
      era: string;
      type?: string; // Unit type from data blob (e.g. BattleMech)
      config?: string; // Biped, Quad etc.
      movement?: { walk_mp?: number; run_mp?: number; jump_mp?: number };
      armor?: { type: string; locations: Array<{ location: string; armor_points: number; rear_armor_points?: number }> };
      engine?: { type: string; rating: number };
      structure?: { type: string };
      heat_sinks?: { type: string; count: number };
      weapons_and_equipment: UnitEquipmentItem[];
      criticals: CriticalLocation[];
      [key: string]: any; // Allow other properties
    }

    export interface CustomizableUnit { // This is used by the CustomizerPage, represents a unit being customized
      id: string | number;
      chassis: string;
      model: string;
      mass: number; // This is mass_tons from DB, aliased as mass by API
      type: string; // Unit type from top level of API response
      data: CustomizableUnitData; // The full JSON blob from the base unit
    }

    export interface EquipmentItem { // Represents an item selectable in the picker
      id: string | number;
      internal_id: string;
      name: string;
      type: string;
      category: string;
      tech_base: string;
      critical_slots: number;
      tonnage: number;
      cost_cbills?: number;
      battle_value?: number;
      weapon_details?: any; // Could be more specific
      ammo_details?: any;   // Could be more specific
      data: any; // The full JSON blob for equipment
    }

    export interface ApiListResponse<T> {
      items: T[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    }

    export interface EquipmentToRemoveDetails {
      name: string;
      location: string;
      startIndex: number;
      count: number;
    }

    // == Types for Variant Comparison ==

    export interface CustomVariantCustomData { // Data stored in custom_unit_variants.custom_data
      loadout: UnitEquipmentItem[];
      criticals: CriticalLocation[];
      // Future additions: armor?: any; engine_modifications?: any;
    }

    export interface CustomVariantDetail { // Full detail of a saved custom variant from API
      id: number;
      base_unit_id: number;
      variant_name: string;
      notes?: string | null;
      custom_data: CustomVariantCustomData; // Parsed custom_data JSON
      created_at: string;
      updated_at: string;
    }

    export interface LoadoutComparison {
        onlyInA: UnitEquipmentItem[];
        onlyInB: UnitEquipmentItem[];
        // commonItems?: Array<{ itemA: UnitEquipmentItem; itemB: UnitEquipmentItem; differences?: string[] }>;
    }

    export interface CriticalsComparisonDifference {
        location: string;
        slotsA: string[];
        slotsB: string[];
    }

    export interface ComparisonResult {
      loadoutChanges: LoadoutComparison;
      criticalsDifferences: CriticalsComparisonDifference[];
      variantADetails: CustomVariantDetail;
      variantBDetails: CustomVariantDetail;
      totalEquipmentTonnageA: number; // Added
      totalEquipmentTonnageB: number; // Added
    }
