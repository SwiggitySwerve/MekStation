/**
 * Unit Equipment Summary Component
 * 
 * Displays detailed weapons and equipment listings with categorization,
 * statistics, and weapon type badges for BattleTech units.
 * 
 * Phase 4: Component Modularization - Day 17
 * Extracted from UnitDetail.tsx (924 lines → focused components)
 */

import React from 'react'
import { FullUnit, WeaponOrEquipmentItem, WeaponClass } from '../../types'

interface UnitEquipmentSummaryProps {
  unit: FullUnit
}

/**
 * Section title component for consistent styling
 */
const SectionTitle: React.FC<{children: React.ReactNode; className?: string}> = ({ children, className }) => (
  <h3 className={`text-xl font-semibold text-gray-700 mt-4 mb-2 pb-1 border-b border-gray-200 ${className}`}>{children}</h3>
)

// Weapon categorization helper functions
const categorizeWeapon = (item: WeaponOrEquipmentItem): WeaponClass => {
  if (item.weapon_class) return item.weapon_class
  
  const name = item.item_name.toLowerCase()
  const type = item.item_type.toLowerCase()
  
  // Check for specific weapon types by name
  if (name.includes('laser') || name.includes('ppc') || name.includes('flamer') || 
      name.includes('plasma') || name.includes('pulse')) {
    return 'Energy'
  }
  
  if (name.includes('autocannon') || name.includes('ac/') || name.includes('gauss') || 
      name.includes('rifle') || name.includes('machine gun') || name.includes('mg')) {
    return 'Ballistic'
  }
  
  if (name.includes('lrm') || name.includes('srm') || name.includes('missile') || 
      name.includes('rocket') || name.includes('narc') || name.includes('artemis')) {
    return 'Missile'
  }
  
  if (name.includes('hatchet') || name.includes('sword') || name.includes('claw') || 
      name.includes('punch') || name.includes('kick')) {
    return 'Physical'
  }
  
  if (type === 'weapon') {
    return 'Energy' // Default for unknown weapons
  }
  
  return 'Equipment'
}

const getWeaponTypeColor = (weaponClass: WeaponClass): string => {
  switch (weaponClass) {
    case 'Energy': return 'border-red-200 bg-red-50'
    case 'Ballistic': return 'border-yellow-200 bg-yellow-50'
    case 'Missile': return 'border-blue-200 bg-blue-50'
    case 'Physical': return 'border-purple-200 bg-purple-50'
    case 'Artillery': return 'border-orange-200 bg-orange-50'
    case 'Equipment': 
    default: return 'border-gray-200 bg-gray-50'
  }
}

const getWeaponTypeBadgeColor = (weaponClass: WeaponClass): string => {
  switch (weaponClass) {
    case 'Energy': return 'bg-red-100 text-red-800'
    case 'Ballistic': return 'bg-yellow-100 text-yellow-800'
    case 'Missile': return 'bg-blue-100 text-blue-800'
    case 'Physical': return 'bg-purple-100 text-purple-800'
    case 'Artillery': return 'bg-orange-100 text-orange-800'
    case 'Equipment': 
    default: return 'bg-gray-100 text-gray-800'
  }
}

const formatDamage = (damage: string | number | undefined): string => {
  if (!damage) return 'N/A'
  if (typeof damage === 'number') return String(damage)
  return String(damage)
}

const formatRange = (range: WeaponOrEquipmentItem['range']): string => {
  if (!range) return 'N/A'
  
  const s = range.short ?? 'N/A'
  const m = range.medium ?? 'N/A'
  const l = range.long ?? 'N/A'
  const e = range.extreme
  
  let rangeStr = `${s}/${m}/${l}`
  if (e !== undefined) rangeStr += `/${e}`
  if (range.minimum !== undefined) rangeStr += ` (Min: ${range.minimum})`
  
  return rangeStr
}

