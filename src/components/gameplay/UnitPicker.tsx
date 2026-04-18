/**
 * UnitPicker
 *
 * Per-side unit picker for the pre-battle skirmish setup screen. Lists
 * canonical units from `CanonicalUnitService.getIndex()`, supports
 * filter-by-name and tonnage range, and emits add/remove events as the
 * user fills (or empties) two slots per side.
 *
 * @spec openspec/changes/add-skirmish-setup-ui/tasks.md § 2 (Per-side Unit Picker)
 */

import { useEffect, useMemo, useState } from 'react';

import type { IUnitIndexEntry } from '@/services/common/types';
import type { ISkirmishUnitSelection } from '@/utils/gameplay/preBattleSessionBuilder';

import { Badge, Card } from '@/components/ui';
import { canonicalUnitService } from '@/services/units/CanonicalUnitService';

// =============================================================================
// Public Props
// =============================================================================

export interface UnitPickerProps {
  /** Visual identifier (Player vs Opponent) — drives accent color. */
  side: 'player' | 'opponent';
  /** Display title (e.g. "Player Force Roster"). */
  title: string;
  /** Maximum unit slots for this side. */
  maxUnits: number;
  /** Currently picked units for this side. */
  selectedUnits: readonly ISkirmishUnitSelection[];
  /** Add a unit to this side. */
  onAdd: (selection: ISkirmishUnitSelection) => void;
  /** Remove a unit from this side by `unitId`. */
  onRemove: (unitId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Convert a catalog index entry into the picker's selection shape.
 * Pilot is always `null` at pick time — the PilotPicker fills it in.
 */
function toSelection(entry: IUnitIndexEntry): ISkirmishUnitSelection {
  return {
    unitId: entry.id,
    designation: `${entry.chassis} ${entry.variant}`.trim(),
    tonnage: entry.tonnage,
    bv: entry.bv ?? 0,
    pilot: null,
  };
}

export function UnitPicker({
  side,
  title,
  maxUnits,
  selectedUnits,
  onAdd,
  onRemove,
}: UnitPickerProps): React.ReactElement {
  const isOpponent = side === 'opponent';
  const accentClass = isOpponent
    ? 'border-red-500/30 text-red-400'
    : 'border-cyan-500/30 text-cyan-400';

  const [catalog, setCatalog] = useState<readonly IUnitIndexEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tonnageFilter, setTonnageFilter] = useState<
    'all' | 'light' | 'medium' | 'heavy' | 'assault'
  >('all');

  // Load the canonical unit index once. Errors surface inline as a
  // non-blocking warning — the parent can still proceed with vault
  // units if the canonical service is unavailable.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    canonicalUnitService
      .getIndex()
      .then((index) => {
        if (cancelled) {
          return;
        }
        setCatalog(index);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load unit catalog',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return (): void => {
      cancelled = true;
    };
  }, []);

  // Apply search + tonnage filter, then exclude duplicates already on
  // this side (spec § 2.3) so the user can't pick the same chassis
  // twice for the same lance.
  const filteredCatalog = useMemo(() => {
    const selectedIds = new Set(selectedUnits.map((u) => u.unitId));
    const query = searchQuery.trim().toLowerCase();

    return catalog
      .filter((entry) => !selectedIds.has(entry.id))
      .filter((entry) => {
        if (!query) {
          return true;
        }
        return (
          entry.name.toLowerCase().includes(query) ||
          entry.chassis.toLowerCase().includes(query) ||
          entry.variant.toLowerCase().includes(query)
        );
      })
      .filter((entry) => {
        switch (tonnageFilter) {
          case 'light':
            return entry.tonnage <= 35;
          case 'medium':
            return entry.tonnage > 35 && entry.tonnage <= 55;
          case 'heavy':
            return entry.tonnage > 55 && entry.tonnage <= 75;
          case 'assault':
            return entry.tonnage > 75;
          default:
            return true;
        }
      })
      .slice(0, 50); // Cap rendering to keep the picker responsive
  }, [catalog, searchQuery, tonnageFilter, selectedUnits]);

  const isFull = selectedUnits.length >= maxUnits;
  const remainingSlots = maxUnits - selectedUnits.length;

