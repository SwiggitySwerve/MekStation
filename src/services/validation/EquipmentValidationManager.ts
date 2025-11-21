/**
 * Equipment Validation Manager
 * Handles validation of weapons, ammunition, and special equipment
 * Extracted from ConstructionRulesValidator.ts for better organization
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'
import { ComponentConfiguration } from '../../types/componentConfiguration'

export interface WeaponValidation {
  isValid: boolean
  weaponCount: number
  totalWeaponWeight: number
  heatGeneration: number
  violations: WeaponViolation[]
  recommendations: string[]
}

export interface WeaponViolation {
  weapon: string
  type: 'invalid_mounting' | 'tech_level_violation' | 'era_restriction' | 'compatibility_issue'
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export interface AmmoValidation {
  isValid: boolean
  totalAmmoWeight: number
  ammoBalance: AmmoBalanceCheck[]
  caseProtection: CASEProtectionCheck
  violations: AmmoViolation[]
  recommendations: string[]
}

export interface AmmoBalanceCheck {
  weapon: string
  ammoTons: number
  recommendedTons: number
  turns: number
  adequate: boolean
}

export interface CASEProtectionCheck {
  requiredLocations: string[]
  protectedLocations: string[]
  unprotectedLocations: string[]
  isCompliant: boolean
}

export interface AmmoViolation {
  type: 'missing_ammo' | 'excess_ammo' | 'case_required' | 'explosive_in_head'
  weapon?: string
  location?: string
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export interface SpecialEquipmentValidation {
  isValid: boolean
  specialEquipment: SpecialEquipmentCheck[]
  violations: SpecialEquipmentViolation[]
  recommendations: string[]
}

export interface SpecialEquipmentCheck {
  equipment: string
  isValid: boolean
  requirements: string[]
  restrictions: string[]
  compatibility: string[]
}

export interface SpecialEquipmentViolation {
  equipment: string
  type: 'missing_requirement' | 'restriction_violated' | 'incompatible_combination'
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export interface JumpJetValidation {
  isValid: boolean
  jumpJetCount: number
  jumpMP: number
  maxJumpMP: number
  jumpJetWeight: number
  jumpJetType: string
  violations: JumpJetViolation[]
  recommendations: string[]
}

export interface JumpJetViolation {
  type: 'exceeds_maximum' | 'invalid_type' | 'weight_mismatch' | 'tonnage_incompatible'
  message: string
  severity: 'critical' | 'major' | 'minor'
  suggestedFix: string
}

export class EquipmentValidationManager {
  /**
   * Validate weapon rules and restrictions
   */
  validateWeaponRules(equipment: any[], config: UnitConfiguration): WeaponValidation {
    const violations: WeaponViolation[] = []
    const recommendations: string[] = []
    
    let weaponCount = 0
    let totalWeaponWeight = 0
    let heatGeneration = 0
    
    // Filter weapons from equipment
    const weapons = equipment.filter(item => item.type === 'weapon')
    
    weapons.forEach(weapon => {
      weaponCount++
      totalWeaponWeight += weapon.weight || 0
      heatGeneration += weapon.heat || 0
      
      // Check tech level compatibility
      if (weapon.techBase && config.techBase && weapon.techBase !== config.techBase) {
        violations.push({
          weapon: weapon.name,
          type: 'tech_level_violation',
          message: `${weapon.name} is ${weapon.techBase} tech but unit is ${config.techBase}`,
          severity: 'major',
          suggestedFix: `Replace with ${config.techBase} equivalent or change unit tech base`
        })
      }
      
      // Check era restrictions
      const unitEra = this.getUnitEra(config)
      if (weapon.introductionYear && unitEra) {
        const weaponEra = this.getEraFromYear(weapon.introductionYear)
        if (!this.isEraCompatible(weaponEra, unitEra)) {
          violations.push({
            weapon: weapon.name,
            type: 'era_restriction',
            message: `${weapon.name} is not available in ${unitEra} era`,
            severity: 'minor',
            suggestedFix: `Use weapon available in ${unitEra} era`
          })
        }
      }
      
      // Check mounting restrictions
      if (weapon.allowedLocations && weapon.location) {
        if (!weapon.allowedLocations.includes(weapon.location)) {
          violations.push({
            weapon: weapon.name,
            type: 'invalid_mounting',
            message: `${weapon.name} cannot be mounted in ${weapon.location}`,
            severity: 'critical',
            suggestedFix: `Move ${weapon.name} to allowed location: ${weapon.allowedLocations.join(', ')}`
          })
        }
      }
    })
    
    // Generate recommendations
    if (weaponCount === 0) {
      recommendations.push('Consider adding weapons for combat effectiveness')
    }
    
    if (heatGeneration > 20) {
      recommendations.push('High heat generation detected - consider heat sink upgrades')
    }
    
    return {
      isValid: violations.length === 0,
      weaponCount,
      totalWeaponWeight,
      heatGeneration,
      violations,
      recommendations
    }
  }
  
  /**
   * Validate ammunition rules and balance
   */
  validateAmmoRules(equipment: any[], config: UnitConfiguration): AmmoValidation {
    const violations: AmmoViolation[] = []
    const recommendations: string[] = []
    const ammoBalance: AmmoBalanceCheck[] = []
    
    let totalAmmoWeight = 0
    
    // Filter ammunition from equipment
    const ammo = equipment.filter(item => item.type === 'ammo')
    
    ammo.forEach(ammoItem => {
      totalAmmoWeight += ammoItem.weight || 0
      
      // Check for explosive ammo in head
      if (ammoItem.explosive && ammoItem.location === 'Head') {
        violations.push({
          type: 'explosive_in_head',
          weapon: ammoItem.weapon,
          location: 'Head',
          message: `Explosive ammunition for ${ammoItem.weapon} should not be placed in head`,
          severity: 'critical',
          suggestedFix: 'Move explosive ammunition to torso locations'
        })
      }
      
      // Check ammo balance
      const weapon = equipment.find(item => item.name === ammoItem.weapon)
      if (weapon) {
        const recommendedTons = this.calculateRecommendedAmmo(weapon, config)
        const turns = this.calculateAmmoTurns(ammoItem.weight, weapon)
        
        ammoBalance.push({
          weapon: ammoItem.weapon,
          ammoTons: ammoItem.weight,
          recommendedTons,
          turns,
          adequate: ammoItem.weight >= recommendedTons
        })
        
        if (ammoItem.weight < recommendedTons) {
          violations.push({
            type: 'missing_ammo',
            weapon: ammoItem.weapon,
            message: `Insufficient ammunition for ${ammoItem.weapon}`,
            severity: 'major',
            suggestedFix: `Increase ${ammoItem.weapon} ammunition to at least ${recommendedTons} tons`
          })
        }
      }
    })
    
    // Check CASE protection for explosive ammo
    const explosiveAmmo = ammo.filter(item => item.explosive)
    const caseEquipment = equipment.filter(item => item.name === 'CASE')
    
    const caseProtection: CASEProtectionCheck = {
      requiredLocations: explosiveAmmo.map(item => item.location).filter(Boolean),
      protectedLocations: caseEquipment.map(item => item.location).filter(Boolean),
      unprotectedLocations: [],
      isCompliant: true
    }
    
    caseProtection.unprotectedLocations = caseProtection.requiredLocations.filter(
      location => !caseProtection.protectedLocations.includes(location)
    )
    
    if (caseProtection.unprotectedLocations.length > 0) {
      caseProtection.isCompliant = false
      violations.push({
        type: 'case_required',
        message: 'Explosive ammunition requires CASE protection',
        severity: 'major',
        suggestedFix: 'Add CASE to locations with explosive ammunition'
      })
    }
    
    return {
      isValid: violations.length === 0,
      totalAmmoWeight,
      ammoBalance,
      caseProtection,
      violations,
      recommendations
    }
  }
  
  /**
   * Validate special equipment rules and requirements
   */
  validateSpecialEquipmentRules(equipment: any[], config: UnitConfiguration): SpecialEquipmentValidation {
    const violations: SpecialEquipmentViolation[] = []
    const recommendations: string[] = []
    const specialEquipment: SpecialEquipmentCheck[] = []
    
    // Filter special equipment
    const specialItems = equipment.filter(item => 
      item.type === 'equipment' && 
      !['weapon', 'ammo', 'heat_sink'].includes(item.category)
    )
    
    specialItems.forEach(item => {
      const check: SpecialEquipmentCheck = {
        equipment: item.name,
        isValid: true,
        requirements: [],
        restrictions: [],
        compatibility: []
      }
      
      // Check Artemis IV requirements
      if (item.name === 'Artemis IV FCS') {
        check.requirements.push('Requires compatible missile launcher')
        const hasCompatibleLauncher = equipment.some(eq => 
          eq.type === 'weapon' && 
          eq.category === 'missile' && 
          eq.artemisCompatible
        )
        if (!hasCompatibleLauncher) {
          check.isValid = false
          violations.push({
            equipment: item.name,
            type: 'missing_requirement',
            message: 'Artemis IV requires compatible missile launcher',
            severity: 'critical',
            suggestedFix: 'Add Artemis-compatible missile launcher or remove Artemis IV'
          })
        }
      }
      
      // Check targeting computer requirements
      if (item.name === 'Targeting Computer') {
        check.requirements.push('Requires compatible weapons')
        const hasCompatibleWeapons = equipment.some(eq => 
          eq.type === 'weapon' && 
          eq.targetingComputerCompatible
        )
        if (!hasCompatibleWeapons) {
          check.isValid = false
          violations.push({
            equipment: item.name,
            type: 'missing_requirement',
            message: 'Targeting Computer requires compatible weapons',
            severity: 'major',
            suggestedFix: 'Add targeting computer compatible weapons or remove targeting computer'
          })
        }
      }
      
      // Check MASC restrictions
      if (item.name === 'MASC') {
        check.restrictions.push('Cannot be used with TSM')
        const hasTSM = equipment.some(eq => eq.name === 'Triple Strength Myomer')
        if (hasTSM) {
          check.isValid = false
          violations.push({
            equipment: item.name,
            type: 'incompatible_combination',
            message: 'MASC cannot be used with Triple Strength Myomer',
            severity: 'critical',
            suggestedFix: 'Remove either MASC or Triple Strength Myomer'
          })
        }
      }
      
      specialEquipment.push(check)
    })
    
    return {
      isValid: violations.length === 0,
      specialEquipment,
      violations,
      recommendations
    }
  }
  
  /**
   * Validate jump jet rules and restrictions
   */
  validateJumpJetRules(config: UnitConfiguration, equipment: any[]): JumpJetValidation {
    const violations: JumpJetViolation[] = []
    const recommendations: string[] = []
    
    const jumpJetCount = equipment.filter(item => item.type === 'jump_jet').length
    const jumpMP = config.jumpMP || 0
    const maxJumpMP = config.walkMP || 0
    const jumpJetType = this.extractComponentType(config.jumpJetType)
    
    // Check jump MP limits
    if (jumpMP > maxJumpMP) {
      violations.push({
        type: 'exceeds_maximum',
        message: `Jump MP (${jumpMP}) cannot exceed Walk MP (${maxJumpMP})`,
        severity: 'critical',
        suggestedFix: 'Reduce jump MP to match or be less than walk MP'
      })
    }
    
    // Check jump jet count matches jump MP
    if (jumpJetCount !== jumpMP) {
      violations.push({
        type: 'tonnage_incompatible',
        message: `Jump jet count (${jumpJetCount}) does not match jump MP (${jumpMP})`,
        severity: 'critical',
        suggestedFix: 'Adjust jump jet count to match jump MP'
      })
    }
    
    // Calculate jump jet weight
    const jumpJetWeight = this.calculateJumpJetWeight(jumpJetType, config.tonnage, jumpMP)
    
    // Check for valid jump jet type
    if (!this.isValidJumpJetType(jumpJetType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid jump jet type: ${jumpJetType}`,
        severity: 'critical',
        suggestedFix: 'Use valid jump jet type (Standard, Improved, etc.)'
      })
    }
    
    return {
      isValid: violations.length === 0,
      jumpJetCount,
      jumpMP,
      maxJumpMP,
      jumpJetWeight,
      jumpJetType,
      violations,
      recommendations
    }
  }
  
  /**
   * Calculate recommended ammunition tonnage for a weapon
   */
  private calculateRecommendedAmmo(weapon: any, config: UnitConfiguration): number {
    // Basic rule: 1 ton per 10 shots for most weapons
    const shotsPerTon = weapon.shotsPerTon || 10
    const recommendedShots = 120 // 10 turns of combat
    return Math.ceil(recommendedShots / shotsPerTon)
  }
  
  /**
   * Calculate ammunition turns based on weight and weapon
   */
  private calculateAmmoTurns(ammoTons: number, weapon: any): number {
    const shotsPerTon = weapon.shotsPerTon || 10
    const shotsPerTurn = weapon.shotsPerTurn || 1
    const totalShots = ammoTons * shotsPerTon
    return Math.floor(totalShots / shotsPerTurn)
  }
  
  /**
   * Type-safe accessor for unit era
   */
  private getUnitEra(config: UnitConfiguration): string | undefined {
    const configWithEra = config as { era?: string };
    return configWithEra.era;
  }

  /**
   * Get era from introduction year
   */
  private getEraFromYear(year: number): string {
    if (year < 2300) return 'Age of War'
    if (year < 2571) return 'Star League'
    if (year < 2780) return 'Succession Wars'
    if (year < 3050) return 'Clan Invasion'
    if (year < 3067) return 'Civil War'
    if (year < 3085) return 'Jihad'
    return 'Dark Age'
  }
  
  /**
   * Check if weapon era is compatible with unit era
   */
  private isEraCompatible(weaponEra: string, unitEra: string): boolean {
    const eraOrder = [
      'Age of War', 'Star League', 'Succession Wars', 
      'Clan Invasion', 'Civil War', 'Jihad', 'Dark Age'
    ]
    
    const weaponIndex = eraOrder.indexOf(weaponEra)
    const unitIndex = eraOrder.indexOf(unitEra)
    
    return weaponIndex <= unitIndex
  }
  
  /**
   * Calculate jump jet weight
   */
  private calculateJumpJetWeight(jumpJetType: string, tonnage: number, jumpMP: number): number {
    let weightPerJet = 0.5
    
    if (tonnage > 55) weightPerJet = 1.0
    if (tonnage > 85) weightPerJet = 2.0
    
    // Adjust for jump jet type
    switch (jumpJetType) {
      case 'Improved Jump Jet':
        weightPerJet *= 1.5
        break
      case 'Partial Wing':
        weightPerJet *= 2.0
        break
    }
    
    return jumpMP * weightPerJet
  }
  
  /**
   * Check if jump jet type is valid
   */
  private isValidJumpJetType(jumpJetType: string): boolean {
    const validTypes = [
      'Standard Jump Jet',
      'Improved Jump Jet',
      'Extended Jump Jet',
      'UMU',
      'Mechanical Jump Booster',
      'Partial Wing',
      'Jump Booster',
      'Prototype Jump Jet'
    ]
    return validTypes.includes(jumpJetType)
  }
  
  /**
   * Extract component type from ComponentConfiguration or string
   */
  private extractComponentType(component: ComponentConfiguration | string): string {
    return typeof component === 'string' ? component : component.type
  }
} 




