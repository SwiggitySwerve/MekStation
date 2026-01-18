/**
 * Unit Selector Component
 *
 * Modal dialog for selecting a unit/mech to assign to a force slot.
 * Displays available units with filtering and search.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import React, { useState, useMemo } from 'react';
import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Card, Badge, Button, Input } from '@/components/ui';

// =============================================================================
// Types
// =============================================================================

export interface UnitInfo {
  id: string;
  name: string;
  chassis: string;
  model: string;
  tonnage: number;
  bv: number;
  techBase: 'IS' | 'Clan' | 'Mixed';
  weightClass: 'Light' | 'Medium' | 'Heavy' | 'Assault';
}

export interface UnitSelectorProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called when a unit is selected */
  onSelect: (unitId: string) => void;
  /** Available units to choose from */
  units: readonly UnitInfo[];
  /** Unit IDs that are already assigned (shown as unavailable) */
  assignedUnitIds?: readonly string[];
  /** Title for the dialog */
  title?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getWeightClassVariant(
  weightClass: string
): 'emerald' | 'amber' | 'orange' | 'red' | 'muted' {
  switch (weightClass.toLowerCase()) {
    case 'light':
      return 'emerald';
    case 'medium':
      return 'amber';
    case 'heavy':
      return 'orange';
    case 'assault':
      return 'red';
    default:
      return 'muted';
  }
}

function getTechBaseVariant(
  techBase: string
): 'cyan' | 'emerald' | 'violet' | 'muted' {
  switch (techBase.toLowerCase()) {
    case 'clan':
      return 'cyan';
    case 'is':
      return 'emerald';
    case 'mixed':
      return 'violet';
    default:
      return 'muted';
  }
}

// =============================================================================
// Component
// =============================================================================

export function UnitSelector({
  isOpen,
  onClose,
  onSelect,
  units,
  assignedUnitIds = [],
  title = 'Select Unit',
}: UnitSelectorProps): React.ReactElement | null {
  const [searchQuery, setSearchQuery] = useState('');
  const [weightClassFilter, setWeightClassFilter] = useState<string>('all');
  const [techBaseFilter, setTechBaseFilter] = useState<string>('all');
  const [showAssigned, setShowAssigned] = useState(false);

  // Filter and sort units
  const filteredUnits = useMemo(() => {
    const assignedSet = new Set(assignedUnitIds);

    return units
      .filter((unit) => {
        // Search filter
        const matchesSearch =
          !searchQuery ||
          unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          unit.chassis.toLowerCase().includes(searchQuery.toLowerCase()) ||
          unit.model.toLowerCase().includes(searchQuery.toLowerCase());

        // Weight class filter
        const matchesWeightClass =
          weightClassFilter === 'all' ||
          unit.weightClass.toLowerCase() === weightClassFilter.toLowerCase();

        // Tech base filter
        const matchesTechBase =
          techBaseFilter === 'all' ||
          unit.techBase.toLowerCase() === techBaseFilter.toLowerCase();

        // Assigned filter
        const isAssigned = assignedSet.has(unit.id);
        const matchesAssignedFilter = showAssigned || !isAssigned;

        return (
          matchesSearch &&
          matchesWeightClass &&
          matchesTechBase &&
          matchesAssignedFilter
        );
      })
      .sort((a, b) => {
        // Sort by: unassigned first, then by BV descending
        const aAssigned = assignedSet.has(a.id);
        const bAssigned = assignedSet.has(b.id);

        if (aAssigned !== bAssigned) {
          return aAssigned ? 1 : -1;
        }

        return b.bv - a.bv;
      });
  }, [
    units,
    searchQuery,
    weightClassFilter,
    techBaseFilter,
    showAssigned,
    assignedUnitIds,
  ]);

  const handleSelect = (unitId: string) => {
    onSelect(unitId);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6 space-y-4 max-h-[70vh] flex flex-col">
        {/* Title */}
        <h2 className="text-xl font-semibold text-text-theme-primary">
          {title}
        </h2>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, chassis, or model..."
          className="w-full"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Weight class filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-theme-muted">Weight:</span>
            <select
              value={weightClassFilter}
              onChange={(e) => setWeightClassFilter(e.target.value)}
              className="bg-surface-theme-elevated border border-border-theme-subtle rounded px-2 py-1 text-sm text-text-theme-primary"
            >
              <option value="all">All</option>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy</option>
              <option value="assault">Assault</option>
            </select>
          </div>

          {/* Tech base filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-theme-muted">Tech:</span>
            <select
              value={techBaseFilter}
              onChange={(e) => setTechBaseFilter(e.target.value)}
              className="bg-surface-theme-elevated border border-border-theme-subtle rounded px-2 py-1 text-sm text-text-theme-primary"
            >
              <option value="all">All</option>
              <option value="is">Inner Sphere</option>
              <option value="clan">Clan</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* Show assigned toggle */}
          <label className="flex items-center gap-2 text-sm text-text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showAssigned}
              onChange={(e) => setShowAssigned(e.target.checked)}
              className="rounded border-border-theme-subtle"
            />
            Show assigned
          </label>
        </div>

        {/* Unit list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredUnits.length === 0 ? (
            <div className="text-center py-8 text-text-theme-muted">
              No units found
            </div>
          ) : (
            filteredUnits.map((unit) => {
              const isAssigned = assignedUnitIds.includes(unit.id);

              return (
                <Card
                  key={unit.id}
                  variant={isAssigned ? 'dark' : 'interactive'}
                  onClick={isAssigned ? undefined : () => handleSelect(unit.id)}
                  className={isAssigned ? 'opacity-50' : ''}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-text-theme-primary">
                          {unit.name}
                        </span>
                        <Badge
                          variant={getWeightClassVariant(unit.weightClass)}
                          size="sm"
                        >
                          {unit.weightClass}
                        </Badge>
                        <Badge
                          variant={getTechBaseVariant(unit.techBase)}
                          size="sm"
                        >
                          {unit.techBase}
                        </Badge>
                        {isAssigned && (
                          <Badge variant="muted" size="sm">
                            Assigned
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-text-theme-secondary mt-1">
                        {unit.chassis} {unit.model}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="font-mono text-lg text-accent font-bold">
                        {unit.bv.toLocaleString()}
                      </div>
                      <div className="text-sm text-text-theme-muted font-mono">
                        {unit.tonnage}t
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-text-theme-muted">
          Showing {filteredUnits.length} of {units.length} units
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border-theme-subtle">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
