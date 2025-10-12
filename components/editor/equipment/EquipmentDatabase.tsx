import React, { useState, useMemo } from 'react';
import { FullEquipment } from '../../../types/index';
import { 
  isEquipmentAvailable, 
  getAvailabilityRating, 
  getEraFromYear,
  EQUIPMENT_TECH_DATA 
} from '../../../utils/techProgression';

// Sample equipment data with tech progression IDs
const SAMPLE_EQUIPMENT: FullEquipment[] = [
  // Energy Weapons
  {
    id: 'small_laser',
    name: 'Small Laser',
    type: 'Energy Weapon',
    tech_base: 'Inner Sphere',
    damage: 3,
    range: '1/2/3',
    heat: 1,
    weight: 0.5,
    space: 1,
    data: {
      tons: 0.5,
      slots: 1,
      damage: 3,
      heatmap: 1,
      range: { short: 1, medium: 2, long: 3 },
      category: 'Energy',
      weapon_type: 'Laser',
    },
  },
  {
    id: 'medium_laser',
    name: 'Medium Laser',
    type: 'Energy Weapon',
    tech_base: 'Inner Sphere',
    damage: 5,
    range: '3/6/9',
    heat: 3,
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      damage: 5,
      heatmap: 3,
      range: { short: 3, medium: 6, long: 9 },
      category: 'Energy',
      weapon_type: 'Laser',
    },
  },
  {
    id: 'large_laser',
    name: 'Large Laser',
    type: 'Energy Weapon',
    tech_base: 'Inner Sphere',
    damage: 8,
    range: '5/10/15',
    heat: 8,
    weight: 5,
    space: 2,
    data: {
      tons: 5,
      slots: 2,
      damage: 8,
      heatmap: 8,
      range: { short: 5, medium: 10, long: 15 },
      category: 'Energy',
      weapon_type: 'Laser',
    },
  },
  {
    id: 'ppc',
    name: 'PPC',
    type: 'Energy Weapon',
    tech_base: 'Inner Sphere',
    damage: 10,
    range: '3/6/9',
    heat: 10,
    weight: 7,
    space: 3,
    data: {
      tons: 7,
      slots: 3,
      damage: 10,
      heatmap: 10,
      range: { short: 3, medium: 6, long: 9, minimum: 3 },
      category: 'Energy',
      weapon_type: 'Particle Projector Cannon',
    },
  },
  {
    id: 'er_ppc',
    name: 'ER PPC',
    type: 'Energy Weapon',
    tech_base: 'Inner Sphere',
    damage: 10,
    range: '4/8/12',
    heat: 15,
    weight: 7,
    space: 3,
    data: {
      tons: 7,
      slots: 3,
      damage: 10,
      heatmap: 15,
      range: { short: 4, medium: 8, long: 12, minimum: 3 },
      category: 'Energy',
      weapon_type: 'Extended Range PPC',
    },
  },

  // Ballistic Weapons
  {
    id: 'ac_2',
    name: 'Autocannon/2',
    type: 'Ballistic Weapon',
    tech_base: 'Inner Sphere',
    damage: 2,
    range: '8/16/24',
    heat: 1,
    weight: 6,
    space: 1,
    data: {
      tons: 6,
      slots: 1,
      damage: 2,
      heatmap: 1,
      range: { short: 8, medium: 16, long: 24 },
      category: 'Ballistic',
      weapon_type: 'Autocannon',
    },
  },
  {
    id: 'ac_5',
    name: 'Autocannon/5',
    type: 'Ballistic Weapon',
    tech_base: 'Inner Sphere',
    damage: 5,
    range: '6/12/18',
    heat: 1,
    weight: 8,
    space: 4,
    data: {
      tons: 8,
      slots: 4,
      damage: 5,
      heatmap: 1,
      range: { short: 6, medium: 12, long: 18 },
      category: 'Ballistic',
      weapon_type: 'Autocannon',
    },
  },
  {
    id: 'ac_10',
    name: 'Autocannon/10',
    type: 'Ballistic Weapon',
    tech_base: 'Inner Sphere',
    damage: 10,
    range: '5/10/15',
    heat: 3,
    weight: 12,
    space: 7,
    data: {
      tons: 12,
      slots: 7,
      damage: 10,
      heatmap: 3,
      range: { short: 5, medium: 10, long: 15 },
      category: 'Ballistic',
      weapon_type: 'Autocannon',
    },
  },
  {
    id: 'ac_20',
    name: 'Autocannon/20',
    type: 'Ballistic Weapon',
    tech_base: 'Inner Sphere',
    damage: 20,
    range: '3/6/9',
    heat: 7,
    weight: 14,
    space: 10,
    data: {
      tons: 14,
      slots: 10,
      damage: 20,
      heatmap: 7,
      range: { short: 3, medium: 6, long: 9 },
      category: 'Ballistic',
      weapon_type: 'Autocannon',
    },
  },
  {
    id: 'gauss_rifle',
    name: 'Gauss Rifle',
    type: 'Ballistic Weapon',
    tech_base: 'Inner Sphere',
    damage: 15,
    range: '7/15/22',
    heat: 1,
    weight: 15,
    space: 7,
    data: {
      tons: 15,
      slots: 7,
      damage: 15,
      heatmap: 1,
      range: { short: 7, medium: 15, long: 22 },
      category: 'Ballistic',
      weapon_type: 'Gauss Rifle',
    },
  },

  // Missile Weapons
  {
    id: 'srm_2',
    name: 'SRM 2',
    type: 'Missile Weapon',
    tech_base: 'Inner Sphere',
    damage: '2',
    range: '3/6/9',
    heat: 2,
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      damage: 2,
      heatmap: 2,
      range: { short: 3, medium: 6, long: 9 },
      category: 'Missile',
      weapon_type: 'Short Range Missile',
    },
  },
  {
    id: 'srm_4',
    name: 'SRM 4',
    type: 'Missile Weapon',
    tech_base: 'Inner Sphere',
    damage: '4',
    range: '3/6/9',
    heat: 3,
    weight: 2,
    space: 1,
    data: {
      tons: 2,
      slots: 1,
      damage: 4,
      heatmap: 3,
      range: { short: 3, medium: 6, long: 9 },
      category: 'Missile',
      weapon_type: 'Short Range Missile',
    },
  },
  {
    id: 'srm_6',
    name: 'SRM 6',
    type: 'Missile Weapon',
    tech_base: 'Inner Sphere',
    damage: '6',
    range: '3/6/9',
    heat: 4,
    weight: 3,
    space: 2,
    data: {
      tons: 3,
      slots: 2,
      damage: 6,
      heatmap: 4,
      range: { short: 3, medium: 6, long: 9 },
      category: 'Missile',
      weapon_type: 'Short Range Missile',
    },
  },
  {
    id: 'lrm_5',
    name: 'LRM 5',
    type: 'Missile Weapon',
    tech_base: 'Inner Sphere',
    damage: '5',
    range: '6/12/18',
    heat: 2,
    weight: 2,
    space: 1,
    data: {
      tons: 2,
      slots: 1,
      damage: 5,
      heatmap: 2,
      range: { short: 6, medium: 12, long: 18 },
      category: 'Missile',
      weapon_type: 'Long Range Missile',
    },
  },
  {
    id: 'lrm_10',
    name: 'LRM 10',
    type: 'Missile Weapon',
    tech_base: 'Inner Sphere',
    damage: '10',
    range: '6/12/18',
    heat: 4,
    weight: 5,
    space: 2,
    data: {
      tons: 5,
      slots: 2,
      damage: 10,
      heatmap: 4,
      range: { short: 6, medium: 12, long: 18 },
      category: 'Missile',
      weapon_type: 'Long Range Missile',
    },
  },
  {
    id: 'lrm_15',
    name: 'LRM 15',
    type: 'Missile Weapon',
    tech_base: 'Inner Sphere',
    damage: '15',
    range: '6/12/18',
    heat: 5,
    weight: 7,
    space: 3,
    data: {
      tons: 7,
      slots: 3,
      damage: 15,
      heatmap: 5,
      range: { short: 6, medium: 12, long: 18 },
      category: 'Missile',
      weapon_type: 'Long Range Missile',
    },
  },
  {
    id: 'lrm_20',
    name: 'LRM 20',
    type: 'Missile Weapon',
    tech_base: 'Inner Sphere',
    damage: '20',
    range: '6/12/18',
    heat: 6,
    weight: 10,
    space: 5,
    data: {
      tons: 10,
      slots: 5,
      damage: 20,
      heatmap: 6,
      range: { short: 6, medium: 12, long: 18 },
      category: 'Missile',
      weapon_type: 'Long Range Missile',
    },
  },

  // Equipment
  {
    id: 'dhs',
    name: 'Double Heat Sink',
    type: 'Heat Management',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 3,
    data: {
      tons: 1,
      slots: 3,
      category: 'Equipment',
      type: 'Heat Sink',
    },
  },
  {
    id: 'shs',
    name: 'Single Heat Sink',
    type: 'Heat Management',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Equipment',
      type: 'Heat Sink',
    },
  },
  {
    id: 'jump_jet',
    name: 'Jump Jet',
    type: 'Movement',
    tech_base: 'Inner Sphere',
    weight: 0.5,
    space: 1,
    data: {
      tons: 0.5,
      slots: 1,
      category: 'Equipment',
      type: 'Jump Jet',
    },
  },
  {
    id: 'case',
    name: 'CASE',
    type: 'Protection',
    tech_base: 'Inner Sphere',
    weight: 0.5,
    space: 1,
    data: {
      tons: 0.5,
      slots: 1,
      category: 'Equipment',
      type: 'CASE',
    },
  },

  // Ammunition
  {
    id: 'ac_2_ammo',
    name: 'AC/2 Ammo',
    type: 'Ammunition',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Ammunition',
      type: 'AC/2 Ammo',
      shots: 45,
    },
  },
  {
    id: 'ac_5_ammo',
    name: 'AC/5 Ammo',
    type: 'Ammunition',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Ammunition',
      type: 'AC/5 Ammo',
      shots: 20,
    },
  },
  {
    id: 'ac_10_ammo',
    name: 'AC/10 Ammo',
    type: 'Ammunition',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Ammunition',
      type: 'AC/10 Ammo',
      shots: 10,
    },
  },
  {
    id: 'ac_20_ammo',
    name: 'AC/20 Ammo',
    type: 'Ammunition',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Ammunition',
      type: 'AC/20 Ammo',
      shots: 5,
    },
  },
  {
    id: 'gauss_ammo',
    name: 'Gauss Ammo',
    type: 'Ammunition',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Ammunition',
      type: 'Gauss Ammo',
      shots: 8,
    },
  },
  {
    id: 'srm_ammo',
    name: 'SRM Ammo',
    type: 'Ammunition',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Ammunition',
      type: 'SRM Ammo',
      shots: 50,
    },
  },
  {
    id: 'lrm_ammo',
    name: 'LRM Ammo',
    type: 'Ammunition',
    tech_base: 'Inner Sphere',
    weight: 1,
    space: 1,
    data: {
      tons: 1,
      slots: 1,
      category: 'Ammunition',
      type: 'LRM Ammo',
      shots: 120,
    },
  },
];

