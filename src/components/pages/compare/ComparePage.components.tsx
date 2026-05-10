import { Card, EmptyState } from '@/components/ui';
import { IUnitEntry, IUnitDetails, calculateTotalArmor } from '@/types/pages';

interface CompareSearchResultsProps {
  catalogLoading: boolean;
  filteredCatalog: IUnitEntry[];
  loadingUnits: Set<string>;
  onAddUnit: (unit: IUnitEntry) => void;
  searchTerm: string;
  selectedUnits: IUnitDetails[];
}

export function CompareSearchResults({
  catalogLoading,
  filteredCatalog,
  loadingUnits,
  onAddUnit,
  searchTerm,
  selectedUnits,
}: CompareSearchResultsProps): React.ReactElement | null {
  if (!searchTerm) {
    return null;
  }

  if (filteredCatalog.length === 0 && !catalogLoading) {
    return (
      <div className="bg-surface-base border-border-theme text-text-theme-secondary absolute top-full right-0 left-0 mt-2 rounded-xl border p-4 text-center">
        No units found matching &quot;{searchTerm}&quot;
      </div>
    );
  }

  if (filteredCatalog.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-base border-border-theme absolute top-full right-0 left-0 z-10 mt-2 overflow-hidden rounded-xl border shadow-xl">
      <ul className="divide-border-theme/50 divide-y">
        {filteredCatalog.map((unit) => {
          const isLoading = loadingUnits.has(unit.id);
          const isAdded = selectedUnits.some((u) => u.id === unit.id);

          return (
            <li key={unit.id}>
              <button
                onClick={() => onAddUnit(unit)}
                disabled={isLoading || isAdded}
                className="hover:bg-surface-raised/50 active:bg-surface-raised min-h-[44px] w-full px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Add ${unit.name} to comparison`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{unit.name}</div>
                    <div className="text-text-theme-secondary text-sm">
                      {unit.tonnage}t - {unit.techBase.replace(/_/g, ' ')}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="loading-spinner loading-spinner-sm" />
                  ) : isAdded ? (
                    <span className="text-sm text-emerald-400">Added</span>
                  ) : (
                    <span className="text-sm text-violet-400">+ Add</span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ComparisonGridProps {
  onRemoveUnit: (id: string) => void;
  selectedUnits: IUnitDetails[];
}

export function ComparisonGrid({
  onRemoveUnit,
  selectedUnits,
}: ComparisonGridProps): React.ReactElement {
  if (selectedUnits.length === 0) {
    return (
      <EmptyState
        icon={<CompareIcon />}
        title="No Units Selected"
        message="Use the search bar above to add units to compare"
      />
    );
  }

  return (
    <>
      <MobileComparisonCards
        onRemoveUnit={onRemoveUnit}
        selectedUnits={selectedUnits}
      />
      <DesktopComparisonTable
        onRemoveUnit={onRemoveUnit}
        selectedUnits={selectedUnits}
      />
    </>
  );
}

interface CompareSlotsHintProps {
  maxCompare: number;
  selectedCount: number;
}

export function CompareSlotsHint({
  maxCompare,
  selectedCount,
}: CompareSlotsHintProps): React.ReactElement | null {
  if (selectedCount === 0 || selectedCount >= maxCompare) {
    return null;
  }

  const remaining = maxCompare - selectedCount;

  return (
    <div className="text-text-theme-secondary mt-4 text-center text-sm">
      You can add {remaining} more unit{remaining > 1 ? 's' : ''} to compare
    </div>
  );
}

function MobileComparisonCards({
  onRemoveUnit,
  selectedUnits,
}: ComparisonGridProps): React.ReactElement {
  return (
    <div className="space-y-4 md:hidden">
      {selectedUnits.map((unit) => (
        <Card key={unit.id} variant="dark" className="overflow-hidden">
          <div className="bg-surface-base border-border-theme/50 flex items-start justify-between border-b p-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {unit.name || `${unit.chassis} ${unit.model}`}
              </h3>
              <p className="text-text-theme-secondary text-sm">
                {unit.tonnage}t - {unit.techBase?.replace(/_/g, ' ')}
              </p>
            </div>
            <RemoveUnitButton onRemoveUnit={onRemoveUnit} unit={unit} />
          </div>
          <div className="divide-border-theme/30 divide-y">
            <MobileStatRow label="Tonnage" value={`${unit.tonnage}t`} mono />
            <MobileStatRow
              label="Walk MP"
              value={unit.movement?.walk || '--'}
              mono
            />
            <MobileStatRow
              label="Run MP"
              value={
                unit.movement?.walk ? Math.ceil(unit.movement.walk * 1.5) : '--'
              }
              mono
            />
            <MobileStatRow
              label="Jump MP"
              value={unit.movement?.jump || 0}
              mono
            />
            <MobileStatRow
              label="Engine"
              value={
                unit.engine ? `${unit.engine.type} ${unit.engine.rating}` : '--'
              }
            />
            <MobileStatRow
              label="Heat Sinks"
              value={
                unit.heatSinks
                  ? `${unit.heatSinks.count} ${unit.heatSinks.type}`
                  : '--'
              }
            />
            <MobileStatRow
              label="Armor Type"
              value={unit.armor?.type || '--'}
            />
            <MobileStatRow
              label="Total Armor"
              value={
                unit.armor ? `${calculateTotalArmor(unit.armor)} pts` : '--'
              }
              mono
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

function DesktopComparisonTable({
  onRemoveUnit,
  selectedUnits,
}: ComparisonGridProps): React.ReactElement {
  return (
    <Card variant="dark" className="hidden overflow-hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-base">
            <tr>
              <th className="text-text-theme-secondary w-40 px-4 py-3 text-left font-medium">
                Stat
              </th>
              {selectedUnits.map((unit) => (
                <th key={unit.id} className="min-w-[200px] px-4 py-3 text-left">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white">
                        {unit.name || `${unit.chassis} ${unit.model}`}
                      </div>
                      <div className="text-text-theme-secondary text-sm">
                        {unit.tonnage}t - {unit.techBase?.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <RemoveUnitButton onRemoveUnit={onRemoveUnit} unit={unit} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border-theme/50 divide-y">
            <CompareRow
              label="Tonnage"
              units={selectedUnits}
              getValue={(u) => `${u.tonnage}t`}
              mono
            />
            <CompareRow
              label="Walk MP"
              units={selectedUnits}
              getValue={(u) => u.movement?.walk || '--'}
              mono
            />
            <CompareRow
              label="Run MP"
              units={selectedUnits}
              getValue={(u) =>
                u.movement?.walk ? Math.ceil(u.movement.walk * 1.5) : '--'
              }
              mono
            />
            <CompareRow
              label="Jump MP"
              units={selectedUnits}
              getValue={(u) => u.movement?.jump || 0}
              mono
            />
            <CompareRow
              label="Engine"
              units={selectedUnits}
              getValue={(u) =>
                u.engine ? `${u.engine.type} ${u.engine.rating}` : '--'
              }
            />
            <CompareRow
              label="Heat Sinks"
              units={selectedUnits}
              getValue={(u) =>
                u.heatSinks ? `${u.heatSinks.count} ${u.heatSinks.type}` : '--'
              }
            />
            <CompareRow
              label="Armor Type"
              units={selectedUnits}
              getValue={(u) => u.armor?.type || '--'}
            />
            <CompareRow
              label="Total Armor"
              units={selectedUnits}
              getValue={(u) =>
                u.armor ? `${calculateTotalArmor(u.armor)} pts` : '--'
              }
              mono
            />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface RemoveUnitButtonProps {
  onRemoveUnit: (id: string) => void;
  unit: IUnitDetails;
}

function RemoveUnitButton({
  onRemoveUnit,
  unit,
}: RemoveUnitButtonProps): React.ReactElement {
  return (
    <button
      onClick={() => onRemoveUnit(unit.id)}
      className="-mt-2 -mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-500 transition-colors hover:text-red-400 active:text-red-500"
      aria-label={`Remove ${unit.name || unit.chassis} from comparison`}
    >
      <CloseIcon />
    </button>
  );
}

interface CompareRowProps {
  getValue: (unit: IUnitDetails) => string | number;
  label: string;
  mono?: boolean;
  units: IUnitDetails[];
}

function CompareRow({
  getValue,
  label,
  mono,
  units,
}: CompareRowProps): React.ReactElement {
  return (
    <tr className="hover:bg-surface-raised/20">
      <td className="text-text-theme-secondary px-4 py-3">{label}</td>
      {units.map((unit) => (
        <td
          key={unit.id}
          className={`px-4 py-3 text-white ${mono ? 'font-mono' : ''}`}
        >
          {getValue(unit)}
        </td>
      ))}
    </tr>
  );
}

interface MobileStatRowProps {
  label: string;
  mono?: boolean;
  value: string | number;
}

function MobileStatRow({
  label,
  mono,
  value,
}: MobileStatRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-text-theme-secondary">{label}</span>
      <span className={`text-white ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function CompareIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-16 w-16"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function CloseIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
