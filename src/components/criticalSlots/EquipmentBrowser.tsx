/**
 * Equipment Browser - Standalone equipment database browser
 * Pure data display component with optional integration via props
 * Always shows equipment data regardless of context or providers
 */

import React, { useState, useMemo } from 'react'
import { EquipmentObject } from '../../utils/criticalSlots/CriticalSlot'
import { ALL_EQUIPMENT_VARIANTS, Equipment, TechBase } from '../../data/equipment'

// Props interface for optional integration
interface EquipmentBrowserProps {
  // Optional equipment action handlers
  onAddEquipment?: (equipment: EquipmentObject) => void
  onEquipmentAction?: (action: string, equipment: EquipmentObject) => void
  // Optional UI customization
  showAddButtons?: boolean
  actionButtonLabel?: string
  actionButtonIcon?: string
  // Optional styling
  className?: string
}

// Local equipment variant interface
interface LocalEquipmentVariant {
  id: string;
  name: string;
  category: string;
  techBase: TechBase;
  weight: number;
  crits: number;
  damage?: number | null;
  heat?: number | null;
  minRange?: number | null;
  rangeShort?: number | null;
  rangeMedium?: number | null;
  rangeLong?: number | null;
  rangeExtreme?: number | null;
  ammoPerTon?: number | null;
  cost?: number | null;
  battleValue?: number | null;
  requiresAmmo: boolean;
  introductionYear: number;
  rulesLevel: string;
  baseType?: string;
  description?: string;
  special?: string[];
  sourceBook?: string;
  pageReference?: string;
}

// Convert local equipment to EquipmentObject
function convertLocalEquipmentToObject(variant: LocalEquipmentVariant): EquipmentObject {
  // Map category names to equipment types
  const categoryToType: Record<string, EquipmentObject['type']> = {
    'Energy Weapons': 'weapon',
    'Ballistic Weapons': 'weapon',
    'Missile Weapons': 'weapon',
    'Artillery Weapons': 'weapon',
    'Capital Weapons': 'weapon',
    'Physical Weapons': 'weapon',
    'Anti-Personnel Weapons': 'weapon',
    'One-Shot Weapons': 'weapon',
    'Torpedoes': 'weapon',
    'Ammunition': 'ammo',
    'Heat Management': 'heat_sink',
    'Equipment': 'equipment',
    'Industrial Equipment': 'equipment',
    'Movement Equipment': 'equipment',
    'Electronic Warfare': 'equipment',
    'Prototype Equipment': 'equipment'
  }

  let type: EquipmentObject['type'] = 'equipment'
  if (categoryToType[variant.category]) {
    type = categoryToType[variant.category]
  }

  return {
    id: variant.id,
    name: variant.name,
    requiredSlots: variant.crits,
    weight: variant.weight,
    type,
    techBase: variant.techBase === 'IS' ? 'Inner Sphere' : variant.techBase,
    heat: variant.heat || 0
  }
}