const groupWeaponsByType = (weapons: WeaponOrEquipmentItem[]) => {
  const grouped = weapons.reduce((acc, weapon) => {
    const category = categorizeWeapon(weapon)
    if (!acc[category]) acc[category] = []
    acc[category].push(weapon)
    return acc
  }, {} as Record<WeaponClass, WeaponOrEquipmentItem[]>)
  
  // Sort within each group by location, then by name
  Object.keys(grouped).forEach(category => {
    grouped[category as WeaponClass].sort((a, b) => {
      if (a.location !== b.location) return a.location.localeCompare(b.location)
      return a.item_name.localeCompare(b.item_name)
    })
  })
  
  return grouped
}

export const UnitEquipmentSummary: React.FC<UnitEquipmentSummaryProps> = ({ unit }) => {
  const uData = unit.data || {}

  // Render Armament Tab
  const renderArmamentSection = () => {
    if (!uData.weapons_and_equipment || uData.weapons_and_equipment.length === 0) {
      return (
        <div>
          <SectionTitle>Weapons and Equipment</SectionTitle>
          <p className="text-sm text-gray-500">No armament or significant equipment listed.</p>
        </div>
      )
    }

    const groupedWeapons = groupWeaponsByType(uData.weapons_and_equipment)
    const weaponTypes: WeaponClass[] = ['Energy', 'Ballistic', 'Missile', 'Physical', 'Artillery', 'Equipment']

    return (
      <div>
        <SectionTitle>Weapons and Equipment</SectionTitle>
        <div className="space-y-6 mt-4">
          {weaponTypes.map(weaponType => {
            const weapons = groupedWeapons[weaponType]
            if (!weapons || weapons.length === 0) return null

            return (
              <div key={weaponType} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center space-x-2">
                  <h4 className="text-lg font-semibold text-gray-700">{weaponType} Weapons</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWeaponTypeBadgeColor(weaponType)}`}>
                    {weapons.length} item{weapons.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Weapons in this category */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                  {weapons.map((item, index) => {
                    const weaponClass = categorizeWeapon(item)
                    return (
                      <div
                        key={`${weaponType}-${index}`}
                        className={`p-4 rounded-lg shadow-sm border-2 ${getWeaponTypeColor(weaponClass)}`}
                      >
                        {/* Weapon Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900">{item.item_name}</h5>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getWeaponTypeBadgeColor(weaponClass)}`}>
                                {weaponClass}
                              </span>
                              <span className="text-sm text-gray-600">
                                {item.location}
                                {item.rear_facing && <span className="ml-1 text-orange-600">(Rear)</span>}
                                {item.turret_mounted && <span className="ml-1 text-blue-600">(Turret)</span>}
                                {item.is_omnipod && <span className="ml-1 text-purple-600">(OmniPod)</span>}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Weapon Statistics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="space-y-1">
                            <span className="font-medium text-gray-600">Damage:</span>
                            <span className="block text-gray-800">{formatDamage(item.damage)}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-medium text-gray-600">Range:</span>
                            <span className="block text-gray-800">{formatRange(item.range)}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-medium text-gray-600">Heat:</span>
                            <span className="block text-gray-800">{item.heat ?? 'N/A'}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-medium text-gray-600">Crits:</span>
                            <span className="block text-gray-800">{item.crits ?? 'N/A'}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-medium text-gray-600">Weight:</span>
                            <span className="block text-gray-800">{item.tons ? `${item.tons} tons` : 'N/A'}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-medium text-gray-600">Ammo/Ton:</span>
                            <span className="block text-gray-800">{item.ammo_per_ton ?? 'N/A'}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="font-medium text-gray-600">Tech Base:</span>
                            <span className="block text-gray-800">{item.tech_base}</span>
                          </div>

                          {item.related_ammo && (
                            <div className="space-y-1">
                              <span className="font-medium text-gray-600">Ammo Type:</span>
                              <span className="block text-gray-800">{item.related_ammo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderArmamentSection()}
    </div>
  )
}

export default UnitEquipmentSummary
