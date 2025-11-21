/**
 * Unit Technical Specs Component
 * 
 * Displays detailed technical specifications for BattleTech units including
 * critical slot layout in MegaMekLab-style format and armor distribution.
 * 
 * Phase 4: Component Modularization - Day 17
 * Extracted from UnitDetail.tsx (924 lines → focused components)
 */

import React from 'react'
import { FullUnit, CriticalSlotLocation, ArmorLocation } from '../../types'
import MechArmorDiagram from '../common/MechArmorDiagram'

interface UnitTechnicalSpecsProps {
  unit: FullUnit
}

/**
 * Section title component for consistent styling
 */
const SectionTitle: React.FC<{children: React.ReactNode; className?: string}> = ({ children, className }) => (
  <h3 className={`text-xl font-semibold text-gray-700 mt-4 mb-2 pb-1 border-b border-gray-200 ${className}`}>{children}</h3>
)

export const UnitTechnicalSpecs: React.FC<UnitTechnicalSpecsProps> = ({ unit }) => {
  const uData = unit.data || {}

  // Render Critical Locations Tab
  const renderCriticalsSection = () => {
    if (!uData.criticals || uData.criticals.length === 0) {
      return (
        <div>
          <SectionTitle>Critical Locations</SectionTitle>
          <p className="text-sm text-gray-500">Critical slot information not available.</p>
        </div>
      )
    }

    // Organize criticals by location for MegaMekLab-style layout
    const criticalsByLocation = uData.criticals.reduce((acc, critLoc) => {
      acc[critLoc.location] = critLoc
      return acc
    }, {} as Record<string, CriticalSlotLocation>)

    // Helper function to render a critical location
    const renderCriticalLocation = (locationName: string, maxSlots: number = 12) => {
      const critLoc = criticalsByLocation[locationName]
      if (!critLoc) return null

      const slots = critLoc.slots.slice(0, maxSlots)
      // Pad with empty slots if needed
      while (slots.length < maxSlots) {
        slots.push('-Empty-' as any)
      }

      return (
        <div className="space-y-2">
          <h4 className="font-semibold text-center text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded border">
            {locationName}
          </h4>
          <div className="border border-gray-200 rounded bg-gray-50">
            <ul className="divide-y divide-gray-200">
              {slots.map((slot, i) => (
                <li 
                  key={i} 
                  className={`px-3 py-1 text-xs flex justify-between items-center ${
                    slot && String(slot) !== '-Empty-' 
                      ? 'bg-white text-gray-900' 
                      : 'text-gray-400 bg-gray-50'
                  }`}
                >
                  <span className="font-mono w-6">{i + 1}:</span>
                  <span className="flex-1 ml-2 truncate" title={String(slot) || 'Empty'}>
                    {String(slot) === '-Empty-' ? 'Empty' : String(slot)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    }

    return (
      <div>
        <SectionTitle>Critical Locations</SectionTitle>
        
        {/* MegaMekLab-style layout */}
        <div className="space-y-6 max-w-6xl mx-auto">
          
          {/* Head Section - Top center */}
          <div className="flex justify-center">
            <div className="w-48">
              {renderCriticalLocation('Head', 6)}
            </div>
          </div>

          {/* Arms and Torso Section - Main body */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            
            {/* Left Arm */}
            <div className="lg:col-span-1">
              {renderCriticalLocation('Left Arm', 12)}
            </div>

            {/* Torso Section */}
            <div className="lg:col-span-3 grid grid-cols-3 gap-4">
              {/* Left Torso */}
              <div>
                {renderCriticalLocation('Left Torso', 12)}
              </div>
              
              {/* Center Torso */}
              <div>
                {renderCriticalLocation('Center Torso', 12)}
              </div>
              
              {/* Right Torso */}
              <div>
                {renderCriticalLocation('Right Torso', 12)}
              </div>
            </div>

            {/* Right Arm */}
            <div className="lg:col-span-1">
              {renderCriticalLocation('Right Arm', 12)}
            </div>
          </div>

          {/* Legs Section - Bottom */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div>
              {renderCriticalLocation('Left Leg', 6)}
            </div>
            <div>
              {renderCriticalLocation('Right Leg', 6)}
            </div>
          </div>

          {/* Rear Torso Section (if applicable) */}
          {(criticalsByLocation['Left Torso (rear)'] || 
            criticalsByLocation['Center Torso (rear)'] || 
            criticalsByLocation['Right Torso (rear)']) && (
            <div className="border-t pt-6 mt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Rear Torso</h4>
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div>
                  {renderCriticalLocation('Left Torso (rear)', 2)}
                </div>
                <div>
                  {renderCriticalLocation('Center Torso (rear)', 2)}
                </div>
                <div>
                  {renderCriticalLocation('Right Torso (rear)', 2)}
                </div>
              </div>
            </div>
          )}

          {/* Additional Locations (for any non-standard locations) */}
          {Object.keys(criticalsByLocation).some(loc => 
            !['Head', 'Left Arm', 'Right Arm', 'Left Torso', 'Center Torso', 'Right Torso', 
              'Left Leg', 'Right Leg', 'Left Torso (rear)', 'Center Torso (rear)', 'Right Torso (rear)'].includes(loc)
          ) && (
            <div className="border-t pt-6 mt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">Other Locations</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(criticalsByLocation)
                  .filter(([location]) => 
                    !['Head', 'Left Arm', 'Right Arm', 'Left Torso', 'Center Torso', 'Right Torso', 
                      'Left Leg', 'Right Leg', 'Left Torso (rear)', 'Center Torso (rear)', 'Right Torso (rear)'].includes(location)
                  )
                  .map(([location, critLoc]) => (
                    <div key={location}>
                      {renderCriticalLocation(location, critLoc.slots.length)}
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Armor Distribution Section
  const renderArmorSection = () => {
    if (!uData.armor || !uData.armor.locations || uData.armor.locations.length === 0) {
      return (
        <div>
          <SectionTitle>Armor Distribution (N/A)</SectionTitle>
          <p className="text-sm text-gray-500">Armor information not available.</p>
        </div>
      )
    }

    // Determine mech type from unit configuration
    const getMechType = () => {
      const config = uData.config?.toLowerCase() || ''
      if (config.includes('quad')) return 'Quad'
      if (config.includes('lam')) return 'LAM'
      return 'Biped' // Default
    }

    const mechType = getMechType()
    const hasRearArmor = uData.armor.locations.some(loc => 
      loc.rear_armor_points !== undefined && loc.rear_armor_points > 0
    )

    return (
      <div>
        <SectionTitle>Armor Distribution ({uData.armor.type || 'N/A'})</SectionTitle>
        
        {/* MegaMekLab-style Armor Diagram */}
        <div className="flex justify-center mb-8">
          <MechArmorDiagram
            armorData={uData.armor.locations}
            mechType={mechType}
            showRearArmor={hasRearArmor}
            interactive={true}
            size="large"
            theme="light"
            className="mx-auto"
          />
        </div>

        {/* Detailed Armor Table */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">Detailed Armor Values</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Front Armor</th>
                  {hasRearArmor && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rear Armor</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uData.armor.locations.map((loc: ArmorLocation, index) => {
                  const frontArmor = loc.armor_points || 0
                  const rearArmor = loc.rear_armor_points || 0
                  const total = frontArmor + rearArmor
                  
                  return (
                    <tr key={loc.location} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {loc.location}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                        {frontArmor}
                      </td>
                      {hasRearArmor && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                          {rearArmor > 0 ? rearArmor : '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono font-semibold">
                        {total}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              
              {/* Total Armor Footer */}
              <tfoot className="bg-gray-100">
                <tr className="font-semibold">
                  <td className="px-4 py-3 text-sm text-gray-900">Total Armor Points</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {uData.armor.locations.reduce((sum, loc) => sum + (loc.armor_points || 0), 0)}
                  </td>
                  {hasRearArmor && (
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {uData.armor.locations.reduce((sum, loc) => sum + (loc.rear_armor_points || 0), 0)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono font-bold">
                    {uData.armor.total_armor_points || 
                     uData.armor.locations.reduce((sum, loc) => 
                       sum + (loc.armor_points || 0) + (loc.rear_armor_points || 0), 0
                     )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Armor Summary Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800">Armor Type</h5>
            <p className="text-blue-700">{uData.armor.type || 'Standard'}</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-semibold text-green-800">Total Protection</h5>
            <p className="text-green-700 font-mono text-lg">
              {uData.armor.total_armor_points || 
               uData.armor.locations.reduce((sum, loc) => 
                 sum + (loc.armor_points || 0) + (loc.rear_armor_points || 0), 0
               )} points
            </p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="font-semibold text-purple-800">Coverage</h5>
            <p className="text-purple-700">
              {uData.armor.locations.length} locations
              {hasRearArmor && <span className="block text-sm">Includes rear armor</span>}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {renderCriticalsSection()}
      {renderArmorSection()}
    </div>
  )
}

export default UnitTechnicalSpecs
