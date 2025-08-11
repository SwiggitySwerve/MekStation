import { validateAndResolveComponentWithMemory, createDefaultMemory, updateMemory } from '../../utils/techBaseMemory'
import { ComponentCategory, TechBase } from '../../types/componentDatabase'

function makeConfig(overrides: any = {}) {
  return {
    techProgression: {
      chassis: 'Inner Sphere',
      gyro: 'Inner Sphere',
      engine: 'Inner Sphere',
      heatsink: 'Inner Sphere',
      targeting: 'Inner Sphere',
      myomer: 'Inner Sphere',
      movement: 'Inner Sphere',
      armor: 'Inner Sphere'
    },
    structureType: 'Standard',
    armorType: 'Standard',
    engineType: 'Standard',
    gyroType: 'Standard',
    heatSinkType: 'Single',
    enhancementType: 'None',
    jumpJetType: 'Standard Jump Jet',
    rulesLevel: 'Standard',
    ...overrides
  }
}

describe('Overview controller-level tech base switch', () => {
  test('Switching armor tech base resolves selection via memory/defaults and updates progression', () => {
    const currentConfig = makeConfig({ armorType: 'Ferro-Fibrous' })
    let memory = createDefaultMemory()

    // Save current IS selection in memory
    const saved = updateMemory(memory, 'armor' as ComponentCategory, 'Inner Sphere' as TechBase, 'Ferro-Fibrous')
    memory = saved.updatedMemory

    // Simulate switch to Clan armor
    const resolution = validateAndResolveComponentWithMemory(
      'Ferro-Fibrous',
      'armor' as ComponentCategory,
      'Inner Sphere' as TechBase,
      'Clan' as TechBase,
      memory,
      currentConfig.rulesLevel
    )

    // Build new configuration
    const newProgression = { ...currentConfig.techProgression, armor: 'Clan' as TechBase }
    const newConfig = { ...currentConfig, techProgression: newProgression, armorType: resolution.resolvedComponent }

    expect(newConfig.techProgression.armor).toBe('Clan')
    expect(typeof newConfig.armorType).toBe('string')
    expect((newConfig.armorType as string).length).toBeGreaterThan(0)
  })
})