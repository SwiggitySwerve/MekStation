/**
 * Critical Slots Toolbar - Provides auto-mode toggles and manual action buttons
 * for managing critical slot allocation
 */

import React from 'react'
import { useUnit } from '../multiUnit/MultiUnitProvider'

export interface CriticalSlotsToolbarState {
  autoFillUnhittables: boolean
  autoCompact: boolean
  autoSort: boolean
}

interface CriticalSlotsToolbarProps {
  onFillUnhittables: () => void
  onCompact: () => void
  onSort: () => void
  onReset: () => void
}

export function CriticalSlotsToolbar({
  onFillUnhittables,
  onCompact,
  onSort,
  onReset
}: CriticalSlotsToolbarProps) {
  const { unit } = useUnit()

  // Get toolbar state from localStorage with defaults
  const getToolbarState = (): CriticalSlotsToolbarState => {
    try {
      const saved = localStorage.getItem('criticalSlotsToolbar')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.warn('Failed to load critical slots toolbar state:', error)
    }
    
    return {
      autoFillUnhittables: false,
      autoCompact: false,
      autoSort: false
    }
  }

  const [toolbarState, setToolbarState] = React.useState<CriticalSlotsToolbarState>(getToolbarState)

  // Save state to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem('criticalSlotsToolbar', JSON.stringify(toolbarState))
    } catch (error) {
      console.warn('Failed to save critical slots toolbar state:', error)
    }
  }, [toolbarState])

  // Toggle handlers
  const handleToggle = (key: keyof CriticalSlotsToolbarState) => {
    setToolbarState(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Button styling helpers
  const getToggleButtonClass = (isActive: boolean): string => {
    const baseClass = "px-3 py-1.5 text-sm font-medium border rounded transition-colors duration-200"
    
    if (isActive) {
      return `${baseClass} bg-blue-600 text-white border-blue-500 hover:bg-blue-700 shadow-md`
    } else {
      return `${baseClass} bg-gray-600 text-gray-300 border-gray-500 hover:bg-gray-500 hover:text-white`
    }
  }

  const getActionButtonClass = (): string => {
    return "px-3 py-1.5 text-sm font-medium bg-gray-700 text-gray-200 border border-gray-600 rounded hover:bg-gray-600 hover:text-white transition-colors duration-200"
  }

  const getResetButtonClass = (): string => {
    return "px-3 py-1.5 text-sm font-medium bg-red-600 text-white border border-red-500 rounded hover:bg-red-700 transition-colors duration-200"
  }

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        
        {/* Left side: Auto-mode toggles */}
        <div className="flex items-center space-x-3">
          <span className="text-gray-300 text-sm font-medium mr-2">Auto:</span>
          
          <button
            onClick={() => handleToggle('autoFillUnhittables')}
            className={getToggleButtonClass(toolbarState.autoFillUnhittables)}
            title="Automatically fill empty slots with unhittable components (Endo Steel, Ferro-Fibrous) when equipment changes"
          >
            Auto Fill Unhittables
          </button>
          
          <button
            onClick={() => handleToggle('autoCompact')}
            className={getToggleButtonClass(toolbarState.autoCompact)}
            title="Automatically compact equipment to remove gaps when equipment changes"
          >
            Auto Compact
          </button>
          
          <button
            onClick={() => handleToggle('autoSort')}
            className={getToggleButtonClass(toolbarState.autoSort)}
            title="Automatically sort equipment by type and priority when equipment changes"
          >
            Auto Sort
          </button>
        </div>

        {/* Right side: Manual action buttons */}
        <div className="flex items-center space-x-3">
          <span className="text-gray-300 text-sm font-medium mr-2">Actions:</span>
          
          <button
            onClick={onFillUnhittables}
            className={getActionButtonClass()}
            title="Fill empty slots with unhittable components now"
          >
            Fill
          </button>
          
          <button
            onClick={onCompact}
            className={getActionButtonClass()}
            title="Compact equipment to remove gaps now"
          >
            Compact
          </button>
          
          <button
            onClick={onSort}
            className={getActionButtonClass()}
            title="Sort equipment by type and priority now"
          >
            Sort
          </button>
          
          <button
            onClick={onReset}
            className={getResetButtonClass()}
            title="Remove all non-system components and return to base configuration"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Status indicator for active auto modes */}
      {(toolbarState.autoFillUnhittables || toolbarState.autoCompact || toolbarState.autoSort) && (
        <div className="mt-2 text-xs text-blue-400">
          Active auto-modes: {[
            toolbarState.autoFillUnhittables && 'Fill Unhittables',
            toolbarState.autoCompact && 'Compact',  
            toolbarState.autoSort && 'Sort'
          ].filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  )
}
