import { CustomizableUnit, UnitEquipmentItem, EquipmentItem } from '../types/customizer';
import {
  UnitDisplayData,
  UnitAnalysisContext,
  HeatManagementInfo,
  ArmorInfo,
  StructureInfo,
  EquipmentSummary,
  CriticalSlotSummary,
  BuildRecommendation,
  TechnicalSpecs
} from '../types/unitDisplay';
import { calculateInternalHeatSinks } from './heatSinkCalculations';
import { calculateEngineWeight } from '../types/systemComponents';

export class UnitAnalyzer {
  /**
   * Performs comprehensive analysis of a unit and returns all display data
   */
  static analyzeUnit(
    unit: CustomizableUnit,
    loadout: UnitEquipmentItem[],
    availableEquipment: EquipmentItem[],
    context: UnitAnalysisContext
  ): UnitDisplayData {
    const result: UnitDisplayData = {
      unit,
      loadout,
      availableEquipment
    };

    if (context.includeHeatAnalysis && context.unitType === 'BattleMech') {
      result.heatManagement = this.analyzeHeatManagement(unit, loadout, availableEquipment);
    }

    if (context.includeArmorAnalysis) {
      result.armorInfo = this.analyzeArmor(unit);
    }

    result.structureInfo = this.analyzeStructure(unit);

    if (context.includeEquipmentAnalysis) {
      result.equipmentSummary = this.analyzeEquipment(loadout, availableEquipment);
    }

    if (context.unitType === 'BattleMech') {
      result.criticalSlotSummary = this.analyzeCriticalSlots(unit);
    }

    if (context.includeBuildRecommendations) {
      result.buildRecommendations = this.generateBuildRecommendations(unit, loadout, availableEquipment, result);
    }

    result.technicalSpecs = this.calculateTechnicalSpecs(unit, loadout, availableEquipment);

    return result;
  }

  /**
   * Analyzes heat generation and dissipation for BattleMechs
   */
  static analyzeHeatManagement(
    unit: CustomizableUnit,
    loadout: UnitEquipmentItem[],
    availableEquipment: EquipmentItem[]
  ): HeatManagementInfo {
    // Calculate heat generation from weapons
    let totalHeatGeneration = 0;
    loadout.forEach(item => {
      const equipment = availableEquipment.find(eq => 
        eq.internal_id === item.item_name || eq.name === item.item_name
      );
      if (equipment?.weapon_details?.heat) {
        totalHeatGeneration += equipment.weapon_details.heat;
      }
    });

    // Add movement heat (walking generates 1 heat)
    totalHeatGeneration += 1;

    // Calculate heat sinks
    const heatSinkCount = unit.data?.heat_sinks?.count || 10;
    const heatSinkType = unit.data?.heat_sinks?.type || 'Single';
    const dissipationPerSink = heatSinkType === 'Double' ? 2 : 1;
    const totalHeatDissipation = heatSinkCount * dissipationPerSink;

    // Engine heat sink capacity (usually 10 for most engines)
    const engineRating = unit.data?.engine?.rating || 0;
    const engineType = unit.data?.engine?.type || 'Standard';
    const { calculateInternalHeatSinksForEngine } = require('./heatSinkCalculations');
    const engineHeatSinkCapacity = calculateInternalHeatSinksForEngine(engineRating, engineType);
    const engineIntegratedHeatSinks = Math.min(heatSinkCount, engineHeatSinkCapacity);
    const externalHeatSinks = Math.max(0, heatSinkCount - engineIntegratedHeatSinks);

    const heatBalance = totalHeatDissipation - totalHeatGeneration;

    let overheatingRisk: HeatManagementInfo['overheatingRisk'] = 'none';
    if (heatBalance < 0) {
      if (heatBalance >= -2) overheatingRisk = 'low';
      else if (heatBalance >= -5) overheatingRisk = 'medium';
      else if (heatBalance >= -10) overheatingRisk = 'high';
      else overheatingRisk = 'critical';
    }

    return {
      totalHeatGeneration,
      totalHeatDissipation,
      heatBalance,
      totalHeatSinks: heatSinkCount,
      engineIntegratedHeatSinks,
      externalHeatSinks,
      engineHeatSinkCapacity,
      heatSinkType,
      overheatingRisk
    };
  }

