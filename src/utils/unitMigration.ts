/**
 * Unit Migration System - Converts legacy unit data to enhanced Overview format
 * Handles backward compatibility and data migration for existing units
 */

import { UnitConfiguration } from './criticalSlots/UnitCriticalManager'
import { EngineType } from './criticalSlots/SystemComponentRules'
import { 
  TechProgression, 
  TechRating, 
  inferTechProgression,
  createDefaultTechProgression,
  generateTechBaseString
} from './techProgression'
import { 
  calculateTechRating, 
  parseIntroductionYear,
  calculateUnitComplexity 
} from './techRating'
import {
  ComponentConfiguration,
  TechBase,
  migrateStringToComponentConfiguration
} from '../types/componentConfiguration'
import { calculateInternalHeatSinks, calculateInternalHeatSinksForEngine } from './heatSinkCalculations';

/**
 * Legacy unit data structure from existing schemas
 */
export interface LegacyUnitData {
  // Required fields from commonUnitSchema
  chassis: string
  model: string
  mul_id?: string | number
  config?: string
  tech_base: string
  era: string | number
  source?: string
  rules_level: string | number
  role?: string
  mass: number
  
  // Component data
  engine?: { type: string; rating: number; manufacturer?: string }
  structure?: { type: string; manufacturer?: string }
  armor?: { type: string; manufacturer?: string; locations?: any[] }
  heat_sinks?: { type: string; count: number; dissipation_per_sink?: number }
  myomer?: { type: string; manufacturer?: string }
  
  // Equipment and weapons
  weapons_and_equipment?: Array<{
    item_name: string
    item_type: string
    location: string
    tech_base: 'IS' | 'Clan'
    [key: string]: any
  }>
  
  // Movement data
  movement?: {
    walk_mp?: number
    run_mp?: number
    jump_mp?: number
    [key: string]: any
  }
  
  // Critical slots
  criticals?: Array<{
    location: string
    slots: string[]
  }>
  
  // Additional fields
  [key: string]: any
}

/**
 * Enhanced unit configuration with Overview fields
 */
export interface EnhancedUnitConfiguration extends UnitConfiguration {
  introductionYear: number
  rulesLevel: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
  techProgression: TechProgression
  techRating: TechRating
}

/**
 * Migration result with metadata
 */
export interface MigrationResult {
  success: boolean
  enhancedConfig: EnhancedUnitConfiguration | null
  warnings: string[]
  errors: string[]
  migrationInfo: {
    originalTechBase: string
    inferredProgression: TechProgression
    calculatedYear: number
    detectedComplexity: string
  }
}

/**
 * Main migration function - converts legacy unit data to enhanced format
 */
export function migrateUnitData(legacyData: LegacyUnitData): MigrationResult {
  console.log('[UnitMigration] Starting migration for unit:', legacyData.chassis, legacyData.model)
  
  const warnings: string[] = []
  const errors: string[] = []
  
  try {
    // Step 1: Parse introduction year
    const introductionYear = parseIntroductionYear(legacyData.era)
    console.log('[UnitMigration] Parsed introduction year:', introductionYear, 'from era:', legacyData.era)
    
    // Step 2: Infer tech progression from legacy data
    const techProgression = inferTechProgression(legacyData)
    console.log('[UnitMigration] Inferred tech progression:', techProgression)
    
    // Step 3: Build base unit configuration
    const baseConfig = buildBaseConfiguration(legacyData)
    console.log('[UnitMigration] Built base configuration')
    
    // Step 4: Calculate tech ratings
    const techRating = calculateTechRating(introductionYear, techProgression, legacyData)
    console.log('[UnitMigration] Calculated tech rating:', techRating)
    
    // Step 5: Determine rules level
    const rulesLevel = determineRulesLevel(legacyData.rules_level, techRating)
    console.log('[UnitMigration] Determined rules level:', rulesLevel)
    
    // Step 6: Build enhanced configuration
    const enhancedConfig: EnhancedUnitConfiguration = {
      ...baseConfig,
      introductionYear,
      rulesLevel,
      techProgression,
      techRating
    }
    
    // Step 7: Validate and add warnings
    const validation = validateMigration(enhancedConfig, legacyData)
    warnings.push(...validation.warnings)
    
    if (validation.errors.length > 0) {
      errors.push(...validation.errors)
    }
    
    const migrationInfo = {
      originalTechBase: legacyData.tech_base,
      inferredProgression: techProgression,
      calculatedYear: introductionYear,
      detectedComplexity: calculateUnitComplexity(techRating).level
    }
    
    console.log('[UnitMigration] Migration completed successfully')
    
    return {
      success: true,
      enhancedConfig,
      warnings,
      errors,
      migrationInfo
    }
    
  } catch (error) {
    console.error('[UnitMigration] Migration failed:', error)
    errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    
    return {
      success: false,
      enhancedConfig: null,
      warnings,
      errors,
      migrationInfo: {
        originalTechBase: legacyData.tech_base || 'Unknown',
        inferredProgression: createDefaultTechProgression(),
        calculatedYear: 3025,
        detectedComplexity: 'Unknown'
      }
    }
  }
}

