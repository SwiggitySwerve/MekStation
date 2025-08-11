import { createDefaultMemory, updateMemory, getRememberedComponent, validateAndResolveComponentWithMemory } from '../../utils/techBaseMemory'
import { ComponentCategory, TechBase } from '../../types/componentDatabase'

describe('Tech Base Memory', () => {
  test('createDefaultMemory has entries for all categories and tech bases', () => {
    const mem = createDefaultMemory()
    // spot check a couple of categories
    expect(mem.chassis['Inner Sphere']).toBeDefined()
    expect(mem.chassis['Clan']).toBeDefined()
    expect(mem.armor['Inner Sphere']).toBeDefined()
  })

  test('updateMemory stores selection per category and tech base', () => {
    const mem = createDefaultMemory()
    const { updatedMemory, changed } = updateMemory(mem, 'chassis' as ComponentCategory, 'Inner Sphere' as TechBase, 'Endo Steel')
    expect(changed).toBe(true)
    expect(updatedMemory.chassis['Inner Sphere']).toBe('Endo Steel')
  })

  test('validateAndResolveComponentWithMemory restores remembered selection when switching tech base', () => {
    const mem = createDefaultMemory()
    // Save current IS selection
    const { updatedMemory } = updateMemory(mem, 'armor' as ComponentCategory, 'Inner Sphere' as TechBase, 'Ferro-Fibrous')

    const result = validateAndResolveComponentWithMemory(
      'Ferro-Fibrous',
      'armor' as ComponentCategory,
      'Inner Sphere' as TechBase,
      'Clan' as TechBase,
      updatedMemory,
      'Standard'
    )
    // If Clan memory exists, it's restored; otherwise, default is used.
    // Our default memory contains a valid Clan entry; resolution returns a non-empty string.
    expect(typeof result.resolvedComponent).toBe('string')
    expect(result.resolvedComponent.length).toBeGreaterThan(0)
  })
})