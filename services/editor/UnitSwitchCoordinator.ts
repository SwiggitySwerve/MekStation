import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager'
import { ComponentSwitchOrchestrator, SwitchResult } from './ComponentSwitchOrchestrator'
import { TechContext } from '../catalog/types'

export interface SwitchDiff {
  displacedEquipmentIds: string[]
  retainedEquipmentIds: string[]
  retainedSameLocationIds: string[]
}

function snapshotAllocations(unit: UnitCriticalManager): Map<string, { location: string; start: number; end: number }> {
  const map = new Map<string, { location: string; start: number; end: number }>()
  const sections = ['Head','Center Torso','Left Torso','Right Torso','Left Arm','Right Arm','Left Leg','Right Leg']
  sections.forEach(location => {
    const section = unit.getSection(location)
    if (!section) return
    section.getAllEquipment().forEach(eq => {
      map.set(eq.equipmentGroupId, { location, start: eq.startSlotIndex, end: eq.endSlotIndex })
    })
  })
  return map
}

function computeDiff(before: Map<string, { location: string; start: number; end: number }>, after: Map<string, { location: string; start: number; end: number }>): SwitchDiff {
  const displaced: string[] = []
  const retained: string[] = []
  const retainedSameLoc: string[] = []

  // Any before-allocated id not in after-allocated is displaced
  before.forEach((posBefore, id) => {
    const posAfter = after.get(id)
    if (!posAfter) {
      displaced.push(id)
    } else {
      retained.push(id)
      if (posAfter.location === posBefore.location && posAfter.start === posBefore.start) {
        retainedSameLoc.push(id)
      }
    }
  })

  return {
    displacedEquipmentIds: displaced,
    retainedEquipmentIds: retained,
    retainedSameLocationIds: retainedSameLoc
  }
}

export async function switchSubsystemOnUnit(
  unit: UnitCriticalManager,
  subsystem: 'chassis' | 'gyro' | 'engine' | 'heatsink' | 'targeting' | 'myomer' | 'movement' | 'armor',
  newTechBase: 'Inner Sphere' | 'Clan',
  memoryState: any | null,
  context: Partial<TechContext> = { unitType: 'BattleMech' }
): Promise<SwitchResult & SwitchDiff> {
  const before = snapshotAllocations(unit)

  const currentConfiguration = unit.getConfiguration() as any
  const result = await ComponentSwitchOrchestrator.switchSubsystemTechBase(
    subsystem,
    newTechBase,
    currentConfiguration,
    memoryState,
    context
  )

  // Apply configuration to unit, which will trigger displacement internally
  unit.updateConfiguration(result.updatedConfiguration as any)

  const after = snapshotAllocations(unit)
  const diff = computeDiff(before, after)

  return {
    ...result,
    ...diff
  }
}

export async function switchAllSubsystemsOnUnit(
  unit: UnitCriticalManager,
  newTechBase: 'Inner Sphere' | 'Clan',
  memoryState: any | null,
  context: Partial<TechContext> = { unitType: 'BattleMech' }
): Promise<(SwitchResult & SwitchDiff) & { updatedMemoryState: any }> {
  const order: Array<'gyro' | 'engine' | 'chassis' | 'armor' | 'heatsink' | 'movement' | 'targeting' | 'myomer'> = [
    'gyro',
    'engine',
    'chassis',
    'armor',
    'heatsink',
    'movement',
    'targeting',
    'myomer'
  ]

  let mem = memoryState
  let aggregate: SwitchDiff = { displacedEquipmentIds: [], retainedEquipmentIds: [], retainedSameLocationIds: [] }
  let lastResult: SwitchResult | null = null

  for (const subsystem of order) {
    const res = await switchSubsystemOnUnit(unit, subsystem, newTechBase, mem, context)
    mem = res.updatedMemoryState
    lastResult = res
    aggregate = {
      displacedEquipmentIds: Array.from(new Set([...aggregate.displacedEquipmentIds, ...res.displacedEquipmentIds])),
      retainedEquipmentIds: Array.from(new Set([...aggregate.retainedEquipmentIds, ...res.retainedEquipmentIds])),
      retainedSameLocationIds: Array.from(new Set([...aggregate.retainedSameLocationIds, ...res.retainedSameLocationIds]))
    }
  }

  return {
    ...(lastResult as SwitchResult),
    ...aggregate,
    updatedMemoryState: mem
  }
}