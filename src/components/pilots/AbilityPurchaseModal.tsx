/**
 * Ability Purchase Modal
 * 
 * Modal for browsing and purchasing pilot special abilities.
 * Abilities are grouped by category with visual indicators for status.
 * 
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Button, Badge } from '@/components/ui';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  IPilot,
  ISpecialAbility,
  AbilityCategory,
  getAbilitiesByCategory,
  getAvailableAbilities,
  meetsPrerequisites,
  getAbility,
  SPECIAL_ABILITIES,
} from '@/types/pilot';

// =============================================================================
// Types
// =============================================================================

interface AbilityPurchaseModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal is closed */
  onClose: () => void;
  /** The pilot purchasing abilities */
  pilot: IPilot;
  /** Called when an ability is purchased */
  onPurchase?: () => void;
}

type AbilityStatus = 'owned' | 'available' | 'affordable' | 'missing-prereqs' | 'need-xp';

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_INFO: Record<AbilityCategory, { label: string; icon: React.ReactNode; color: string }> = {
  [AbilityCategory.Gunnery]: {
    label: 'Gunnery',
    color: 'rose',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  [AbilityCategory.Piloting]: {
    label: 'Piloting',
    color: 'cyan',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  [AbilityCategory.Toughness]: {
    label: 'Toughness',
    color: 'emerald',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  [AbilityCategory.Tactical]: {
    label: 'Tactical',
    color: 'violet',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
};

const CATEGORY_COLOR_MAP: Record<string, { badge: 'rose' | 'cyan' | 'emerald' | 'violet'; bg: string; border: string }> = {
  rose: { badge: 'rose', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  cyan: { badge: 'cyan', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  emerald: { badge: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  violet: { badge: 'violet', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
};

// =============================================================================
// Sub-Components
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

function AbilityCard({
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
      return { variant: 'orange' as const, text: `Need ${ability.xpCost - availableXp} more XP` };
    }
    return { variant: 'slate' as const, text: 'Locked' };
  };
  
  const statusBadge = getStatusBadge();

  return (
    <div
      className={`
        relative p-4 rounded-lg border transition-all duration-200
        ${isOwned 
          ? 'bg-emerald-900/10 border-emerald-600/30' 
          : canPurchase 
            ? `${colors.bg} ${colors.border} hover:border-accent/50` 
            : 'bg-surface-raised/20 border-border-theme-subtle/30 opacity-75'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-semibold ${isOwned ? 'text-emerald-400' : 'text-text-theme-primary'}`}>
              {ability.name}
            </h4>
            <Badge variant={statusBadge.variant} size="sm">
              {statusBadge.text}
            </Badge>
          </div>
        </div>
        
        {/* XP Cost */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-lg font-bold tabular-nums ${canPurchase ? 'text-accent' : 'text-text-theme-secondary'}`}>
            {ability.xpCost}
          </div>
          <div className="text-xs text-text-theme-muted">XP</div>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-text-theme-secondary leading-relaxed mb-3">
        {ability.description}
      </p>
      
      {/* Prerequisites */}
      {(ability.prerequisites.length > 0 || ability.minGunnery || ability.minPiloting) && (
        <div className="mb-3 space-y-1">
          <div className="text-xs text-text-theme-muted uppercase tracking-wide">Prerequisites</div>
          <div className="flex flex-wrap gap-2">
            {ability.minGunnery && (
              <Badge 
                variant={missingPrereqs.some(m => m.includes('Gunnery')) ? 'red' : 'slate'} 
                size="sm"
              >
                Gunnery {ability.minGunnery}+
              </Badge>
            )}
            {ability.minPiloting && (
              <Badge 
                variant={missingPrereqs.some(m => m.includes('Piloting')) ? 'red' : 'slate'} 
                size="sm"
              >
                Piloting {ability.minPiloting}+
              </Badge>
            )}
            {ability.prerequisites.map((prereqId) => {
              const prereq = getAbility(prereqId);
              const isMissing = missingPrereqs.some(m => m.includes(prereq?.name || prereqId));
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
        <div className="mb-3 p-2 rounded bg-red-900/20 border border-red-600/20">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )
          }
        >
          {canPurchase ? `Purchase for ${ability.xpCost} XP` : 'Cannot Purchase'}
        </Button>
      )}
      
      {/* Owned Checkmark */}
      {isOwned && (
        <div className="flex items-center justify-center gap-2 text-emerald-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Already Learned</span>
        </div>
      )}
    </div>
  );
}

interface CategorySectionProps {
  category: AbilityCategory;
  abilities: ISpecialAbility[];
  pilot: IPilot;
  onPurchase: (ability: ISpecialAbility) => void;
  purchasingId: string | null;
}

function CategorySection({
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
  const getAbilityStatus = (ability: ISpecialAbility): { status: AbilityStatus; missing: string[] } => {
    if (ownedIds.includes(ability.id)) {
      return { status: 'owned', missing: [] };
    }
    
    const prereqCheck = meetsPrerequisites(
      ability.id,
      pilot.skills.gunnery,
      pilot.skills.piloting,
      ownedIds
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
      'owned': 0,
      'affordable': 1,
      'need-xp': 2,
      'available': 3,
      'missing-prereqs': 4,
    };
    
    const orderDiff = order[statusA.status] - order[statusB.status];
    if (orderDiff !== 0) return orderDiff;
    
    return a.xpCost - b.xpCost;
  });

  return (
    <div className="space-y-4">
      {/* Category Header */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
        <div className={`text-${info.color}-400`}>
          {info.icon}
        </div>
        <div>
          <h3 className="font-semibold text-text-theme-primary">{info.label} Abilities</h3>
          <p className="text-xs text-text-theme-secondary">
            {abilities.length} {abilities.length === 1 ? 'ability' : 'abilities'} available
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={colors.badge} size="sm">
            {ownedIds.filter(id => abilities.some(a => a.id === id)).length} / {abilities.length} owned
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

// =============================================================================
// Main Component
// =============================================================================

export function AbilityPurchaseModal({
  isOpen,
  onClose,
  pilot,
  onPurchase,
}: AbilityPurchaseModalProps): React.ReactElement | null {
  const { purchaseAbility, error } = usePilotStore();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AbilityCategory | 'all'>('all');
  
  // Get abilities grouped by category
  const abilitiesByCategory = useMemo(() => getAbilitiesByCategory(), []);
  
  // Available XP
  const availableXp = pilot.career?.xp ?? 0;
  const ownedIds = (pilot.abilities || []).map((a) => a.abilityId);
  
  // Stats
  const stats = useMemo(() => {
    const total = Object.values(SPECIAL_ABILITIES).length;
    const owned = ownedIds.length;
    const affordable = getAvailableAbilities(
      pilot.skills.gunnery,
      pilot.skills.piloting,
      ownedIds
    ).filter(a => a.xpCost <= availableXp).length;
    
    return { total, owned, affordable };
  }, [ownedIds, pilot.skills, availableXp]);
  
  // Handle purchase
  const handlePurchase = useCallback(async (ability: ISpecialAbility) => {
    setPurchasingId(ability.id);
    const success = await purchaseAbility(pilot.id, ability.id, ability.xpCost);
    setPurchasingId(null);
    
    if (success) {
      onPurchase?.();
    }
  }, [purchaseAbility, pilot.id, onPurchase]);
  
  // Filter categories
  const visibleCategories = selectedCategory === 'all' 
    ? Object.values(AbilityCategory)
    : [selectedCategory];

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      preventClose={purchasingId !== null}
      className="w-[720px] max-h-[85vh] overflow-hidden"
    >
      <div className="flex flex-col h-full max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-theme-subtle bg-surface-deep/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-theme-primary">Special Abilities</h2>
            <p className="text-sm text-text-theme-secondary">
              Enhance {pilot.name}&apos;s combat capabilities
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={purchasingId !== null}
            className="p-2 text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Stats Bar */}
        <div className="px-6 py-3 bg-surface-base border-b border-border-theme-subtle flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-lg font-bold text-accent tabular-nums">{availableXp}</span>
                <span className="text-sm text-text-theme-secondary">XP available</span>
              </div>
              
              <div className="h-6 w-px bg-border-theme-subtle" />
              
              <div className="flex items-center gap-4 text-sm">
                <span className="text-text-theme-secondary">
                  <span className="font-medium text-emerald-400">{stats.owned}</span> owned
                </span>
                <span className="text-text-theme-secondary">
                  <span className="font-medium text-accent">{stats.affordable}</span> purchasable
                </span>
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-surface-raised text-text-theme-secondary hover:text-text-theme-primary border border-border-theme-subtle'
                }`}
              >
                All
              </button>
              {Object.values(AbilityCategory).map((cat) => {
                const info = CATEGORY_INFO[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-accent/20 text-accent border border-accent/30'
                        : 'bg-surface-raised text-text-theme-secondary hover:text-text-theme-primary border border-border-theme-subtle'
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {visibleCategories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              abilities={abilitiesByCategory[category]}
              pilot={pilot}
              onPurchase={handlePurchase}
              purchasingId={purchasingId}
            />
          ))}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 p-4 rounded-lg bg-red-900/20 border border-red-600/30 flex-shrink-0">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border-theme-subtle bg-surface-deep/50 flex-shrink-0">
          <Button variant="secondary" onClick={onClose} disabled={purchasingId !== null}>
            Close
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default AbilityPurchaseModal;