  /**
   * Analyzes armor distribution and efficiency
   */
  static analyzeArmor(unit: CustomizableUnit): ArmorInfo {
    const armorData = unit.data?.armor;
    if (!armorData) {
      return {
        type: 'Standard',
        totalArmorPoints: 0,
        maxArmorPoints: 0,
        armorEfficiency: 0,
        locationBreakdown: [],
        armorTonnage: 0
      };
    }

    let totalArmorPoints = 0;
    const locationBreakdown = (armorData.locations || []).map(loc => {
      const armorPoints = loc.armor_points || 0;
      const rearArmorPoints = loc.rear_armor_points;
      totalArmorPoints += armorPoints + (rearArmorPoints || 0);

      // Calculate max armor for location (simplified)
      let maxArmorPoints = 0;
      if (loc.location === 'Head') {
        maxArmorPoints = 9;
      } else {
        // Estimate based on unit mass (this would need more sophisticated logic)
        maxArmorPoints = Math.floor(unit.mass * 0.8);
      }

      return {
        location: loc.location,
        armorPoints,
        maxArmorPoints,
        rearArmorPoints,
        maxRearArmorPoints: rearArmorPoints ? maxArmorPoints : undefined
      };
    });

    const maxArmorPoints = Math.floor(unit.mass * 3.5 + 40); // Simplified max armor calculation
    const armorEfficiency = maxArmorPoints > 0 ? (totalArmorPoints / maxArmorPoints) * 100 : 0;

    // Calculate armor tonnage using proper BattleTech rounding
    const armorWeight = totalArmorPoints / 16; // Standard armor provides 16 points per ton
    const armorTonnage = Math.ceil(armorWeight * 2) / 2; // Round to nearest 0.5 ton

    return {
      type: armorData.type || 'Standard',
      totalArmorPoints,
      maxArmorPoints,
      armorEfficiency,
      locationBreakdown,
      armorTonnage
    };
  }

  /**
   * Analyzes internal structure
   */
  static analyzeStructure(unit: CustomizableUnit): StructureInfo {
    const structureData = unit.data?.structure;
    const structureType = structureData?.type || 'Standard';
    
    // Calculate total internal structure points (simplified)
    const totalInternalStructure = Math.floor(unit.mass / 10) * 10; // Rough estimate
    
    // Estimate structure tonnage
    let structureTonnage = Math.ceil(unit.mass / 10);
    if (structureType === 'Endo Steel') {
      structureTonnage = Math.ceil(structureTonnage / 2);
    }

    const structureEfficiency = 100; // Structures are typically at max efficiency

    return {
      type: structureType,
      totalInternalStructure,
      structureTonnage,
      structureEfficiency
    };
  }

  /**
   * Analyzes equipment distribution and categories
   */
  static analyzeEquipment(
    loadout: UnitEquipmentItem[],
    availableEquipment: EquipmentItem[]
  ): EquipmentSummary {
    let totalEquipmentTonnage = 0;
    const equipmentByCategory: { [key: string]: { count: number; tonnage: number; items: string[] } } = {};
    const weaponCounts = {
      totalWeapons: 0,
      energyWeapons: 0,
      ballisticWeapons: 0,
      missileWeapons: 0,
      physicalWeapons: 0
    };

    loadout.forEach(item => {
      const equipment = availableEquipment.find(eq => 
        eq.internal_id === item.item_name || eq.name === item.item_name
      );

      if (equipment) {
        totalEquipmentTonnage += equipment.tonnage;
        
        const category = equipment.category || equipment.type || 'Other';
        if (!equipmentByCategory[category]) {
          equipmentByCategory[category] = { count: 0, tonnage: 0, items: [] };
        }
        
        equipmentByCategory[category].count++;
        equipmentByCategory[category].tonnage += equipment.tonnage;
        equipmentByCategory[category].items.push(equipment.name);

        // Weapon categorization
        if (item.item_type === 'weapon') {
          weaponCounts.totalWeapons++;
          
          if (equipment.category?.toLowerCase().includes('energy')) {
            weaponCounts.energyWeapons++;
          } else if (equipment.category?.toLowerCase().includes('ballistic')) {
            weaponCounts.ballisticWeapons++;
          } else if (equipment.category?.toLowerCase().includes('missile')) {
            weaponCounts.missileWeapons++;
          } else if (equipment.category?.toLowerCase().includes('physical')) {
            weaponCounts.physicalWeapons++;
          }
        }
      }
    });

    return {
      totalEquipmentCount: loadout.length,
      totalEquipmentTonnage,
      equipmentByCategory: Object.entries(equipmentByCategory).map(([category, data]) => ({
        category,
        ...data
      })),
      weaponSummary: weaponCounts
    };
  }

