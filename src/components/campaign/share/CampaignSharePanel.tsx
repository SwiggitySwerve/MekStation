/**
 * Campaign share panel (task 2.2).
 *
 * Lets the owner of a campaign hand out scoped access, see who currently
 * holds it, and withdraw it.
 *
 * Two presentation decisions carry weight:
 *
 * - Revoked grants stay listed, visibly marked. Dropping them would
 *   leave the owner unable to tell "never shared with them" from
 *   "shared and later withdrawn", which is exactly the question you ask
 *   when auditing access.
 * - A replica renders NO share controls at all. A replica holds someone
 *   else's campaign under a grant that may be narrower than what it
 *   would hand on; the server refuses such a request anyway, but showing
 *   a control that always fails is its own kind of lie.
 *
 * Presentational: the caller owns fetching and mutation, so this panel
 * can be exercised without a live server.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import React from 'react';

import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { CampaignAuthority } from '@/types/campaign/SerializedCampaign';

export interface CampaignSharePanelProps {
  /** Stored D2 authority for the campaign being viewed. */
  readonly authority: CampaignAuthority;
  /** Grants the server reported, newest first; revoked ones included. */
  readonly grants: readonly ICampaignGrant[];
  /** Invoked when the owner withdraws a grant. */
  readonly onRevoke?: (grantId: string) => void;
}

/** Renders one grant row: who holds it, at what scope, and its state. */
function grantRow(
  grant: ICampaignGrant,
  onRevoke: (grantId: string) => void,
): React.ReactElement {
  const revoked = grant.revokedAt != null;
  return (
    <li
      key={grant.grantId}
      data-testid={`share-grant-${grant.grantId}`}
      className="flex items-center justify-between gap-3 rounded border border-slate-700 bg-slate-800/60 px-3 py-2"
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-200">{grant.participantId}</p>
        <p
          data-testid={`share-grant-scopes-${grant.grantId}`}
          className="truncate font-mono text-xs text-slate-400"
        >
          {grant.scopes.join(', ')}
        </p>
      </div>
      {revoked ? (
        <span
          data-testid={`share-grant-revoked-${grant.grantId}`}
          className="rounded bg-slate-700/60 px-2 py-0.5 text-xs text-slate-300"
        >
          revoked
        </span>
      ) : (
        <button
          type="button"
          data-testid={`share-grant-revoke-${grant.grantId}`}
          onClick={() => onRevoke(grant.grantId)}
          className="rounded-lg border border-red-700 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-900/40"
        >
          Revoke
        </button>
      )}
    </li>
  );
}

/**
 * The share surface. Renders the replica notice instead of controls when
 * this host is not the campaign's source.
 */
export function CampaignSharePanel(
  props: CampaignSharePanelProps,
): React.ReactElement {
  const {
    authority,
    grants,
    onRevoke = () => {
      /* caller wires the mutation */
    },
  } = props;

  if (authority.role === 'replica') {
    return (
      <section data-testid="campaign-share-panel" className="mt-4">
        <p
          data-testid="campaign-share-replica-notice"
          className="rounded-lg border border-sky-700 bg-sky-900/30 p-3 text-xs text-sky-200"
        >
          This is a shared copy of a campaign hosted elsewhere. Sharing and
          revoking are done by the campaign owner.
        </p>
      </section>
    );
  }

  return (
    <section data-testid="campaign-share-panel" className="mt-4">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Shared access
      </h3>
      {grants.length === 0 ? (
        <p
          data-testid="campaign-share-empty"
          className="text-sm text-slate-500"
        >
          This campaign has not been shared.
        </p>
      ) : (
        <ul className="space-y-1">
          {grants.map((grant) => grantRow(grant, onRevoke))}
        </ul>
      )}
    </section>
  );
}

export default CampaignSharePanel;
