/**
 * System Component Controls - Comprehensive mech configuration
 * Dark theme component with all mech component selections
 */

import React, { useCallback, useMemo } from 'react'
import { useMultiUnit } from '../multiUnit/MultiUnitProvider'
import { UnitConfigurationBuilder } from '../../utils/criticalSlots/UnitConfigurationBuilder'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'
import { ComponentConfiguration } from '../../types/componentConfiguration'
import { EngineType, GyroType, StructureType, ArmorType, HeatSinkType } from '../../types'
import { 
  getAvailableStructureTypes, 
  getAvailableArmorTypes, 
  getAvailableEngineTypes,
  getAvailableHeatSinkTypes,
  getAvailableGyroTypes
} from '../../utils/componentOptionFiltering'
import { 
  JumpJetType, 
  JUMP_JET_VARIANTS,
  getAvailableJumpJetTypes,
  validateJumpJetConfiguration,
  calculateTotalJumpJetWeight,
  calculateTotalJumpJetCrits,
  calculateJumpJetHeat,
  getMaxAllowedJumpMP
} from '../../utils/jumpJetCalculations'

export function SystemComponentControls(): React.ReactElement | null {
  const { 
    unit, 
    validation, 
    updateConfiguration,
    changeEngine,
    changeGyro,
    changeStructure,
    changeArmor,
    changeHeatSink,
    changeJumpJet,
    removeEquipment, 
    addEquipmentToUnit 
  } = useMultiUnit()
  
  // Get config before early return (safe because we'll guard against null below)
  const config = unit?.getConfiguration()
  
  // Get available options for dropdowns (all hooks MUST come before any conditional returns)
  const structureOptions = useMemo(() => config ? getAvailableStructureTypes(config) : [], [config])
  const armorOptions = useMemo(() => config ? getAvailableArmorTypes(config) : [], [config])
  const engineOptions = useMemo(() => config ? getAvailableEngineTypes(config) : [], [config])
  const gyroOptions = useMemo(() => config ? getAvailableGyroTypes(config) : [], [config])
  const heatSinkOptions = useMemo(() => config ? getAvailableHeatSinkTypes(config) : [], [config])
  const jumpJetOptions = useMemo(() => {
    if (!config) return []
    const techBase = config.techBase === 'Mixed' ? 'Inner Sphere' : (config.techBase || 'Inner Sphere')
    return getAvailableJumpJetTypes(techBase as 'Inner Sphere' | 'Clan')
  }, [config])
  
  // Jump jet calculations
  // TODO: These calculations need to be updated to extract proper parameters from config
  const jumpJetValidation = useMemo(() => {
    if (!config) return { isValid: true, errors: [], warnings: [], maxJumpMP: 0 }
    return { isValid: true, errors: [], warnings: [], maxJumpMP: Math.floor(config.tonnage / 10) }
  }, [config])
  // const jumpJetWeight = useMemo(() => config ? calculateTotalJumpJetWeight(config) : 0, [config])
  // const jumpJetCrits = useMemo(() => config ? calculateTotalJumpJetCrits(config) : 0, [config])
  // const jumpJetHeat = useMemo(() => config ? calculateJumpJetHeat(config) : 0, [config])
  // const maxAllowedJumpMP = useMemo(() => config ? getMaxAllowedJumpMP(config) : 0, [config])
  
  // Add null check for unit AFTER all hooks
  if (!unit || !config) {
    return <div>Loading...</div>
  }
  
  // Handle jump jet type - can be ComponentConfiguration object or string
  let jumpJetTypeName: string = 'Standard Jump Jet'
  if (config.jumpJetType) {
    jumpJetTypeName = config.jumpJetType
  }
  
  // Ensure we have a valid jump jet type
  const validJumpJetNames = jumpJetOptions.map(opt => opt.name);
  if (!validJumpJetNames.includes(jumpJetTypeName)) {
    jumpJetTypeName = jumpJetOptions[0]?.name || 'Standard Jump Jets'
  }
  
  const jumpJetAllocation = { [jumpJetTypeName]: config.jumpMP || 0 }
  
  // Generate tonnage options (20-100 in 5-ton increments)
  const tonnageOptions = Array.from({ length: 17 }, (_, i) => 20 + (i * 5))
  
  // Calculate maximum walk MP for current tonnage
  const maxWalkMP = Math.floor(400 / config.tonnage)
  
  // Helper function to extract component type
  const getComponentType = (component: ComponentConfiguration | string | undefined): string => {
    if (!component) return 'Standard'
    if (typeof component === 'string') return component
    return component.type || 'Standard'
  }
  
  // Helper function to create component configuration
  const createComponentConfig = (type: string, techBase: string): ComponentConfiguration => ({
    type,
    techBase: techBase as 'Inner Sphere' | 'Clan'
  })
  
  // Structure dropdown change handler
  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('[UI_DEBUG] 🏗️ Structure dropdown change:', {
      selectedValue: e.target.value,
      currentConfig: config.structureType,
      techBase: config.techBase
    })
    changeStructure(e.target.value as StructureType)
  }
  
  // Armor dropdown change handler
  const handleArmorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('[UI_DEBUG] 🛡️ Armor dropdown change:', {
      selectedValue: e.target.value,
      currentConfig: config.armorType,
      techBase: config.techBase
    })
    changeArmor(e.target.value as ArmorType)
  }
  
  // Heat sink dropdown change handler
  const handleHeatSinkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeHeatSink(e.target.value as HeatSinkType)
  }
  
  // Jump jet dropdown change handler
  const handleJumpJetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeJumpJet(e.target.value)
  }
  
  // Engine rating validation
  const engineValidation = UnitConfigurationBuilder.validateEngineRating(
    config.tonnage, 
    config.walkMP
  )

  return (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
      <h2 className="text-white text-base font-bold mb-3">Mech Configuration</h2>
      
      {/* Condensed Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column: Chassis */}
        <div className="bg-gray-900 border border-gray-600 p-3 rounded">
          <h3 className="text-gray-300 text-sm font-medium mb-2 border-b border-gray-600 pb-1">Chassis</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-gray-300 text-xs">Tonnage:</label>
              <select 
                value={config.tonnage} 
                onChange={(e) => {
                  const newValue = parseInt(e.target.value) || 0
                  const clampedValue = Math.min(Math.max(newValue, 0), 100) // Assuming max tonnage is 100
                  updateConfiguration({ ...config, tonnage: clampedValue })
                }}
                className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
              >
                {tonnageOptions.map(tonnage => (
                  <option key={tonnage} value={tonnage}>{tonnage}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-gray-300 text-xs">Tech Base:</label>
              <select
                value={config.techBase}
                onChange={(e) => {
                  const newTechBase = e.target.value as 'Inner Sphere' | 'Clan'
                  updateConfiguration({ ...config, techBase: newTechBase })
                }}
                className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
              >
                <option value="Inner Sphere">Inner Sphere</option>
                <option value="Clan">Clan</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-gray-300 text-xs">Structure:</label>
              <select 
                value={getComponentType(config.structureType)} 
                onChange={handleStructureChange}
                className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
              >
                {structureOptions.map(option => (
                  <option key={option.type} value={option.type}>{option.type}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-gray-300 text-xs">Engine:</label>
              <select 
                value={(() => {
                  // Handle both string and ComponentConfiguration engine types
                  if (typeof config.engineType === 'string') {
                    // Find matching option for the string type
                    const matchingOption = engineOptions.find(option => option.type === config.engineType);
                    return matchingOption ? JSON.stringify(matchingOption) : JSON.stringify(engineOptions[0]);
                  }
                  return JSON.stringify(config.engineType);
                })()}
                onChange={e => {
                  const selected = JSON.parse(e.target.value);
                  changeEngine(selected);
                }}
                className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
              >
                {engineOptions.map(option => (
                  <option key={option.type + option.techBase} value={JSON.stringify(option)}>{option.type}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-gray-300 text-xs">Gyro:</label>
              <select 
                value={getComponentType(config.gyroType)} 
                onChange={e => {
                  changeGyro(e.target.value as GyroType)
                }}
                className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
              >
                {gyroOptions.map(option => (
                  <option key={option.type} value={option.type}>{option.type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Middle Column: Movement & Heat Sinks */}
        <div className="space-y-3">
          {/* Movement */}
          <div className="bg-gray-900 border border-gray-600 p-3 rounded">
            <h3 className="text-gray-300 text-sm font-medium mb-2 border-b border-gray-600 pb-1">Movement</h3>
            <div className="space-y-2">
              {/* Column Headers */}
              <div className="grid grid-cols-3 gap-2 items-center text-xs">
                <div></div>
                <div className="text-gray-400 text-center">Base</div>
                <div className="text-gray-400 text-center">Final</div>
              </div>
              
              {/* Walk MP */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-gray-300 text-xs">Walk MP:</label>
                <input
                  type="number"
                  min="1"
                  max={maxWalkMP}
                  value={config.walkMP}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0
                    const clampedValue = Math.min(Math.max(newValue, 0), maxWalkMP)
                    updateConfiguration({ ...config, walkMP: clampedValue })
                  }}
                  className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500 text-center"
                />
                <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center text-xs">
                  {config.walkMP}
                </div>
              </div>

              {/* Run MP */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-gray-300 text-xs">Run MP:</label>
                <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center text-xs">
                  {config.runMP}
                </div>
                <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center text-xs">
                  {config.runMP}
                </div>
              </div>

              {/* Jump/UMU MP */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-gray-300 text-xs">Jump/UMU MP:</label>
                <input
                  type="number"
                  min="0"
                  max={jumpJetValidation.maxJumpMP}
                  value={config.jumpMP}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0
                    const clampedValue = Math.min(Math.max(newValue, 0), jumpJetValidation.maxJumpMP)
                    updateConfiguration({ ...config, jumpMP: clampedValue })
                  }}
                  className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500 text-center"
                />
                <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center text-xs">
                  {config.jumpMP}
                </div>
              </div>

              {/* Jump Type */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-gray-300 text-xs">Jump Type:</label>
                <select 
                  value={jumpJetTypeName}
                  onChange={handleJumpJetChange}
                  className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500 col-span-2"
                >
                  {jumpJetOptions.map(option => (
                    <option key={option.type} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jump Jet Stats */}
              <div className="grid grid-cols-3 gap-2 items-center text-xs">
                <span className="text-gray-400">Weight:</span>
                <span className="text-center text-white">--t</span>
                <span className="text-gray-400">Crits: --</span>
              </div>

              {/* Movement Limits */}
              <div className="grid grid-cols-3 gap-2 items-center text-xs">
                <span className="text-gray-400">Max Jump MP:</span>
                <span className="text-center text-white">{jumpJetValidation.maxJumpMP}</span>
                <span className="text-gray-400">Heat: --</span>
              </div>
              
              {/* Engine Rating (moved here for context) */}
              <div className="grid grid-cols-2 gap-2 items-center pt-2 border-t border-gray-600">
                <label className="text-gray-300 text-xs">Engine Rating:</label>
                <div className={`bg-gray-700 p-1 rounded border text-center text-xs
                               ${!engineValidation.isValid ? 'border-red-500 text-red-300' : 'border-gray-600 text-white'}`}>
                  {config.engineRating}
                </div>
              </div>
            </div>
          </div>

          {/* Heat Sinks */}
          <div className="bg-gray-900 border border-gray-600 p-3 rounded">
            <h3 className="text-gray-300 text-sm font-medium mb-2 border-b border-gray-600 pb-1">Heat Sinks</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-gray-300 text-xs">Type:</label>
                <select 
                  value={getComponentType(config.heatSinkType)} 
                  onChange={handleHeatSinkChange}
                  className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
                >
                  {heatSinkOptions.map(option => (
                    <option key={option.type} value={option.type}>{option.type}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-4 gap-1 items-center">
                <label className="text-gray-300 text-xs col-span-2">Number:</label>
                <input
                  type="number"
                  min="10"
                  value={config.totalHeatSinks}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 0
                    const clampedValue = Math.max(newValue, 0)
                    updateConfiguration({ ...config, totalHeatSinks: clampedValue })
                  }}
                  className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
                />
                <div className="text-gray-400 text-xs text-center">
                  <span className="text-gray-300">Engine Free:</span>
                  <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center">
                    {config.internalHeatSinks}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-gray-300 text-xs">Weight Free:</label>
                <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center text-xs">
                  {config.externalHeatSinks}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-gray-300 text-xs">Total Dissipation:</label>
                <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center text-xs">
                  {getComponentType(config.heatSinkType) === 'Double' || getComponentType(config.heatSinkType) === 'Double (Clan)' 
                    ? config.totalHeatSinks * 2 
                    : config.totalHeatSinks}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-gray-300 text-xs">Total Equipment Heat:</label>
                <div className="bg-gray-700 p-1 rounded border border-gray-600 text-white text-center text-xs">
                  0
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="riscHeatSink"
                  className="text-blue-500 text-xs"
                />
                <label htmlFor="riscHeatSink" className="text-gray-300 text-xs">
                  RISC Heat Sink Override Kit
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Armor & Status */}
        <div className="space-y-3">
          {/* Armor */}
          <div className="bg-gray-900 border border-gray-600 p-3 rounded">
            <h3 className="text-gray-300 text-sm font-medium mb-2 border-b border-gray-600 pb-1">Armor</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="text-gray-300 text-xs">Armor Type:</label>
                <select 
                  value={getComponentType(config.armorType)} 
                  onChange={handleArmorChange}
                  className="bg-gray-700 text-white text-xs p-1 rounded border border-gray-600 focus:border-blue-500"
                >
                  {armorOptions.map(option => (
                    <option key={option.type} value={option.type}>{option.type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Configuration Status */}
          <div className="bg-gray-900 border border-gray-600 p-3 rounded">
            <h3 className="text-gray-300 text-sm font-medium mb-2 border-b border-gray-600 pb-1">Summary</h3>
            <div className="space-y-1 text-xs">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-blue-400">Tonnage:</span>
                <span className="text-white">{config.tonnage}t</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-green-400">Tech Base:</span>
                <span className="text-white">{config.techBase === 'Inner Sphere' ? 'IS' : 'Clan'}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-orange-400">Engine:</span>
                <span className="text-white">{config.engineRating}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-purple-400">Movement:</span>
                <span className="text-white">{config.walkMP}/{config.runMP}/{config.jumpMP}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-cyan-400">Heat Sinks:</span>
                <span className="text-white">{config.totalHeatSinks}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-gray-400">Status:</span>
                <span className={`${(validation?.isValid && engineValidation.isValid) ? 'text-green-400' : 'text-red-400'}`}>
                  {(validation?.isValid && engineValidation.isValid) ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {(!validation?.isValid || !engineValidation.isValid || !jumpJetValidation.isValid) && (
            <div className="bg-red-900 border border-red-600 p-2 rounded">
              <h4 className="text-red-200 text-xs font-medium mb-1">Errors:</h4>
              <ul className="text-red-300 text-xs space-y-1">
                {(validation?.errors || []).map((error: string, index: number) => (
                  <li key={`validation-${index}`}>• {error}</li>
                ))}
                {engineValidation.errors.map((error: string, index: number) => (
                  <li key={`engine-${index}`}>• {error}</li>
                ))}
                {jumpJetValidation.errors.map((error: string, index: number) => (
                  <li key={`jumpjet-${index}`}>• Jump Jets: {error}</li>
                ))}
              </ul>
            </div>
          )}

          {((validation?.warnings && validation.warnings.length > 0) || jumpJetValidation.warnings.length > 0) && (
            <div className="bg-yellow-900 border border-yellow-600 p-2 rounded">
              <h4 className="text-yellow-200 text-xs font-medium mb-1">Warnings:</h4>
              <ul className="text-yellow-300 text-xs space-y-1">
                {(validation?.warnings || []).map((warning: string, index: number) => (
                  <li key={`warning-${index}`}>• {warning}</li>
                ))}
                {jumpJetValidation.warnings.map((warning: string, index: number) => (
                  <li key={`jumpjet-warn-${index}`}>• Jump Jets: {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
