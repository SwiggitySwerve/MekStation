/**
 * Unit Basic Info Component
 * 
 * Displays general unit information including mass, tech base, era, rules level,
 * propulsion details, heat management, cockpit, gyro, and quirks.
 * 
 * Phase 4: Component Modularization - Day 17
 * Extracted from UnitDetail.tsx (924 lines → focused components)
 */

import React from 'react'
import { FullUnit, UnitQuirk } from '../../types'

interface UnitBasicInfoProps {
  unit: FullUnit
}

/**
 * Section title component for consistent styling
 */
const SectionTitle: React.FC<{children: React.ReactNode; className?: string}> = ({ children, className }) => (
  <h3 className={`text-xl font-semibold text-gray-700 mt-4 mb-2 pb-1 border-b border-gray-200 ${className}`}>{children}</h3>
)

/**
 * Data pair component for key-value display
 */
const DataPair: React.FC<{label: string, value?: string | number | null}> = ({ label, value }) => (
  <div className="flex justify-between py-1 text-sm">
    <span className="font-medium text-gray-600">{label}:</span>
    <span className="text-gray-800 break-words">{value !== undefined && value !== null ? String(value) : 'N/A'}</span>
  </div>
)

/**
 * Helper functions for safe data access
 */
const safeGetValue = (primary: any, fallback: any, defaultValue: any = null) => {
  return primary !== undefined && primary !== null ? primary : 
         (fallback !== undefined && fallback !== null ? fallback : defaultValue)
}

const safeGetRole = (role: any, fallbackRole: any) => {
  if (typeof role === 'object' && role?.name) return role.name
  if (typeof role === 'string') return role
  if (typeof fallbackRole === 'string') return fallbackRole
  return null
}

export const UnitBasicInfo: React.FC<UnitBasicInfoProps> = ({ unit }) => {
  // Safe data extraction with proper validation
  const uData = unit.data || {}
  const chassis = safeGetValue(uData.chassis, unit.chassis, 'Unknown')
  const model = safeGetValue(uData.model, unit.model, 'Unknown')
  const mass = safeGetValue(uData.mass, unit.mass, 0)
  const tech_base = safeGetValue(uData.tech_base, unit.tech_base, 'Unknown')
  const era = safeGetValue(uData.era, unit.era, 'Unknown')
  const rules_level = safeGetValue(uData.rules_level, unit.rules_level, 'Unknown')
  const role = safeGetRole(uData.role, unit.role)
  const source = safeGetValue(uData.source, unit.source, 'Unknown')
  const mul_id = safeGetValue(uData.mul_id, unit.mul_id, null)

  return (
    <div className="space-y-6">
      {/* General Information */}
      <div>
        <SectionTitle>General</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          <DataPair label="Mass" value={`${mass || 0} tons`} />
          <DataPair label="Tech Base" value={tech_base} />
          <DataPair label="Era" value={era} />
          <DataPair label="Rules Level" value={rules_level} />
          <DataPair label="Role" value={role} />
          <DataPair label="Source" value={source} />
          <DataPair label="Configuration" value={uData.config} />
          <DataPair label="MUL ID" value={mul_id || 'N/A'} />
        </div>
      </div>

      {/* Propulsion & Structure */}
      {uData.engine && (
        <div>
          <SectionTitle>Propulsion & Structure</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <DataPair label="Engine" value={`${uData.engine.rating} ${uData.engine.type} (${uData.engine.manufacturer || 'N/A'})`} />
            {uData.movement && <DataPair label="Walking MP" value={uData.movement.walk_mp} />}
            {uData.movement && <DataPair label="Running MP" value={uData.movement.run_mp} />}
            {uData.movement && <DataPair label="Jumping MP" value={uData.movement.jump_mp} />}
            {uData.structure && <DataPair label="Internal Structure" value={`${uData.structure.type} (${uData.structure.manufacturer || 'N/A'})`} />}
            {uData.myomer && <DataPair label="Myomer" value={`${uData.myomer.type} (${uData.myomer.manufacturer || 'N/A'})`} />}
          </div>
        </div>
      )}

      {/* Heat Management */}
      {uData.heat_sinks && (
        <div>
          <SectionTitle>Heat Management</SectionTitle>
          <DataPair
            label="Heat Sinks"
            value={`${uData.heat_sinks.count || 0} ${uData.heat_sinks.type || ''} (Dissipating: ${uData.heat_sinks.dissipation_per_sink || (uData.heat_sinks.count || 0) * (uData.heat_sinks.type?.includes("Double") ? 2 : 1)})`}
          />
        </div>
      )}

      {/* Cockpit */}
      {uData.cockpit && (
        <div>
          <SectionTitle>Cockpit</SectionTitle>
          <DataPair label="Cockpit Type" value={uData.cockpit.type || 'Standard'} />
          {uData.cockpit.manufacturer && <DataPair label="Manufacturer" value={uData.cockpit.manufacturer} />}
        </div>
      )}

      {/* Gyro */}
      {uData.gyro && (
        <div>
          <SectionTitle>Gyro</SectionTitle>
          <DataPair label="Gyro Type" value={uData.gyro.type || 'Standard'} />
          {uData.gyro.manufacturer && <DataPair label="Manufacturer" value={uData.gyro.manufacturer} />}
        </div>
      )}

      {/* Quirks */}
      {uData.quirks && (Array.isArray(uData.quirks) ? uData.quirks.length > 0 : ((uData.quirks.positive?.length || 0) > 0 || (uData.quirks.negative?.length || 0) > 0)) && (
        <div>
          <SectionTitle>Quirks</SectionTitle>
          {Array.isArray(uData.quirks) ? (
            <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-gray-700">
              {uData.quirks.map((quirk: UnitQuirk, index: number) => (
                <li key={index}>{typeof quirk === 'string' ? quirk : quirk.name}</li>
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uData.quirks.positive && uData.quirks.positive.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-1">Positive</h4>
                  <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-gray-700">
                    {uData.quirks.positive.map((quirk: string, index: number) => (
                      <li key={index}>{quirk}</li>
                    ))}
                  </ul>
                </div>
              )}
              {uData.quirks.negative && uData.quirks.negative.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-1">Negative</h4>
                  <ul className="list-disc list-inside pl-4 space-y-1 text-sm text-gray-700">
                    {uData.quirks.negative.map((quirk: string, index: number) => (
                      <li key={index}>{quirk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UnitBasicInfo
