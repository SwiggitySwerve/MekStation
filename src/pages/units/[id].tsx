/**
 * Unit Detail Page
 * Displays full details for a single unit.
 */
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { IUnitDetails, isArmorFrontRear, calculateTotalArmor } from '@/types/pages';
import {
  PageLayout,
  PageLoading,
  PageError,
  Card,
  CardSection,
  Badge,
  StatRow,
  StatList,
  StatCard,
  StatGrid,
} from '@/components/ui';

export default function UnitDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [unit, setUnit] = useState<IUnitDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function fetchUnit() {
      try {
        const response = await fetch(`/api/units?id=${encodeURIComponent(id as string)}`);
        const data = await response.json() as { success: boolean; data?: IUnitDetails; error?: string };
        
        if (data.success && data.data) {
          setUnit(data.data);
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
        backLabel="Back to Units"
      />
    );
  }

  const displayName = unit.name || `${unit.chassis || ''} ${unit.model || unit.variant || ''}`.trim();
  const totalArmor = calculateTotalArmor(unit.armor);

  return (
    <PageLayout
      title={displayName}
      backLink="/units"
      backLabel="Back to Units"
    >
      {/* Header Card */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="warning">{unit.tonnage} tons</Badge>
              {unit.techBase && (
                <Badge variant="info">{unit.techBase.replace(/_/g, ' ')}</Badge>
              )}
              {unit.unitType && (
                <Badge variant="muted">{unit.unitType}</Badge>
              )}
              {unit.configuration && (
                <Badge variant="muted">{unit.configuration}</Badge>
              )}
            </div>
          </div>
          <div className="text-right text-slate-400 text-sm">
            {unit.era && <div>Era: {unit.era.replace(/_/g, ' ')}</div>}
            {unit.year && <div>Year: {unit.year}</div>}
            {unit.rulesLevel && <div>Rules: {unit.rulesLevel.replace(/_/g, ' ')}</div>}
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <StatGrid cols={3} className="mb-6">
        {/* Movement */}
        <StatCard title="Movement" icon={<MovementIcon />} variant="amber">
          <StatList>
            <StatRow label="Walk MP" value={unit.movement?.walk || '—'} />
            <StatRow
              label="Run MP"
              value={unit.movement?.walk ? Math.ceil(unit.movement.walk * 1.5) : '—'}
            />
            <StatRow label="Jump MP" value={unit.movement?.jump || 0} />
            {unit.movement?.jumpJetType && (
              <StatRow label="Jump Jets" value={unit.movement.jumpJetType} mono={false} />
            )}
          </StatList>
          {unit.movement?.enhancements && unit.movement.enhancements.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-700">
              <span className="text-slate-400 text-sm">Enhancements:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {unit.movement.enhancements.map((e, i) => (
                  <Badge key={i} variant="success" size="sm">{e}</Badge>
                ))}
              </div>
            </div>
          )}
        </StatCard>

        {/* Engine & Structure */}
        <StatCard title="Core Systems" icon={<GearIcon />} variant="cyan">
          <StatList>
            {unit.engine && (
              <>
                <StatRow label="Engine" value={unit.engine.type} mono={false} />
                <StatRow label="Rating" value={unit.engine.rating} />
              </>
            )}
            {unit.gyro && (
              <StatRow label="Gyro" value={unit.gyro.type} mono={false} />
            )}
            {unit.cockpit && (
              <StatRow label="Cockpit" value={unit.cockpit} mono={false} />
            )}
            {unit.structure && (
              <StatRow label="Structure" value={unit.structure.type} mono={false} />
            )}
          </StatList>
        </StatCard>

        {/* Heat & Armor */}
        <StatCard title="Heat & Armor" icon={<FlameIcon />} variant="rose">
          <StatList>
            {unit.heatSinks && (
              <>
                <StatRow label="Heat Sinks" value={unit.heatSinks.count} />
                <StatRow label="Type" value={unit.heatSinks.type} mono={false} />
              </>
            )}
            {unit.armor && (
              <>
                <StatRow label="Armor Type" value={unit.armor.type} mono={false} />
                <StatRow label="Total Armor" value={`${totalArmor} pts`} />
              </>
            )}
          </StatList>
        </StatCard>
      </StatGrid>

      {/* Armor Allocation */}
      {unit.armor?.allocation && (
        <Card variant="dark" className="mb-6">
          <CardSection title="Armor Allocation" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(unit.armor.allocation).map(([location, value]) => (
              <div key={location} className="bg-slate-700/30 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs uppercase mb-1">
                  {location.replace(/_/g, ' ')}
                </div>
                <div className="text-white font-mono">
                  {typeof value === 'number' ? (
                    value
                  ) : isArmorFrontRear(value) ? (
                    <>
                      {value.front}
                      {value.rear > 0 && (
                        <span className="text-slate-500 text-sm"> / {value.rear}</span>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Equipment */}
      {unit.equipment && unit.equipment.length > 0 && (
        <Card variant="dark" className="mb-6 overflow-hidden">
          <CardSection title="Equipment" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr className="text-left text-slate-400 text-sm uppercase">
                  <th className="px-4 py-3">Equipment</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {unit.equipment.map((eq, index) => (
                  <tr key={index} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-white">{eq.id}</td>
                    <td className="px-4 py-3 text-slate-300">{eq.location}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {eq.isRearMounted && (
                        <Badge variant="warning" size="sm">Rear</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quirks */}
      {unit.quirks && unit.quirks.length > 0 && (
        <Card variant="dark">
          <CardSection title="Quirks" />
          <div className="flex flex-wrap gap-2">
            {unit.quirks.map((quirk, index) => (
              <Badge key={index} variant="purple">{quirk}</Badge>
            ))}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}

// Icon Components
function MovementIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  );
}
