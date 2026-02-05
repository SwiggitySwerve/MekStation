/**
 * Pilot Section Component
 *
 * Displays pilot identity, skills, wounds, career stats, and abilities.
 * Used as part of the PilotMechCard composite component.
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { formatSkills } from '@/services/pilot-mech-card';
import { IPilotMechCardData } from '@/types/pilot/pilot-mech-card';

// =============================================================================
// Types
// =============================================================================

export interface PilotSectionProps {
  /** Pilot-mech card data */
  data: IPilotMechCardData;
  /** Whether to show career stats */
  showCareerStats?: boolean;
  /** Whether to show abilities */
  showAbilities?: boolean;
  /** Whether to show effective stats */
  showEffectiveStats?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Wound tracker display - 6 pips showing current wounds
 */
function WoundTracker({ wounds }: { wounds: number }): React.ReactElement {
  const maxWounds = 6;
  const pips = [];

  for (let i = 0; i < maxWounds; i++) {
    const isWounded = i < wounds;
    pips.push(
      <div
        key={i}
        className={`h-4 w-4 rounded-full border-2 transition-colors ${
          isWounded
            ? 'border-rose-400 bg-rose-500'
            : 'border-border-theme-subtle bg-transparent'
        }`}
        title={isWounded ? `Wound ${i + 1}` : 'No wound'}
      />,
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {pips}
      <span className="text-text-theme-muted ml-2 font-mono text-sm">
        {wounds}/{maxWounds}
      </span>
    </div>
  );
}

/**
 * Career stats row - Missions | Kills | XP
 */
function CareerStats({
  missions,
  kills,
  xp,
}: {
  missions?: number;
  kills?: number;
  xp?: number;
}): React.ReactElement | null {
  if (missions === undefined && kills === undefined && xp === undefined) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      {missions !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-theme-muted">Missions:</span>
          <span className="text-text-theme-primary font-mono">{missions}</span>
        </div>
      )}
      {kills !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-theme-muted">Kills:</span>
          <span className="text-text-theme-primary font-mono">{kills}</span>
        </div>
      )}
      {xp !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-theme-muted">XP:</span>
          <span className="text-accent font-mono">{xp}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Effective stats display - Base To-Hit and Consciousness Target
 */
function EffectiveStats({
  gunnery,
  wounds,
  baseToHit,
  consciousnessTarget,
}: {
  gunnery: number;
  wounds: number;
  baseToHit: number;
  consciousnessTarget: number;
}): React.ReactElement {
  return (
    <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border p-3">
      <h4 className="text-text-theme-muted mb-2 text-xs font-semibold tracking-wider uppercase">
        Combat Stats
      </h4>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-secondary">Base To-Hit</span>
          <span className="text-text-theme-primary font-mono">
            4 + {gunnery} ={' '}
            <span className="text-accent font-semibold">{baseToHit}</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-secondary">Consciousness</span>
          <span className="text-text-theme-primary font-mono">
            3 + {wounds} ={' '}
            <span
              className={`font-semibold ${
                wounds > 3
                  ? 'text-rose-400'
                  : wounds > 0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {consciousnessTarget}+
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PilotSection({
  data,
  showCareerStats = true,
  showAbilities = true,
  showEffectiveStats = true,
  className = '',
}: PilotSectionProps): React.ReactElement {
  const {
    pilotName,
    callsign,
    affiliation,
    rank,
    gunnery,
    piloting,
    wounds,
    status,
    missions,
    kills,
    xp,
    abilities,
    baseToHit,
    consciousnessTarget,
  } = data;

  // Determine status badge variant
  const getStatusVariant = (): 'emerald' | 'amber' | 'rose' | 'muted' => {
    switch (status) {
      case 'Active':
        return 'emerald';
      case 'Injured':
        return 'amber';
      case 'KIA':
      case 'MIA':
        return 'rose';
      default:
        return 'muted';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header: Name and Callsign */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-text-theme-primary text-xl font-bold">
            {callsign ? `"${callsign}"` : pilotName}
          </h3>
          <Badge variant={getStatusVariant()} size="sm">
            {status}
          </Badge>
        </div>
        {callsign && (
          <p className="text-text-theme-secondary mt-0.5 text-sm">
            {pilotName}
          </p>
        )}
        <div className="text-text-theme-muted mt-1 flex items-center gap-2 text-sm">
          {rank && <span>{rank}</span>}
          {rank && affiliation && (
            <span className="text-border-theme-subtle">-</span>
          )}
          {affiliation && <span>{affiliation}</span>}
        </div>
      </div>

      {/* Skills Display */}
      <div className="flex items-center gap-4">
        <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border px-4 py-2">
          <span className="text-text-theme-muted mb-1 block text-xs tracking-wider uppercase">
            Gunnery / Piloting
          </span>
          <span className="text-text-theme-primary font-mono text-2xl font-bold">
            {formatSkills(gunnery, piloting)}
          </span>
        </div>
      </div>

      {/* Wounds Tracker */}
      <div>
        <span className="text-text-theme-muted mb-2 block text-xs tracking-wider uppercase">
          Wounds
        </span>
        <WoundTracker wounds={wounds} />
      </div>

      {/* Career Stats */}
      {showCareerStats && (
        <CareerStats missions={missions} kills={kills} xp={xp} />
      )}

      {/* Effective Stats */}
      {showEffectiveStats && (
        <EffectiveStats
          gunnery={gunnery}
          wounds={wounds}
          baseToHit={baseToHit}
          consciousnessTarget={consciousnessTarget}
        />
      )}

      {/* Abilities */}
      {showAbilities && abilities.length > 0 && (
        <div>
          <span className="text-text-theme-muted mb-2 block text-xs tracking-wider uppercase">
            Abilities
          </span>
          <div className="flex flex-wrap gap-2">
            {abilities.map((ability) => (
              <Badge key={ability} variant="violet" size="md">
                {ability
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PilotSection;
