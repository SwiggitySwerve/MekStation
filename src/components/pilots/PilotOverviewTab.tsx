import { useMemo } from 'react';

import { AwardGrid } from '@/components/award';
import { PilotProgressionPanel } from '@/components/pilots/PilotProgressionPanel';
import { Card, CardSection, Badge, StatRow, StatList } from '@/components/ui';
import {
  IPilot,
  PilotStatus,
  PilotType,
  getPilotRating,
  getSkillLabel,
} from '@/types/pilot';

import { StatusBadge } from './PilotDetailModals';

export interface PilotOverviewTabProps {
  pilot: IPilot;
  pilotId: string;
  onUpdate: () => void;
}

export function PilotOverviewTab({
  pilot,
  pilotId,
  onUpdate,
}: PilotOverviewTabProps): React.ReactElement {
  const isPersistent = pilot.type === PilotType.Persistent;
  const isActive =
    pilot.status === PilotStatus.Active || pilot.status === PilotStatus.Injured;

  const careerStats = useMemo(() => {
    if (!pilot?.career) return null;
    const { missionsCompleted, victories, defeats, draws, totalKills } =
      pilot.career;
    const winRate =
      missionsCompleted > 0
        ? Math.round((victories / missionsCompleted) * 100)
        : 0;
    return {
      missionsCompleted,
      victories,
      defeats,
      draws,
      totalKills,
      winRate,
    };
  }, [pilot?.career]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left Column - Pilot Info */}
      <div className="space-y-6 lg:col-span-1">
        {/* Identity Card */}
        <Card variant="accent-left" accentColor="amber" className="p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="bg-surface-raised border-border-theme-subtle flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border">
              <svg
                className="text-text-theme-secondary h-10 w-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h2 className="text-text-theme-primary truncate text-xl font-bold">
                {pilot.name}
              </h2>
              {pilot.callsign && (
                <p className="text-accent font-medium">
                  &quot;{pilot.callsign}&quot;
                </p>
              )}
              {pilot.affiliation && (
                <p className="text-text-theme-secondary mt-1 text-sm">
                  {pilot.affiliation}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={pilot.status} />
                <Badge variant={isPersistent ? 'emerald' : 'amber'} size="sm">
                  {isPersistent ? 'Persistent' : 'Statblock'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Skills Card */}
        <Card variant="dark">
          <CardSection title="Combat Skills" />
          <div className="flex items-center justify-center gap-12 py-4">
            <div className="text-center">
              <div className="text-accent text-4xl font-bold tabular-nums">
                {pilot.skills.gunnery}
              </div>
              <div className="text-text-theme-secondary mt-1 text-xs">
                Gunnery
              </div>
              <Badge
                variant={
                  pilot.skills.gunnery <= 3
                    ? 'emerald'
                    : pilot.skills.gunnery <= 5
                      ? 'amber'
                      : 'red'
                }
                size="sm"
                className="mt-2"
              >
                {getSkillLabel(pilot.skills.gunnery)}
              </Badge>
            </div>
            <div className="text-border-theme text-5xl font-light">/</div>
            <div className="text-center">
              <div className="text-accent text-4xl font-bold tabular-nums">
                {pilot.skills.piloting}
              </div>
              <div className="text-text-theme-secondary mt-1 text-xs">
                Piloting
              </div>
              <Badge
                variant={
                  pilot.skills.piloting <= 3
                    ? 'emerald'
                    : pilot.skills.piloting <= 5
                      ? 'amber'
                      : 'red'
                }
                size="sm"
                className="mt-2"
              >
                {getSkillLabel(pilot.skills.piloting)}
              </Badge>
            </div>
          </div>
          <div className="text-text-theme-secondary border-border-theme-subtle border-t pt-3 text-center text-sm">
            Pilot Rating:{' '}
            <span className="text-accent font-bold">
              {getPilotRating(pilot.skills)}
            </span>
          </div>
        </Card>

        {/* Wounds Card */}
        {pilot.wounds > 0 && (
          <Card variant="dark" className="border-red-600/30 bg-red-900/10">
            <CardSection title="Wounds" />
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      i < pilot.wounds
                        ? 'border-red-500 bg-red-600'
                        : 'border-border-theme-subtle bg-surface-raised/30'
                    }`}
                  >
                    {i < pilot.wounds && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              <span className="font-medium text-red-400">
                {pilot.wounds}/6 wounds
              </span>
            </div>
            <p className="text-text-theme-secondary mt-3 text-xs">
              Skill penalty: +{pilot.wounds} to all skill checks
            </p>
          </Card>
        )}

        {/* Career Stats Card */}
        {careerStats && (
          <Card variant="dark">
            <CardSection title="Career Statistics" />
            <StatList>
              <StatRow label="Missions" value={careerStats.missionsCompleted} />
              <StatRow label="Victories" value={careerStats.victories} />
              <StatRow label="Defeats" value={careerStats.defeats} />
              <StatRow label="Draws" value={careerStats.draws} />
              <StatRow label="Win Rate" value={`${careerStats.winRate}%`} />
              <StatRow label="Total Kills" value={careerStats.totalKills} />
            </StatList>
          </Card>
        )}

        {/* Awards Section */}
        {isPersistent && (
          <AwardGrid pilotId={pilotId!} showUnearned={true} columns={3} />
        )}
      </div>

      {/* Right Column - Progression Panel */}
      <div className="lg:col-span-2">
        {isPersistent && isActive ? (
          <PilotProgressionPanel pilot={pilot} onUpdate={onUpdate} />
        ) : (
          <Card variant="dark" className="p-8 text-center">
            <div className="bg-surface-raised/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-text-theme-muted h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h3 className="text-text-theme-primary mb-2 text-lg font-semibold">
              Progression Unavailable
            </h3>
            <p className="text-text-theme-secondary mx-auto max-w-md text-sm">
              {!isPersistent
                ? 'Statblock pilots do not track progression. They are intended for quick NPC creation.'
                : `This pilot is ${pilot.status.toLowerCase()} and cannot advance skills or abilities.`}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
