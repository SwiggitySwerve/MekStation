/**
 * Tech Rating System - Calculates BattleTech technology availability ratings by era
 * Based on official BattleTech tech progression tables and introduction years
 */

import { TechProgression, TechRating } from './techProgression'

/**
 * Era definitions for tech rating calculation
 */
export const TECH_ERAS = {
  '2100-2800': { start: 2100, end: 2800, name: 'Age of War/Star League' },
  '2801-3050': { start: 2801, end: 3050, name: 'Succession Wars' },
  '3051-3082': { start: 3051, end: 3082, name: 'FedCom Civil War' },
  '3083-Now': { start: 3083, end: 3200, name: 'Dark Age/ilClan' }
} as const

/**
 * Technology availability database by era and tech base
 * Ratings: A=Common, B=Uncommon, C=Rare, D=Very Rare, E=Extremely Rare, F=Primitive/Extinct, X=Unavailable
 */
const TECH_AVAILABILITY = {
  'Inner Sphere': {
    // Engine Technologies
    'Standard Engine': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'ICE Engine': { '2100-2800': 'B', '2801-3050': 'C', '3051-3082': 'D', '3083-Now': 'D' },
    'Fuel Cell Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'XL Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'Light Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Compact Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'XXL Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'F' },
    
    // Structure Technologies
    'Standard Structure': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Endo Steel': { '2100-2800': 'E', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'Composite Structure': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Reinforced Structure': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'F' },
    'Industrial Structure': { '2100-2800': 'C', '2801-3050': 'C', '3051-3082': 'D', '3083-Now': 'D' },
    
    // Armor Technologies
    'Standard Armor': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Ferro-Fibrous': { '2100-2800': 'E', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'Light Ferro-Fibrous': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Heavy Ferro-Fibrous': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Stealth Armor': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Reactive Armor': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'F', '3083-Now': 'E' },
    'Reflective Armor': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'F', '3083-Now': 'E' },
    'Hardened Armor': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'F' },
    
    // Heat Sink Technologies
    'Single Heat Sink': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Double Heat Sink': { '2100-2800': 'E', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'Compact Heat Sink': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Laser Heat Sink': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'F' },
    
    // Gyro Technologies
    'Standard Gyro': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'XL Gyro': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Compact Gyro': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Heavy-Duty Gyro': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'F' },
    
    // Targeting and Electronics
    'Standard Targeting': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Artemis IV': { '2100-2800': 'E', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'Targeting Computer': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'Advanced Fire Control': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    
    // Myomer Technologies
    'Standard Myomer': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Triple Strength Myomer': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'MASC': { '2100-2800': 'E', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    
    // Movement Technologies
    'Standard Movement': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Jump Jets': { '2100-2800': 'D', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Improved Jump Jets': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'Partial Wing': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' }
  },
  
  'Clan': {
    // Engine Technologies
    'Standard Engine': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'XL Engine': { '2100-2800': 'X', '2801-3050': 'E', '3051-3082': 'D', '3083-Now': 'D' },
    'XXL Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'F', '3083-Now': 'E' },
    'Light Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    'ICE Engine': { '2100-2800': 'X', '2801-3050': 'F', '3051-3082': 'F', '3083-Now': 'F' },
    'Fuel Cell Engine': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'F', '3083-Now': 'E' },
    
    // Structure Technologies
    'Standard Structure': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Endo Steel': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Reinforced Structure': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'F' },
    
    // Armor Technologies
    'Standard Armor': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Ferro-Fibrous': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Reflective Armor': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' },
    'Laser Reflective Armor': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'F', '3083-Now': 'E' },
    
    // Heat Sink Technologies
    'Single Heat Sink': { '2100-2800': 'X', '2801-3050': 'F', '3051-3082': 'F', '3083-Now': 'F' },
    'Double Heat Sink': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Compact Heat Sink': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    
    // Gyro Technologies
    'Standard Gyro': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'XL Gyro': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'X', '3083-Now': 'E' },
    
    // Targeting and Electronics
    'Standard Targeting': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Artemis IV': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Targeting Computer': { '2100-2800': 'X', '2801-3050': 'E', '3051-3082': 'D', '3083-Now': 'D' },
    
    // Myomer Technologies
    'Standard Myomer': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Triple Strength Myomer': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'F', '3083-Now': 'E' },
    
    // Movement Technologies
    'Standard Movement': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Jump Jets': { '2100-2800': 'X', '2801-3050': 'D', '3051-3082': 'D', '3083-Now': 'D' },
    'Improved Jump Jets': { '2100-2800': 'X', '2801-3050': 'X', '3051-3082': 'E', '3083-Now': 'D' }
  }
} as const

/**
 * Calculate tech rating for a unit based on era and tech progression
 */
