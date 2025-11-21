/**
 * Unit Action Buttons Component
 * 
 * Provides navigation controls, export functionality, and tab management
 * for the BattleTech unit detail view.
 * 
 * Phase 4: Component Modularization - Day 17
 * Extracted from UnitDetail.tsx (924 lines → focused components)
 */

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { FullUnit } from '../../types'
import { exportUnit, downloadUnit } from '../../utils/unitExportImportProper'

interface UnitActionButtonsProps {
  unit: FullUnit
  activeTab: TabName
  onTabChange: (tab: TabName) => void
  availableTabs: Array<{ name: TabName; label: string; disabled?: boolean }>
}

type TabName = "Overview" | "Armament" | "Criticals" | "Armor" | "Fluff" | "Analysis"

export const UnitActionButtons: React.FC<UnitActionButtonsProps> = ({ 
  unit, 
  activeTab, 
  onTabChange, 
  availableTabs 
}) => {
  const router = useRouter()
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Safe data extraction
  const uData = unit.data || {}
  const chassis = uData.chassis || unit.chassis || 'Unknown'
  const model = uData.model || unit.model || 'Unknown'

  // Handle export functionality
  const handleExport = (format: 'json' | 'mtf' | 'auto') => {
    // Convert FullUnit to EditableUnit format for export
    const exportUnit = {
      ...unit,
      // Add EditableUnit specific fields
      armorAllocation: {},
      equipmentPlacements: [],
      criticalSlots: [],
      fluffData: uData.fluff_text || {},
      selectedQuirks: [],
      validationState: { isValid: true, errors: [], warnings: [] },
      editorMetadata: {
        lastModified: new Date(),
        isDirty: false,
        version: '1.0'
      }
    }
    
    try {
      downloadUnit(exportUnit as any, format)
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export unit. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Navigation and Export */}
      <header className="mb-4">
        <div className="flex items-center justify-between mb-2">
          {/* Back Button */}
          <button
            onClick={() => router.push('/compendium')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Compendium
          </button>
          
          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Unit
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  JSON (Full Data)
                </button>
                <button
                  onClick={() => handleExport('mtf')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  MTF (MegaMekLab)
                </button>
                <button
                  onClick={() => handleExport('auto')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Auto-detect Format
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Unit Title */}
        <h1 className="text-3xl font-bold text-blue-700">{chassis} {model}</h1>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
          {availableTabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => !tab.disabled && onTabChange(tab.name)}
              disabled={tab.disabled}
              className={`${
                activeTab === tab.name
                  ? 'border-blue-500 text-blue-600'
                  : tab.disabled
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 rounded-t-md transition-colors duration-200`}
              title={tab.disabled ? 'Analysis unavailable - unit conversion failed' : undefined}
            >
              {tab.label}
              {tab.disabled && (
                <span className="ml-1 text-xs text-gray-400" aria-label="Disabled">⚠</span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default UnitActionButtons
