/**
 * Unit Detail Component - Orchestrator for unit display
 * 
 * Phase 4: Component Modularization - Day 17
 * Refactored from 924 lines → orchestrator + 5 focused components
 */

import React, { useState, useMemo } from 'react'
import { FullUnit } from '../../types'
import { 
  convertFullUnitToCustomizable, 
  convertWeaponsToLoadout, 
  createMockAvailableEquipment 
} from '../../utils/unitConverter'

// Import extracted components
import UnitBasicInfo from './UnitBasicInfo'
import UnitTechnicalSpecs from './UnitTechnicalSpecs'
import UnitEquipmentSummary from './UnitEquipmentSummary'
import UnitFluffDisplay from './UnitFluffDisplay'
import UnitActionButtons from './UnitActionButtons'

interface UnitDetailProps {
  unit: FullUnit | null
  isLoading: boolean
  error?: string | null
}

type TabName = "Overview" | "Armament" | "Criticals" | "Armor" | "Fluff" | "Analysis"

const UnitDetail: React.FC<UnitDetailProps> = ({ unit, isLoading, error }) => {
  const [activeTab, setActiveTab] = useState<TabName>("Overview")

  // Convert unit for analysis display with error handling
  const convertedUnit = useMemo(() => {
    if (!unit) return null
    try {
      return convertFullUnitToCustomizable(unit)
    } catch (error) {
      console.error('Error converting unit for analysis:', error)
      return null
    }
  }, [unit])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading unit details...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-10">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Unit</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!unit) {
    return (
      <div className="text-center py-10">
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-w-md mx-auto">
          <p className="text-gray-600">No unit data available.</p>
        </div>
      </div>
    )
  }

  // Available tabs configuration
  const availableTabs: Array<{ name: TabName; label: string; disabled?: boolean }> = [
    { name: "Overview", label: "Overview & Stats" },
    { name: "Armament", label: "Armament & Equipment" },
    { name: "Criticals", label: "Criticals" },
    { name: "Armor", label: "Armor Distribution" },
    { name: "Fluff", label: "History & Fluff" },
    { name: "Analysis", label: "Advanced Analysis", disabled: !convertedUnit },
  ]

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "Overview":
        return <UnitBasicInfo unit={unit} />
      case "Armament":
        return <UnitEquipmentSummary unit={unit} />
      case "Criticals":
      case "Armor":
        return <UnitTechnicalSpecs unit={unit} />
      case "Fluff":
      case "Analysis":
        return <UnitFluffDisplay unit={unit} />
      default:
        return <UnitBasicInfo unit={unit} />
    }
  }

  return (
    <div className="content-card">
      {/* Action Buttons and Navigation */}
      <UnitActionButtons
        unit={unit}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableTabs={availableTabs}
      />

      {/* Tab Content */}
      <div className="tab-content min-h-[200px]">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default UnitDetail