export function calculateTechRating(
  introductionYear: number,
  techProgression: TechProgression,
  unitConfig?: any
): TechRating {
  console.log('[TechRating] Calculating tech rating for year:', introductionYear, 'progression:', techProgression)

  // Determine which era each rating period falls into relative to introduction year
  const ratings: TechRating = {
    era2100_2800: calculateEraRating(introductionYear, techProgression, '2100-2800', unitConfig),
    era2801_3050: calculateEraRating(introductionYear, techProgression, '2801-3050', unitConfig),
    era3051_3082: calculateEraRating(introductionYear, techProgression, '3051-3082', unitConfig),
    era3083_Now: calculateEraRating(introductionYear, techProgression, '3083-Now', unitConfig)
  }

  console.log('[TechRating] Calculated ratings:', ratings)
  return ratings
}

/**
 * Calculate rating for a specific era
 */
function calculateEraRating(
  introductionYear: number,
  techProgression: TechProgression,
  era: keyof typeof TECH_ERAS,
  unitConfig?: any
): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X' {
  const eraInfo = TECH_ERAS[era]
  
  // If unit is introduced after this era ends, it's unavailable
  if (introductionYear > eraInfo.end) {
    return 'X'
  }
  
  // Collect ratings for all subsystems
  const subsystemRatings: Array<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X'> = []
  
  // Rate each subsystem
  Object.entries(techProgression).forEach(([subsystem, techBase]) => {
    const rating = getSubsystemTechRating(subsystem, techBase, era, unitConfig)
    subsystemRatings.push(rating)
  })
  
  // Overall rating is the worst (highest) rating among all subsystems
  const ratingOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'X']
  let worstRating = 'A' as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X'
  
  subsystemRatings.forEach(rating => {
    if (ratingOrder.indexOf(rating) > ratingOrder.indexOf(worstRating)) {
      worstRating = rating
    }
  })
  
  return worstRating
}

/**
 * Get tech rating for a specific subsystem
 */
export function getSubsystemTechRating(
  subsystem: string,
  techBase: 'Inner Sphere' | 'Clan',
  era: keyof typeof TECH_ERAS,
  unitConfig?: any
): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X' {
  const techAvailability = TECH_AVAILABILITY[techBase]
  
  if (!techAvailability) {
    return 'X'
  }
  
  // Map subsystem to specific technologies
  const techName = mapSubsystemToTechName(subsystem, unitConfig)
  const techEntry = techAvailability[techName as keyof typeof techAvailability]
  
  if (!techEntry) {
    // Default to standard tech if specific technology not found
    const standardTech = getStandardTechForSubsystem(subsystem, techBase)
    const standardEntry = techAvailability[standardTech as keyof typeof techAvailability]
    return standardEntry?.[era] || 'D'
  }
  
  return techEntry[era]
}

/**
 * Map subsystem to specific technology name
 */
function mapSubsystemToTechName(subsystem: string, unitConfig?: any): string {
  if (!unitConfig) {
    return getStandardTechForSubsystem(subsystem, 'Inner Sphere')
  }
  
  switch (subsystem) {
    case 'engine':
      return unitConfig.engineType ? `${unitConfig.engineType} Engine` : 'Standard Engine'
    case 'chassis':
      return unitConfig.structureType ? `${unitConfig.structureType} Structure` : 'Standard Structure'
    case 'armor':
      return unitConfig.armorType || 'Standard Armor'
    case 'heatsink':
      return unitConfig.heatSinkType ? `${unitConfig.heatSinkType} Heat Sink` : 'Single Heat Sink'
    case 'gyro':
      return unitConfig.gyroType ? `${unitConfig.gyroType} Gyro` : 'Standard Gyro'
    case 'targeting':
      // Analyze equipment for targeting systems
      return analyzeTargetingTech(unitConfig) || 'Standard Targeting'
    case 'myomer':
      return getMyomerType(unitConfig)
    case 'movement':
      return analyzeMovementTech(unitConfig) || 'Standard Movement'
    default:
      return getStandardTechForSubsystem(subsystem, 'Inner Sphere')
  }
}

/**
 * Get standard technology name for a subsystem
 */
function getStandardTechForSubsystem(subsystem: string, techBase: 'Inner Sphere' | 'Clan'): string {
  const standardTech = {
    engine: 'Standard Engine',
    chassis: 'Standard Structure',
    armor: 'Standard Armor',
    heatsink: techBase === 'Clan' ? 'Double Heat Sink' : 'Single Heat Sink',
    gyro: 'Standard Gyro',
    targeting: 'Standard Targeting',
    myomer: 'Standard Myomer',
    movement: 'Standard Movement'
  }
  
  return standardTech[subsystem as keyof typeof standardTech] || 'Standard'
}

