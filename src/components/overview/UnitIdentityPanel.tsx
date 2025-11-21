/**
 * Unit Identity Panel Component
 * 
 * Handles the unit's basic identity configuration including tech base selection,
 * introduction year, and foundational technology settings.
 * 
 * Phase 4: Component Modularization - Day 15
 * Extracted from OverviewTabV2.tsx (992 lines → focused components)
 */

import React from 'react'
import { getEraForYear } from '../../utils/techRating'

interface UnitIdentityPanelProps {
  techBase: string
  introductionYear: number
  readOnly?: boolean
  onTechBaseChange: (techBase: string) => void
  onIntroductionYearChange: (year: number) => void
}

/**
 * Tech base options for overview
 */
const TECH_BASE_OPTIONS = [
  { value: 'Inner Sphere', label: 'Inner Sphere', description: 'Standard Inner Sphere technology' },
  { value: 'Clan', label: 'Clan', description: 'Advanced Clan technology' },
  { value: 'Mixed', label: 'Mixed Tech', description: 'Combination of IS and Clan technology' }
] as const

export const UnitIdentityPanel: React.FC<UnitIdentityPanelProps> = ({
  techBase,
  introductionYear,
  readOnly = false,
  onTechBaseChange,
  onIntroductionYearChange
}) => {
  
  // Calculate current era for display
  const currentEra = getEraForYear(introductionYear)
  const isMixedTechEnabled = techBase === 'Mixed'

  const handleTechBaseDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(`[UnitIdentityPanel] DROPDOWN CHANGE EVENT: ${e.target.value}`)
    onTechBaseChange(e.target.value)
  }

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(e.target.value) || 3025
    onIntroductionYearChange(year)
  }

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-lg">
      <h3 className="text-slate-100 font-semibold text-lg mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        Technology Foundation
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tech Base Selection */}
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-2">Tech Base</label>
          <select
            value={techBase}
            onChange={handleTechBaseDropdownChange}
            disabled={readOnly}
            className="w-full px-3 py-2 bg-slate-700/80 border border-slate-600/50 rounded-md text-sm text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          >
            {TECH_BASE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="text-xs text-slate-400 mt-1">
            {isMixedTechEnabled ? 'Mixed technology configuration' : `All systems use ${techBase} technology`}
          </div>
        </div>

        {/* Introduction Year */}
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-2">Introduction Year</label>
          <input
            type="number"
            min="2005"
            max="3200"
            step="1"
            value={introductionYear}
            onChange={handleYearInputChange}
            disabled={readOnly}
            className="w-full px-3 py-2 bg-slate-700/80 border border-slate-600/50 rounded-md text-sm text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          />
          <div className="text-xs text-slate-400 mt-1">
            Era: {currentEra} • Year of first production
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnitIdentityPanel
