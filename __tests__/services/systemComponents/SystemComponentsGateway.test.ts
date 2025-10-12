/**
 * System Components Gateway Integration Tests
 */

import { SystemComponentsGateway } from '../../../services/systemComponents/SystemComponentsGateway'

describe('SystemComponentsGateway', () => {
  beforeEach(() => {
    // Reset service between tests
    SystemComponentsGateway.resetService()
  })

  describe('Engine Operations', () => {
    test('gets engines for Inner Sphere tech base', () => {
      const engines = SystemComponentsGateway.getEngines({
        techBase: 'Inner Sphere',
        unitTonnage: 50,
        desiredRating: 200
      })

      expect(engines).toBeDefined()
      expect(engines.length).toBeGreaterThan(0)
      
      // All engines should have calculated properties
      engines.forEach(engine => {
        expect(engine.weight).toBeGreaterThan(0)
        expect(engine.slots).toBeDefined()
        expect(engine.rating).toBe(200)
      })
    })

    test('calculates engine weight correctly', () => {
      const weight = SystemComponentsGateway.calculateEngineWeight('standard_fusion', 200, 50)
      
      // Standard engine: (200 * 50 / 1000) * 1.0 = 10 tons
      expect(weight).toBe(10)
    })

    test('filters engines by year', () => {
      const engines3025 = SystemComponentsGateway.getEngines({
        techBase: 'Inner Sphere',
        unitTonnage: 50,
        desiredRating: 200,
        availableByYear: 3025
      })

      const engines3067 = SystemComponentsGateway.getEngines({
        techBase: 'Inner Sphere',
        unitTonnage: 50,
        desiredRating: 200,
        availableByYear: 3067
      })

      // Should have more engines available in 3067 than 3025
      expect(engines3067.length).toBeGreaterThanOrEqual(engines3025.length)
    })
  })

  describe('Gyro Operations', () => {
    test('gets gyros for given engine rating', () => {
      const gyros = SystemComponentsGateway.getGyros({
        techBase: 'Inner Sphere',
        engineRating: 200
      })

      expect(gyros).toBeDefined()
      expect(gyros.length).toBeGreaterThan(0)

      gyros.forEach(gyro => {
        expect(gyro.weight).toBeGreaterThan(0)
        expect(gyro.slots).toBeGreaterThan(0)
      })
    })

    test('calculates gyro weight correctly', () => {
      const weight = SystemComponentsGateway.calculateGyroWeight('standard_gyro', 200)
      
      // Standard gyro: ceil(200 / 100) * 1.0 = 2 tons
      expect(weight).toBe(2)
    })
  })

  describe('Structure Operations', () => {
    test('gets structures for unit', () => {
      const structures = SystemComponentsGateway.getStructures({
        techBase: 'Inner Sphere',
        unitType: 'BattleMech',
        unitTonnage: 50
      })

      expect(structures).toBeDefined()
      expect(structures.length).toBeGreaterThan(0)

      structures.forEach(structure => {
        expect(structure.weight).toBeGreaterThan(0)
        expect(structure.slots).toBeGreaterThanOrEqual(0)
      })
    })

    test('calculates structure weight correctly', () => {
      const weight = SystemComponentsGateway.calculateStructureWeight('standard_structure', 50)
      
      // Standard structure: 50 * 0.1 * 1.0 = 5 tons
      expect(weight).toBe(5)
    })

    test('filters industrial structure for IndustrialMechs only', () => {
      const battleMechStructures = SystemComponentsGateway.getStructures({
        techBase: 'Inner Sphere',
        unitType: 'BattleMech',
        unitTonnage: 50
      })

      const industrialMechStructures = SystemComponentsGateway.getStructures({
        techBase: 'Inner Sphere',
        unitType: 'IndustrialMech',
        unitTonnage: 50
      })

      const battleMechIndustrial = battleMechStructures.find(s => s === 'Industrial')
      const industrialMechIndustrial = industrialMechStructures.find(s => s === 'Industrial')

      expect(battleMechIndustrial).toBeUndefined()
      expect(industrialMechIndustrial).toBeDefined()
    })
  })

  describe('Validation', () => {
    test('validates engine for unit configuration', () => {
      const context = SystemComponentsGateway.createContext({
        tonnage: 50,
        engineRating: 200,
        techBase: 'Inner Sphere',
        constructionYear: 3025
      })

      const result = SystemComponentsGateway.validateEngineForUnit('standard_fusion', context)

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    test('fails validation for engine exceeding year restriction', () => {
      const context = SystemComponentsGateway.createContext({
        tonnage: 50,
        engineRating: 200,
        techBase: 'Inner Sphere',
        constructionYear: 3000
      })

      // XXL engine introduced in 3130
      const result = SystemComponentsGateway.validateEngineForUnit('xxl_fusion', context)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Context Creation', () => {
    test('creates default context', () => {
      const context = SystemComponentsGateway.createContext()

      expect(context.tonnage).toBeDefined()
      expect(context.techBase).toBeDefined()
      expect(context.engineRating).toBeDefined()
    })

    test('creates context with overrides', () => {
      const context = SystemComponentsGateway.createContext({
        tonnage: 75,
        techBase: 'Clan',
        engineRating: 300
      })

      expect(context.tonnage).toBe(75)
      expect(context.techBase).toBe('Clan')
      expect(context.engineRating).toBe(300)
    })
  })
})

