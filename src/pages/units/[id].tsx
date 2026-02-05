import Link from 'next/link';
/**
 * Custom Unit Detail Page
 * Displays full specifications for a single user-created unit.
 */
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import {
  PageLayout,
  PageLoading,
  PageError,
  Card,
  CardSection,
  Badge,
  TechBaseBadge,
  WeightClassBadge,
  StatRow,
  StatList,
  StatCard,
  StatGrid,
  Button,
} from '@/components/ui';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

interface UnitData {
  id: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  era: string;
  rulesLevel: RulesLevel;
  unitType: string;
  weightClass: WeightClass;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  data: string;
  parsedData: Record<string, unknown>;
}

// Unit type display configuration
const UNIT_TYPE_CONFIG: Record<
  string,
  { label: string; badgeVariant: string }
> = {
  [UnitType.BATTLEMECH]: { label: 'BattleMech', badgeVariant: 'emerald' },
  [UnitType.OMNIMECH]: { label: 'OmniMech', badgeVariant: 'teal' },
  [UnitType.INDUSTRIALMECH]: { label: 'IndustrialMech', badgeVariant: 'slate' },
  [UnitType.PROTOMECH]: { label: 'ProtoMech', badgeVariant: 'violet' },
  [UnitType.VEHICLE]: { label: 'Vehicle', badgeVariant: 'amber' },
  [UnitType.VTOL]: { label: 'VTOL', badgeVariant: 'sky' },
  [UnitType.SUPPORT_VEHICLE]: {
    label: 'Support Vehicle',
    badgeVariant: 'slate',
  },
  [UnitType.AEROSPACE]: { label: 'Aerospace', badgeVariant: 'cyan' },
  [UnitType.CONVENTIONAL_FIGHTER]: {
    label: 'Conv. Fighter',
    badgeVariant: 'sky',
  },
  [UnitType.SMALL_CRAFT]: { label: 'Small Craft', badgeVariant: 'indigo' },
  [UnitType.DROPSHIP]: { label: 'DropShip', badgeVariant: 'fuchsia' },
  [UnitType.JUMPSHIP]: { label: 'JumpShip', badgeVariant: 'purple' },
  [UnitType.WARSHIP]: { label: 'WarShip', badgeVariant: 'rose' },
  [UnitType.SPACE_STATION]: { label: 'Space Station', badgeVariant: 'pink' },
  [UnitType.INFANTRY]: { label: 'Infantry', badgeVariant: 'lime' },
  [UnitType.BATTLE_ARMOR]: { label: 'Battle Armor', badgeVariant: 'yellow' },
};

function getUnitTypeDisplay(unitType: string) {
  return (
    UNIT_TYPE_CONFIG[unitType] || { label: unitType, badgeVariant: 'slate' }
  );
}

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

  // Extract common fields from parsed data
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
      {/* Header with badges and edit button */}
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

      {/* Basic Stats */}
      <StatGrid cols={2} className="mb-6">
        {/* Physical Properties */}
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

        {/* Movement */}
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

      {/* Armor & Heat Management */}
      <StatGrid cols={2} className="mb-6">
        {/* Armor */}
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

        {/* Heat Management */}
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

      {/* Equipment List */}
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

      {/* Quirks */}
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

      {/* Metadata */}
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

// Icon Components
function CubeIcon() {
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
        d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
      />
    </svg>
  );
}

function SpeedIcon() {
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
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function ShieldIcon() {
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
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function FlameIcon() {
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
        d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
      />
    </svg>
  );
}

function EditIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}
