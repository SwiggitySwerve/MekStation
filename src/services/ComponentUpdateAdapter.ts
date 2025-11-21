/**
 * Component Update Adapter
 * 
 * This adapter provides a clean interface between the UI layer and the ComponentUpdateService.
 * It handles the translation between UI state and service requests, making the system
 * more testable and maintainable.
 */

import { ComponentUpdateService, ComponentUpdateRequest, ComponentUpdateResult } from './ComponentUpdateService'
import { ComponentConfiguration } from '../types/componentConfiguration'
import { UnitConfiguration } from '../utils/criticalSlots/UnitCriticalManagerTypes'

export interface ComponentUpdateAdapterInterface {
  updateStructure(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateArmor(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateEngine(newValue: string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateGyro(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateHeatSink(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
  updateJumpJet(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult
}

export class ComponentUpdateAdapter implements ComponentUpdateAdapterInterface {
  /**
   * Update structure type
   */
  updateStructure(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult {
    console.log('[ComponentUpdateAdapter] Updating structure:', { newValue, currentStructure: currentConfig.structureType })
    
    const request: ComponentUpdateRequest = {
      componentType: 'structure',
      newValue,
      currentConfiguration: currentConfig
    }
    
    return ComponentUpdateService.updateComponent(request)
  }
  
  /**
   * Update armor type
   */
  updateArmor(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult {
    console.log('[ComponentUpdateAdapter] Updating armor:', { newValue, currentArmor: currentConfig.armorType })
    
    const request: ComponentUpdateRequest = {
      componentType: 'armor',
      newValue,
      currentConfiguration: currentConfig
    }
    
    return ComponentUpdateService.updateComponent(request)
  }
  
  /**
   * Update engine type
   */
  updateEngine(newValue: string, currentConfig: UnitConfiguration): ComponentUpdateResult {
    console.log('[ComponentUpdateAdapter] Updating engine:', { newValue, currentEngine: currentConfig.engineType })
    
    const request: ComponentUpdateRequest = {
      componentType: 'engine',
      newValue,
      currentConfiguration: currentConfig
    }
    
    return ComponentUpdateService.updateComponent(request)
  }
  
  /**
   * Update gyro type
   */
  updateGyro(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult {
    console.log('[ComponentUpdateAdapter] Updating gyro:', { newValue, currentGyro: currentConfig.gyroType })
    
    const request: ComponentUpdateRequest = {
      componentType: 'gyro',
      newValue,
      currentConfiguration: currentConfig
    }
    
    return ComponentUpdateService.updateComponent(request)
  }
  
  /**
   * Update heat sink type
   */
  updateHeatSink(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult {
    console.log('[ComponentUpdateAdapter] Updating heat sink:', { newValue, currentHeatSink: currentConfig.heatSinkType })
    
    const request: ComponentUpdateRequest = {
      componentType: 'heatSink',
      newValue,
      currentConfiguration: currentConfig
    }
    
    return ComponentUpdateService.updateComponent(request)
  }
  
  /**
   * Update jump jet type
   */
  updateJumpJet(newValue: ComponentConfiguration | string, currentConfig: UnitConfiguration): ComponentUpdateResult {
    console.log('[ComponentUpdateAdapter] Updating jump jet:', { newValue, currentJumpJet: currentConfig.jumpJetType })
    
    const request: ComponentUpdateRequest = {
      componentType: 'jumpJet',
      newValue,
      currentConfiguration: currentConfig
    }
    
    return ComponentUpdateService.updateComponent(request)
  }
}

// Export a singleton instance for use throughout the application
export const componentUpdateAdapter = new ComponentUpdateAdapter() 




