/**
 * Unit Fluff Display Component
 * 
 * Displays historical and background information (fluff text) for BattleTech units
 * including development history, deployment notes, and variant information.
 * 
 * Phase 4: Component Modularization - Day 17
 * Extracted from UnitDetail.tsx (924 lines → focused components)
 */

import React, { Suspense, useMemo } from 'react'
import { FullUnit } from '../../types'
import { 
  convertFullUnitToCustomizable, 
  convertWeaponsToLoadout, 
  createMockAvailableEquipment 
} from '../../utils/unitConverter'

// Lazy load the heavy UnitDisplay component
const UnitDisplay = React.lazy(() => import('../common/UnitDisplay'))

interface UnitFluffDisplayProps {
  unit: FullUnit
}

/**
 * Section title component for consistent styling
 */
const SectionTitle: React.FC<{children: React.ReactNode; className?: string}> = ({ children, className }) => (
  <h3 className={`text-xl font-semibold text-gray-700 mt-4 mb-2 pb-1 border-b border-gray-200 ${className}`}>{children}</h3>
)

export const UnitFluffDisplay: React.FC<UnitFluffDisplayProps> = ({ unit }) => {
  const uData = unit.data || {}

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

  const loadout = useMemo(() => {
    if (!unit) return []
    try {
      return convertWeaponsToLoadout(unit)
    } catch (error) {
      console.error('Error converting weapons to loadout:', error)
      return []
    }
  }, [unit])

  const availableEquipment = useMemo(() => {
    if (!unit) return []
    try {
      return createMockAvailableEquipment(unit)
    } catch (error) {
      console.error('Error creating mock equipment:', error)
      return []
    }
  }, [unit])

  // Render Fluff Tab
  const renderFluffSection = () => (
    <div>
      <SectionTitle>History & Background</SectionTitle>
      {(!uData.fluff_text || Object.keys(uData.fluff_text).length === 0) && 
        <p className="text-sm text-gray-500">No fluff or historical information available.</p>}
      {uData.fluff_text && Object.entries(uData.fluff_text).map(([key, value]) => value && (
        <div key={key} className="mt-3">
          <h4 className="font-semibold text-md capitalize text-gray-700">{key.replace(/_/g, ' ')}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{String(value)}</p>
        </div>
      ))}
    </div>
  )

  // Render Analysis Tab
  const renderAnalysisSection = () => (
    <div>
      <SectionTitle>Detailed Analysis</SectionTitle>
      {convertedUnit ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading analysis...</span>
            </div>
          }
        >
          <UnitDisplay
            unit={convertedUnit}
            loadout={loadout}
            availableEquipment={availableEquipment}
            options={{
              showBasicInfo: true,
              showMovement: true,
              showArmor: true,
              showStructure: true,
              showHeatManagement: true,
              showEquipmentSummary: true,
              showCriticalSlotSummary: true,
              showBuildRecommendations: true,
              showTechnicalSpecs: true,
              compact: false,
              interactive: false
            }}
          />
        </Suspense>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Analysis Unavailable</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Unable to perform detailed analysis for this unit. This may be due to incomplete unit data or conversion issues.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      {renderFluffSection()}
      {renderAnalysisSection()}
    </div>
  )
}

export default UnitFluffDisplay
