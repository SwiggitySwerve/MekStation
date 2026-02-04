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
import { IPilotMechCardData } from '@/types/pilot/pilot-mech-card';
import { formatSkills } from '@/services/pilot-mech-card';

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
        className={`w-4 h-4 rounded-full border-2 transition-colors ${
          isWounded
            ? 'bg-rose-500 border-rose-400'
            : 'bg-transparent border-border-theme-subtle'
        }`}
        title={isWounded ? `Wound ${i + 1}` : 'No wound'}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {pips}
      <span className="ml-2 text-sm text-text-theme-muted font-mono">
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
          <span className="font-mono text-text-theme-primary">{missions}</span>
        </div>
      )}
      {kills !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-theme-muted">Kills:</span>
          <span className="font-mono text-text-theme-primary">{kills}</span>
        </div>
      )}
      {xp !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-theme-muted">XP:</span>
          <span className="font-mono text-accent">{xp}</span>
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
    <div className="bg-surface-base/50 rounded-lg p-3 border border-border-theme-subtle/50">
      <h4 className="text-xs font-semibold text-text-theme-muted uppercase tracking-wider mb-2">
        Combat Stats
      </h4>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-secondary">Base To-Hit</span>
          <span className="font-mono text-text-theme-primary">
            4 + {gunnery} = <span className="text-accent font-semibold">{baseToHit}</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-secondary">Consciousness</span>
          <span className="font-mono text-text-theme-primary">
            3 + {wounds} ={' '}
            <span
              className={`font-semibold ${
                wounds > 3 ? 'text-rose-400' : wounds > 0 ? 'text-amber-400' : 'text-emerald-400'
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
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xl font-bold text-text-theme-primary">
            {callsign ? `"${callsign}"` : pilotName}
          </h3>
          <Badge variant={getStatusVariant()} size="sm">
            {status}
          </Badge>
        </div>
        {callsign && (
          <p className="text-sm text-text-theme-secondary mt-0.5">
            {pilotName}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 text-sm text-text-theme-muted">
          {rank && <span>{rank}</span>}
          {rank && affiliation && <span className="text-border-theme-subtle">-</span>}
          {affiliation && <span>{affiliation}</span>}
        </div>
      </div>

      {/* Skills Display */}
      <div className="flex items-center gap-4">
        <div className="bg-surface-base/50 rounded-lg px-4 py-2 border border-border-theme-subtle/50">
          <span className="text-xs text-text-theme-muted uppercase tracking-wider block mb-1">
            Gunnery / Piloting
          </span>
          <span className="text-2xl font-bold font-mono text-text-theme-primary">
            {formatSkills(gunnery, piloting)}
          </span>
        </div>
      </div>

      {/* Wounds Tracker */}
      <div>
        <span className="text-xs text-text-theme-muted uppercase tracking-wider block mb-2">
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
          <span className="text-xs text-text-theme-muted uppercase tracking-wider block mb-2">
            Abilities
          </span>
          <div className="flex flex-wrap gap-2">
            {abilities.map((ability) => (
              <Badge key={ability} variant="violet" size="md">
                {ability.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PilotSection;