const EQUIPMENT_CATEGORIES = [
  { id: 'all', label: 'All Equipment', count: 0 },
  { id: 'Energy', label: 'Energy Weapons', count: 0 },
  { id: 'Ballistic', label: 'Ballistic Weapons', count: 0 },
  { id: 'Missile', label: 'Missile Weapons', count: 0 },
  { id: 'Equipment', label: 'Equipment', count: 0 },
  { id: 'Ammunition', label: 'Ammunition', count: 0 },
];

interface EquipmentDatabaseProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedEquipment: string | null;
  onEquipmentSelect: (equipmentId: string | null) => void;
  onEquipmentAdd: (equipment: FullEquipment) => void;
  readOnly?: boolean;
  compact?: boolean;
  currentYear?: number;
  faction?: string;
  showUnavailable?: boolean;
}

const EquipmentDatabase: React.FC<EquipmentDatabaseProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedEquipment,
  onEquipmentSelect,
  onEquipmentAdd,
  readOnly = false,
  compact = true,
  currentYear = 3025,
  faction,
  showUnavailable = false,
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'weight' | 'damage'>('name');
  const [showAvailabilityFilter, setShowAvailabilityFilter] = useState(false);

  // Filter and sort equipment
  const filteredEquipment = useMemo(() => {
    const filtered = SAMPLE_EQUIPMENT.filter(equipment => {
      // Tech availability filter
      if (!showUnavailable) {
        // Map equipment ID to tech progression ID
        const techId = equipment.id.replace(/_/g, '_');
        const isAvailable = isEquipmentAvailable(techId, currentYear, faction);
        if (!isAvailable) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const category = equipment.data?.category || equipment.type;
        if (category !== selectedCategory) return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          equipment.name.toLowerCase().includes(searchLower) ||
          equipment.type.toLowerCase().includes(searchLower) ||
          (equipment.data?.weapon_type || '').toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Sort equipment
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'weight':
          return (a.weight || 0) - (b.weight || 0);
        case 'damage':
          const aDamage = typeof a.damage === 'number' ? a.damage : parseInt(String(a.damage)) || 0;
          const bDamage = typeof b.damage === 'number' ? b.damage : parseInt(String(b.damage)) || 0;
          return bDamage - aDamage;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedCategory, sortBy]);

  // Update category counts
  const categoriesWithCounts = useMemo(() => {
    return EQUIPMENT_CATEGORIES.map(cat => ({
      ...cat,
      count: cat.id === 'all' 
        ? SAMPLE_EQUIPMENT.length 
        : SAMPLE_EQUIPMENT.filter(eq => (eq.data?.category || eq.type) === cat.id).length,
    }));
  }, []);

  return (
    <div className="equipment-database bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Equipment Database ({getEraFromYear(currentYear)} - {currentYear})
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAvailabilityFilter(!showAvailabilityFilter)}
            className={`px-2 py-1 text-xs rounded ${
              showAvailabilityFilter ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            } hover:bg-gray-200`}
          >
            Tech Filter
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'weight' | 'damage')}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="name">Sort by Name</option>
            <option value="weight">Sort by Weight</option>
            <option value="damage">Sort by Damage</option>
          </select>
        </div>
      </div>
      {/* Tech Availability Filter */}
      {showAvailabilityFilter && (
        <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">
              Show unavailable equipment
            </label>
            <input
              type="checkbox"
              checked={showUnavailable}
              onChange={(e) => e.target.checked}
              className="rounded border-gray-300"
            />
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Current tech availability based on {faction || 'All Factions'} in {currentYear}
          </div>
        </div>
      )}
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search equipment..."
          className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {/* Category Filters */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {categoriesWithCounts.map(category => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>
      {/* Equipment List */}
      <div className="equipment-list max-h-96 overflow-y-auto space-y-2">
        {filteredEquipment.map(equipment => {
          const techId = equipment.id.replace(/_/g, '_');
          const isAvailable = isEquipmentAvailable(equipment, currentYear, faction);
          const availabilityRating = getAvailabilityRating(equipment, currentYear, faction);
          
          return (
            <div
              key={equipment.name}
              className={`equipment-item border rounded-lg p-3 transition-all cursor-pointer ${
                selectedEquipment === equipment.id
                  ? 'border-blue-500 bg-blue-50'
                  : !isAvailable
                  ? 'border-gray-200 bg-gray-100 opacity-60'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onEquipmentSelect(
                selectedEquipment === equipment.id ? null : equipment.id
              )}
            >
              {/* Equipment Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h4 className={`font-medium text-sm ${!isAvailable ? 'text-gray-500' : 'text-gray-900'}`}>
                    {equipment.name}
                  </h4>
                  {!isAvailable && (
                    <span className="text-xs text-red-600">
                      (Not Available)
                    </span>
                  )}
                </div>
                {!readOnly && isAvailable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEquipmentAdd(equipment);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>

              {/* Equipment Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span>{equipment.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tech:</span>
                  <span>{equipment.tech_base}</span>
                </div>
                {availabilityRating !== 'X-X-X-X' && (
                  <div className="flex justify-between col-span-2">
                    <span>Availability:</span>
                    <span className="font-mono text-xs">{availabilityRating}</span>
                  </div>
                )}
              {equipment.damage && (
                <div className="flex justify-between">
                  <span>Damage:</span>
                  <span>{equipment.damage}</span>
                </div>
              )}
              {equipment.range && (
                <div className="flex justify-between">
                  <span>Range:</span>
                  <span>{equipment.range}</span>
                </div>
              )}
              {equipment.heat && (
                <div className="flex justify-between">
                  <span>Heat:</span>
                  <span>{equipment.heat}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Weight:</span>
                <span>{equipment.weight}t</span>
              </div>
              <div className="flex justify-between">
                <span>Slots:</span>
                <span>{equipment.space}</span>
              </div>
            </div>

              {/* Expanded Details */}
              {selectedEquipment === equipment.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600 space-y-1">
                    {equipment.data?.weapon_type && (
                      <div><strong>Weapon Type:</strong> {equipment.data.weapon_type}</div>
                    )}
                    {equipment.data?.range && (
                      <div>
                        <strong>Range Brackets:</strong> 
                        {equipment.data.range.minimum && ` Min: ${equipment.data.range.minimum}`}
                        {equipment.data.range.short && ` Short: ${equipment.data.range.short}`}
                        {equipment.data.range.medium && ` Medium: ${equipment.data.range.medium}`}
                        {equipment.data.range.long && ` Long: ${equipment.data.range.long}`}
                      </div>
                    )}
                    {equipment.data?.specials && (
                      <div><strong>Special Rules:</strong> {Array.isArray(equipment.data.specials) ? equipment.data.specials.join(', ') : equipment.data.specials}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredEquipment.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No equipment found matching your criteria</div>
          </div>
        )}
      </div>
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Showing {filteredEquipment.length} of {SAMPLE_EQUIPMENT.length} equipment items
        </div>
      </div>
    </div>
  );
};

export default EquipmentDatabase;
