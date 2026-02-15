import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import type { UnitData } from '@/pages-modules/units/detail.types';

import {
  Badge,
  Button,
  Card,
  CardSection,
  PageError,
  PageLayout,
  PageLoading,
  StatCard,
  StatGrid,
  StatList,
  StatRow,
  TechBaseBadge,
  WeightClassBadge,
} from '@/components/ui';
import { getUnitTypeDisplay } from '@/pages-modules/units/detail.constants';
import {
  CubeIcon,
  EditIcon,
  FlameIcon,
  ShieldIcon,
  SpeedIcon,
} from '@/pages-modules/units/detail.icons';

export default function CustomUnitDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  const [unit, setUnit] = useState<UnitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function fetchUnit() {
      try {
        const response = await fetch(
          `/api/units/custom/${encodeURIComponent(id as string)}`,
        );
        const data = (await response.json()) as UnitData & { error?: string };

        if (response.ok && data.chassis) {
          setUnit(data);
        } else {
          setError(data.error || 'Unit not found');
        }
      } catch {
        setError('Failed to load unit');
      } finally {
        setLoading(false);
      }
    }

    fetchUnit();
  }, [id]);

  if (loading) {
    return <PageLoading message="Loading unit data..." />;
  }

  if (error || !unit) {
    return (
      <PageError
        title="Unit Not Found"
        message={error || 'The requested unit could not be found.'}
        backLink="/units"
        backLabel="Back to Custom Units"
      />
    );
  }

  const typeDisplay = getUnitTypeDisplay(unit.unitType);
  const unitName = `${unit.chassis} ${unit.variant}`;
  const parsedData = unit.parsedData;

  const engine = parsedData.engine as
    | { type?: string; rating?: number }
    | undefined;
  const movement = parsedData.movement as
    | { walkMP?: number; runMP?: number; jumpMP?: number }
    | undefined;
  const armor = parsedData.armorAllocation as
    | Record<string, number>
    | undefined;
  const totalArmor = parsedData.totalArmorPoints as number | undefined;
  const equipment = parsedData.equipment as
    | Array<{ name: string; location: string }>
    | undefined;
  const heatSinks = parsedData.heatSinks as
    | { type?: string; total?: number }
    | undefined;
  const structure = parsedData.structure as { type?: string } | undefined;
  const quirks = parsedData.quirks as string[] | undefined;
  const role = (parsedData.metadata as { role?: string } | undefined)?.role;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Units', href: '/units' },
    { label: unitName },
  ];

  return (
    <PageLayout
      title={unitName}
      subtitle={
        role ? `Role: ${role}` : `${unit.tonnage} tons • ${unit.techBase}`
      }
      backLink="/units"
      backLabel="Back to Custom Units"
      breadcrumbs={breadcrumbs}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
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
          >
            {typeDisplay.label}
          </Badge>
          <TechBaseBadge techBase={unit.techBase} />
          <WeightClassBadge weightClass={unit.weightClass} />
          <Badge variant="muted">{unit.rulesLevel.replace(/_/g, ' ')}</Badge>
        </div>
        <Link href={`/customizer?id=${encodeURIComponent(unit.id)}`}>
          <Button variant="secondary" size="sm">
            <EditIcon className="mr-1 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <StatGrid cols={2} className="mb-6">
        <StatCard
          title="Physical Properties"
          icon={<CubeIcon />}
          variant="emerald"
        >
          <StatList>
            <StatRow label="Tonnage" value={`${unit.tonnage} tons`} highlight />
            <StatRow label="Weight Class" value={unit.weightClass} />
            {structure?.type && (
              <StatRow
                label="Internal Structure"
                value={structure.type.replace(/_/g, ' ')}
              />
            )}
            {engine?.type && (
              <StatRow
                label="Engine Type"
                value={engine.type.replace(/_/g, ' ')}
              />
            )}
            {engine?.rating && (
              <StatRow label="Engine Rating" value={engine.rating} />
            )}
          </StatList>
        </StatCard>

        <StatCard title="Movement" icon={<SpeedIcon />} variant="cyan">
          <StatList>
            {movement?.walkMP !== undefined && (
              <StatRow label="Walk MP" value={movement.walkMP} highlight />
            )}
            {movement?.runMP !== undefined && (
              <StatRow label="Run MP" value={movement.runMP} />
            )}
            {movement?.jumpMP !== undefined && movement.jumpMP > 0 && (
              <StatRow label="Jump MP" value={movement.jumpMP} />
            )}
          </StatList>
        </StatCard>
      </StatGrid>

      <StatGrid cols={2} className="mb-6">
        <StatCard title="Armor" icon={<ShieldIcon />} variant="rose">
          <StatList>
            {totalArmor !== undefined && (
              <StatRow label="Total Armor" value={totalArmor} highlight />
            )}
            {armor &&
              Object.entries(armor).map(([location, points]) => (
                <StatRow
                  key={location}
                  label={location.replace(/_/g, ' ')}
                  value={points}
                />
              ))}
          </StatList>
        </StatCard>

        {heatSinks && (
          <StatCard
            title="Heat Management"
            icon={<FlameIcon />}
            variant="amber"
          >
            <StatList>
              {heatSinks.total !== undefined && (
                <StatRow label="Heat Sinks" value={heatSinks.total} highlight />
              )}
              {heatSinks.type && (
                <StatRow
                  label="Type"
                  value={heatSinks.type.replace(/_/g, ' ')}
                />
              )}
            </StatList>
          </StatCard>
        )}
      </StatGrid>

      {equipment && equipment.length > 0 && (
        <Card variant="dark" className="mb-6">
          <CardSection title="Mounted Equipment" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border-theme-subtle/50 border-b">
                  <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold uppercase">
                    Equipment
                  </th>
                  <th className="text-text-theme-secondary px-3 py-2 text-left text-xs font-semibold uppercase">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border-theme-subtle/30 divide-y">
                {equipment.map((eq, index) => (
                  <tr key={index} className="hover:bg-surface-raised/10">
                    <td className="text-text-theme-primary px-3 py-2">
                      {eq.name}
                    </td>
                    <td className="text-text-theme-secondary px-3 py-2">
                      {eq.location?.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {quirks && quirks.length > 0 && (
        <Card variant="dark" className="mb-6">
          <CardSection title="Quirks" />
          <div className="flex flex-wrap gap-2">
            {quirks.map((quirk, index) => (
              <Badge key={index} variant="violet">
                {quirk}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card variant="dark">
        <CardSection title="Unit Information" />
        <StatList>
          <StatRow label="Era" value={unit.era} />
          <StatRow label="Version" value={`v${unit.currentVersion}`} />
          <StatRow
            label="Created"
            value={new Date(unit.createdAt).toLocaleDateString()}
          />
          <StatRow
            label="Last Updated"
            value={new Date(unit.updatedAt).toLocaleDateString()}
          />
        </StatList>
      </Card>
    </PageLayout>
  );
}