  return (
    <Card
      className={`mb-6 border ${accentClass}`}
      data-testid={`${side}-unit-picker`}
    >
      <div className="border-border-theme-subtle border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium ${accentClass}`}>{title}</h3>
          <Badge variant={isOpponent ? 'red' : 'cyan'}>
            {selectedUnits.length} / {maxUnits}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        {selectedUnits.length === 0 ? (
          <p
            className="text-text-theme-muted text-sm italic"
            data-testid={`${side}-empty-roster-msg`}
          >
            No units selected. Pick from the catalog below.
          </p>
        ) : (
          <ul className="mb-4 space-y-2" data-testid={`${side}-selected-units`}>
            {selectedUnits.map((unit) => (
              <li
                key={unit.unitId}
                className="bg-surface-raised border-border-theme-subtle flex items-center justify-between rounded-lg border p-2"
                data-testid={`${side}-selected-unit-${unit.unitId}`}
              >
                <div>
                  <p className="text-text-theme-primary text-sm font-medium">
                    {unit.designation}
                  </p>
                  <p className="text-text-theme-muted text-xs">
                    {unit.tonnage}T · {unit.bv.toLocaleString()} BV
                    {unit.pilot ? (
                      <span className="ml-2 text-emerald-400">
                        · {unit.pilot.callsign} {unit.pilot.gunnery}/
                        {unit.pilot.piloting}
                      </span>
                    ) : (
                      <span className="ml-2 text-amber-400">
                        · pilot needed
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(unit.unitId)}
                  className="text-text-theme-muted text-xs hover:text-red-400"
                  data-testid={`${side}-remove-${unit.unitId}`}
                  aria-label={`Remove ${unit.designation}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {!isFull && (
          <div className="border-border-theme-subtle border-t pt-4">
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="text"
                placeholder="Search by chassis or variant"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-theme text-text-theme-primary border-border-theme rounded border px-2 py-1 text-sm"
                data-testid={`${side}-search-input`}
                aria-label={`Search units for ${title}`}
              />
              <select
                value={tonnageFilter}
                onChange={(e) =>
                  setTonnageFilter(e.target.value as typeof tonnageFilter)
                }
                className="bg-surface-theme text-text-theme-primary border-border-theme rounded border px-2 py-1 text-sm"
                data-testid={`${side}-tonnage-filter`}
                aria-label={`Filter by weight class for ${title}`}
              >
                <option value="all">All weights</option>
                <option value="light">Light (≤35T)</option>
                <option value="medium">Medium (36–55T)</option>
                <option value="heavy">Heavy (56–75T)</option>
                <option value="assault">Assault (76T+)</option>
              </select>
            </div>

            {isLoading ? (
              <p className="text-text-theme-muted text-sm">Loading catalog…</p>
            ) : loadError ? (
              <p
                className="text-sm text-amber-400"
                data-testid={`${side}-catalog-error`}
              >
                Catalog error: {loadError}
              </p>
            ) : filteredCatalog.length === 0 ? (
              <p
                className="text-text-theme-muted text-sm"
                data-testid={`${side}-no-results`}
              >
                No units match the current filter.
              </p>
            ) : (
              <ul
                className="max-h-64 space-y-1 overflow-y-auto"
                data-testid={`${side}-catalog-list`}
                aria-label={`${title} available units (${remainingSlots} slot(s) open)`}
              >
                {filteredCatalog.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onAdd(toSelection(entry))}
                      className="bg-surface-theme hover:bg-surface-raised border-border-theme-subtle flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm transition-colors"
                      data-testid={`${side}-catalog-${entry.id}`}
                      aria-label={`Add ${entry.chassis} ${entry.variant}`}
                    >
                      <span>
                        <span className="text-text-theme-primary font-medium">
                          {entry.chassis} {entry.variant}
                        </span>
                        <span className="text-text-theme-muted ml-2 text-xs">
                          {entry.tonnage}T
                          {entry.bv ? ` · ${entry.bv.toLocaleString()} BV` : ''}
                        </span>
                      </span>
                      <span className="text-text-theme-muted text-xs">Add</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isFull && (
          <p
            className="text-text-theme-muted mt-2 text-xs"
            data-testid={`${side}-roster-full-msg`}
          >
            Roster full ({maxUnits} of {maxUnits}). Remove a unit to swap.
          </p>
        )}
      </div>
    </Card>
  );
}
