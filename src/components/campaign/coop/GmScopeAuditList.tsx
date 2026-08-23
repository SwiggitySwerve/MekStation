/**
 * GM scope audit list (task 3.6).
 *
 * Renders the campaign event stream the GM receives WITH each event's
 * scope shown. The scope classification decided at emission is what
 * every downstream filter, projection, and snapshot obeys, so if a
 * misclassification is not visible to a human it is not auditable at
 * all - this list is the surface that makes it visible.
 *
 * GM-only by construction: the caller renders it solely on the host
 * surface, and a guest is never handed the full stream to render.
 */

import type {
  CampaignEventScope,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

export interface GmScopeAuditListProps {
  /** Events in receipt order; the newest is rendered first. */
  readonly events: readonly ICampaignEvent[];
  /** Cap on rendered rows so a long campaign cannot flood the panel. */
  readonly limit?: number;
}

const DEFAULT_LIMIT = 25;

/**
 * Chip classes per scope. Distinct hues make a misfiled event stand out
 * at a glance; every class here already appears elsewhere in the
 * campaign components.
 */
function scopeChipClass(scope: CampaignEventScope): string {
  if (scope === 'gm') return 'bg-amber-500/20 text-amber-200';
  if (scope === 'campaign') return 'bg-emerald-500/20 text-emerald-200';
  return 'bg-sky-600/20 text-sky-200';
}

/**
 * One audit row: sequence, event type, and the scope it was stamped
 * with at emission.
 */
function auditRow(event: ICampaignEvent): React.ReactElement {
  return (
    <li
      key={`${event.sequence}-${event.type}`}
      data-testid={`gm-scope-audit-row-${event.sequence}`}
      className="flex items-center justify-between gap-3 rounded border border-slate-700 bg-slate-800/60 px-2 py-1.5"
    >
      <span className="font-mono text-xs text-slate-400">{event.sequence}</span>
      <span className="flex-1 truncate text-xs text-slate-200">
        {event.type}
      </span>
      <span
        data-testid={`gm-scope-audit-scope-${event.sequence}`}
        className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${scopeChipClass(event.scope)}`}
      >
        {event.scope}
      </span>
    </li>
  );
}

/**
 * The GM's per-event scope audit panel. Renders nothing when the stream
 * is empty so an idle campaign shows no empty chrome.
 */
export function GmScopeAuditList(
  props: GmScopeAuditListProps,
): React.ReactElement | null {
  const { events, limit = DEFAULT_LIMIT } = props;
  if (events.length === 0) return null;
  const rows = [...events].reverse().slice(0, limit);
  return (
    <section data-testid="gm-scope-audit" className="mt-4">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Event scope audit
      </h3>
      <ul className="space-y-1">{rows.map((event) => auditRow(event))}</ul>
    </section>
  );
}

export default GmScopeAuditList;
