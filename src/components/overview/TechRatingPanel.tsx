/**
 * Tech Rating Panel Component
 * 
 * Displays the technology rating timeline across different eras,
 * showing how rare/common the unit's technology is in each period.
 * 
 * Phase 4: Component Modularization - Day 15
 * Extracted from OverviewTabV2.tsx (992 lines → focused components)
 */

import React from 'react'
import { TECH_ERAS } from '../../utils/techRating'
import { TechRating } from '../../utils/techProgression'

interface TechRatingPanelProps {
  techRating?: TechRating
  introductionYear: number
}

/**
 * Era icons for tech rating display
 */
const ERA_ICONS = {
  '2100-2800': '🏛️',
  '2801-3050': '⚔️', 
  '3051-3082': '🔥',
  '3083-Now': '🌟'
} as const

export const TechRatingPanel: React.FC<TechRatingPanelProps> = ({
  techRating,
  introductionYear
}) => {
  
  // Add null checks and default values with correct property names
  const safeTechRating: TechRating = techRating || {
    era2100_2800: 'X',
    era2801_3050: 'D',
    era3051_3082: 'E',
    era3083_Now: 'F'
  }
  
  // Map era keys to TechRating property names
  const getRatingForEra = (era: string): string => {
    switch (era) {
      case '2100-2800': return safeTechRating.era2100_2800
      case '2801-3050': return safeTechRating.era2801_3050
      case '3051-3082': return safeTechRating.era3051_3082
      case '3083-Now': return safeTechRating.era3083_Now
      default: return 'X'
    }
  }
  
  // Rating color scheme
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A': return 'text-green-400 bg-green-900/30 border-green-600/50'
      case 'B': return 'text-blue-400 bg-blue-900/30 border-blue-600/50'
      case 'C': return 'text-yellow-400 bg-yellow-900/30 border-yellow-600/50'
      case 'D': return 'text-orange-400 bg-orange-900/30 border-orange-600/50'
      case 'E': return 'text-red-400 bg-red-900/30 border-red-600/50'
      case 'F': return 'text-purple-400 bg-purple-900/30 border-purple-600/50'
      case 'X': return 'text-gray-400 bg-gray-900/30 border-gray-600/50'
      default: return 'text-slate-400 bg-slate-900/30 border-slate-600/50'
    }
  }

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-lg">
      <h3 className="text-slate-100 font-semibold text-lg mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
        Tech Rating
      </h3>
      
      <div className="space-y-3">
        {Object.entries(TECH_ERAS).map(([era, info]) => {
          const rating = getRatingForEra(era)
          const isCurrentEra = introductionYear >= info.start && introductionYear <= info.end
          
          return (
            <div
              key={era}
              className={`p-3 rounded-lg border ${getRatingColor(rating)} ${
                isCurrentEra ? 'ring-2 ring-cyan-500/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ERA_ICONS[era as keyof typeof ERA_ICONS]}</span>
                  <span className="font-medium text-sm text-slate-200">
                    {era.replace('-', ' – ')}
                  </span>
                </div>
                <div className={`font-bold text-lg ${getRatingColor(rating)}`}>
                  {rating}
                </div>
              </div>
              <div className="text-xs opacity-75">{info.name}</div>
              {isCurrentEra && (
                <div className="text-xs text-cyan-400 mt-1 font-medium">
                  Introduction Era
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Rating Legend */}
      <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
        <div className="text-slate-300 font-medium text-sm mb-2">Rating Scale</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="text-green-400">A: Common</div>
          <div className="text-blue-400">B: Uncommon</div>
          <div className="text-yellow-400">C: Rare</div>
          <div className="text-orange-400">D: Very Rare</div>
          <div className="text-red-400">E: Experimental</div>
          <div className="text-purple-400">F: Primitive</div>
          <div className="text-gray-400 col-span-2">X: Unavailable</div>
        </div>
      </div>
    </div>
  )
}

export default TechRatingPanel