/**
 * Build base unit configuration from legacy data
 */
function buildBaseConfiguration(legacyData: LegacyUnitData): UnitConfiguration {
  console.log('[UnitMigration] Building base configuration from legacy data')
  
  // Extract basic unit info
  const tonnage = legacyData.mass || 50
  const chassis = legacyData.chassis || 'Unknown'
  const model = legacyData.model || 'Unknown'
  
  // Extract movement data
  const movement = legacyData.movement || {}
  const walkMP = movement.walk_mp || 4
  const runMP = movement.run_mp || Math.floor(walkMP * 1.5)
  const jumpMP = movement.jump_mp || 0
  
  // Calculate engine rating
  const engineRating = Math.min(tonnage * walkMP, 400)
  
  // Extract component types - create ComponentConfiguration objects
  const techBaseType = (legacyData.tech_base.includes('Clan') ? 'Clan' : 'Inner Sphere') as TechBase
  
  const engineTypeString = parseEngineType(legacyData.engine?.type || 'Standard')
  const structureType = migrateStringToComponentConfiguration('structure', parseStructureType(legacyData.structure?.type || 'Standard'), techBaseType)
  const armorType = migrateStringToComponentConfiguration('armor', parseArmorType(legacyData.armor?.type || 'Standard'), techBaseType)
  const gyroType = migrateStringToComponentConfiguration('gyro', parseGyroType('Standard'), techBaseType)
  const heatSinkType = migrateStringToComponentConfiguration('heatSink', parseHeatSinkType(legacyData.heat_sinks?.type || 'Single'), techBaseType)
  
  // Calculate heat sinks
  const totalHeatSinks = legacyData.heat_sinks?.count || 10
  const internalHeatSinks = calculateInternalHeatSinksForEngine(engineRating, engineTypeString)
  const externalHeatSinks = Math.max(0, totalHeatSinks - internalHeatSinks)
  
  // Parse armor allocation
  const armorAllocation = parseArmorAllocation(legacyData.armor?.locations, tonnage)
  
  // Calculate armor tonnage from allocation - extract string from ComponentConfiguration
  const armorTypeString = typeof armorType === 'object' ? armorType.type : armorType
  const armorTonnage = calculateArmorTonnageFromAllocation(armorAllocation, armorTypeString)
  
  // Determine tech base with type safety
  const rawTechBase = legacyData.tech_base || 'Inner Sphere'
  const techBase: 'Inner Sphere' | 'Clan' = rawTechBase.includes('Clan') ? 'Clan' : 'Inner Sphere'
  
  // Build configuration
  const config: UnitConfiguration = {
    // Basic info
    chassis,
    model,
    tonnage,
    unitType: 'BattleMech',
    techBase: techBase,
    
    // Movement
    walkMP,
    runMP,
    jumpMP,
    engineRating,
    engineType: engineTypeString as EngineType,
    
    // Jump jets
    jumpJetType: migrateStringToComponentConfiguration('jumpJet', 'Standard Jump Jet', techBaseType),
    jumpJetCounts: {},
    hasPartialWing: false,
    
    // System components
    gyroType,
    structureType,
    armorType,
    
    // Armor
    armorAllocation,
    armorTonnage,
    
    // Heat management
    heatSinkType,
    totalHeatSinks,
    internalHeatSinks,
    externalHeatSinks,
    
    // Enhancement systems
    enhancements: parseEnhancementType(legacyData.myomer?.type) ?
      [migrateStringToComponentConfiguration('enhancement', parseEnhancementType(legacyData.myomer?.type)!, techBaseType)] :
      [],
    
    // Legacy compatibility
    mass: tonnage
  }
  
  console.log('[UnitMigration] Base configuration built:', {
    chassis: config.chassis,
    tonnage: config.tonnage,
    engineType: config.engineType,
    techBase: config.techBase
  })
  
  return config
}

/**
 * Parse engine type from legacy string
 */
function parseEngineType(engineType: string): string {
  const normalized = engineType.toLowerCase().trim()
  
  if (normalized.includes('xl')) return 'XL'
  if (normalized.includes('light')) return 'Light'
  if (normalized.includes('xxl')) return 'XXL'
  if (normalized.includes('compact')) return 'Compact'
  if (normalized.includes('ice')) return 'ICE'
  if (normalized.includes('fuel cell')) return 'Fuel Cell'
  
  return 'Standard'
}

/**
 * Parse structure type from legacy string
 */
function parseStructureType(structureType: string): string {
  const normalized = structureType.toLowerCase().trim()
  
  if (normalized.includes('endo steel (clan)') || normalized.includes('endo-steel (clan)')) return 'Endo Steel (Clan)'
  if (normalized.includes('endo steel') || normalized.includes('endo-steel')) return 'Endo Steel'
  if (normalized.includes('composite')) return 'Composite'
  if (normalized.includes('reinforced')) return 'Reinforced'
  if (normalized.includes('industrial')) return 'Industrial'
  
  return 'Standard'
}

/**
 * Parse armor type from legacy string
 */
function parseArmorType(armorType: string): string {
  const normalized = armorType.toLowerCase().trim()
  
  if (normalized.includes('ferro-fibrous (clan)')) return 'Ferro-Fibrous (Clan)'
  if (normalized.includes('ferro-fibrous') || normalized.includes('ferro fibrous')) return 'Ferro-Fibrous'
  if (normalized.includes('light ferro')) return 'Light Ferro-Fibrous'
  if (normalized.includes('heavy ferro')) return 'Heavy Ferro-Fibrous'
  if (normalized.includes('stealth')) return 'Stealth'
  if (normalized.includes('reactive')) return 'Reactive'
  if (normalized.includes('reflective')) return 'Reflective'
  if (normalized.includes('hardened')) return 'Hardened'
  
  return 'Standard'
}

/**
 * Parse gyro type from legacy string
 */
function parseGyroType(gyroType: string): string {
  const normalized = gyroType.toLowerCase().trim()
  
  if (normalized.includes('xl')) return 'XL'
  if (normalized.includes('compact')) return 'Compact'
  if (normalized.includes('heavy-duty') || normalized.includes('heavy duty')) return 'Heavy-Duty'
  
  return 'Standard'
}

/**
 * Parse heat sink type from legacy string
 */
function parseHeatSinkType(heatSinkType: string): string {
  const normalized = heatSinkType.toLowerCase().trim()
  
  if (normalized.includes('double') && normalized.includes('clan')) return 'Double (Clan)'
  if (normalized.includes('double')) return 'Double'
  if (normalized.includes('compact')) return 'Compact'
  if (normalized.includes('laser')) return 'Laser'
  
  return 'Single'
}

/**
 * Parse enhancement type from myomer type
 */
function parseEnhancementType(myomerType?: string): string | null {
  if (!myomerType) return null
  
  const normalized = myomerType.toLowerCase().trim()
  
  if (normalized.includes('masc')) return 'MASC'
  if (normalized.includes('triple strength') || normalized.includes('tsm')) return 'Triple Strength Myomer'
  
  return null
}



/**
 * Parse armor allocation from legacy location data
 */
function parseArmorAllocation(locations?: any[], tonnage: number = 50): any {
  // Default allocation if no legacy data
  const defaultAllocation = {
    HD: { front: 9, rear: 0 },
    CT: { front: Math.floor(tonnage * 0.4), rear: Math.floor(tonnage * 0.12) },
    LT: { front: Math.floor(tonnage * 0.32), rear: Math.floor(tonnage * 0.08) },
    RT: { front: Math.floor(tonnage * 0.32), rear: Math.floor(tonnage * 0.08) },
    LA: { front: Math.floor(tonnage * 0.24), rear: 0 },
    RA: { front: Math.floor(tonnage * 0.24), rear: 0 },
    LL: { front: Math.floor(tonnage * 0.32), rear: 0 },
    RL: { front: Math.floor(tonnage * 0.32), rear: 0 }
  }
  
  if (!locations || !Array.isArray(locations)) {
    console.log('[UnitMigration] No armor locations data, using defaults')
    return defaultAllocation
  }
  
  const allocation = { ...defaultAllocation }
  
  // Map legacy location names to standard format
  const locationMap: Record<string, string> = {
    'Head': 'HD',
    'Center Torso': 'CT',
    'Left Torso': 'LT',
    'Right Torso': 'RT',
    'Left Arm': 'LA',
    'Right Arm': 'RA',
    'Left Leg': 'LL',
    'Right Leg': 'RL',
    'Center Torso (Rear)': 'CT',
    'Left Torso (Rear)': 'LT',
    'Right Torso (Rear)': 'RT'
  }
  
  locations.forEach(location => {
    const locationKey = locationMap[location.location]
    if (locationKey && locationKey in allocation) {
      const isRear = location.location.includes('(Rear)')
      const armorPoints = location.armor_points || 0
      
      // Type-safe armor allocation access
      const locationData = allocation[locationKey as keyof typeof allocation]
      
      if (isRear) {
        locationData.rear = armorPoints
      } else {
        locationData.front = armorPoints
      }
    }
  })
  
  console.log('[UnitMigration] Parsed armor allocation from', locations.length, 'legacy locations')
  return allocation
}

/**
 * Calculate armor tonnage from armor allocation
 */
function calculateArmorTonnageFromAllocation(allocation: any, armorType: string): number {
  const totalPoints = Object.values(allocation).reduce((total: number, location: any) => {
    return total + (location.front || 0) + (location.rear || 0)
  }, 0)
  
  // Determine armor efficiency
  const armorEfficiency = getArmorEfficiency(armorType)
  
  // Calculate tonnage and round to nearest 0.5
  const tonnage = totalPoints / armorEfficiency
  return Math.ceil(tonnage * 2) / 2
}

/**
 * Get armor efficiency for armor type
 */
function getArmorEfficiency(armorType: string): number {
  const efficiencyMap: Record<string, number> = {
    'Standard': 16,
    'Ferro-Fibrous': 17.6,
    'Ferro-Fibrous (Clan)': 17.6,
    'Light Ferro-Fibrous': 19.2,
    'Heavy Ferro-Fibrous': 16.8,
    'Stealth': 16,
    'Reactive': 16,
    'Reflective': 16,
    'Hardened': 8
  }
  
  return efficiencyMap[armorType] || 16
}

/**
 * Determine rules level from legacy data
 */
function determineRulesLevel(
  legacyRulesLevel: string | number, 
  techRating: TechRating
): 'Introductory' | 'Standard' | 'Advanced' | 'Experimental' {
  
  // First try to parse legacy rules level
  if (typeof legacyRulesLevel === 'number') {
    switch (legacyRulesLevel) {
      case 1: return 'Introductory'
      case 2: return 'Standard'
      case 3: return 'Advanced'
      case 4: return 'Experimental'
    }
  }
  
  if (typeof legacyRulesLevel === 'string') {
    const normalized = legacyRulesLevel.toLowerCase().trim()
    
    if (normalized.includes('intro')) return 'Introductory'
    if (normalized.includes('standard') || normalized.includes('tourna')) return 'Standard'
    if (normalized.includes('advanced')) return 'Advanced'
    if (normalized.includes('experimental') || normalized.includes('exp')) return 'Experimental'
  }
  
  // Fallback: determine from tech rating complexity
  const complexity = calculateUnitComplexity(techRating)
  return complexity.level
}

/**
 * Validate migration result
 */