  /**
   * Analyzes critical slot utilization for BattleMechs
   */
  static analyzeCriticalSlots(unit: CustomizableUnit): CriticalSlotSummary {
    // Try to use the new V2 critical slot system if available
    if (unit && typeof unit === 'object' && 'getCriticalSlotBreakdown' in unit && typeof unit.getCriticalSlotBreakdown === 'function') {
      const breakdown = unit.getCriticalSlotBreakdown();
      
      // Generate location breakdown from the V2 system
      const locationBreakdown = this.generateLocationBreakdownFromV2System(unit, breakdown);
      
      return {
        totalSlots: breakdown.totals.capacity,
        usedSlots: breakdown.totals.used,
        availableSlots: breakdown.totals.remaining,
        locationBreakdown
      };
    }
    
    // Fallback to configuration-based calculation
    const criticalSlotData = this.calculateCriticalSlotsFromConfiguration(unit);
    
    // If we have legacy criticals data, use it for location breakdown
    const criticals = unit.data?.criticals || [];
    let locationBreakdown: Array<{
      location: string;
      totalSlots: number;
      usedSlots: number;
      availableSlots: number;
      utilizationPercentage: number;
    }> = [];

    if (criticals.length > 0) {
      // Use legacy data for location breakdown
      locationBreakdown = criticals.map((locationData: any) => ({
        location: locationData.location,
        totalSlots: locationData.totalSlots || 0,
        usedSlots: locationData.usedSlots || 0,
        availableSlots: locationData.availableSlots || 0,
        utilizationPercentage: locationData.totalSlots > 0 ? (locationData.usedSlots / locationData.totalSlots) * 100 : 0
      }));
    } else {
      // Generate estimated location breakdown based on standard BattleMech layout
      locationBreakdown = this.generateEstimatedLocationBreakdown(unit);
    }

    return {
      totalSlots: criticalSlotData.totalSlots,
      usedSlots: criticalSlotData.usedSlots,
      availableSlots: criticalSlotData.availableSlots,
      locationBreakdown
    };
  }

  /**
   * Generate location breakdown from V2 system
   */
  private static generateLocationBreakdownFromV2System(unit: any, breakdown: any): Array<{
    location: string;
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
    utilizationPercentage: number;
  }> {
    const locationBreakdown: Array<{
      location: string;
      totalSlots: number;
      usedSlots: number;
      availableSlots: number;
      utilizationPercentage: number;
    }> = [];

    // Standard BattleMech locations
    const standardLocations = [
      { name: 'Head', slots: 6 },
      { name: 'Center Torso', slots: 12 },
      { name: 'Left Torso', slots: 12 },
      { name: 'Right Torso', slots: 12 },
      { name: 'Left Arm', slots: 12 },
      { name: 'Right Arm', slots: 12 },
      { name: 'Left Leg', slots: 6 },
      { name: 'Right Leg', slots: 6 }
    ];

    // Try to get actual section data if available
    if (unit && typeof unit.getAllSections === 'function') {
      const sections = unit.getAllSections();
      sections.forEach((section: any) => {
        const locationName = section.getLocationName?.() || section.location || 'Unknown';
        const totalSlots = section.getTotalSlots?.() || 0;
        const usedSlots = section.getUsedSlots?.() || 0;
        const availableSlots = section.getAvailableSlots?.() || 0;
        
        locationBreakdown.push({
          location: locationName,
          totalSlots,
          usedSlots,
          availableSlots,
          utilizationPercentage: totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0
        });
      });
    } else {
      // Fallback to estimated breakdown
      standardLocations.forEach(loc => {
        locationBreakdown.push({
          location: loc.name,
          totalSlots: loc.slots,
          usedSlots: 0, // Will be calculated based on equipment
          availableSlots: loc.slots,
          utilizationPercentage: 0
        });
      });
    }

    return locationBreakdown;
  }

