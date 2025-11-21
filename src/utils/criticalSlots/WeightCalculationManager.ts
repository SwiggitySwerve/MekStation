/**
 * Weight Calculation Manager
 * Handles weight calculations for various components and systems
 */

import { UnitConfiguration } from './UnitCriticalManagerTypes'
import { SystemComponentsGateway } from '../../services/systemComponents/SystemComponentsGateway'

export class WeightCalculationManager {
  private configuration: UnitConfiguration

  constructor(configuration: UnitConfiguration) {
    this.configuration = configuration
  }

  /**
   * Update the configuration
   */
  updateConfiguration(configuration: UnitConfiguration): void {
    this.configuration = configuration
  }

  private extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    return component.type;
  }

  /**
   * Get engine weight
   */
  getEngineWeight(): number {
    const config = this.configuration;
    let type = this.extractComponentType(config.engineType);
    
    if (type === 'XL') type = config.techBase === 'Clan' ? 'XL (Clan)' : 'XL (IS)';
    
    let techBase = config.techBase;
    if (techBase === 'Mixed') techBase = type.includes('Clan') ? 'Clan' : 'Inner Sphere';

    const engines = SystemComponentsGateway.getEngines({
      techBase,
      unitTonnage: config.tonnage,
      desiredRating: config.engineRating,
      ignoreYearRestrictions: true
    });
    const engine = engines.find(e => e.type === type) || engines[0];
    return engine ? engine.weight : 0;
  }

  /**
   * Get gyro weight
   */
  getGyroWeight(): number {
    const config = this.configuration;
    const type = this.extractComponentType(config.gyroType);
    
    let techBase = config.techBase;
    if (techBase === 'Mixed') techBase = type.includes('Clan') ? 'Clan' : 'Inner Sphere';

    const gyros = SystemComponentsGateway.getGyros({
      techBase,
      engineRating: config.engineRating,
      ignoreYearRestrictions: true
    });
    
    const gyro = gyros.find(g => g.type === type);
    return gyro ? gyro.weight : 0;
  }

  /**
   * Get heat sink tonnage
   */
  getHeatSinkTonnage(): number {
    const heatSinkType = this.getHeatSinkTypeString()
    return heatSinkType === 'Double' ? 1.0 : 0.5
  }

  /**
   * Get jump jet weight
   */
  getJumpJetWeight(): number {
    const jumpJetType = this.getJumpJetTypeString()
    const jumpMP = this.configuration.jumpMP
    
    if (jumpMP === 0) return 0
    
    const baseWeight = jumpJetType === 'Improved Jump Jet' ? 0.5 : 0.5
    return jumpMP * baseWeight
  }

  /**
   * Get structure weight
   */
  getStructureWeight(): number {
    const config = this.configuration;
    const type = this.extractComponentType(config.structureType);
    
    let techBase = config.techBase;
    if (techBase === 'Mixed') techBase = type.includes('Clan') ? 'Clan' : 'Inner Sphere';

    const structures = SystemComponentsGateway.getStructures({
      techBase,
      unitType: 'BattleMech',
      unitTonnage: config.tonnage,
      ignoreYearRestrictions: true
    });
    
    const structure = structures.find(s => s.type === type);
    return structure ? structure.weight : 0;
  }

  /**
   * Get armor weight
   */
  getArmorWeight(): number {
    return this.configuration.armorTonnage
  }

  /**
   * Get used tonnage for all components
   */
  getUsedTonnage(): number {
    const config = this.configuration
    
    // Engine weight
    const engineWeight = this.getEngineWeight()
    
    // Gyro weight
    const gyroWeight = this.getGyroWeight()
    
    // Structure weight
    const structureWeight = this.getStructureWeight()
    
    // Heat sink weight
    const heatSinkWeight = config.externalHeatSinks * this.getHeatSinkTonnage()
    
    // Jump jet weight
    const jumpJetWeight = this.getJumpJetWeight()
    
    // Armor weight
    const armorWeight = config.armorTonnage
    
    // Equipment weight (estimate - would need to be calculated from actual equipment)
    const equipmentWeight = 0
    
    const totalWeight = engineWeight + gyroWeight + structureWeight + heatSinkWeight + jumpJetWeight + armorWeight + equipmentWeight
    
    console.log(`[getUsedTonnage] Breakdown:`)
    console.log(`  Engine: ${engineWeight.toFixed(2)} tons`)
    console.log(`  Gyro: ${gyroWeight.toFixed(2)} tons`)
    console.log(`  Structure: ${structureWeight.toFixed(2)} tons`)
    console.log(`  Heat Sinks: ${heatSinkWeight.toFixed(2)} tons`)
    console.log(`  Jump Jets: ${jumpJetWeight.toFixed(2)} tons`)
    console.log(`  Armor: ${armorWeight.toFixed(2)} tons`)
    console.log(`  Equipment: ${equipmentWeight.toFixed(2)} tons`)
    console.log(`  Total: ${totalWeight.toFixed(2)} tons`)
    
    return totalWeight
  }

  /**
   * Get remaining tonnage
   */
  getRemainingTonnage(): number {
    const usedTonnage = this.getUsedTonnage()
    return this.configuration.tonnage - usedTonnage
  }

  /**
   * Get remaining tonnage for armor
   */
  getRemainingTonnageForArmor(): number {
    const usedWithoutArmor = this.getUsedTonnage() - this.configuration.armorTonnage
    return this.configuration.tonnage - usedWithoutArmor
  }

  /**
   * Check if unit is overweight
   */
  isOverweight(): boolean {
    return this.getUsedTonnage() > this.configuration.tonnage
  }

  /**
   * Get weight validation
   */
  getWeightValidation(): { isValid: boolean, overweight: number, warnings: string[] } {
    const usedTonnage = this.getUsedTonnage()
    const maxTonnage = this.configuration.tonnage
    const overweight = Math.max(0, usedTonnage - maxTonnage)
    const warnings: string[] = []
    
    if (overweight > 0) {
      warnings.push(`Unit is ${overweight.toFixed(2)} tons overweight`)
    }
    
    if (usedTonnage > maxTonnage * 0.95) {
      warnings.push('Unit is approaching weight limit')
    }
    
    return {
      isValid: overweight === 0,
      overweight,
      warnings
    }
  }

  /**
   * Get weight breakdown
   */
  getWeightBreakdown(): Record<string, number> {
    return {
      engine: this.getEngineWeight(),
      gyro: this.getGyroWeight(),
      structure: this.getStructureWeight(),
      heatSinks: this.configuration.externalHeatSinks * this.getHeatSinkTonnage(),
      jumpJets: this.getJumpJetWeight(),
      armor: this.configuration.armorTonnage,
      equipment: 0, // Would need to be calculated from actual equipment
      total: this.getUsedTonnage()
    }
  }

  /**
   * Get heat sink type as string
   */
  private getHeatSinkTypeString(): string {
    if (typeof this.configuration.heatSinkType === 'string') {
      return this.configuration.heatSinkType
    }
    return this.configuration.heatSinkType.type
  }

  /**
   * Get jump jet type as string
   */
  private getJumpJetTypeString(): string {
    if (typeof this.configuration.jumpJetType === 'string') {
      return this.configuration.jumpJetType
    }
    return this.configuration.jumpJetType.type
  }
} 