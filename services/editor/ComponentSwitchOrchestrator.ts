import { CatalogGateway } from '../catalog/CatalogGateway'
import { ComponentCategory as CatalogComponentCategory, TechContext } from '../catalog/types'
import { ComponentMemoryState, TechBaseMemory } from '../../types/componentDatabase'
import { validateAndResolveComponentWithMemory, updateMemory } from '../../utils/techBaseMemory'

// Map overview subsystem → component category and config property
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
  updatedConfiguration: any
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
    currentConfiguration: any,
    memoryState: ComponentMemoryState | null,
    context: Partial<TechContext> = { unitType: 'BattleMech' }
  ): Promise<SwitchResult> {
    const oldTechBase: 'Inner Sphere' | 'Clan' = (currentConfiguration?.techProgression?.[subsystem] as any) || 'Inner Sphere'
    const configProp = SubsystemToConfigProp[subsystem]
    const currentComponent = configProp ? currentConfiguration[configProp] : undefined

    // Update catalog context so subsequent searches are tech-aware
    await CatalogGateway.setContext({ techBase: newTechBase, unitType: context.unitType || 'BattleMech' })

    let resolvedName = typeof currentComponent === 'object' && currentComponent?.type ? currentComponent.type : currentComponent
    let updatedMemoryState = memoryState || undefined
    let wasRestoredFromMemory = false
    let resolutionReason = 'No change'

    if (memoryState && oldTechBase !== newTechBase) {
      const resolution = validateAndResolveComponentWithMemory(
        resolvedName,
        SubsystemToCategory[subsystem] as any,
        oldTechBase as any,
        newTechBase as any,
        memoryState.techBaseMemory,
        (currentConfiguration as any).rulesLevel || 'Standard'
      )
      wasRestoredFromMemory = resolution.wasRestored
      resolutionReason = resolution.resolutionReason

      // update memory container
      updatedMemoryState = {
        ...memoryState,
        techBaseMemory: resolution.updatedMemory
      }

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