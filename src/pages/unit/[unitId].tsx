/**
 * Individual Unit Page - Loads a specific unit by chassis+model ID
 * Demonstrates the new chassis+model persistence system
 * URL format: /unit/annihilator-anh-1e
 */

import React from 'react'
import { useRouter } from 'next/router'
import { SingleUnitProvider, useSingleUnit } from '../../components/unit/SingleUnitProvider'
import { UnitPersistenceService, parseUnitId } from '../../utils/unit/UnitPersistenceService'
import { getComponentType } from '../../utils/componentTypeUtils';
import { EngineType } from '../../types/systemComponents';
import { ComponentConfiguration } from '../../types/componentConfiguration';

// Component that uses the unit context
function UnitDisplay() {
  const {
    unit,
    chassis,
    model,
    unitId,
    summary,
    validation,
    updateConfiguration,
    saveUnit,
    autoSave,
    setAutoSave
  } = useSingleUnit()
  
  if (!unit) {
    return <div>Loading unit...</div>
  }
  
  const config = unit.getConfiguration()
  const unitSummary = unit.getSummary()
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {chassis} {model}
          </h1>
          <div className="text-slate-400 space-x-4">
            <span>Unit ID: {unitId}</span>
            <span>Tonnage: {config.tonnage} tons</span>
            <span>Tech Base: {config.techBase}</span>
          </div>
        </div>
        
        {/* Auto-save controls */}
        <div className="mb-6 p-4 bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Auto-Save</h3>
              <p className="text-slate-400 text-sm">
                Automatically save changes to localStorage
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="mr-2"
                />
                Enable Auto-Save
              </label>
              <button
                onClick={saveUnit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Save Now
              </button>
            </div>
          </div>
        </div>
        
        {/* Unit Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Basic Info */}
          <div className="p-6 bg-slate-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Chassis:</span>
                <span>{config.chassis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span>{config.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Type:</span>
                <span>{config.unitType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tech Base:</span>
                <span>{config.techBase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tonnage:</span>
                <span>{config.tonnage} tons</span>
              </div>
            </div>
          </div>
          
          {/* System Components */}
          <div className="p-6 bg-slate-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">System Components</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Engine:</span>
                <span>{config.engineType} {config.engineRating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gyro:</span>
                <span>{getComponentType(config.gyroType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Structure:</span>
                <span>{getComponentType(config.structureType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Armor:</span>
                <span>{getComponentType(config.armorType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Heat Sinks:</span>
                <span>{config.totalHeatSinks} {getComponentType(config.heatSinkType)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Movement */}
        <div className="p-6 bg-slate-800 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Movement Profile</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{config.walkMP}</div>
              <div className="text-slate-400">Walk MP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{config.runMP}</div>
              <div className="text-slate-400">Run MP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{config.jumpMP}</div>
              <div className="text-slate-400">Jump MP</div>
            </div>
          </div>
        </div>
        
        {/* Unit Summary */}
        <div className="p-6 bg-slate-800 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Unit Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold">{unitSummary.totalSlots}</div>
              <div className="text-slate-400 text-sm">Total Slots</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-400">{unitSummary.occupiedSlots}</div>
              <div className="text-slate-400 text-sm">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{unitSummary.availableSlots}</div>
              <div className="text-slate-400 text-sm">Available</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{unitSummary.unallocatedEquipment}</div>
              <div className="text-slate-400 text-sm">Unallocated</div>
            </div>
          </div>
        </div>
        
        {/* Weight Analysis */}
        <div className="p-6 bg-slate-800 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Weight Analysis</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Weight:</span>
              <span>{unitSummary.totalWeight.toFixed(2)} tons</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Remaining:</span>
              <span className={`${
                config.tonnage - unitSummary.totalWeight >= 0 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {(config.tonnage - unitSummary.totalWeight).toFixed(2)} tons
              </span>
            </div>
            
            {/* Weight bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Weight Usage</span>
                <span>{((unitSummary.totalWeight / config.tonnage) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    unitSummary.totalWeight <= config.tonnage 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (unitSummary.totalWeight / config.tonnage) * 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Configuration Editor */}
        <div className="p-6 bg-slate-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Quick Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Chassis */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Chassis
              </label>
              <input
                type="text"
                value={config.chassis}
                onChange={(e) => updateConfiguration({
                  ...config,
                  chassis: e.target.value
                })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100"
              />
            </div>
            
            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Model
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => updateConfiguration({
                  ...config,
                  model: e.target.value
                })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100"
              />
            </div>
            
            {/* Tonnage */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Tonnage
              </label>
              <select
                value={config.tonnage}
                onChange={(e) => updateConfiguration({
                  ...config,
                  tonnage: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100"
              >
                {[20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map(ton => (
                  <option key={ton} value={ton}>{ton} tons</option>
                ))}
              </select>
            </div>
            
            {/* Engine Type */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Engine Type
              </label>
              <select
                value={config.engineType}
                onChange={(e) => updateConfiguration({
                  ...config,
                  engineType: e.target.value as EngineType
                })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100"
              >
                <option value="Standard">Standard</option>
                <option value="XL">XL</option>
                <option value="Light">Light</option>
                <option value="XXL">XXL</option>
                <option value="Compact">Compact</option>
              </select>
            </div>
            
            {/* Structure Type */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Structure Type
              </label>
              <select
                value={getComponentType(config.structureType)}
                onChange={(e) => {
                  // Use safe type assertion here since we know the component shapes
                  const newType = e.target.value;
                  const current = config.structureType;
                  const updated = typeof current === 'string' 
                    ? newType 
                    : { ...(current as ComponentConfiguration), type: newType };
                  
                  updateConfiguration({
                    ...config,
                    structureType: updated as ComponentConfiguration
                  });
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100"
              >
                <option value="Standard">Standard</option>
                <option value="Endo Steel">Endo Steel</option>
                <option value="Endo Steel (Clan)">Endo Steel (Clan)</option>
                <option value="Composite">Composite</option>
                <option value="Reinforced">Reinforced</option>
              </select>
            </div>
            
            {/* Armor Type */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Armor Type
              </label>
              <select
                value={getComponentType(config.armorType)}
                onChange={(e) => {
                  const newType = e.target.value;
                  const current = config.armorType;
                  const updated = typeof current === 'string'
                    ? newType
                    : { ...(current as ComponentConfiguration), type: newType };

                  updateConfiguration({
                    ...config,
                    armorType: updated as ComponentConfiguration
                  });
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100"
              >
                <option value="Standard">Standard</option>
                <option value="Ferro-Fibrous">Ferro-Fibrous</option>
                <option value="Ferro-Fibrous (Clan)">Ferro-Fibrous (Clan)</option>
                <option value="Light Ferro-Fibrous">Light Ferro-Fibrous</option>
                <option value="Heavy Ferro-Fibrous">Heavy Ferro-Fibrous</option>
                <option value="Stealth">Stealth</option>
                <option value="Hardened">Hardened</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main page component
export default function UnitPage() {
  const router = useRouter()
  const { unitId } = router.query
  
  if (!unitId || typeof unitId !== 'string') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Unit ID</h1>
          <p className="text-slate-400 mb-4">
            Unit ID must be in format: chassis-model (e.g. annihilator-anh-1e)
          </p>
        </div>
      </div>
    )
  }
  
  // Parse unit ID to get chassis and model
  const { chassis, model } = parseUnitId(unitId)
  
  return (
    <SingleUnitProvider
      unitId={unitId}
      autoSave={true}
      saveDelay={1000}
      onUnitLoad={(result) => {
        console.log('Unit loaded:', result)
      }}
      onSave={(savedUnitId) => {
        console.log('Unit saved:', savedUnitId)
        // Update URL if unit ID changed
        if (savedUnitId !== unitId) {
          router.replace(`/unit/${savedUnitId}`, undefined, { shallow: true })
        }
      }}
      onError={(error) => {
        console.error('Unit error:', error)
      }}
    >
      <UnitDisplay />
    </SingleUnitProvider>
  )
}
