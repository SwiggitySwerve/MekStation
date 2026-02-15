/**
 * Ability Purchase Card & Category Section
 *
 * Sub-components for the AbilityPurchaseModal.
 * AbilityCard renders individual ability details with purchase controls.
 * CategorySection groups abilities by category with header and sorting.
 */

import React from 'react';

import { Badge, Button } from '@/components/ui';
import {
  IPilot,
  ISpecialAbility,
  AbilityCategory,
  meetsPrerequisites,
  getAbility,
} from '@/types/pilot';

import {
  CATEGORY_INFO,
  CATEGORY_COLOR_MAP,
  type AbilityStatus,
} from './AbilityPurchaseConstants';

// =============================================================================
// Ability Card
// =============================================================================

interface AbilityCardProps {
  ability: ISpecialAbility;
  status: AbilityStatus;
  missingPrereqs: string[];
  availableXp: number;
  onPurchase: () => void;
  isPurchasing: boolean;
  categoryColor: string;
}

export function AbilityCard({
  ability,
  status,
  missingPrereqs,
  availableXp,
  onPurchase,
  isPurchasing,
  categoryColor,
}: AbilityCardProps): React.ReactElement {
  const colors = CATEGORY_COLOR_MAP[categoryColor] || CATEGORY_COLOR_MAP.violet;

  const isOwned = status === 'owned';
  const canPurchase = status === 'affordable';
  const needsXp = status === 'need-xp';
  const missingReqs = status === 'missing-prereqs';

  // Status badge config
  const getStatusBadge = () => {
    if (isOwned) {
      return { variant: 'emerald' as const, text: 'Owned' };
    }
    if (canPurchase) {
      return { variant: 'amber' as const, text: 'Available' };
    }
    if (needsXp) {
      return {
        variant: 'orange' as const,
        text: `Need ${ability.xpCost - availableXp} more XP`,
      };
    }
    return { variant: 'slate' as const, text: 'Locked' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className={`relative rounded-lg border p-4 transition-all duration-200 ${
        isOwned
          ? 'border-emerald-600/30 bg-emerald-900/10'
          : canPurchase
            ? `${colors.bg} ${colors.border} hover:border-accent/50`
            : 'bg-surface-raised/20 border-border-theme-subtle/30 opacity-75'
      } `}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`font-semibold ${isOwned ? 'text-emerald-400' : 'text-text-theme-primary'}`}
            >
              {ability.name}
            </h4>
            <Badge variant={statusBadge.variant} size="sm">
              {statusBadge.text}
            </Badge>
          </div>
        </div>

        {/* XP Cost */}
        <div className="flex-shrink-0 text-right">
          <div
            className={`text-lg font-bold tabular-nums ${canPurchase ? 'text-accent' : 'text-text-theme-secondary'}`}
          >
            {ability.xpCost}
          </div>
          <div className="text-text-theme-muted text-xs">XP</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-text-theme-secondary mb-3 text-sm leading-relaxed">
        {ability.description}
      </p>

      {/* Prerequisites */}
      {(ability.prerequisites.length > 0 ||
        ability.minGunnery ||
        ability.minPiloting) && (
        <div className="mb-3 space-y-1">
          <div className="text-text-theme-muted text-xs tracking-wide uppercase">
            Prerequisites
          </div>
          <div className="flex flex-wrap gap-2">
            {ability.minGunnery && (
              <Badge
                variant={
                  missingPrereqs.some((m) => m.includes('Gunnery'))
                    ? 'red'
                    : 'slate'
                }
                size="sm"
              >
                Gunnery {ability.minGunnery}+
              </Badge>
            )}
            {ability.minPiloting && (
              <Badge
                variant={
                  missingPrereqs.some((m) => m.includes('Piloting'))
                    ? 'red'
                    : 'slate'
                }
                size="sm"
              >
                Piloting {ability.minPiloting}+
              </Badge>
            )}
            {ability.prerequisites.map((prereqId) => {
              const prereq = getAbility(prereqId);
              const isMissing = missingPrereqs.some((m) =>
                m.includes(prereq?.name || prereqId),
              );
              return (
                <Badge
                  key={prereqId}
                  variant={isMissing ? 'red' : 'emerald'}
                  size="sm"
                >
                  {prereq?.name || prereqId}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing Prerequisites Warning */}
      {missingReqs && missingPrereqs.length > 0 && (
        <div className="mb-3 rounded border border-red-600/20 bg-red-900/20 p-2">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="text-xs text-red-400">
              {missingPrereqs.map((msg, i) => (
                <div key={i}>{msg}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!isOwned && (
        <Button
          variant={canPurchase ? 'primary' : 'secondary'}
          size="sm"
          fullWidth
          disabled={!canPurchase || isPurchasing}
          onClick={onPurchase}
          isLoading={isPurchasing}
          leftIcon={
            !isPurchasing && (
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )
          }
        >
          {canPurchase
            ? `Purchase for ${ability.xpCost} XP`
            : 'Cannot Purchase'}
        </Button>
      )}

      {/* Owned Checkmark */}
      {isOwned && (
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">Already Learned</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Category Section
// =============================================================================

interface CategorySectionProps {
  category: AbilityCategory;
  abilities: ISpecialAbility[];
  pilot: IPilot;
  onPurchase: (ability: ISpecialAbility) => void;
  purchasingId: string | null;
}

export function CategorySection({
  category,
  abilities,
  pilot,
  onPurchase,
  purchasingId,
}: CategorySectionProps): React.ReactElement {
  const info = CATEGORY_INFO[category];
  const colors = CATEGORY_COLOR_MAP[info.color];
  const availableXp = pilot.career?.xp ?? 0;
  const ownedIds = (pilot.abilities || []).map((a) => a.abilityId);

  // Calculate status for each ability
  const getAbilityStatus = (
    ability: ISpecialAbility,
  ): { status: AbilityStatus; missing: string[] } => {
    if (ownedIds.includes(ability.id)) {
      return { status: 'owned', missing: [] };
    }

    const prereqCheck = meetsPrerequisites(
      ability.id,
      pilot.skills.gunnery,
      pilot.skills.piloting,
      ownedIds,
    );

    if (!prereqCheck.meets) {
      return { status: 'missing-prereqs', missing: prereqCheck.missing };
    }

    if (availableXp >= ability.xpCost) {
      return { status: 'affordable', missing: [] };
    }

    return { status: 'need-xp', missing: [] };
  };

  // Sort abilities: owned first, then affordable, then by cost
  const sortedAbilities = [...abilities].sort((a, b) => {
    const statusA = getAbilityStatus(a);
    const statusB = getAbilityStatus(b);

    const order: Record<AbilityStatus, number> = {
      owned: 0,
      affordable: 1,
      'need-xp': 2,
      available: 3,
      'missing-prereqs': 4,
    };

    const orderDiff = order[statusA.status] - order[statusB.status];
    if (orderDiff !== 0) return orderDiff;

    return a.xpCost - b.xpCost;
  });

  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div
        className={`flex items-center gap-3 rounded-lg p-3 ${colors.bg} ${colors.border} border`}
      >
        <div className={`text-${info.color}-400`}>{info.icon}</div>
        <div>
          <h3 className="text-text-theme-primary font-semibold">
            {info.label} Abilities
          </h3>
          <p className="text-text-theme-secondary text-xs">
            {abilities.length}{' '}
            {abilities.length === 1 ? 'ability' : 'abilities'} available
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={colors.badge} size="sm">
            {ownedIds.filter((id) => abilities.some((a) => a.id === id)).length}{' '}
            / {abilities.length} owned
          </Badge>
        </div>
      </div>

      {/* Ability Cards */}
      <div className="grid grid-cols-1 gap-3">
        {sortedAbilities.map((ability) => {
          const { status, missing } = getAbilityStatus(ability);
          return (
            <AbilityCard
              key={ability.id}
              ability={ability}
              status={status}
              missingPrereqs={missing}
              availableXp={availableXp}
              onPurchase={() => onPurchase(ability)}
              isPurchasing={purchasingId === ability.id}
              categoryColor={info.color}
            />
          );
        })}
      </div>
    </div>
  );
}
