/**
 * Enhanced Critical Slots Display - Combines toolbar with critical slots display
 * and implements auto-mode reactive behavior
 */

import React, { useEffect, useRef } from 'react'
import { useUnit } from '../multiUnit/MultiUnitProvider'
import { CriticalSlotsToolbar, CriticalSlotsToolbarState } from './CriticalSlotsToolbar'
import { CriticalSlotsDisplay } from './CriticalSlotsDisplay'
import { UnallocatedEquipmentDisplay } from './UnallocatedEquipmentDisplay'
import { CriticalSlotsManagementService, CriticalSlotsOperationResult } from '../../utils/criticalSlots/CriticalSlotsManagementService'

export function EnhancedCriticalSlotsDisplay() {
  const { unit, unallocatedEquipment, selectedEquipmentId, removeEquipment } = useUnit()
  
  // Track previous equipment state for auto-mode triggers
  const prevUnallocatedRef = useRef<any[]>([])
  const prevSelectedRef = useRef<string | null>(null)
  
  // Get toolbar state from localStorage
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

  // Execute management operations and show results
  const executeOperation = (operation: () => CriticalSlotsOperationResult, operationName: string) => {
    if (!unit) {
      console.error(`[EnhancedCriticalSlotsDisplay] Cannot execute ${operationName}: no unit available`)
      return {
        success: false,
        message: `Cannot execute ${operationName}: no unit available`,
        slotsModified: 0
      }
    }

    try {
      console.log(`[EnhancedCriticalSlotsDisplay] Executing ${operationName} with unit:`, unit)
      
      const result = operation()
      
      console.log(`[EnhancedCriticalSlotsDisplay] ${operationName} result:`, result)
      
      if (result.success && result.slotsModified > 0) {
        // Show success notification (could be replaced with a toast system)
        console.log(`✅ ${result.message}`)
        
        // Force a re-render by updating a dummy state
        setForceUpdateTrigger(prev => prev + 1)
      } else if (!result.success) {
        // Show error notification
        console.error(`❌ ${result.message}`)
      } else {
        // Show info notification
        console.log(`ℹ️ ${result.message}`)
      }
      
      return result
    } catch (error) {
      console.error(`[EnhancedCriticalSlotsDisplay] Error executing ${operationName}:`, error)
      return {
        success: false,
        message: `Error executing ${operationName}: ${error}`,
        slotsModified: 0
      }
    }
  }

  // Force update trigger for UI refresh
  const [forceUpdateTrigger, setForceUpdateTrigger] = React.useState(0)

  // Manual action handlers
  const handleFillUnhittables = () => {
    if (!unit) return
    
    executeOperation(
      () => CriticalSlotsManagementService.fillUnhittables(unit),
      'Fill Unhittables'
    )
  }

  const handleCompact = () => {
    if (!unit) return
    
    executeOperation(
      () => CriticalSlotsManagementService.compact(unit),
      'Compact'
    )
  }

  const handleSort = () => {
    if (!unit) return
    
    executeOperation(
      () => CriticalSlotsManagementService.sort(unit),
      'Sort'
    )
  }

  const handleReset = () => {
    if (!unit) return
    
    const confirmReset = window.confirm(
      'Are you sure you want to reset all critical slots?\n\n' +
      'This will:\n' +
      '• Remove all allocated equipment\n' +
      '• Move equipment back to unallocated pool\n' +
      '• Keep system components (engine, gyro, etc.)\n\n' +
      'This action can be undone by manually re-allocating equipment.'
    )

    if (confirmReset) {
      executeOperation(
        () => CriticalSlotsManagementService.reset(unit),
        'Reset'
      )
    }
  }

  // Auto-mode reactive behavior
  useEffect(() => {
    if (!unit) return
    
    const currentToolbarState = getToolbarState()
    
    // Skip auto-actions if no auto modes are enabled
    if (!currentToolbarState.autoFillUnhittables && 
        !currentToolbarState.autoCompact && 
        !currentToolbarState.autoSort) {
      return
    }

    // Check if equipment state has changed
    const unallocatedChanged = JSON.stringify(unallocatedEquipment) !== JSON.stringify(prevUnallocatedRef.current)
    const selectedChanged = selectedEquipmentId !== prevSelectedRef.current

    if (unallocatedChanged || selectedChanged) {
      console.log('[EnhancedCriticalSlotsDisplay] Equipment state changed, checking auto-modes')
      
      // Small delay to allow React state to settle
      const timeoutId = setTimeout(() => {
        if (!unit) return // Double-check unit is still available
        
        // Execute auto-actions in sequence if enabled
        if (currentToolbarState.autoFillUnhittables) {
          const result = executeOperation(
            () => CriticalSlotsManagementService.fillUnhittables(unit),
            'Auto Fill Unhittables'
          )
          
          // Continue with next auto-action only if this one succeeded or did nothing
          if (result.success) {
            if (currentToolbarState.autoCompact) {
              const compactResult = executeOperation(
                () => CriticalSlotsManagementService.compact(unit),
                'Auto Compact'
              )
              
              if (compactResult.success && currentToolbarState.autoSort) {
                executeOperation(
                  () => CriticalSlotsManagementService.sort(unit),
                  'Auto Sort'
                )
              }
            } else if (currentToolbarState.autoSort) {
              executeOperation(
                () => CriticalSlotsManagementService.sort(unit),
                'Auto Sort'
              )
            }
          }
        } else if (currentToolbarState.autoCompact) {
          const compactResult = executeOperation(
            () => CriticalSlotsManagementService.compact(unit),
            'Auto Compact'
          )
          
          if (compactResult.success && currentToolbarState.autoSort) {
            executeOperation(
              () => CriticalSlotsManagementService.sort(unit),
              'Auto Sort'
            )
          }
        } else if (currentToolbarState.autoSort) {
          executeOperation(
            () => CriticalSlotsManagementService.sort(unit),
            'Auto Sort'
          )
        }
      }, 100)

      return () => clearTimeout(timeoutId)
    }

    // Update refs for next comparison
    prevUnallocatedRef.current = [...unallocatedEquipment]
    prevSelectedRef.current = selectedEquipmentId
  }, [unallocatedEquipment, selectedEquipmentId, unit, forceUpdateTrigger])

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar - Fixed at top */}
      <div className="flex-shrink-0">
        <CriticalSlotsToolbar
          onFillUnhittables={handleFillUnhittables}
          onCompact={handleCompact}
          onSort={handleSort}
          onReset={handleReset}
        />
      </div>

      {/* Main Content Grid - Critical Slots + Unallocated Equipment */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
          {/* Critical Slots - Takes up 2 columns */}
          <div className="xl:col-span-2">
            <CriticalSlotsDisplay />
          </div>

          {/* Unallocated Equipment - Takes up 1 column */}
          <div className="xl:col-span-1">
            <UnallocatedEquipmentDisplay />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to get current toolbar state (useful for other components)
 */
export function useCriticalSlotsToolbarState(): CriticalSlotsToolbarState {
  const [toolbarState, setToolbarState] = React.useState<CriticalSlotsToolbarState>({
    autoFillUnhittables: false,
    autoCompact: false,
    autoSort: false
  })

  React.useEffect(() => {
    const loadState = () => {
      try {
        const saved = localStorage.getItem('criticalSlotsToolbar')
        if (saved) {
          setToolbarState(JSON.parse(saved))
        }
      } catch (error) {
        console.warn('Failed to load critical slots toolbar state:', error)
      }
    }

    loadState()
    
    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'criticalSlotsToolbar') {
        loadState()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return toolbarState
}