// Flatten equipment from the local data structure with comprehensive validation
function flattenLocalEquipment(): LocalEquipmentVariant[] {
  const flattened: LocalEquipmentVariant[] = [];

  // Validation: Check if ALL_EQUIPMENT_VARIANTS is available and populated
  if (!ALL_EQUIPMENT_VARIANTS) {
    console.error('EquipmentBrowser: ALL_EQUIPMENT_VARIANTS is not available');
    return [];
  }

  if (!Array.isArray(ALL_EQUIPMENT_VARIANTS)) {
    console.error('EquipmentBrowser: ALL_EQUIPMENT_VARIANTS is not an array', typeof ALL_EQUIPMENT_VARIANTS);
    return [];
  }

  if (ALL_EQUIPMENT_VARIANTS.length === 0) {
    console.warn('EquipmentBrowser: ALL_EQUIPMENT_VARIANTS is empty');
    return [];
  }

  console.log(`EquipmentBrowser: Processing ${ALL_EQUIPMENT_VARIANTS.length} equipment items`);

  let processedCount = 0;
  let variantCount = 0;

  ALL_EQUIPMENT_VARIANTS.forEach((equipment, index) => {
    try {
      // Validate equipment structure
      if (!equipment || typeof equipment !== 'object') {
        console.warn(`EquipmentBrowser: Invalid equipment at index ${index}:`, equipment);
        return;
      }

      if (!equipment.id || !equipment.name || !equipment.category) {
        console.warn(`EquipmentBrowser: Missing required fields in equipment at index ${index}:`, {
          id: equipment.id,
          name: equipment.name,
          category: equipment.category
        });
        return;
      }

      if (!equipment.variants || typeof equipment.variants !== 'object') {
        console.warn(`EquipmentBrowser: No variants found for equipment ${equipment.name}:`, equipment.variants);
        return;
      }

      // Process each tech base variant
      Object.entries(equipment.variants).forEach(([techBase, variant]) => {
        try {
          if (!variant || typeof variant !== 'object') {
            console.warn(`EquipmentBrowser: Invalid variant for ${equipment.name} ${techBase}:`, variant);
            return;
          }

          // Type assertion for variant
          const typedVariant = variant as any;

          // Validate required variant fields
          if (typeof typedVariant.weight !== 'number' || typeof typedVariant.crits !== 'number') {
            console.warn(`EquipmentBrowser: Missing weight/crits for ${equipment.name} ${techBase}:`, {
              weight: typedVariant.weight,
              crits: typedVariant.crits
            });
            return;
          }

          const flattennedVariant: LocalEquipmentVariant = {
            id: `${equipment.name}_${techBase.toLowerCase()}`,
            name: equipment.name,
            category: equipment.category,
            techBase: techBase as TechBase,
            weight: typedVariant.weight,
            crits: typedVariant.crits,
            damage: typedVariant.damage || null,
            heat: typedVariant.heat || null,
            minRange: typedVariant.minRange || null,
            rangeShort: typedVariant.rangeShort || null,
            rangeMedium: typedVariant.rangeMedium || null,
            rangeLong: typedVariant.rangeLong || null,
            rangeExtreme: typedVariant.rangeExtreme || null,
            ammoPerTon: typedVariant.ammoPerTon || null,
            cost: typedVariant.cost || null,
            battleValue: typedVariant.battleValue || null,
            requiresAmmo: equipment.requiresAmmo || false,
            introductionYear: equipment.introductionYear || 3025,
            rulesLevel: equipment.rulesLevel || 'Standard',
            baseType: equipment.baseType,
            description: equipment.description,
            special: equipment.special,
            sourceBook: equipment.sourceBook,
            pageReference: equipment.pageReference
          };

          flattened.push(flattennedVariant);
          variantCount++;

        } catch (variantError) {
          console.error(`EquipmentBrowser: Error processing variant ${techBase} for ${equipment.name}:`, variantError);
        }
      });

      processedCount++;

    } catch (equipmentError) {
      console.error(`EquipmentBrowser: Error processing equipment at index ${index}:`, equipmentError);
    }
  });

  console.log(`EquipmentBrowser: Successfully processed ${processedCount}/${ALL_EQUIPMENT_VARIANTS.length} equipment items, created ${variantCount} variants`);

  if (flattened.length === 0) {
    console.error('EquipmentBrowser: No valid equipment variants were created!');
  }

  return flattened;
}

// Get tech base display name
function getTechBaseDisplayName(techBase: string): string {
  switch (techBase) {
    case 'IS': return 'Inner Sphere';
    case 'Clan': return 'Clan';
    default: return techBase;
  }
}

// Get tech base colors
function getTechBaseColors(techBase: string) {
  switch (techBase) {
    case 'IS':
      return { text: 'text-blue-300' };
    case 'Clan':
      return { text: 'text-green-300' };
    default:
      return { text: 'text-gray-300' };
  }
}