  /**
   * Calculate critical slots from unit configuration
   */
  private static calculateCriticalSlotsFromConfiguration(unit: CustomizableUnit): {
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
  } {
    // Standard BattleMech total slots (6+12+12+12+12+12+6+6 = 78)
    const totalSlots = 78;
    let usedSlots = 0;

    // Calculate system component slots
    const engineType = unit.data?.engine?.type || 'Standard';
    const structureType = unit.data?.structure?.type || 'Standard';
    const gyroType = unit.data?.gyro?.type || 'Standard';
    const armorType = unit.data?.armor?.type || 'Standard';
    const jumpMP = unit.data?.movement?.jump_mp || 0;

    // Engine slots (based on V2 system logic)
    switch (engineType) {
      case 'XL':
        usedSlots += 6; // 3 per side torso
        break;
      case 'XXL':
        usedSlots += 12; // 6 per side torso
        break;
      case 'Light':
        usedSlots += 4; // 2 per side torso
        break;
      case 'Compact':
        usedSlots += 3; // In center torso
        break;
      case 'ICE':
      case 'Fuel Cell':
        usedSlots += 6; // 3 per side torso
        break;
      default:
        usedSlots += 0; // Standard fusion engine
    }

    // Structure slots (based on V2 system logic)
    switch (structureType) {
      case 'Endo Steel':
        usedSlots += 14; // 7 per side torso
        break;
      case 'Endo Steel (Clan)':
        usedSlots += 7; // 7 total, distributed
        break;
      default:
        usedSlots += 0; // Standard structure
    }

    // Gyro slots (based on V2 system logic)
    switch (gyroType) {
      case 'XL':
        usedSlots += 6; // In center torso
        break;
      case 'Compact':
        usedSlots += 2; // In center torso
        break;
      case 'None':
        usedSlots += 0;
        break;
      default:
        usedSlots += 4; // Standard gyro
    }

    // Armor slots (based on V2 system logic)
    switch (armorType) {
      case 'Ferro-Fibrous':
        usedSlots += 14; // 7 per side torso
        break;
      case 'Ferro-Fibrous (Clan)':
        usedSlots += 7; // 7 total, distributed
        break;
      case 'Stealth':
        usedSlots += 12; // 6 per side torso
        break;
      default:
        usedSlots += 0; // Standard armor
    }

    // Jump jets (1 slot per jump MP)
    usedSlots += jumpMP;

    // Fixed components (cockpit, life support, sensors, actuators)
    // Head: 5 slots (life support, sensors, cockpit)
    // Arms: 8 slots (4 per arm for actuators)
    // Legs: 4 slots (2 per leg for actuators)
    usedSlots += 17;

    // Equipment slots - count actual equipment from weapons_and_equipment
    const equipmentSlots = (unit.data?.weapons_and_equipment || []).reduce((total, item) => {
      // Try to get actual slot count from equipment data if available
      // For now, estimate 1 slot per equipment item
      return total + 1;
    }, 0);

    usedSlots += equipmentSlots;

    return {
      totalSlots,
      usedSlots: Math.min(usedSlots, totalSlots),
      availableSlots: Math.max(0, totalSlots - usedSlots)
    };
  }