/**
 * Analyze unit equipment for targeting technology
 */
function analyzeTargetingTech(unitConfig: any): string | null {
  if (!unitConfig.weapons_and_equipment) {
    return null
  }
  
  const equipment = unitConfig.weapons_and_equipment
  
  // Look for advanced targeting systems
  for (const item of equipment) {
    const name = item.item_name?.toLowerCase() || ''
    
    if (name.includes('targeting computer')) {
      return 'Targeting Computer'
    }
    if (name.includes('artemis')) {
      return item.tech_base === 'Clan' ? 'Artemis IV (Clan)' : 'Artemis IV'
    }
    if (name.includes('advanced fire control')) {
      return 'Advanced Fire Control'
    }
  }
  
  return null
}

/**
 * Analyze unit equipment for movement technology
 */
function analyzeMovementTech(unitConfig: any): string | null {
  if (unitConfig.jumpMP > 0) {
    // Look for improved jump jets
    if (unitConfig.weapons_and_equipment) {
      const hasImprovedJJ = unitConfig.weapons_and_equipment.some((item: any) =>
        item.item_name?.toLowerCase().includes('improved jump')
      )
      
      if (hasImprovedJJ) {
        return 'Improved Jump Jets'
      }
    }
    
    return 'Jump Jets'
  }
  
  if (unitConfig.hasPartialWing) {
    return 'Partial Wing'
  }
  
  return null
}

/**
 * Parse introduction year from various era formats
 */
export function parseIntroductionYear(era: string | number): number {
  if (typeof era === 'number') {
    return era
  }
  
  // Handle specific year formats
  const yearMatch = era.match(/(\d{4})/)
  if (yearMatch) {
    return parseInt(yearMatch[1])
  }
  
  // Handle era name mappings
  const eraMapping: Record<string, number> = {
    'Age of War': 2005,
    'Star League': 2571,
    'Succession Wars': 2785,
    'Late Succession Wars': 3000,
    'FedCom Civil War': 3057,
    'Dark Age': 3132,
    'ilClan Era': 3151,
    'Clan Invasion': 3050,
    'Civil War': 3057
  }
  
  const mappedYear = eraMapping[era]
  if (mappedYear) {
    return mappedYear
  }
  
  // Default fallback
  console.warn('[TechRating] Could not parse introduction year from era:', era, 'using default 3025')
  return 3025
}

/**
 * Get era name for a given year
 */
export function getEraForYear(year: number): string {
  if (year <= 2800) return 'Star League'
  if (year <= 3050) return 'Succession Wars'
  if (year <= 3082) return 'FedCom Civil War'
  return 'Dark Age'
}

/**
 * Get tech rating description
 */
export function getTechRatingDescription(rating: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'X'): string {
  const descriptions = {
    'A': 'Common - Widely available technology',
    'B': 'Uncommon - Limited availability',
    'C': 'Rare - Difficult to obtain',
    'D': 'Very Rare - Extremely limited production',
    'E': 'Extremely Rare - Prototype or experimental',
    'F': 'Primitive/Extinct - Obsolete technology',
    'X': 'Unavailable - Technology does not exist'
  }
  
  return descriptions[rating]
}

/**
 * Calculate overall unit complexity rating
 */
export function calculateUnitComplexity(techRating: TechRating): {
  level: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental'
  description: string
} {
  const allRatings = Object.values(techRating)
  const hasX = allRatings.includes('X')
  const hasF = allRatings.includes('F')
  const hasE = allRatings.includes('E')
  
  if (hasX || hasF) {
    return {
      level: 'Experimental',
      description: 'Contains prototype or unavailable technology'
    }
  }
  
  if (hasE) {
    return {
      level: 'Advanced',
      description: 'Contains extremely rare technology'
    }
  }
  
  const hasAdvanced = allRatings.some(r => ['C', 'D'].includes(r))
  
  if (hasAdvanced) {
    return {
      level: 'Standard',
      description: 'Uses standard BattleTech technology'
    }
  }
  
  return {
    level: 'Introductory',
    description: 'Uses only common technology'
  }
}

/**
 * Auto-update tech ratings when configuration changes
 */
export function autoUpdateTechRating(
  introductionYear: number,
  techProgression: TechProgression,
  unitConfig: any
): TechRating {
  return calculateTechRating(introductionYear, techProgression, unitConfig)
}

/**
 * Update getMyomerType to work with enhancements array
 */
export function getMyomerType(unitConfig: any): string {
  if (!unitConfig.enhancements || unitConfig.enhancements.length === 0) {
    return 'Standard Myomer'
  }
  // Return the first enhancement type, or 'Standard Myomer' if none
  return unitConfig.enhancements[0].type || 'Standard Myomer'
}
