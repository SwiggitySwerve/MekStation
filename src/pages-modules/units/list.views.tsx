import Link from 'next/link';
import { useRouter } from 'next/router';

import type { UnitEntry } from '@/pages-modules/units/list.types';

import { Badge, TechBaseBadge } from '@/components/ui';
import { UnitCardCompact } from '@/components/unit-card';
import {
  getUnitTypeDisplay,
  getWeightClassDisplay,
} from '@/pages-modules/units/list.constants';

interface ViewProps {
  units: UnitEntry[];
}

export function UnitGridView({ units }: ViewProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {units.map((unit) => {
        const typeDisplay = getUnitTypeDisplay(unit.unitType);
        const weightDisplay = getWeightClassDisplay(unit.weightClass);

        return (
          <Link key={unit.id} href={`/units/${encodeURIComponent(unit.id)}`}>
            <div className="group bg-surface-base/40 border-border-theme-subtle/50 hover:bg-surface-base/60 hover:border-accent/50 cursor-pointer rounded-lg border p-3 transition-all">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-text-theme-primary group-hover:text-accent/90 line-clamp-1 text-sm leading-tight font-medium">
                    {unit.chassis}
                  </h3>
                  <p className="text-text-theme-secondary truncate text-xs">
                    {unit.variant}
                  </p>
                </div>
                <TechBaseBadge techBase={unit.techBase} />
              </div>

              <div className="text-text-theme-secondary mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className={`font-medium ${weightDisplay.color}`}>
                  {unit.tonnage}t
                </span>
                <span className={weightDisplay.color}>
                  {weightDisplay.label}
                </span>
              </div>

              <Badge
                variant={
                  typeDisplay.badgeVariant as
                    | 'emerald'
                    | 'teal'
                    | 'slate'
                    | 'violet'
                    | 'amber'
                    | 'sky'
                    | 'cyan'
                    | 'fuchsia'
                    | 'rose'
                    | 'lime'
                    | 'yellow'
                }
                size="sm"
              >
                {typeDisplay.label}
              </Badge>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function UnitCardListView({ units }: ViewProps): React.ReactElement {
  const router = useRouter();

  return (
    <div className="space-y-2">
      {units.map((unit) => {
        const weightDisplay = getWeightClassDisplay(unit.weightClass);
        const battleValue = 0;
        const walkMP = 0;
        const runMP = 0;
        const jumpMP = 0;

        return (
          <UnitCardCompact
            key={unit.id}
            id={unit.id}
            name={`${unit.chassis} ${unit.variant}`}
            chassis={unit.chassis}
            model={unit.variant}
            tonnage={unit.tonnage}
            weightClassName={weightDisplay.label}
            techBaseName={unit.techBase}
            battleValue={battleValue}
            rulesLevelName={unit.rulesLevel}
            walkMP={walkMP}
            runMP={runMP}
            jumpMP={jumpMP}
            onClick={() => router.push(`/units/${encodeURIComponent(unit.id)}`)}
          />
        );
      })}
    </div>
  );
}

export function UnitTableView({ units }: ViewProps): React.ReactElement {
  return (
    <div className="bg-surface-base/30 border-border-theme-subtle/50 overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-base/60 border-border-theme-subtle/50 border-b">
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Unit
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Type
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-center text-xs font-semibold tracking-wider uppercase">
                Tech
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-right text-xs font-semibold tracking-wider uppercase">
                Tons
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Class
              </th>
              <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold tracking-wider uppercase">
                Era
              </th>
            </tr>
          </thead>
          <tbody className="divide-border-theme-subtle/30 divide-y">
            {units.map((unit) => {
              const typeDisplay = getUnitTypeDisplay(unit.unitType);
              const weightDisplay = getWeightClassDisplay(unit.weightClass);

              return (
                <tr
                  key={unit.id}
                  className="hover:bg-surface-raised/20 cursor-pointer transition-colors"
                  onClick={() =>
                    (window.location.href = `/units/${encodeURIComponent(unit.id)}`)
                  }
                >
                  <td className="px-3 py-2">
                    <div>
                      <span className="text-text-theme-primary font-medium">
                        {unit.chassis}
                      </span>
                      <span className="text-text-theme-secondary ml-1">
                        {unit.variant}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        typeDisplay.badgeVariant as
                          | 'emerald'
                          | 'teal'
                          | 'slate'
                          | 'violet'
                          | 'amber'
                          | 'sky'
                          | 'cyan'
                          | 'fuchsia'
                          | 'rose'
                          | 'lime'
                          | 'yellow'
                      }
                      size="sm"
                    >
                      {typeDisplay.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TechBaseBadge techBase={unit.techBase} />
                  </td>
                  <td className="text-text-theme-primary/80 px-3 py-2 text-right font-mono">
                    {unit.tonnage}
                  </td>
                  <td className={`px-3 py-2 ${weightDisplay.color}`}>
                    {weightDisplay.label}
                  </td>
                  <td className="text-text-theme-secondary px-3 py-2">
                    {unit.era}
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
