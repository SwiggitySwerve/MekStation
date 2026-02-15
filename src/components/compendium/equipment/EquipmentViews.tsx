/**
 * Equipment View Components (Grid, List, Table)
 * Using centralized colors from equipmentColors.ts
 */
import Link from 'next/link';

import { Badge, TechBaseBadge } from '@/components/ui';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import { getEquipmentDisplayColors } from './equipment.helpers';

export interface EquipmentEntry {
  id: string;
  name: string;
  category?: EquipmentCategory;
  techBase?: TechBase;
  rulesLevel?: RulesLevel;
  weight?: number;
  criticalSlots?: number;
  damage?: number;
  heat?: number;
  costCBills?: number;
  introductionYear?: number;
}

interface ViewProps {
  equipment: EquipmentEntry[];
}

// Grid View - Compact cards (max 3 columns)
export function EquipmentGridView({
  equipment,
}: ViewProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {equipment.map((eq) => {
        const colors = getEquipmentDisplayColors(eq.category, eq.name);

        return (
          <Link
            key={eq.id}
            href={`/compendium/equipment/${encodeURIComponent(eq.id)}`}
          >
            <div className="group bg-surface-base/40 border-border-theme-subtle/50 hover:bg-surface-base/60 hover:border-accent/50 cursor-pointer rounded-lg border p-3 transition-all">
              {/* Header row */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-text-theme-primary group-hover:text-accent/90 line-clamp-1 text-sm leading-tight font-medium">
                  {eq.name}
                </h3>
                {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
              </div>

              {/* Stats row - compact inline */}
              <div className="text-text-theme-secondary mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {eq.weight !== undefined && (
                  <span>
                    <span className="text-text-theme-primary/80 font-mono">
                      {eq.weight}
                    </span>
                    t
                  </span>
                )}
                {eq.criticalSlots !== undefined && (
                  <span>
                    <span className="text-text-theme-primary/80 font-mono">
                      {eq.criticalSlots}
                    </span>{' '}
                    slots
                  </span>
                )}
                {eq.damage !== undefined && (
                  <span>
                    <span className="font-mono text-cyan-400">{eq.damage}</span>{' '}
                    dmg
                  </span>
                )}
                {eq.heat !== undefined && (
                  <span>
                    <span className="text-accent font-mono">{eq.heat}</span>{' '}
                    heat
                  </span>
                )}
              </div>

              {/* Category badge - using centralized colors */}
              {colors && (
                <Badge
                  variant={
                    colors.badgeVariant as
                      | 'rose'
                      | 'amber'
                      | 'sky'
                      | 'violet'
                      | 'fuchsia'
                      | 'slate'
                      | 'yellow'
                      | 'teal'
                      | 'emerald'
                      | 'lime'
                      | 'red'
                  }
                  size="sm"
                >
                  {colors.label}
                </Badge>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// List View - Ultra compact rows
export function EquipmentListView({
  equipment,
}: ViewProps): React.ReactElement {
  return (
    <div className="space-y-1">
      {equipment.map((eq) => {
        const colors = getEquipmentDisplayColors(eq.category, eq.name);

        return (
          <Link
            key={eq.id}
            href={`/compendium/equipment/${encodeURIComponent(eq.id)}`}
          >
            <div className="bg-surface-base/30 hover:bg-surface-base/50 hover:border-border-theme-subtle/50 group flex cursor-pointer items-center gap-3 rounded border border-transparent px-3 py-2 transition-all">
              {/* Category indicator bar - using centralized colors */}
              {colors && (
                <div
                  className={`h-8 w-0.5 rounded-full ${colors.indicatorBg}`}
                />
              )}

              {/* Name */}
              <span className="text-text-theme-primary group-hover:text-accent/90 min-w-0 flex-1 truncate text-sm">
                {eq.name}
              </span>

              {/* Quick stats */}
              <div className="text-text-theme-muted hidden flex-shrink-0 items-center gap-3 text-xs sm:flex">
                {eq.weight !== undefined && (
                  <span className="font-mono">{eq.weight}t</span>
                )}
                {eq.criticalSlots !== undefined && (
                  <span className="font-mono">{eq.criticalSlots}sl</span>
                )}
                {eq.damage !== undefined && (
                  <span className="font-mono text-cyan-500">{eq.damage}d</span>
                )}
                {eq.heat !== undefined && (
                  <span className="text-accent font-mono">{eq.heat}h</span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {colors && (
                  <Badge
                    variant={
                      colors.badgeVariant as
                        | 'rose'
                        | 'amber'
                        | 'sky'
                        | 'violet'
                        | 'fuchsia'
                        | 'slate'
                        | 'yellow'
                        | 'teal'
                        | 'emerald'
                        | 'lime'
                        | 'red'
                    }
                    size="sm"
                  >
                    {colors.label}
                  </Badge>
                )}
                {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
              </div>

              {/* Arrow */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="text-border-theme group-hover:text-text-theme-secondary h-3 w-3 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Table View - Compact data table
export function EquipmentTableView({
  equipment,
}: ViewProps): React.ReactElement {
  return (
    <div className="bg-surface-base/30 border-border-theme-subtle/50 overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-base/60 border-border-theme-subtle/50 border-b">
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Name
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Type
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-center text-xs font-semibold tracking-wider uppercase">
                Tech
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-right text-xs font-semibold tracking-wider uppercase">
                Wt
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-right text-xs font-semibold tracking-wider uppercase">
                Slots
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-right text-xs font-semibold tracking-wider uppercase">
                Dmg
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-right text-xs font-semibold tracking-wider uppercase">
                Heat
              </th>
            </tr>
          </thead>
          <tbody className="divide-border-theme-subtle/30 divide-y">
            {equipment.map((eq) => {
              const colors = getEquipmentDisplayColors(eq.category, eq.name);

              return (
                <tr
                  key={eq.id}
                  className="hover:bg-surface-raised/20 cursor-pointer transition-colors"
                  onClick={() =>
                    (window.location.href = `/compendium/equipment/${encodeURIComponent(eq.id)}`)
                  }
                >
                  <td className="px-3 py-2">
                    <span className="text-text-theme-primary font-medium">
                      {eq.name}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {colors && (
                      <Badge
                        variant={
                          colors.badgeVariant as
                            | 'rose'
                            | 'amber'
                            | 'sky'
                            | 'violet'
                            | 'fuchsia'
                            | 'slate'
                            | 'yellow'
                            | 'teal'
                            | 'emerald'
                            | 'lime'
                            | 'red'
                        }
                        size="sm"
                      >
                        {colors.label}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {eq.techBase && <TechBaseBadge techBase={eq.techBase} />}
                  </td>
                  <td className="text-text-theme-primary/80 px-3 py-2 text-right font-mono">
                    {eq.weight !== undefined ? `${eq.weight}` : '-'}
                  </td>
                  <td className="text-text-theme-primary/80 px-3 py-2 text-right font-mono">
                    {eq.criticalSlots ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-cyan-400">
                    {eq.damage ?? '-'}
                  </td>
                  <td className="text-accent px-3 py-2 text-right font-mono">
                    {eq.heat ?? '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
