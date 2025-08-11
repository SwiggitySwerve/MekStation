import { EquipmentAllocationServiceImpl } from '../../services/EquipmentAllocationService'

function makeUnitConfig(partial: any = {}): any {
  return {
    techBase: 'Inner Sphere',
    engineType: 'Standard',
    gyroType: 'Standard',
    weapons: [],
    ...partial
  }
}

function makeEquipment(name: string, baseType: string, type: string = 'equipment', tonnage = 1, crits = 1) {
  return {
    equipmentData: {
      name,
      baseType,
      type,
      tonnage,
      criticals: crits
    }
  }
}

describe('Placement Rules', () => {
  const service = new EquipmentAllocationServiceImpl() as any

  test('Supercharger requires engine slots in location', () => {
    const supercharger = makeEquipment('Supercharger', 'Supercharger')

    // Standard engine: no LT/RT slots -> should be invalid in LT
    let res = service.validatePlacement(supercharger, 'Left Torso', makeUnitConfig({ engineType: 'Standard', gyroType: 'Standard' }))
    expect(res.isValid).toBe(false)

    // XL engine: has LT/RT slots -> should be valid in LT
    res = service.validatePlacement(supercharger, 'Left Torso', makeUnitConfig({ engineType: 'XL', gyroType: 'Standard' }))
    expect(res.isValid).toBe(true)

    // Compact engine: only CT slots -> LT invalid, CT valid
    res = service.validatePlacement(supercharger, 'Left Torso', makeUnitConfig({ engineType: 'Compact', gyroType: 'Standard' }))
    expect(res.isValid).toBe(false)
    res = service.validatePlacement(supercharger, 'Center Torso', makeUnitConfig({ engineType: 'Compact', gyroType: 'Standard' }))
    expect(res.isValid).toBe(true)
  })

  test('Targeting Computer torso-only', () => {
    const tc = makeEquipment('Targeting Computer (2 Ton)', 'Targeting Computer')
    // Arms should be invalid
    let res = service.validatePlacement(tc, 'Left Arm', makeUnitConfig())
    expect(res.isValid).toBe(false)
    // Torso should be valid
    res = service.validatePlacement(tc, 'Right Torso', makeUnitConfig())
    expect(res.isValid).toBe(true)
  })

  test('ECM/Probe/TAG torso-only', () => {
    const ecm = makeEquipment('Guardian ECM', 'Guardian ECM')
    const probe = makeEquipment('Beagle Active Probe', 'Beagle Active Probe')
    const tag = makeEquipment('TAG', 'Target Acquisition Gear')

    expect(service.validatePlacement(ecm, 'Left Arm', makeUnitConfig()).isValid).toBe(false)
    expect(service.validatePlacement(ecm, 'Center Torso', makeUnitConfig()).isValid).toBe(true)

    expect(service.validatePlacement(probe, 'Right Leg', makeUnitConfig()).isValid).toBe(false)
    expect(service.validatePlacement(probe, 'Left Torso', makeUnitConfig()).isValid).toBe(true)

    expect(service.validatePlacement(tag, 'Head', makeUnitConfig()).isValid).toBe(false)
    expect(service.validatePlacement(tag, 'Right Torso', makeUnitConfig()).isValid).toBe(true)
  })

  test('Partial Wing torso-only Left/Right', () => {
    const pw = makeEquipment('Partial Wing', 'Partial Wing')
    expect(service.validatePlacement(pw, 'Head', makeUnitConfig()).isValid).toBe(false)
    expect(service.validatePlacement(pw, 'Left Torso', makeUnitConfig()).isValid).toBe(true)
    expect(service.validatePlacement(pw, 'Right Torso', makeUnitConfig()).isValid).toBe(true)
    expect(service.validatePlacement(pw, 'Center Torso', makeUnitConfig()).isValid).toBe(false)
  })

  test('Artemis torso-only and warns without missiles', () => {
    const artemis = makeEquipment('Prototype Artemis IV', 'Prototype Artemis IV')
    // Arm invalid
    let res = service.validatePlacement(artemis, 'Right Arm', makeUnitConfig())
    expect(res.isValid).toBe(false)

    // Torso valid, warning when no missiles
    res = service.validatePlacement(artemis, 'Left Torso', makeUnitConfig())
    expect(res.isValid).toBe(true)
    const hasArtemisWarn = res.warnings?.some((w: any) => (w.message || '').toLowerCase().includes('artemis'))
    expect(hasArtemisWarn).toBe(true)

    // When missiles present, should not warn
    const cfgWithLRM = makeUnitConfig({ weapons: [{ name: 'LRM 10' }] })
    res = service.validatePlacement(artemis, 'Left Torso', cfgWithLRM)
    const stillWarns = res.warnings?.some((w: any) => (w.message || '').toLowerCase().includes('artemis'))
    expect(stillWarns).toBe(false)
  })
})