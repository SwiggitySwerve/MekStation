/**
 * Heat Sink Generation Tests
 * Tests to validate that external heat sinks are properly generated and appear in unallocated equipment
 */

import { UnitCriticalManager, UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager'

describe('Heat Sink Generation', () => {
  
  beforeEach(() => {
    // Reset any global state
    jest.clearAllMocks()
  })

  test('should generate external heat sinks for basic configuration', () => {
    // Create a basic 50-ton mech with 12 total heat sinks
    const config: UnitConfiguration = {
      chassis: 'Test Mech',
      model: 'TST-1',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200, // 200 rating = 8 internal heat sinks
      runMP: 6,
      engineType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 20, rear: 6 },
        LT: { front: 15, rear: 5 },
        RT: { front: 15, rear: 5 },
        LA: { front: 12, rear: 0 },
        RA: { front: 12, rear: 0 },
        LL: { front: 16, rear: 0 },
        RL: { front: 16, rear: 0 }
      },
      armorTonnage: 8.0,
      heatSinkType: 'Single',
      totalHeatSinks: 12,        // Total heat sinks
      internalHeatSinks: 8,      // Internal (from 200-rated engine)
      externalHeatSinks: 4,      // External (12 - 8 = 4)
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50,
      gyroType: 'Standard',
      enhancements: []
    }

    console.log('=== TEST: Creating UnitCriticalManager with configuration ===')
    console.log('Expected external heat sinks:', config.externalHeatSinks)
    
    const manager = new UnitCriticalManager(config)
    
    console.log('=== TEST: Checking unallocated equipment ===')
    const unallocated = manager.getUnallocatedEquipment()
    
    console.log('Total unallocated equipment:', unallocated.length)
    console.log('Unallocated equipment by name:')
    const equipmentCounts = unallocated.reduce((acc, eq) => {
      const name = eq.equipmentData.name
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log(equipmentCounts)
    
    // Find heat sink equipment
    const heatSinks = unallocated.filter(eq => 
      eq.equipmentData.name.includes('Heat Sink') || 
      eq.equipmentData === 'heat_sink'
    )
    
    console.log('Found heat sink equipment:', heatSinks.length)
    heatSinks.forEach((hs, index) => {
      console.log(`  ${index + 1}. ${hs.equipmentData.name} (ID: ${hs.equipmentData.id}, GroupID: ${hs.equipmentGroupId})`)
    })
    
    // Assertions
    expect(heatSinks.length).toBe(4) // Should have 4 external heat sinks
    expect(heatSinks[0].equipmentData.name).toBe('Single Heat Sink')
    expect(heatSinks[0].equipmentData).toBe('heat_sink')
    expect(heatSinks[0].equipmentData.requiredSlots).toBe(1)
  })

  test('should generate double heat sinks correctly', () => {
    const config: UnitConfiguration = {
      chassis: 'Test Mech',
      model: 'TST-2',
      tonnage: 75,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 300, // 300 rating = 10 internal heat sinks
      runMP: 6,
      engineType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 25, rear: 8 },
        LT: { front: 20, rear: 6 },
        RT: { front: 20, rear: 6 },
        LA: { front: 16, rear: 0 },
        RA: { front: 16, rear: 0 },
        LL: { front: 20, rear: 0 },
        RL: { front: 20, rear: 0 }
      },
      armorTonnage: 12.0,
      heatSinkType: 'Double',
      totalHeatSinks: 15,        // Total heat sinks
      internalHeatSinks: 10,     // Internal (from 300-rated engine)
      externalHeatSinks: 5,      // External (15 - 10 = 5)
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 75,
      gyroType: 'Standard',
      enhancements: []
    }

    console.log('=== TEST: Double Heat Sinks ===')
    console.log('Expected external heat sinks:', config.externalHeatSinks)
    
    const manager = new UnitCriticalManager(config)
    const unallocated = manager.getUnallocatedEquipment()
    
    const heatSinks = unallocated.filter(eq => 
      eq.equipmentData.name.includes('Heat Sink') || 
      eq.equipmentData === 'heat_sink'
    )
    
    console.log('Found heat sinks:', heatSinks.length)
    heatSinks.forEach((hs, index) => {
      console.log(`  ${index + 1}. ${hs.equipmentData.name} - ${hs.equipmentData.requiredSlots} slots`)
    })
    
    expect(heatSinks.length).toBe(5)
    expect(heatSinks[0].equipmentData.name).toBe('Double (IS) Heat Sink')
    expect(heatSinks[0].equipmentData.requiredSlots).toBe(3) // IS Double heat sinks = 3 slots
  })

  test('should handle configuration changes without accumulation', () => {
    const config: UnitConfiguration = {
      chassis: 'Test Mech',
      model: 'TST-3',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 20, rear: 6 },
        LT: { front: 15, rear: 5 },
        RT: { front: 15, rear: 5 },
        LA: { front: 12, rear: 0 },
        RA: { front: 12, rear: 0 },
        LL: { front: 16, rear: 0 },
        RL: { front: 16, rear: 0 }
      },
      armorTonnage: 8.0,
      heatSinkType: 'Single',
      totalHeatSinks: 12,
      internalHeatSinks: 8,
      externalHeatSinks: 4,
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50,
      gyroType: 'Standard',
      enhancements: []
    }

    console.log('=== TEST: Configuration Changes ===')
    
    const manager = new UnitCriticalManager(config)
    
    // Check initial state
    let unallocated = manager.getUnallocatedEquipment()
    let heatSinks = unallocated.filter(eq => 
      eq.equipmentData.name.includes('Heat Sink') || 
      eq.equipmentData === 'heat_sink'
    )
    
    console.log('Initial heat sinks:', heatSinks.length)
    expect(heatSinks.length).toBe(4)
    
    // Change to 15 total heat sinks with 8 internal (should be 7 external now)
    const newConfig = {
      ...config,
      totalHeatSinks: 15,
      internalHeatSinks: 8, // Explicitly set to match test expectation
      externalHeatSinks: 7
    }
    
    console.log('Updating configuration to 15 total heat sinks (7 external)...')
    manager.updateConfiguration(newConfig)
    
    // Check updated state
    unallocated = manager.getUnallocatedEquipment()
    heatSinks = unallocated.filter(eq => 
      eq.equipmentData.name.includes('Heat Sink') || 
      eq.equipmentData === 'heat_sink'
    )
    
    console.log('After update heat sinks:', heatSinks.length)
    expect(heatSinks.length).toBe(7) // Should be exactly 7, not 4+7=11
    
    // Change heat sink type to Double
    const doubleConfig = {
      ...newConfig,
      heatSinkType: 'Double' as const
    }
    
    console.log('Changing to Double heat sinks...')
    manager.updateConfiguration(doubleConfig)
    
    // Check final state
    unallocated = manager.getUnallocatedEquipment()
    heatSinks = unallocated.filter(eq => 
      eq.equipmentData.name.includes('Heat Sink') || 
      eq.equipmentData === 'heat_sink'
    )
    
    console.log('After type change heat sinks:', heatSinks.length)
    console.log('Heat sink names:', heatSinks.map(hs => hs.equipmentData.name))
    
    expect(heatSinks.length).toBe(7) // Should still be exactly 7
    expect(heatSinks[0].equipmentData.name).toBe('Double (IS) Heat Sink') // System is generating double heat sinks
  })

  test('should not generate heat sinks when externalHeatSinks is 0', () => {
    const config: UnitConfiguration = {
      chassis: 'Test Mech',
      model: 'TST-4',
      tonnage: 20,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 8,
      engineRating: 160,
      runMP: 12,
      engineType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 12, rear: 4 },
        LT: { front: 8, rear: 2 },
        RT: { front: 8, rear: 2 },
        LA: { front: 6, rear: 0 },
        RA: { front: 6, rear: 0 },
        LL: { front: 8, rear: 0 },
        RL: { front: 8, rear: 0 }
      },
      armorTonnage: 4.0,
      heatSinkType: 'Single',
      totalHeatSinks: 10,        // Only minimum 10
      internalHeatSinks: 10,     // All internal (160 rating provides 6, but minimum 10)
      externalHeatSinks: 0,      // No external heat sinks needed
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 20,
      gyroType: 'Standard',
      enhancements: []
    }

    console.log('=== TEST: No External Heat Sinks ===')
    console.log('Expected external heat sinks:', config.externalHeatSinks)
    
    const manager = new UnitCriticalManager(config)
    
    // Debug: Check what configuration was actually built
    const actualConfig = manager.getConfiguration()
    console.log('Actual configuration after building:', {
      totalHeatSinks: actualConfig.totalHeatSinks,
      internalHeatSinks: actualConfig.internalHeatSinks,
      externalHeatSinks: actualConfig.externalHeatSinks
    })
    
    const unallocated = manager.getUnallocatedEquipment()
    
    const heatSinks = unallocated.filter(eq => 
      eq.equipmentData.name.includes('Heat Sink') || 
      eq.equipmentData === 'heat_sink'
    )
    
    console.log('Found heat sinks:', heatSinks.length)
    expect(heatSinks.length).toBe(0) // Should have no external heat sinks
  })
})
