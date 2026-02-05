/**
 * Equipment Detail Page (Compendium Section)
 * Displays full specifications for a single equipment item.
 */
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { CompendiumLayout } from '@/components/compendium';
import {
  PageLoading,
  PageError,
  Card,
  CardSection,
  Badge,
  TechBaseBadge,
  StatRow,
  StatList,
  StatCard,
  StatGrid,
} from '@/components/ui';
import { TechBase } from '@/types/enums/TechBase';

interface EquipmentData {
  id: string;
  name: string;
  category?: string;
  techBase?: TechBase;
  rulesLevel?: string;
  weight?: number;
  criticalSlots?: number;
  costCBills?: number;

  // Weapon-specific
  damage?: number;
  heat?: number;
  minimumRange?: number;
  shortRange?: number;
  mediumRange?: number;
  longRange?: number;
  extremeRange?: number;
  ammoPerTon?: number;

  // Temporal
  introductionYear?: number;
  extinctionYear?: number;
  reintroductionYear?: number;

  // Additional
  description?: string;
  specialRules?: string[];
  battleValue?: number;
}

// Category display names
const categoryLabels: Record<string, string> = {
  ENERGY_WEAPON: 'Energy Weapon',
  BALLISTIC_WEAPON: 'Ballistic Weapon',
  MISSILE_WEAPON: 'Missile Weapon',
  AMMUNITION: 'Ammunition',
  PHYSICAL_WEAPON: 'Physical Weapon',
  ELECTRONICS: 'Electronics',
  HEAT_SINK: 'Heat Sink',
  JUMP_JET: 'Jump Jet',
  MYOMER: 'Myomer Enhancement',
  MOVEMENT_ENHANCEMENT: 'Movement Enhancement',
  TARGETING_SYSTEM: 'Targeting System',
  INDUSTRIAL: 'Industrial Equipment',
  MISC_EQUIPMENT: 'Misc Equipment',
};

export default function EquipmentDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  const [equipment, setEquipment] = useState<EquipmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function fetchEquipment() {
      try {
        const response = await fetch(
          `/api/equipment?id=${encodeURIComponent(id as string)}`,
        );
        const data = (await response.json()) as {
          success: boolean;
          data?: EquipmentData;
          error?: string;
        };

        if (data.success && data.data) {
          setEquipment(data.data);
        } else {
          setError(data.error || 'Equipment not found');
        }
      } catch {
        setError('Failed to load equipment');
      } finally {
        setLoading(false);
      }
    }

    fetchEquipment();
  }, [id]);

  if (loading) {
    return <PageLoading message="Loading equipment data..." />;
  }

  if (error || !equipment) {
    return (
      <PageError
        title="Equipment Not Found"
        message={error || 'The requested equipment could not be found.'}
        backLink="/compendium/equipment"
        backLabel="Back to Equipment"
      />
    );
  }

  const isWeapon = equipment.category?.includes('WEAPON');
  const hasRangeData =
    equipment.shortRange || equipment.mediumRange || equipment.longRange;

  // Header with category badges
  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {equipment.category && (
        <Badge variant="cyan">
          {categoryLabels[equipment.category] ||
            equipment.category.replace(/_/g, ' ')}
        </Badge>
      )}
      {equipment.techBase && <TechBaseBadge techBase={equipment.techBase} />}
      {equipment.rulesLevel && (
        <Badge variant="muted">{equipment.rulesLevel.replace(/_/g, ' ')}</Badge>
      )}
    </div>
  );

  return (
    <CompendiumLayout
      title={equipment.name}
      breadcrumbs={[
        { label: 'Equipment', href: '/compendium/equipment' },
        { label: equipment.name },
      ]}
      headerActions={headerActions}
    >
      {/* Basic Stats */}
      <StatGrid cols={2} className="mb-6">
        {/* Physical Properties */}
        <StatCard
          title="Physical Properties"
          icon={<CubeIcon />}
          variant="cyan"
        >
          <StatList>
            {equipment.weight !== undefined && (
              <StatRow label="Weight" value={`${equipment.weight} tons`} />
            )}
            {equipment.criticalSlots !== undefined && (
              <StatRow label="Critical Slots" value={equipment.criticalSlots} />
            )}
            {equipment.costCBills !== undefined && (
              <StatRow
                label="Cost (C-Bills)"
                value={equipment.costCBills.toLocaleString()}
                highlight
              />
            )}
            {equipment.battleValue !== undefined && (
              <StatRow label="Battle Value" value={equipment.battleValue} />
            )}
          </StatList>
        </StatCard>

        {/* Availability */}
        <StatCard title="Availability" icon={<CalendarIcon />} variant="amber">
          <StatList>
            {equipment.introductionYear !== undefined && (
              <StatRow label="Introduced" value={equipment.introductionYear} />
            )}
            {equipment.extinctionYear !== undefined && (
              <StatRow label="Extinct" value={equipment.extinctionYear} />
            )}
            {equipment.reintroductionYear !== undefined && (
              <StatRow
                label="Reintroduced"
                value={equipment.reintroductionYear}
              />
            )}
          </StatList>
        </StatCard>
      </StatGrid>

      {/* Combat Stats (for weapons) */}
      {isWeapon && (
        <StatGrid cols={2} className="mb-6">
          {/* Damage & Heat */}
          <StatCard title="Combat Stats" icon={<FlameIcon />} variant="rose">
            <StatList>
              {equipment.damage !== undefined && (
                <StatRow label="Damage" value={equipment.damage} highlight />
              )}
              {equipment.heat !== undefined && (
                <StatRow label="Heat" value={equipment.heat} />
              )}
              {equipment.ammoPerTon !== undefined && (
                <StatRow label="Ammo/Ton" value={equipment.ammoPerTon} />
              )}
            </StatList>
          </StatCard>

          {/* Range Data */}
          {hasRangeData && (
            <StatCard
              title="Range Profile"
              icon={<TargetIcon />}
              variant="emerald"
            >
              <StatList>
                {equipment.minimumRange !== undefined &&
                  equipment.minimumRange > 0 && (
                    <StatRow label="Minimum" value={equipment.minimumRange} />
                  )}
                {equipment.shortRange !== undefined && (
                  <StatRow label="Short Range" value={equipment.shortRange} />
                )}
                {equipment.mediumRange !== undefined && (
                  <StatRow label="Medium Range" value={equipment.mediumRange} />
                )}
                {equipment.longRange !== undefined && (
                  <StatRow label="Long Range" value={equipment.longRange} />
                )}
                {equipment.extremeRange !== undefined && (
                  <StatRow
                    label="Extreme Range"
                    value={equipment.extremeRange}
                  />
                )}
              </StatList>
            </StatCard>
          )}
        </StatGrid>
      )}

      {/* Special Rules */}
      {equipment.specialRules && equipment.specialRules.length > 0 && (
        <Card variant="dark" className="mb-6">
          <CardSection title="Special Rules" />
          <div className="flex flex-wrap gap-2">
            {equipment.specialRules.map((rule, index) => (
              <Badge key={index} variant="purple">
                {rule}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Description */}
      {equipment.description && (
        <Card variant="dark">
          <CardSection title="Description" />
          <p className="text-text-theme-secondary leading-relaxed">
            {equipment.description}
          </p>
        </Card>
      )}
    </CompendiumLayout>
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

function CalendarIcon() {
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
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
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

function TargetIcon() {
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
        d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