interface EquipmentRowProps {
  variant: LocalEquipmentVariant
  onAddEquipment?: (equipment: EquipmentObject) => void
  onEquipmentAction?: (action: string, equipment: EquipmentObject) => void
  showAddButtons?: boolean
  actionButtonLabel?: string
  actionButtonIcon?: string
}

function EquipmentRow({
  variant,
  onAddEquipment,
  onEquipmentAction,
  showAddButtons = true,
  actionButtonLabel = "Add to unit",
  actionButtonIcon = "+"
}: EquipmentRowProps) {
  const techBaseColors = getTechBaseColors(variant.techBase);

  const handleAdd = () => {
    try {
      // Convert variant to equipment object
      const equipment = convertLocalEquipmentToObject(variant)

      console.log('EquipmentBrowser: Adding equipment:', equipment);

      // Call provided handler if available
      if (onAddEquipment) {
        onAddEquipment(equipment)
      } else if (onEquipmentAction) {
        onEquipmentAction('add', equipment)
      } else {
        console.warn('EquipmentBrowser: No add equipment handler provided');
      }
    } catch (error) {
      console.error('EquipmentBrowser: Error adding equipment:', error);
    }
  }

  // Build range display
  const rangeDisplay = variant.rangeShort && variant.rangeMedium && variant.rangeLong
    ? `${variant.rangeShort}/${variant.rangeMedium}/${variant.rangeLong}`
    : ''

  return (
    <tr className="border-b border-gray-600 hover:bg-gray-700 transition-colors">
      {/* Add Button (Plus Column) - Only show if integration is configured */}
      <td className="px-2 py-2 text-center w-12">
        {showAddButtons && (onAddEquipment || onEquipmentAction) ? (
          <button
            onClick={handleAdd}
            className="bg-green-600 hover:bg-green-500 text-white text-xs w-6 h-6 rounded flex items-center justify-center transition-colors"
            title={actionButtonLabel}
          >
            {actionButtonIcon}
          </button>
        ) : (
          <div className="w-6 h-6 flex items-center justify-center">
            <span className="text-gray-500 text-xs">—</span>
          </div>
        )}
      </td>

      {/* Name */}
      <td className="px-3 py-2 text-white font-medium text-sm">
        {variant.name}
      </td>

      {/* Damage */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {variant.damage || '-'}
      </td>

      {/* Heat */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {variant.heat || '-'}
      </td>

      {/* Min R */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {variant.minRange || '0'}
      </td>

      {/* Range */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {rangeDisplay || '-'}
      </td>

      {/* Shots */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {variant.ammoPerTon || '-'}
      </td>

      {/* Base */}
      <td className="px-3 py-2 text-xs">
        <span className={techBaseColors.text}>
          {getTechBaseDisplayName(variant.techBase)}
        </span>
      </td>

      {/* BV */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {variant.battleValue || '-'}
      </td>

      {/* Weight */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {variant.weight}
      </td>

      {/* Crit */}
      <td className="px-3 py-2 text-gray-300 text-sm text-center">
        {variant.crits}
      </td>

      {/* Reference */}
      <td className="px-3 py-2 text-gray-400 text-xs">
        {variant.pageReference ||
          `${variant.introductionYear}, ${variant.rulesLevel}`}
      </td>
    </tr>
  )
}

export function EquipmentBrowser({
  onAddEquipment,
  onEquipmentAction,
  showAddButtons = true,
  actionButtonLabel = "Add to unit",
  actionButtonIcon = "+",
  className = ""
}: EquipmentBrowserProps = {}) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [techBaseFilter, setTechBaseFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Get all equipment data with comprehensive error handling
  const allEquipment = useMemo(() => {
    try {
      console.log('EquipmentBrowser: Flattening equipment data...');
      const flattened = flattenLocalEquipment();
      console.log(`EquipmentBrowser: Generated ${flattened.length} equipment variants`);

      if (flattened.length === 0) {
        console.error('EquipmentBrowser: No equipment data available!');
      } else {
        // Log first few items for verification
        console.log('EquipmentBrowser: Sample equipment:', flattened.slice(0, 3));
      }

      return flattened;
    } catch (error) {
      console.error('EquipmentBrowser: Error generating equipment data:', error);
      return [];
    }
  }, []);

  // Get unique categories and tech bases with validation
  const categories = useMemo(() => {
    try {
      if (allEquipment.length === 0) {
        console.warn('EquipmentBrowser: No equipment available for category filtering');
        return [];
      }

      const cats = Array.from(new Set(allEquipment.map(eq => eq.category))).sort();
      console.log('EquipmentBrowser: Available categories:', cats);
      return cats;
    } catch (error) {
      console.error('EquipmentBrowser: Error generating categories:', error);
      return [];
    }
  }, [allEquipment]);

  const techBases = useMemo(() => {
    return ['IS', 'Clan'];
  }, []);

  // Filter and sort equipment with comprehensive validation
  const filteredAndSortedEquipment = useMemo(() => {
    try {
      let filtered = allEquipment;

      if (filtered.length === 0) {
        console.warn('EquipmentBrowser: No equipment to filter');
        return [];
      }

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(eq =>
          eq.name.toLowerCase().includes(searchLower) ||
          eq.category.toLowerCase().includes(searchLower) ||
          eq.description?.toLowerCase().includes(searchLower)
        );
        console.log(`EquipmentBrowser: Search '${searchTerm}' filtered to ${filtered.length} items`);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(eq => eq.category === categoryFilter);
        console.log(`EquipmentBrowser: Category '${categoryFilter}' filtered to ${filtered.length} items`);
      }

      // Apply tech base filter
      if (techBaseFilter !== 'all') {
        filtered = filtered.filter(eq => eq.techBase === techBaseFilter);
        console.log(`EquipmentBrowser: Tech base '${techBaseFilter}' filtered to ${filtered.length} items`);
      }

      // Sort equipment
      filtered.sort((a, b) => {
        let aVal: any = a.name;
        let bVal: any = b.name;

        switch (sortBy) {
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'weight':
            aVal = a.weight;
            bVal = b.weight;
            break;
          case 'crits':
            aVal = a.crits;
            bVal = b.crits;
            break;
          case 'techBase':
            aVal = a.techBase;
            bVal = b.techBase;
            break;
          case 'damage':
            aVal = a.damage || 0;
            bVal = b.damage || 0;
            break;
          case 'heat':
            aVal = a.heat || 0;
            bVal = b.heat || 0;
            break;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return sortOrder === 'DESC' ? -comparison : comparison;
        } else {
          const comparison = aVal - bVal;
          return sortOrder === 'DESC' ? -comparison : comparison;
        }
      });

      console.log(`EquipmentBrowser: Final filtered and sorted result: ${filtered.length} items`);
      return filtered;

    } catch (error) {
      console.error('EquipmentBrowser: Error filtering/sorting equipment:', error);
      return [];
    }
  }, [allEquipment, searchTerm, categoryFilter, techBaseFilter, sortBy, sortOrder]);

  // Paginate equipment with validation
  const paginatedEquipment = useMemo(() => {
    try {
      if (filteredAndSortedEquipment.length === 0) {
        return [];
      }

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginated = filteredAndSortedEquipment.slice(startIndex, endIndex);

      console.log(`EquipmentBrowser: Page ${currentPage}: showing ${paginated.length} items (${startIndex}-${Math.min(endIndex, filteredAndSortedEquipment.length)} of ${filteredAndSortedEquipment.length})`);

      return paginated;
    } catch (error) {
      console.error('EquipmentBrowser: Error paginating equipment:', error);
      return [];
    }
  }, [filteredAndSortedEquipment, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedEquipment.length / pageSize);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, techBaseFilter, sortBy, sortOrder]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  // Debug information display
  const debugInfo = allEquipment.length === 0 ? (
    <div className="bg-red-900/20 border border-red-600 rounded p-4 mb-4">
      <h3 className="text-red-400 font-bold mb-2">⚠️ Equipment Data Issue</h3>
      <div className="text-red-300 text-sm space-y-1">
        <p>• No equipment data is available</p>
        <p>• Check browser console for detailed error messages</p>
        <p>• ALL_EQUIPMENT_VARIANTS status: {ALL_EQUIPMENT_VARIANTS ? `${ALL_EQUIPMENT_VARIANTS.length} items` : 'undefined'}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className={`h-full flex flex-col bg-gray-800 p-4 rounded-lg border border-gray-700 ${className}`}>
      <h2 className="text-white text-lg font-bold mb-4">Equipment Browser</h2>

      {debugInfo}

      {/* Filters - Fixed at top */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Search */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Search Equipment</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Tech Base Filter */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Tech Base</label>
          <select
            value={techBaseFilter}
            onChange={(e) => setTechBaseFilter(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Tech Bases</option>
            <option value="IS">Inner Sphere</option>
            <option value="Clan">Clan</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Sort By</label>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-')
              setSortBy(newSortBy)
              setSortOrder(newSortOrder as 'ASC' | 'DESC')
            }}
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="name-ASC">Name (A-Z)</option>
            <option value="name-DESC">Name (Z-A)</option>
            <option value="weight-ASC">Weight (Low-High)</option>
            <option value="weight-DESC">Weight (High-Low)</option>
            <option value="crits-ASC">Slots (Low-High)</option>
            <option value="crits-DESC">Slots (High-Low)</option>
            <option value="techBase-ASC">Tech Base</option>
          </select>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results Info - Fixed */}
        <div className="flex-shrink-0 flex justify-between items-center mb-4">
          <div className="text-gray-400 text-sm">
            Showing {paginatedEquipment.length} of {filteredAndSortedEquipment.length} equipment variants
            {totalPages > 0 && ` (Page ${currentPage} of ${totalPages})`}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-gray-400 text-sm">Items per page:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Equipment Table - Scrollable */}
        <div className="flex-1 border border-gray-600 rounded bg-gray-900">
          <div className="max-h-96 overflow-auto">
            {paginatedEquipment.length > 0 ? (
              <table className="w-full text-left table-auto">
                <thead className="sticky top-0 bg-gray-800 z-10">
                  <tr className="border-b border-gray-600">
                    <th className="px-2 py-2 text-gray-300 text-sm font-medium text-center w-12"></th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Name ▲</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Damage</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Heat</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Min R</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Range</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Shots</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Base</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">BV</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Weight</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Crit</th>
                    <th className="px-3 py-2 text-gray-300 text-sm font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEquipment.map((variant) => (
                    <EquipmentRow
                      key={variant.name}
                      variant={variant}
                      onAddEquipment={onAddEquipment}
                      onEquipmentAction={onEquipmentAction}
                      showAddButtons={showAddButtons}
                      actionButtonLabel={actionButtonLabel}
                      actionButtonIcon={actionButtonIcon}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <div className="text-lg mb-2">No Equipment Found</div>
                  <div className="text-sm">
                    {allEquipment.length === 0
                      ? 'Equipment database could not be loaded. Check console for errors.'
                      : 'Try adjusting your search filters to find equipment.'
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination - Fixed at bottom */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 flex justify-center items-center space-x-2 mt-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1 rounded text-sm"
            >
              Previous
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 rounded text-sm ${pageNum === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                    }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1 rounded text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Instructions - Fixed at bottom */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-600">
        <div className="text-gray-400 text-xs">
          <p className="mb-1">• Click <span className="text-green-400">+</span> to add equipment to unallocated list</p>
          <p className="mb-1">• Each variant (IS/Clan) is shown as a separate entry with specific stats</p>
          <p className="mb-1">• Use filters and search to find specific equipment</p>
          <p>• <span className="text-blue-400">IS</span> and <span className="text-green-400">Clan</span> tech bases available</p>
        </div>
      </div>
    </div>
  )
}
