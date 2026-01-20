/**
 * Pilot-Mech Card Component
 *
 * Unified character sheet view combining pilot and mech information.
 * Supports three variants:
 * - compact: Single-row list item (~60px height)
 * - standard: Two-column detail view
 * - gameplay: Active game variant with damage/wound controls
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  IPilotMechCardData,
  PilotMechCardVariant,
  IPilotMechCardCompactProps,
  IPilotMechCardStandardProps,
  IPilotMechCardGameplayProps,
} from '@/types/pilot-mech-card';
import { formatSkills, isPilotCombatReady } from '@/services/pilot-mech-card';
import { PilotSection } from './PilotSection';
import { MechSection } from './MechSection';
import { EffectiveStatsSection } from './EffectiveStatsSection';

// =============================================================================
// Compact Variant
// =============================================================================

/**
 * Compact variant for list views - single row ~60px
 */
export function PilotMechCardCompact({
  data,
  onClick,
  className = '',
}: IPilotMechCardCompactProps): React.ReactElement {
  const isReady = isPilotCombatReady(data);

  // Status badge variant
  const getStatusVariant = (): 'emerald' | 'amber' | 'rose' | 'muted' => {
    if (data.status === 'KIA' || data.status === 'MIA') return 'rose';
    if (data.status === 'Injured') return 'amber';
    if (isReady) return 'emerald';
    return 'muted';
  };

  return (
    <Card
      variant="interactive"
      onClick={onClick}
      className={`group ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Pilot identity & skills */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Ready indicator */}
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isReady ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            title={isReady ? 'Combat Ready' : 'Not Ready'}
          />

          {/* Pilot info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-theme-primary truncate">
                {data.callsign ? `"${data.callsign}"` : data.pilotName}
              </span>
              <span className="text-sm font-mono text-text-theme-secondary">
                ({formatSkills(data.gunnery, data.piloting)})
              </span>
              {data.wounds > 0 && (
                <Badge variant="rose" size="sm">
                  {data.wounds}W
                </Badge>
              )}
            </div>
            {data.callsign && (
              <span className="text-xs text-text-theme-muted truncate block">
                {data.pilotName}
              </span>
            )}
          </div>
        </div>

        {/* Center: Mech name (if assigned) */}
        <div className="hidden sm:block min-w-0 flex-1">
          {data.mech ? (
            <div className="flex items-center gap-2">
              <span className="text-text-theme-primary font-medium truncate">
                {data.mech.name}
              </span>
              <span className="text-sm text-text-theme-muted font-mono">
                {data.mech.tonnage}t
              </span>
            </div>
          ) : (
            <span className="text-text-theme-muted italic text-sm">
              No mech assigned
            </span>
          )}
        </div>

        {/* Right: BV & Status */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant={getStatusVariant()} size="sm">
            {data.status}
          </Badge>
          {data.mech && (
            <div className="text-right">
              <div className="text-xs text-text-theme-muted uppercase tracking-wide">BV</div>
              <div className="text-accent font-bold font-mono">
                {data.mech.battleValue.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Standard Variant
// =============================================================================

/**
 * Standard variant - two-column detail view
 */
export function PilotMechCardStandard({
  data,
  onExport,
  onShare,
  onEditPilot,
  onChangeMech,
  className = '',
}: IPilotMechCardStandardProps): React.ReactElement {
  const hasActions = onExport || onShare || onEditPilot || onChangeMech;

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      {/* Two-column layout on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pilot Section (Left) */}
        <div className="border-b lg:border-b-0 lg:border-r border-border-theme-subtle pb-6 lg:pb-0 lg:pr-6">
          <PilotSection
            data={data}
            showCareerStats={true}
            showAbilities={true}
            showEffectiveStats={false}
          />
        </div>

        {/* Mech Section (Right) */}
        <div className="space-y-4">
          <MechSection
            mech={data.mech}
            onChangeMech={onChangeMech}
            showChangeMechButton={!!onChangeMech}
          />

          {/* Effective Stats */}
          <EffectiveStatsSection data={data} />
        </div>
      </div>

      {/* Action Bar */}
      {hasActions && (
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-border-theme-subtle">
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              Export
            </Button>
          )}
          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare}>
              Share
            </Button>
          )}
          {onEditPilot && (
            <Button variant="secondary" size="sm" onClick={onEditPilot}>
              Edit Pilot
            </Button>
          )}
          {onChangeMech && (
            <Button variant="secondary" size="sm" onClick={onChangeMech}>
              Change Mech
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Gameplay Variant
// =============================================================================

/**
 * Gameplay variant - active game with damage/wound controls
 */
export function PilotMechCardGameplay({
  data,
  currentHeat = 0,
  damageState = {},
  onApplyWound,
  onHealWound,
  onEditPilot,
  onChangeMech,
  className = '',
}: IPilotMechCardGameplayProps): React.ReactElement {
  const isReady = isPilotCombatReady(data);

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      {/* Header with ready status */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-theme-subtle">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isReady ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <h3 className="text-lg font-bold text-text-theme-primary">
            {data.callsign ? `"${data.callsign}"` : data.pilotName}
          </h3>
          <Badge variant={isReady ? 'emerald' : 'rose'} size="sm">
            {isReady ? 'Combat Ready' : 'Not Ready'}
          </Badge>
        </div>
        {data.mech && (
          <div className="text-right">
            <span className="text-text-theme-muted text-sm">BV </span>
            <span className="text-accent font-bold font-mono">
              {data.mech.battleValue.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pilot Section with Wound Controls */}
        <div className="space-y-4">
          <PilotSection
            data={data}
            showCareerStats={false}
            showAbilities={true}
            showEffectiveStats={true}
          />

          {/* Wound Application Buttons */}
          {(onApplyWound || onHealWound) && (
            <div className="flex items-center gap-2 pt-4 border-t border-border-theme-subtle">
              <span className="text-sm text-text-theme-muted">Wounds:</span>
              {onHealWound && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onHealWound}
                  disabled={data.wounds <= 0}
                >
                  - Heal
                </Button>
              )}
              <span className="font-mono font-bold text-text-theme-primary">
                {data.wounds}
              </span>
              {onApplyWound && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={onApplyWound}
                  disabled={data.wounds >= 6}
                >
                  + Wound
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Mech Section with Heat/Damage Display */}
        <div className="space-y-4">
          <MechSection
            mech={data.mech}
            onChangeMech={onChangeMech}
            showChangeMechButton={!!onChangeMech}
          />

          {/* Gameplay Heat Display (Placeholder) */}
          {data.mech && (
            <div className="bg-surface-base/40 rounded-lg p-4 border border-border-theme-subtle/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-text-theme-secondary uppercase tracking-wider">
                  Current Heat
                </span>
                <span
                  className={`text-2xl font-bold font-mono ${
                    currentHeat >= 10
                      ? 'text-rose-400'
                      : currentHeat >= 5
                      ? 'text-amber-400'
                      : 'text-text-theme-primary'
                  }`}
                >
                  {currentHeat}
                </span>
              </div>
              <div className="text-xs text-text-theme-muted italic">
                Heat tracking placeholder - full implementation in gameplay phase
              </div>
            </div>
          )}

          {/* Damage State Placeholder */}
          {data.mech && Object.keys(damageState).length > 0 && (
            <div className="bg-surface-base/40 rounded-lg p-4 border border-border-theme-subtle/50">
              <span className="text-sm font-semibold text-text-theme-secondary uppercase tracking-wider block mb-2">
                Damage State
              </span>
              <div className="text-xs text-text-theme-muted italic">
                Damage tracking placeholder - full implementation in gameplay phase
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-6 mt-6 border-t border-border-theme-subtle">
        {onEditPilot && (
          <Button variant="ghost" size="sm" onClick={onEditPilot}>
            Edit Pilot
          </Button>
        )}
        {onChangeMech && (
          <Button variant="ghost" size="sm" onClick={onChangeMech}>
            Change Mech
          </Button>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Unified Component
// =============================================================================

export interface PilotMechCardProps {
  /** Card data */
  data: IPilotMechCardData;
  /** Display variant */
  variant?: PilotMechCardVariant;
  /** Click handler (compact variant) */
  onClick?: () => void;
  /** Export handler (standard variant) */
  onExport?: () => void;
  /** Share handler (standard variant) */
  onShare?: () => void;
  /** Edit pilot handler */
  onEditPilot?: () => void;
  /** Change mech handler */
  onChangeMech?: () => void;
  /** Apply wound handler (gameplay variant) */
  onApplyWound?: () => void;
  /** Heal wound handler (gameplay variant) */
  onHealWound?: () => void;
  /** Current heat (gameplay variant) */
  currentHeat?: number;
  /** Damage state (gameplay variant) */
  damageState?: Record<string, number>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Unified PilotMechCard component with variant selection
 */
export function PilotMechCard({
  data,
  variant = 'standard',
  onClick,
  onExport,
  onShare,
  onEditPilot,
  onChangeMech,
  onApplyWound,
  onHealWound,
  currentHeat,
  damageState,
  className = '',
}: PilotMechCardProps): React.ReactElement {
  switch (variant) {
    case 'compact':
      return (
        <PilotMechCardCompact
          data={data}
          onClick={onClick}
          className={className}
        />
      );
    case 'gameplay':
      return (
        <PilotMechCardGameplay
          data={data}
          currentHeat={currentHeat}
          damageState={damageState}
          onApplyWound={onApplyWound}
          onHealWound={onHealWound}
          onEditPilot={onEditPilot}
          onChangeMech={onChangeMech}
          className={className}
        />
      );
    case 'standard':
    default:
      return (
        <PilotMechCardStandard
          data={data}
          onExport={onExport}
          onShare={onShare}
          onEditPilot={onEditPilot}
          onChangeMech={onChangeMech}
          className={className}
        />
      );
  }
}

export default PilotMechCard;
