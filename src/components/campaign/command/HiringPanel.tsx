/**
 * Hiring Panel
 *
 * The Personnel & Hiring surface (CP2b — `add-campaign-command-ui`,
 * design D2). Renders the current personnel-market candidate pool — one
 * card per candidate showing role, skills, hire cost (salary), and the
 * experience-level trait — with a hire action per candidate.
 *
 * The panel owns NO mutation: the hire action is a callback the page
 * wires to `campaignCommandActions.hireCandidate`, which routes through
 * the existing personnel-management hiring logic.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 * @module components/campaign/command/HiringPanel
 */

import React from 'react';

import type { IPersonnelMarketOffer } from '@/types/campaign/markets/marketTypes';

import { CampaignListCard } from '@/components/campaign/CampaignListCard';
import { Badge } from '@/components/ui';
import { Money } from '@/types/campaign/Money';

import { CommandEmpty } from './CommandStates';

// =============================================================================
// Experience Badge
// =============================================================================

/**
 * Map a candidate experience level onto a `Badge` colour. Better-trained
 * recruits read greener; green recruits read amber.
 */
function experienceClasses(level: string): string {
  switch (level) {
    case 'elite':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'veteran':
      return 'bg-sky-500/20 text-sky-400';
    case 'regular':
      return 'bg-slate-500/20 text-slate-300';
    case 'green':
    default:
      return 'bg-amber-500/20 text-amber-400';
  }
}

// =============================================================================
// Candidate Card
// =============================================================================

interface CandidateCardProps {
  /** The personnel-market offer for this candidate. */
  readonly offer: IPersonnelMarketOffer;
  /** Hire callback — invoked with the offer id. */
  readonly onHire: (offerId: string) => void;
  /** True while a hire for this candidate is in flight. */
  readonly isHiring: boolean;
}

/**
 * One personnel-market candidate card — role, skills, salary, and the
 * experience trait, with a hire button.
 */
export function CandidateCard({
  offer,
  onHire,
  isHiring,
}: CandidateCardProps): React.ReactElement {
  // The candidate skill set is a `{ skill: level }` record — flatten it
  // into "gunnery 3 / piloting 4" for display.
  const skillSummary = Object.entries(offer.skills)
    .map(([skill, level]) => `${skill} ${level}`)
    .join(' / ');

  return (
    <CampaignListCard
      testId={`candidate-card-${offer.id}`}
      align="start"
      left={
        <>
          <h3 className="text-text-theme-primary truncate text-base font-semibold">
            {offer.name}
          </h3>
          <p className="text-text-theme-secondary mt-1 text-xs">{offer.role}</p>
          <p
            className="text-text-theme-secondary mt-2 font-mono text-xs"
            data-testid={`candidate-skills-${offer.id}`}
          >
            {skillSummary || 'No skills listed'}
          </p>
          <p
            className="text-text-theme-secondary mt-1 text-xs"
            data-testid={`candidate-salary-${offer.id}`}
          >
            Hire cost: {new Money(offer.hireCost).format()}
          </p>
        </>
      }
      right={
        <div className="flex flex-col items-end gap-3">
          <Badge
            className={experienceClasses(offer.experienceLevel)}
            data-testid={`candidate-traits-${offer.id}`}
          >
            {offer.experienceLevel}
          </Badge>

          <button
            type="button"
            onClick={() => onHire(offer.id)}
            disabled={isHiring}
            className="bg-accent text-surface-base hover:bg-accent/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            data-testid={`candidate-hire-${offer.id}`}
          >
            {isHiring ? 'Hiring…' : 'Hire'}
          </button>
        </div>
      }
    />
  );
}

// =============================================================================
// Panel
// =============================================================================

export interface HiringPanelProps {
  /** The personnel-market candidate pool. */
  readonly candidates: readonly IPersonnelMarketOffer[];
  /** Hire callback — invoked with the offer id of the chosen candidate. */
  readonly onHire: (offerId: string) => void;
  /** Offer id of a hire currently in flight, if any. */
  readonly hiringOfferId?: string | null;
}

/**
 * The Personnel & Hiring panel — a candidate grid over the personnel
 * market. Renders an empty state when the market has no candidates this
 * cycle (design D7 — empty, not error).
 */
export function HiringPanel({
  candidates,
  onHire,
  hiringOfferId,
}: HiringPanelProps): React.ReactElement {
  if (candidates.length === 0) {
    return (
      <CommandEmpty
        title="No candidates on the market"
        message="The personnel market has no recruits this cycle. Advance the day to refresh the hiring pool."
      />
    );
  }

  return (
    <div className="space-y-3" data-testid="hiring-panel-grid">
      {candidates.map((offer) => (
        <CandidateCard
          key={offer.id}
          offer={offer}
          onHire={onHire}
          isHiring={hiringOfferId === offer.id}
        />
      ))}
    </div>
  );
}

export default HiringPanel;
