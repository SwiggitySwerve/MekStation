/**
 * Overview Summary Panel Component
 * 
 * Displays rules level selection and unit summary information including
 * tonnage, configuration, tech base, and other key unit characteristics.
 * 
 * Phase 4: Component Modularization - Day 15
 * Extracted from OverviewTabV2.tsx (992 lines → focused components)
 */

import React from 'react'
import { getEraForYear } from '../../utils/techRating'

interface OverviewSummaryPanelProps {
  rulesLevel: string
  techBase: string
  introductionYear: number
  unitConfig: any
  readOnly?: boolean
  onRulesLevelChange: (rulesLevel: string) => void
}

/**
 * Rules level options
 */
const RULES_LEVELS = [
  { value: 'Introductory', label: 'Introductory', description: 'Basic rules, common technology' },
  { value: 'Standard', label: 'Standard', description: 'Tournament legal, standard rules' },
  { value: 'Advanced', label: 'Advanced', description: 'Complex rules, rare technology' },
  { value: 'Experimental', label: 'Experimental', description: 'Prototype technology, special rules' }
] as const

export const OverviewSummaryPanel: React.FC<OverviewSummaryPanelProps> = ({
  rulesLevel,
  techBase,
  introductionYear,
  unitConfig,
  readOnly = false,
  onRulesLevelChange
}) => {
  
  // Calculate current era for display
  const currentEra = getEraForYear(introductionYear)

  const handleRulesLevelClick = (level: string) => {
    onRulesLevelChange(level)
  }

  return (
    <div className="space-y-6">
      {/* Rules Level */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-lg">
        <h3 className="text-slate-100 font-semibold text-lg mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
          Rules Level
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RULES_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => handleRulesLevelClick(level.value)}
              disabled={readOnly}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                rulesLevel === level.value
                  ? 'bg-yellow-600/20 border-yellow-500 text-yellow-100'
                  : 'bg-slate-700/30 border-slate-600/50 text-slate-300 hover:border-yellow-500/50 hover:bg-slate-600/30'
              }`}
            >
              <div className="font-medium text-sm">{level.label}</div>
              <div className="text-xs opacity-75 mt-1">{level.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Unit Summary */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-lg">
        <h3 className="text-slate-100 font-semibold text-lg mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
          Unit Summary
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Tonnage</span>
            <span className="text-slate-200 font-medium">{unitConfig.tonnage}t</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Configuration</span>
            <span className="text-slate-200 font-medium">Biped BattleMech</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tech Base</span>
            <span className="text-slate-200 font-medium">{techBase}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Introduction</span>
            <span className="text-slate-200 font-medium">{introductionYear}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Rules Level</span>
            <span className="text-slate-200 font-medium">{rulesLevel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Era</span>
            <span className="text-slate-200 font-medium">{currentEra}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewSummaryPanel
