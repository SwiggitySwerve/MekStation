import { CatalogGateway } from '../catalog/CatalogGateway'
import { ComponentCategory as CatalogComponentCategory, TechContext } from '../catalog/types'
import { ComponentMemoryState } from '../../types/componentDatabase'
import { validateAndResolveComponentWithMemory, createDefaultMemory } from '../../utils/techBaseMemory'
import { ComponentCategory as DbComponentCategory, TechBase, } from '../../types/componentDatabase'
import { COMPONENT_CATEGORIES, TECH_BASES } from '../../types/componentDatabase'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'

// Map overview subsystem → catalog component category (for searching)
const SubsystemToCategory: Record<string, CatalogComponentCategory> = {
  chassis: 'structure',
  gyro: 'gyro',
  engine: 'engine',
  heatsink: 'heatSink',
  targeting: 'enhancement', // targeting computers treated as enhancements for catalog category purposes
  myomer: 'enhancement',
  movement: 'jumpJet',
  armor: 'armor'
}

// Map overview subsystem → database component category (for memory)
const SubsystemToDbCategory: Record<string, DbComponentCategory> = {
  chassis: 'chassis',
  gyro: 'gyro',
  engine: 'engine',
  heatsink: 'heatsink',
  targeting: 'targeting',
  myomer: 'myomer',
  movement: 'movement',
  armor: 'armor'
}

function normalizeMemory(state: ComponentMemoryState | null): ComponentMemoryState {
  const base = createDefaultMemory()
  if (!state || !state.techBaseMemory) {
    return { techBaseMemory: base, lastUpdated: Date.now(), version: '1.0.0' }
  }
  const merged: any = { ...base }
  COMPONENT_CATEGORIES.forEach((cat: any) => {
    merged[cat] = { ...(base as any)[cat] }
    const provided = (state.techBaseMemory as any)[cat] || {}
    TECH_BASES.forEach((tb: TechBase) => {
      if (provided[tb] !== undefined) merged[cat][tb] = provided[tb]
    })
  })
  return { techBaseMemory: merged, lastUpdated: Date.now(), version: '1.0.0' }
}

const SubsystemToConfigProp: Record<string, string> = {
  chassis: 'structureType',
  gyro: 'gyroType',
  engine: 'engineType',
  heatsink: 'heatSinkType',
  targeting: 'targetingSystem',
  myomer: 'enhancementType',
  movement: 'jumpJetType',
  armor: 'armorType'
}

export interface SwitchResult {
  updatedConfiguration: UnitConfiguration
  updatedMemoryState?: ComponentMemoryState
  wasRestoredFromMemory: boolean
  resolutionReason: string
  displacedEquipmentIds: string[]
  retainedEquipmentIds: string[]
}

export class ComponentSwitchOrchestrator {
  static async switchSubsystemTechBase(
    subsystem: keyof typeof SubsystemToCategory,
    newTechBase: 'Inner Sphere' | 'Clan',
    currentConfiguration: UnitConfiguration,
    memoryState: ComponentMemoryState | null,
    context: Partial<TechContext> = { unitType: 'BattleMech' }
  ): Promise<SwitchResult> {
    const oldTechBase: 'Inner Sphere' | 'Clan' = currentConfiguration.techProgression?.[subsystem as keyof typeof currentConfiguration.techProgression] || 'Inner Sphere'
    const configProp = SubsystemToConfigProp[subsystem]
    // Use type assertion to access dynamic property on UnitConfiguration safely
    const currentComponent = configProp ? (currentConfiguration as any)[configProp] : undefined

    // Update catalog context so subsequent searches are tech-aware
    await CatalogGateway.setContext({ techBase: newTechBase, unitType: context.unitType || 'BattleMech' })

    let resolvedName = typeof currentComponent === 'object' && currentComponent?.type ? currentComponent.type : currentComponent
    let updatedMemoryState = normalizeMemory(memoryState)
    let wasRestoredFromMemory = false
    let resolutionReason = 'No change'

    if (updatedMemoryState && oldTechBase !== newTechBase) {
      const resolution = validateAndResolveComponentWithMemory(
        resolvedName,
        SubsystemToDbCategory[subsystem],
        oldTechBase,
        newTechBase,
        updatedMemoryState.techBaseMemory,
        currentConfiguration.rulesLevel as any || 'Standard'
      )
      wasRestoredFromMemory = resolution.wasRestored
      resolutionReason = resolution.resolutionReason

      // update memory container
      updatedMemoryState = { techBaseMemory: resolution.updatedMemory, lastUpdated: Date.now(), version: '1.0.0' }

      resolvedName = resolution.resolvedComponent
    }

    // If still no resolved component, fall back to defaults using the catalog (first available option)
    if (!resolvedName) {
      const options = await CatalogGateway.search({
        componentCategories: [SubsystemToCategory[subsystem]],
        page: 1,
        pageSize: 1,
        sortBy: 'name',
        sortOrder: 'ASC'
      })
      resolvedName = options.items[0]?.name || 'Standard'
      resolutionReason = `Defaulted to first available: ${resolvedName}`
    }

    // Build updated progression and configuration
    const newProgression = {
      ...(currentConfiguration.techProgression || {}),
      [subsystem]: newTechBase
    }

    const updatedConfiguration = {
      ...currentConfiguration,
      techProgression: newProgression,
      [configProp]: resolvedName
    }

    // Placeholders for displacement diffs: require orchestrator/state access to compute precisely
    const displacedEquipmentIds: string[] = []
    const retainedEquipmentIds: string[] = []

    return {
      updatedConfiguration,
      updatedMemoryState,
      wasRestoredFromMemory,
      resolutionReason,
      displacedEquipmentIds,
      retainedEquipmentIds
    }
  }
}