  /**
   * Generate estimated location breakdown based on standard BattleMech layout
   */
  private static generateEstimatedLocationBreakdown(unit: CustomizableUnit): Array<{
    location: string;
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
    utilizationPercentage: number;
  }> {
    const locations = ['Head', 'Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'];
    const locationBreakdown: Array<{
      location: string;
      totalSlots: number;
      usedSlots: number;
      availableSlots: number;
      utilizationPercentage: number;
    }> = [];

    locations.forEach(location => {
      let totalSlots = 0;
      let usedSlots = 0;

      // Standard slot counts
      switch (location) {
        case 'Head':
          totalSlots = 6;
          usedSlots = 5; // Cockpit, life support, sensors
          break;
        case 'Center Torso':
          totalSlots = 12;
          usedSlots = 4; // Standard gyro
          break;
        case 'Left Torso':
        case 'Right Torso':
          totalSlots = 12;
          usedSlots = 0; // Will be calculated based on engine/armor type
          break;
        case 'Left Arm':
        case 'Right Arm':
          totalSlots = 12;
          usedSlots = 4; // Actuators
          break;
        case 'Left Leg':
        case 'Right Leg':
          totalSlots = 6;
          usedSlots = 4; // Actuators
          break;
      }

      // Add engine slots to side torsos
      const engineType = unit.data?.engine?.type || 'Standard';
      if (location === 'Left Torso' || location === 'Right Torso') {
        switch (engineType) {
          case 'XL':
            usedSlots += 3;
            break;
          case 'XXL':
            usedSlots += 6;
            break;
          case 'Light':
            usedSlots += 2;
            break;
          case 'ICE':
          case 'Fuel Cell':
            usedSlots += 3;
            break;
        }
      }

      // Add structure slots to side torsos
      const structureType = unit.data?.structure?.type || 'Standard';
      if (location === 'Left Torso' || location === 'Right Torso') {
        switch (structureType) {
          case 'Endo Steel':
            usedSlots += 7;
            break;
          case 'Endo Steel (Clan)':
            usedSlots += 3.5; // Distributed
            break;
        }
      }

      // Add armor slots to side torsos
      const armorType = unit.data?.armor?.type || 'Standard';
      if (location === 'Left Torso' || location === 'Right Torso') {
        switch (armorType) {
          case 'Ferro-Fibrous':
            usedSlots += 7;
            break;
          case 'Ferro-Fibrous (Clan)':
            usedSlots += 3.5; // Distributed
            break;
          case 'Stealth':
            usedSlots += 6;
            break;
        }
      }

      // Add gyro slots to center torso
      const gyroType = unit.data?.gyro?.type || 'Standard';
      if (location === 'Center Torso') {
        switch (gyroType) {
          case 'XL':
            usedSlots += 6;
            break;
          case 'Compact':
            usedSlots += 2;
            break;
          default:
            usedSlots += 4;
        }
      }

      // Add compact engine to center torso
      if (location === 'Center Torso' && engineType === 'Compact') {
        usedSlots += 3;
      }

      locationBreakdown.push({
        location,
        totalSlots,
        usedSlots: Math.min(usedSlots, totalSlots),
        availableSlots: Math.max(0, totalSlots - usedSlots),
        utilizationPercentage: totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0
      });
    });

    return locationBreakdown;
  }

