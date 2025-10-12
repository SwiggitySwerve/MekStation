import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager'
import { switchSubsystemOnUnit } from '../../services/editor/UnitSwitchCoordinator'
import { createComponentConfiguration } from '../../types/componentConfiguration'

function makeConfig(): any {
  return {
    chassis: 'Std Test',
    model: 'Test',
    tonnage: 50,
    unitType: 'BattleMech',
    techBase: 'Inner Sphere',
    walkMP: 4,
    engineRating: 200,
    runMP: 6,
    engineType: 'Standard',
    gyroType: 'Standard',
    structureType: 'Standard',
    armorType: 'Standard',
    armorAllocation: {
      HD: { front: 9, rear: 0 },
      CT: { front: 20, rear: 6 },
      LT: { front: 16, rear: 5 },
      RT: { front: 16, rear: 5 },
      LA: { front: 16, rear: 0 },
      RA: { front: 16, rear: 0 },
      LL: { front: 20, rear: 0 },
      RL: { front: 20, rear: 0 }
    },
    armorTonnage: 8.0,
    externalHeatSinks: 2,
    heatSinkType: 'Single',
    totalHeatSinks: 10,
    internalHeatSinks: 8,
    jumpMP: 0,
    jumpJetType: 'createComponentConfiguration('jumpJet', 'Standard Jump Jet')!',
    enhancements: []
  }
}

describe('UnitSwitchCoordinator', () => {
  test('switching armor IS->Clan returns a diff and updates config', async () => {
    const unit = new UnitCriticalManager(makeConfig())

    const memory = { techBaseMemory: {} } as any
    const result = await switchSubsystemOnUnit(unit, 'armor', 'Clan', memory, { unitType: 'BattleMech' })

    expect(result.updatedConfiguration.techProgression.armor).toBe('Clan')
    expect(Array.isArray(result.displacedEquipmentIds)).toBe(true)
    expect(Array.isArray(result.retainedEquipmentIds)).toBe(true)
  })

  test('switching engine preserves displacement accounting', async () => {
    const unit = new UnitCriticalManager(makeConfig())
    // Allocate a torso component to likely be displaced by XL engine side slots later
    const unallocated = unit.getUnallocatedEquipment()
    // Nothing initially; test ensures code path runs even without prior allocations

    const memory = { techBaseMemory: {} } as any
    const result = await switchSubsystemOnUnit(unit, 'engine', 'Inner Sphere', memory, { unitType: 'BattleMech' })
    expect(result.retainedEquipmentIds).toBeDefined()
  })
})