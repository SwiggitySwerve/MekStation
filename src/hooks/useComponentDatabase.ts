/**
 * React Hook for Component Database
 * 
 * MIGRATED: Now uses SystemComponentsGateway instead of old ComponentDatabaseService
 * Drop-in replacement maintaining backward compatibility
 */

import { useSystemComponents } from './systemComponents/useSystemComponents'

// Re-export types for backward compatibility
export type {
  ComponentFilters
} from './systemComponents/useSystemComponents'

export type {
  ComponentCategory,
  ComponentVariantUnion,
  EngineVariant,
  GyroVariant,
  StructureVariant,
  ArmorVariant,
  HeatSinkVariant,
  JumpJetVariant,
  TechBase,
  UnitType
} from '../types/core/ComponentDatabase'

/**
 * Hook for accessing component database
 * 
 * @deprecated Consider using useSystemComponents directly for new code
 */
export const useComponentDatabase = () => {
  // Delegate to new gateway-based hook
  return useSystemComponents()
} 