  /**
   * Generates build recommendations based on analysis
   */
  static generateBuildRecommendations(
    unit: CustomizableUnit,
    loadout: UnitEquipmentItem[],
    availableEquipment: EquipmentItem[],
    analysisData: UnitDisplayData
  ): BuildRecommendation[] {
    const recommendations: BuildRecommendation[] = [];

    // Heat management recommendations
    if (analysisData.heatManagement) {
      const heat = analysisData.heatManagement;
      if (heat.overheatingRisk === 'high' || heat.overheatingRisk === 'critical') {
        recommendations.push({
          id: 'heat-management-critical',
          type: 'heat_management',
          priority: 'high',
          title: 'Critical Heat Management Issue',
          description: `Unit generates ${heat.totalHeatGeneration} heat but only dissipates ${heat.totalHeatDissipation}. Add ${Math.abs(heat.heatBalance)} more heat sinks.`,
          suggestedActions: [`Add ${Math.abs(heat.heatBalance)} heat sinks`],
          autoApplyable: true
        });
      } else if (heat.overheatingRisk === 'medium') {
        recommendations.push({
          id: 'heat-management-warning',
          type: 'heat_management',
          priority: 'medium',
          title: 'Heat Management Warning',
          description: `Unit may overheat under sustained fire. Consider adding ${Math.abs(heat.heatBalance) + 2} heat sinks for safety margin.`,
          suggestedActions: [`Add ${Math.abs(heat.heatBalance) + 2} heat sinks for safety`],
          autoApplyable: true
        });
      }
    }

    // Armor efficiency recommendations
    if (analysisData.armorInfo) {
      const armor = analysisData.armorInfo;
      if (armor.armorEfficiency < 80) {
        recommendations.push({
          id: 'armor-efficiency',
          type: 'protection',
          priority: 'medium',
          title: 'Low Armor Efficiency',
          description: `Unit is only using ${armor.armorEfficiency.toFixed(1)}% of maximum armor. Consider maximizing armor for better protection.`,
          suggestedActions: ['Maximize armor allocation'],
          autoApplyable: true
        });
      }
    }

    // Critical slot utilization
    if (analysisData.criticalSlotSummary) {
      const slots = analysisData.criticalSlotSummary;
      if (slots.availableSlots > 10) {
        recommendations.push({
          id: 'slot-utilization',
          type: 'optimization',
          priority: 'low',
          title: 'Unused Critical Slots',
          description: `${slots.availableSlots} critical slots are unused. Consider adding more equipment.`,
          suggestedActions: ['Review equipment options for unused slots'],
          autoApplyable: false
        });
      }
    }

    // Equipment balance recommendations
    if (analysisData.equipmentSummary) {
      const equipment = analysisData.equipmentSummary;
      if (equipment.weaponSummary.totalWeapons === 0) {
        recommendations.push({
          id: 'no-weapons',
          type: 'constraint_violation',
          priority: 'high',
          title: 'No Weapons Equipped',
          description: 'Unit has no weapons equipped. This is likely not a valid combat unit.',
          suggestedActions: ['Add weapons to the unit'],
          autoApplyable: false
        });
      } else if (equipment.weaponSummary.totalWeapons < 3) {
        recommendations.push({
          id: 'few-weapons',
          type: 'optimization',
          priority: 'medium',
          title: 'Limited Weaponry',
          description: 'Unit has very few weapons. Consider adding more for combat effectiveness.',
          suggestedActions: ['Add more weapons for balanced firepower'],
          autoApplyable: false
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculates comprehensive technical specifications
   */
  static calculateTechnicalSpecs(
    unit: CustomizableUnit,
    loadout: UnitEquipmentItem[],
    availableEquipment: EquipmentItem[]
  ): TechnicalSpecs {
    // Calculate equipment tonnage
    const equipmentTonnage = loadout.reduce((sum, item) => {
      const equipment = availableEquipment.find(eq => 
        eq.internal_id === item.item_name || eq.name === item.item_name
      );
      return sum + (equipment?.tonnage || 0);
    }, 0);

    // Estimate tonnage breakdown (simplified)
    const engineRating = unit.data?.engine?.rating || 0;
    const engineTonnage = calculateEngineWeight(engineRating, 100, 'Standard'); // Use proper engine weight calculation
    
    const weaponTonnage = loadout
      .filter(item => item.item_type === 'weapon')
      .reduce((sum, item) => {
        const equipment = availableEquipment.find(eq => 
          eq.internal_id === item.item_name || eq.name === item.item_name
        );
        return sum + (equipment?.tonnage || 0);
      }, 0);

    const ammoTonnage = loadout
      .filter(item => item.item_type === 'ammo')
      .reduce((sum, item) => {
        const equipment = availableEquipment.find(eq => 
          eq.internal_id === item.item_name || eq.name === item.item_name
        );
        return sum + (equipment?.tonnage || 0);
      }, 0);

    // Calculate movement speeds
    const walkMP = unit.data?.movement?.walk_mp || 0;
    const runMP = unit.data?.movement?.run_mp || walkMP * 1.5;
    const jumpMP = unit.data?.movement?.jump_mp || 0;

    // Convert MP to kph (simplified: MP * 10.8 for walking speed)
    const walkSpeed = walkMP * 10.8;
    const runSpeed = runMP * 10.8;
    const jumpSpeed = jumpMP * 10.8;

    return {
      battleValue: 0, // Would need complex BV calculation
      costCBills: 0, // Would need complex cost calculation
      techLevel: unit.data?.tech_base || 'Inner Sphere',
      rulesLevel: 'Standard', // Would need to determine from equipment
      walkSpeed,
      runSpeed,
      jumpSpeed,
      tonnageBreakdown: {
        chassis: unit.mass - equipmentTonnage - engineTonnage,
        engine: engineTonnage,
        heatSinks: (unit.data?.heat_sinks?.count || 10) * 1, // Simplified
        armor: 0, // Would need armor tonnage calculation
        structure: Math.ceil(unit.mass / 10), // Simplified
        equipment: equipmentTonnage - weaponTonnage - ammoTonnage,
        weapons: weaponTonnage,
        ammunition: ammoTonnage
      }
    };
  }
}