function validateMigration(enhancedConfig: EnhancedUnitConfiguration, legacyData: LegacyUnitData): {
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []
  
  // Check for significant differences
  if (Math.abs(enhancedConfig.tonnage - legacyData.mass) > 0.1) {
    warnings.push(`Tonnage mismatch: enhanced=${enhancedConfig.tonnage}, legacy=${legacyData.mass}`)
  }
  
  // Check movement consistency
  if (legacyData.movement?.walk_mp && Math.abs(enhancedConfig.walkMP - legacyData.movement.walk_mp) > 1) {
    warnings.push(`Walk MP mismatch: enhanced=${enhancedConfig.walkMP}, legacy=${legacyData.movement.walk_mp}`)
  }
  
  // Check engine rating consistency
  if (legacyData.engine?.rating && Math.abs(enhancedConfig.engineRating - legacyData.engine.rating) > 5) {
    warnings.push(`Engine rating mismatch: enhanced=${enhancedConfig.engineRating}, legacy=${legacyData.engine.rating}`)
  }
  
  // Check tech base consistency
  const legacyTechBase = legacyData.tech_base.toLowerCase()
  const enhancedTechBase = enhancedConfig.techBase.toLowerCase()
  
  if (!legacyTechBase.includes(enhancedTechBase.split(' ')[0].toLowerCase())) {
    warnings.push(`Tech base may have changed during migration: ${legacyData.tech_base} → ${enhancedConfig.techBase}`)
  }
  
  return { warnings, errors }
}

/**
 * Check if data is legacy format (missing Overview fields)
 */
export function isLegacyUnitData(data: any): data is LegacyUnitData {
  return data && 
         typeof data === 'object' && 
         'mass' in data && 
         'tech_base' in data && 
         !('techProgression' in data) && 
         !('techRating' in data)
}

/**
 * Migrate multiple units in batch
 */
export function batchMigrateUnits(legacyUnits: LegacyUnitData[]): {
  successful: EnhancedUnitConfiguration[]
  failed: Array<{ unit: LegacyUnitData; error: string }>
  summary: {
    total: number
    successful: number
    failed: number
    warnings: number
  }
} {
  console.log('[UnitMigration] Starting batch migration of', legacyUnits.length, 'units')
  
  const successful: EnhancedUnitConfiguration[] = []
  const failed: Array<{ unit: LegacyUnitData; error: string }> = []
  let totalWarnings = 0
  
  legacyUnits.forEach((unit, index) => {
    try {
      const result = migrateUnitData(unit)
      
      if (result.success && result.enhancedConfig) {
        successful.push(result.enhancedConfig)
        totalWarnings += result.warnings.length
      } else {
        failed.push({
          unit,
          error: result.errors.join('; ')
        })
      }
      
      if ((index + 1) % 100 === 0) {
        console.log(`[UnitMigration] Batch progress: ${index + 1}/${legacyUnits.length}`)
      }
    } catch (error) {
      failed.push({
        unit,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  const summary = {
    total: legacyUnits.length,
    successful: successful.length,
    failed: failed.length,
    warnings: totalWarnings
  }
  
  console.log('[UnitMigration] Batch migration completed:', summary)
  
  return { successful, failed, summary }
}

/**
 * Create a migration report for debugging
 */
export function createMigrationReport(result: MigrationResult): string {
  const report = [
    '=== Unit Migration Report ===',
    `Status: ${result.success ? 'SUCCESS' : 'FAILED'}`,
    '',
    '--- Migration Info ---',
    `Original Tech Base: ${result.migrationInfo.originalTechBase}`,
    `Calculated Year: ${result.migrationInfo.calculatedYear}`,
    `Detected Complexity: ${result.migrationInfo.detectedComplexity}`,
    '',
    '--- Tech Progression ---',
    Object.entries(result.migrationInfo.inferredProgression)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n'),
    ''
  ]
  
  if (result.warnings.length > 0) {
    report.push('--- Warnings ---')
    result.warnings.forEach(warning => report.push(`• ${warning}`))
    report.push('')
  }
  
  if (result.errors.length > 0) {
    report.push('--- Errors ---')
    result.errors.forEach(error => report.push(`• ${error}`))
    report.push('')
  }
  
  return report.join('\n')
}
