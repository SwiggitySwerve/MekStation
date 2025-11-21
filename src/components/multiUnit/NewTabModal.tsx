/**
 * New Tab Modal - Modal for creating new tabs with various options
 */

import React, { useState } from 'react'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'
import { useMultiUnit } from './MultiUnitProvider'

interface NewTabModalProps {
  onClose: () => void
  onCreate: (name?: string, config?: UnitConfiguration) => void
}

type CreationMode = 'new' | 'copy' | 'import'

// Pre-defined unit templates
const UNIT_TEMPLATES: Array<{
  name: string
  tonnage: number
  description: string
  config: Partial<UnitConfiguration>
}> = [
  {
    name: 'Light Mech',
    tonnage: 25,
    description: '25-ton light BattleMech',
    config: {
      tonnage: 25,
      walkMP: 6,
      engineRating: 150,
      runMP: 9
    }
  },
  {
    name: 'Medium Mech',
    tonnage: 50,
    description: '50-ton medium BattleMech (default)',
    config: {
      tonnage: 50,
      walkMP: 4,
      engineRating: 200,
      runMP: 6
    }
  },
  {
    name: 'Heavy Mech',
    tonnage: 70,
    description: '70-ton heavy BattleMech',
    config: {
      tonnage: 70,
      walkMP: 3,
      engineRating: 210,
      runMP: 4
    }
  },
  {
    name: 'Assault Mech',
    tonnage: 100,
    description: '100-ton assault BattleMech',
    config: {
      tonnage: 100,
      walkMP: 3,
      engineRating: 300,
      runMP: 4
    }
  }
]

export function NewTabModal({ onClose, onCreate }: NewTabModalProps) {
  const { tabs, activeTab } = useMultiUnit()
  const [creationMode, setCreationMode] = useState<CreationMode>('new')
  const [selectedTemplate, setSelectedTemplate] = useState(1) // Default to Medium Mech
  const [customName, setCustomName] = useState('')
  const [importData, setImportData] = useState('')
  
  // Handle creation based on selected mode
  const handleCreate = () => {
    switch (creationMode) {
      case 'new':
        const template = UNIT_TEMPLATES[selectedTemplate]
        const newConfig: UnitConfiguration = {
          // Generate chassis and model for template
          chassis: 'Custom',
          model: template.name.replace(' ', '-'),
          tonnage: template.config.tonnage || 50,
          unitType: 'BattleMech',
          techBase: 'Inner Sphere',
          walkMP: template.config.walkMP || 4,
          engineRating: template.config.engineRating || 200,
          runMP: template.config.runMP || 6,
          engineType: 'Standard',
          gyroType: { type: 'Standard', techBase: 'Inner Sphere' } as any,
          structureType: { type: 'Standard', techBase: 'Inner Sphere' } as any,
          armorType: { type: 'Standard', techBase: 'Inner Sphere' } as any,
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
          heatSinkType: { type: 'Single', techBase: 'Inner Sphere' } as any,
          totalHeatSinks: 10,
          internalHeatSinks: 8,
          externalHeatSinks: 2,
          enhancements: [],
          jumpMP: 0,
          jumpJetType: 'Standard Jump Jet',
          jumpJetCounts: {},
          hasPartialWing: false,
          mass: template.config.tonnage || 50
        }
        
        const name = customName.trim() || template.name
        onCreate(name, newConfig)
        break
        
      case 'copy':
        if (activeTab) {
          const copyConfig = activeTab.unitManager.getConfiguration()
          const copyName = customName.trim() || `${activeTab.name} Copy`
          onCreate(copyName, copyConfig)
        }
        break
        
      case 'import':
        try {
          const parsedConfig = JSON.parse(importData)
          const importName = customName.trim() || 'Imported Mech'
          onCreate(importName, parsedConfig)
        } catch (error) {
          alert('Invalid JSON data. Please check your import data and try again.')
          return
        }
        break
    }
  }
  
  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && creationMode !== 'import') {
      handleCreate()
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-xl font-bold text-slate-100 mb-4">Create New Unit</h2>
        
        {/* Creation Mode Selection */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setCreationMode('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                creationMode === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              🆕 New Unit
            </button>
            <button
              onClick={() => setCreationMode('copy')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                creationMode === 'copy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              disabled={!activeTab}
            >
              📋 Copy Current
            </button>
            <button
              onClick={() => setCreationMode('import')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                creationMode === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              📥 Import Data
            </button>
          </div>
        </div>
        
        {/* Unit Name Input */}
        <div className="mb-4">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Unit Name
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={
              creationMode === 'new' ? UNIT_TEMPLATES[selectedTemplate]?.name :
              creationMode === 'copy' ? `${activeTab?.name || 'Unit'} Copy` :
              'Imported Mech'
            }
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        
        {/* Mode-specific Content */}
        {creationMode === 'new' && (
          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {UNIT_TEMPLATES.map((template, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTemplate(index)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedTemplate === index
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium text-slate-200">{template.name}</div>
                  <div className="text-sm text-slate-400">{template.description}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {template.tonnage}t • {template.config.walkMP}/{template.config.runMP} MP
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {creationMode === 'copy' && activeTab && (
          <div className="mb-6">
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <h3 className="font-medium text-slate-200 mb-2">Copying from: {activeTab.name}</h3>
              <div className="text-sm text-slate-400">
                {activeTab.unitManager.getConfiguration().tonnage}-ton{' '}
                {activeTab.unitManager.getConfiguration().techBase} BattleMech
              </div>
            </div>
          </div>
        )}
        
        {creationMode === 'import' && (
          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Unit Configuration JSON
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your unit configuration JSON here..."
              className="w-full h-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
            />
            <div className="text-xs text-slate-500 mt-1">
              Paste a valid UnitConfiguration JSON object
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creationMode === 'import' && !importData.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 transition-colors"
          >
            Create Unit
          </button>
        </div>
      </div>
    </div>
  )
}
