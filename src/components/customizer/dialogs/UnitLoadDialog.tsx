/**
 * Unit Load Dialog Component
 * 
 * Dialog for loading existing units (canonical or custom) into a new tab.
 * Provides search and filtering capabilities.
 * 
 * @spec openspec/specs/customizer-toolbar/spec.md
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModalOverlay } from './ModalOverlay';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitService } from '@/services/units/CustomUnitService';
import { IUnitIndexEntry } from '@/services/common/types';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

// =============================================================================
// Types
// =============================================================================

export interface UnitLoadDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Called when a unit is selected for loading */
  onLoadUnit: (unit: IUnitIndexEntry) => void;
  /** Called when dialog is cancelled */
  onCancel: () => void;
}

type UnitSource = 'all' | 'canonical' | 'custom';

interface UnitWithSource extends IUnitIndexEntry {
  source: 'canonical' | 'custom';
}

// =============================================================================
// Component
// =============================================================================

export function UnitLoadDialog({
  isOpen,
  onLoadUnit,
  onCancel,
}: UnitLoadDialogProps) {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [techBaseFilter, setTechBaseFilter] = useState<TechBase | 'all'>('all');
  const [weightClassFilter, setWeightClassFilter] = useState<WeightClass | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<UnitSource>('all');
  
  // Data state
  const [canonicalUnits, setCanonicalUnits] = useState<IUnitIndexEntry[]>([]);
  const [customUnits, setCustomUnits] = useState<IUnitIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<UnitWithSource | null>(null);
  
  // Load units when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    
    setIsLoading(true);
    setSelectedUnit(null);
    setSearchQuery('');
    
    Promise.all([
      canonicalUnitService.getIndex(),
      customUnitService.list(),
    ]).then(([canonical, custom]) => {
      setCanonicalUnits([...canonical]);
      setCustomUnits([...custom]);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Failed to load units:', error);
      setIsLoading(false);
    });
  }, [isOpen]);
  
  // Combine and filter units
  const filteredUnits = useMemo(() => {
    // Combine with source tagging
    const allUnits: UnitWithSource[] = [
      ...(sourceFilter !== 'custom' ? canonicalUnits.map(u => ({ ...u, source: 'canonical' as const })) : []),
      ...(sourceFilter !== 'canonical' ? customUnits.map(u => ({ ...u, source: 'custom' as const })) : []),
    ];
    
    // Apply filters
    return allUnits.filter(unit => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = `${unit.chassis} ${unit.variant}`.toLowerCase();
        if (!name.includes(query)) {
          return false;
        }
      }
      
      // Tech base filter
      if (techBaseFilter !== 'all' && unit.techBase !== techBaseFilter) {
        return false;
      }
      
      // Weight class filter
      if (weightClassFilter !== 'all' && unit.weightClass !== weightClassFilter) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort: custom first, then by name
      if (a.source !== b.source) {
        return a.source === 'custom' ? -1 : 1;
      }
      return `${a.chassis} ${a.variant}`.localeCompare(`${b.chassis} ${b.variant}`);
    });
  }, [canonicalUnits, customUnits, searchQuery, techBaseFilter, weightClassFilter, sourceFilter]);
  
  // Handle load
  const handleLoad = useCallback(() => {
    if (selectedUnit) {
      onLoadUnit(selectedUnit);
    }
  }, [selectedUnit, onLoadUnit]);
  
  // Handle double-click to load immediately
  const handleDoubleClick = useCallback((unit: UnitWithSource) => {
    onLoadUnit(unit);
  }, [onLoadUnit]);
  
  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onCancel}
      className="w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-lg font-medium text-white">Load Unit from Library</h3>
        <button
          onClick={onCancel}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Search and filters */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        {/* Search input */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by chassis or variant..."
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as UnitSource)}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sources</option>
            <option value="custom">Custom Only</option>
            <option value="canonical">Official Only</option>
          </select>
          
          {/* Tech base filter */}
          <select
            value={techBaseFilter}
            onChange={(e) => setTechBaseFilter(e.target.value as TechBase | 'all')}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tech Bases</option>
            <option value={TechBase.INNER_SPHERE}>Inner Sphere</option>
            <option value={TechBase.CLAN}>Clan</option>
          </select>
          
          {/* Weight class filter */}
          <select
            value={weightClassFilter}
            onChange={(e) => setWeightClassFilter(e.target.value as WeightClass | 'all')}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Weight Classes</option>
            <option value={WeightClass.LIGHT}>Light (20-35t)</option>
            <option value={WeightClass.MEDIUM}>Medium (40-55t)</option>
            <option value={WeightClass.HEAVY}>Heavy (60-75t)</option>
            <option value={WeightClass.ASSAULT}>Assault (80-100t)</option>
          </select>
        </div>
      </div>
      
      {/* Unit list */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading units...
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No units found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredUnits.map((unit) => (
              <button
                key={unit.id}
                onClick={() => setSelectedUnit(unit)}
                onDoubleClick={() => handleDoubleClick(unit)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  selectedUnit?.id === unit.id
                    ? 'bg-blue-600/20 border-l-2 border-blue-500'
                    : 'hover:bg-slate-700/50 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{unit.chassis} {unit.variant}</span>
                      {unit.source === 'custom' && (
                        <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">Custom</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400 mt-0.5">
                      {unit.tonnage}t • {unit.techBase} • {unit.weightClass}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50">
        <span className="text-sm text-slate-400">
          {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} found
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selectedUnit}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
              selectedUnit
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            Load Unit
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

