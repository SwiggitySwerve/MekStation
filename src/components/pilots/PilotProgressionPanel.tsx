/**
 * Pilot Progression Panel
 *
 * Displays pilot XP, skills, and upgrade options. Hosts the SPA editor
 * via `<PilotAbilitiesPanel>` (Phase 5 Wave 2a) — the legacy
 * `AbilityPurchaseModal` was retired so we don't ship two SPA UIs.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 * @spec openspec/changes/add-pilot-spa-editor-integration/proposal.md
 */

import React, { useState } from 'react';

import { Badge, Button, Card } from '@/components/ui';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  IPilot,
  MIN_SKILL_VALUE,
  getGunneryImprovementCost,
  getPilotingImprovementCost,
  getSkillLabel,
} from '@/types/pilot';

import { PilotAbilitiesPanel } from './PilotAbilitiesPanel';

// =============================================================================
// Types
// =============================================================================

interface PilotProgressionPanelProps {
  /** The pilot to display progression for */
  pilot: IPilot;
  /** Optional callback when pilot is updated */
  onUpdate?: () => void;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface SkillUpgradeRowProps {
  label: string;
  currentValue: number;
  xpCost: number | null;
  availableXp: number;
  onUpgrade: () => void;
  isUpgrading: boolean;
}

function SkillUpgradeRow({
  label,
  currentValue,
  xpCost,
  availableXp,
  onUpgrade,
  isUpgrading,
}: SkillUpgradeRowProps): React.ReactElement {
  const skillLabel = getSkillLabel(currentValue);
  const canAfford = xpCost !== null && availableXp >= xpCost;
  const isMaxed = currentValue <= MIN_SKILL_VALUE;

  // Color based on skill level
  const getSkillColor = (value: number): string => {
    if (value <= 2) return 'text-emerald-400';
    if (value <= 3) return 'text-cyan-400';
    if (value <= 4) return 'text-accent';
    if (value <= 5) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBadgeVariant = (
    value: number,
  ): 'emerald' | 'cyan' | 'amber' | 'orange' | 'red' => {
    if (value <= 2) return 'emerald';
    if (value <= 3) return 'cyan';
    if (value <= 4) return 'amber';
    if (value <= 5) return 'orange';
    return 'red';
  };

  return (
    <div className="bg-surface-raised/30 border-border-theme-subtle/50 group hover:border-border-theme/50 flex items-center justify-between rounded-lg border p-4 transition-all">
      {/* Skill Info */}
      <div className="flex items-center gap-4">
        <div className="bg-surface-deep/80 border-border-theme-subtle flex h-14 w-14 items-center justify-center rounded-lg border">
          <span
            className={`text-2xl font-bold tabular-nums ${getSkillColor(currentValue)}`}
          >
            {currentValue}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-text-theme-primary font-semibold">
              {label}
            </span>
            <Badge variant={getBadgeVariant(currentValue)} size="sm">
              {skillLabel}
            </Badge>
          </div>
          {!isMaxed && xpCost !== null && (
            <p className="text-text-theme-secondary mt-1 text-xs">
              Upgrade cost:{' '}
              <span className="text-accent font-medium">{xpCost} XP</span>
              {currentValue > 1 && (
                <span className="text-text-theme-muted ml-2">
                  ({currentValue} &rarr; {currentValue - 1})
                </span>
              )}
            </p>
          )}
          {isMaxed && (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Maximum level reached
            </p>
          )}
        </div>
      </div>

      {/* Upgrade Button */}
      <Button
        variant={canAfford ? 'primary' : 'secondary'}
        size="sm"
        disabled={!canAfford || isMaxed || isUpgrading}
        onClick={onUpgrade}
        isLoading={isUpgrading}
        leftIcon={
          !isUpgrading &&
          !isMaxed && (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          )
        }
      >
        {isMaxed ? 'Maxed' : canAfford ? 'Upgrade' : 'Need XP'}
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PilotProgressionPanel({
  pilot,
  onUpdate,
}: PilotProgressionPanelProps): React.ReactElement {
  const { improveGunnery, improvePiloting, error } = usePilotStore();
  const [isUpgradingGunnery, setIsUpgradingGunnery] = useState(false);
  const [isUpgradingPiloting, setIsUpgradingPiloting] = useState(false);

  // Calculate XP and costs
  const availableXp = pilot.career?.xp ?? 0;
  const totalXpEarned = pilot.career?.totalXpEarned ?? 0;
  const gunneryCost = getGunneryImprovementCost(pilot.skills.gunnery);
  const pilotingCost = getPilotingImprovementCost(pilot.skills.piloting);

  // Handlers
  const handleUpgradeGunnery = async () => {
    setIsUpgradingGunnery(true);
    const success = await improveGunnery(pilot.id);
    setIsUpgradingGunnery(false);
    if (success) {
      onUpdate?.();
    }
  };

  const handleUpgradePiloting = async () => {
    setIsUpgradingPiloting(true);
    const success = await improvePiloting(pilot.id);
    setIsUpgradingPiloting(false);
    if (success) {
      onUpdate?.();
    }
  };

  // The Phase 5 SPA editor decides creation-flow gating from the URL
  // query (`?creating=1`) so the create page can hand off to the detail
  // page without forking layout. Outside that window the panel renders
  // the same chrome but disables Remove + flaws + origin-only.
  const isCreationFlow =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('creating') === '1';

  return (
    <div className="space-y-6">
      {/* XP Display */}
      <Card variant="accent-left" accentColor="amber" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-text-theme-primary flex items-center gap-2 text-lg font-semibold">
              <svg
                className="text-accent h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Experience Points
            </h3>
            <p className="text-text-theme-secondary mt-1 text-sm">
              Use XP to improve skills and unlock abilities
            </p>
          </div>
          <div className="text-right">
            <div className="text-accent text-4xl font-bold tabular-nums">
              {availableXp}
            </div>
            <div className="text-text-theme-muted mt-1 text-xs">
              {totalXpEarned} total earned
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="border-border-theme-subtle/30 mt-4 border-t pt-4">
          <div className="text-text-theme-secondary mb-2 flex justify-between text-xs">
            <span>Available</span>
            <span>Spent: {totalXpEarned - availableXp} XP</span>
          </div>
          <div className="bg-surface-deep h-2 overflow-hidden rounded-full">
            <div
              className="from-accent h-full bg-gradient-to-r to-amber-500 transition-all duration-500"
              style={{
                width:
                  totalXpEarned > 0
                    ? `${(availableXp / totalXpEarned) * 100}%`
                    : '0%',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-text-theme-primary text-lg font-semibold">
            Combat Skills
          </h3>
          <Badge variant="slate" size="sm">
            {pilot.skills.gunnery}/{pilot.skills.piloting}
          </Badge>
        </div>

        <div className="space-y-3">
          <SkillUpgradeRow
            label="Gunnery"
            currentValue={pilot.skills.gunnery}
            xpCost={gunneryCost}
            availableXp={availableXp}
            onUpgrade={handleUpgradeGunnery}
            isUpgrading={isUpgradingGunnery}
          />

          <SkillUpgradeRow
            label="Piloting"
            currentValue={pilot.skills.piloting}
            xpCost={pilotingCost}
            availableXp={availableXp}
            onUpgrade={handleUpgradePiloting}
            isUpgrading={isUpgradingPiloting}
          />
        </div>
      </div>

      {/* Abilities Section — Phase 5 Wave 2a SPA editor */}
      <PilotAbilitiesPanel
        pilot={pilot}
        isCreationFlow={isCreationFlow}
        onPilotChange={onUpdate}
      />

      {/* Skill-upgrade error display (panel manages its own SPA errors). */}
      {error && (
        <div className="rounded-lg border border-red-600/30 bg-red-900/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

export default PilotProgressionPanel;
