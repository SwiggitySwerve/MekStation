/**
 * Component Filtering Analysis Test
 * Tests to verify what components are available in the filtering system
 */

import { 
  getAvailableEngineTypes,
  getAvailableStructureTypes,
  getAvailableArmorTypes,
  getAvailableGyroTypes,
  getAvailableHeatSinkTypes
} from '../../utils/componentOptionFiltering'
import { COMPONENT_DATABASE } from '../../utils/componentDatabase'

describe('Component Filtering Analysis', () => {
  const testConfig = {
    chassis: 'Test Mech',
    model: 'TM-1',
    tonnage: 50,
    unitType: 'BattleMech' as const,
    techBase: 'Inner Sphere' as const,
    walkMP: 4,
    engineRating: 200,
    runMP: 6,
    engineType: 'Standard' as any,
    jumpMP: 0,
    jumpJetType: { type: 'None', techBase: 'Inner Sphere' as const },
    jumpJetCounts: {},
    hasPartialWing: false,
    gyroType: { type: 'Standard', techBase: 'Inner Sphere' as const },
    structureType: { type: 'Standard', techBase: 'Inner Sphere' as const },
    armorType: { type: 'Standard', techBase: 'Inner Sphere' as const },
    armorAllocation: {
      HD: { front: 0, rear: 0 },
      CT: { front: 0, rear: 0 },
      LT: { front: 0, rear: 0 },
      RT: { front: 0, rear: 0 },
      LA: { front: 0, rear: 0 },
      RA: { front: 0, rear: 0 },
      LL: { front: 0, rear: 0 },
      RL: { front: 0, rear: 0 }
    },
    armorTonnage: 0,
    heatSinkType: { type: 'Single', techBase: 'Inner Sphere' as const },
    totalHeatSinks: 10,
    internalHeatSinks: 10,
    externalHeatSinks: 0,
    enhancements: [],
    mass: 50,
    introductionYear: 3070,
    rulesLevel: 'Standard'
  }

  describe('Engine Types', () => {
    it('should return available engine types for Inner Sphere', () => {
      const engineTypes = getAvailableEngineTypes(testConfig as any)
      console.log('Available Inner Sphere Engine Types:', engineTypes.map(e => e))
      
      expect(engineTypes).toBeDefined()
      expect(engineTypes.length).toBeGreaterThan(0)
      
      // Should include basic engines
      const engineTypeNames = engineTypes.map(e => e)
      expect(engineTypeNames).toContain('Standard')
      expect(engineTypeNames).toContain('XL')
      expect(engineTypeNames).toContain('Light')
      expect(engineTypeNames).toContain('Compact')
      expect(engineTypeNames).toContain('ICE')
      expect(engineTypeNames).toContain('Fuel Cell')
    })

    it('should return available engine types for Clan', () => {
      const clanConfig = { ...testConfig, techBase: 'Clan' as const }
      const engineTypes = getAvailableEngineTypes(clanConfig as any)
      console.log('Available Clan Engine Types:', engineTypes.map(e => e))
      
      expect(engineTypes).toBeDefined()
      expect(engineTypes.length).toBeGreaterThan(0)
      
      const engineTypeNames = engineTypes.map(e => e)
      expect(engineTypeNames).toContain('Standard')
      expect(engineTypeNames).toContain('XL (Clan)')
      expect(engineTypeNames).toContain('Light (Clan)')
    })
  })

  describe('Structure Types', () => {
    it('should return available structure types for Inner Sphere', () => {
      const structureTypes = getAvailableStructureTypes(testConfig)
      console.log('Available Inner Sphere Structure Types:', structureTypes.map(s => s))
      
      expect(structureTypes).toBeDefined()
      expect(structureTypes.length).toBeGreaterThan(0)
      
      const structureTypeNames = structureTypes.map(s => s)
      expect(structureTypeNames).toContain('Standard')
      expect(structureTypeNames).toContain('Endo Steel')
      expect(structureTypeNames).toContain('Composite')
      expect(structureTypeNames).toContain('Reinforced')
      expect(structureTypeNames).toContain('Industrial')
    })

    it('should return available structure types for Clan', () => {
      const clanConfig = { ...testConfig, techBase: 'Clan' as const }
      const structureTypes = getAvailableStructureTypes(clanConfig)
      console.log('Available Clan Structure Types:', structureTypes.map(s => s))
      
      expect(structureTypes).toBeDefined()
      expect(structureTypes.length).toBeGreaterThan(0)
      
      const structureTypeNames = structureTypes.map(s => s)
      expect(structureTypeNames).toContain('Standard')
      expect(structureTypeNames).toContain('Endo Steel (Clan)')
    })
  })

  describe('Gyro Types', () => {
    it('should return available gyro types for Inner Sphere', () => {
      const gyroTypes = getAvailableGyroTypes(testConfig)
      console.log('Available Inner Sphere Gyro Types:', gyroTypes.map(g => g))
      
      expect(gyroTypes).toBeDefined()
      expect(gyroTypes.length).toBeGreaterThan(0)
      
      const gyroTypeNames = gyroTypes.map(g => g)
      expect(gyroTypeNames).toContain('Standard')
      expect(gyroTypeNames).toContain('XL')
      expect(gyroTypeNames).toContain('Compact')
      expect(gyroTypeNames).toContain('Heavy-Duty')
    })

    it('should return available gyro types for Clan', () => {
      const clanConfig = { ...testConfig, techBase: 'Clan' as const }
      const gyroTypes = getAvailableGyroTypes(clanConfig)
      console.log('Available Clan Gyro Types:', gyroTypes.map(g => g))
      
      expect(gyroTypes).toBeDefined()
      expect(gyroTypes.length).toBeGreaterThan(0)
      
      const gyroTypeNames = gyroTypes.map(g => g)
      expect(gyroTypeNames).toContain('Standard')
    })
  })

  describe('Armor Types', () => {
    it('should return available armor types for Inner Sphere', () => {
      const armorTypes = getAvailableArmorTypes(testConfig)
      console.log('Available Inner Sphere Armor Types:', armorTypes.map(a => a))
      
      expect(armorTypes).toBeDefined()
      expect(armorTypes.length).toBeGreaterThan(0)
      
      const armorTypeNames = armorTypes.map(a => a)
      expect(armorTypeNames).toContain('Standard')
      expect(armorTypeNames).toContain('Ferro-Fibrous')
      expect(armorTypeNames).toContain('Light Ferro-Fibrous')
      expect(armorTypeNames).toContain('Heavy Ferro-Fibrous')
      expect(armorTypeNames).toContain('Stealth')
      expect(armorTypeNames).toContain('Reactive')
      expect(armorTypeNames).toContain('Reflective')
      expect(armorTypeNames).toContain('Hardened')
    })

    it('should return available armor types for Clan', () => {
      const clanConfig = { ...testConfig, techBase: 'Clan' as const }
      const armorTypes = getAvailableArmorTypes(clanConfig)
      console.log('Available Clan Armor Types:', armorTypes.map(a => a))
      
      expect(armorTypes).toBeDefined()
      expect(armorTypes.length).toBeGreaterThan(0)
      
      const armorTypeNames = armorTypes.map(a => a)
      expect(armorTypeNames).toContain('Standard')
      expect(armorTypeNames).toContain('Ferro-Fibrous (Clan)')
      expect(armorTypeNames).toContain('Stealth (Clan)')
    })
  })

  describe('Heat Sink Types', () => {
    it('should return available heat sink types for Inner Sphere', () => {
      const heatSinkTypes = getAvailableHeatSinkTypes(testConfig)
      console.log('Available Inner Sphere Heat Sink Types:', heatSinkTypes.map(h => h))
      
      expect(heatSinkTypes).toBeDefined()
      expect(heatSinkTypes.length).toBeGreaterThan(0)
      
      const heatSinkTypeNames = heatSinkTypes.map(h => h)
      expect(heatSinkTypeNames).toContain('Single')
      expect(heatSinkTypeNames).toContain('Double')
      expect(heatSinkTypeNames).toContain('Compact')
      expect(heatSinkTypeNames).toContain('Laser')
    })

    it('should return available heat sink types for Clan', () => {
      const clanConfig = { ...testConfig, techBase: 'Clan' as const }
      const heatSinkTypes = getAvailableHeatSinkTypes(clanConfig)
      console.log('Available Clan Heat Sink Types:', heatSinkTypes.map(h => h))
      
      expect(heatSinkTypes).toBeDefined()
      expect(heatSinkTypes.length).toBeGreaterThan(0)
      
      const heatSinkTypeNames = heatSinkTypes.map(h => h)
      expect(heatSinkTypeNames).toContain('Double (Clan)')
    })
  })

  describe('Component Database Analysis', () => {
    it('should have all required component categories', () => {
      expect(COMPONENT_DATABASE.chassis).toBeDefined()
      expect(COMPONENT_DATABASE.engine).toBeDefined()
      expect(COMPONENT_DATABASE.gyro).toBeDefined()
      expect(COMPONENT_DATABASE.armor).toBeDefined()
      expect(COMPONENT_DATABASE.heatsink).toBeDefined()
    })

    it('should have components for both tech bases', () => {
      expect(COMPONENT_DATABASE.engine['Inner Sphere']).toBeDefined()
      expect(COMPONENT_DATABASE.engine['Clan']).toBeDefined()
      expect(COMPONENT_DATABASE.chassis['Inner Sphere']).toBeDefined()
      expect(COMPONENT_DATABASE.chassis['Clan']).toBeDefined()
      expect(COMPONENT_DATABASE.gyro['Inner Sphere']).toBeDefined()
      expect(COMPONENT_DATABASE.gyro['Clan']).toBeDefined()
      expect(COMPONENT_DATABASE.armor['Inner Sphere']).toBeDefined()
      expect(COMPONENT_DATABASE.armor['Clan']).toBeDefined()
      expect(COMPONENT_DATABASE.heatsink['Inner Sphere']).toBeDefined()
      expect(COMPONENT_DATABASE.heatsink['Clan']).toBeDefined()
    })
  })
}) 