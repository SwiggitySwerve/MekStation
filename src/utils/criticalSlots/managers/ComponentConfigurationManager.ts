import { ComponentConfiguration, TechBase } from '../../../types/componentConfiguration'

export class ComponentConfigurationManager {

  /**
   * Extract type string from ComponentConfiguration
   * @deprecated Use component.type directly instead
   */
  static extractComponentType(component: ComponentConfiguration): string {
    return component.type
  }

  /**
   * Extract tech base from ComponentConfiguration
   * @deprecated Use component.techBase directly instead
   */
  static extractTechBase(component: ComponentConfiguration): TechBase {
    return component.techBase
  }
} 