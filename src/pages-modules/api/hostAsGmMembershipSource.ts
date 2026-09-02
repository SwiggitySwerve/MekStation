/**
 * Seat membership never emits role `gm` (finding #55). The private-record
 * writer rechecks membership and then requires that role, so a combat
 * host must be remapped for that write only. The live wire still sees
 * `player`; teaching the seat source to emit `gm` is a different seam.
 */

import type {
  IMembershipRecord,
  IMembershipSource,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

export class HostAsGmMembershipSource implements IMembershipSource {
  public constructor(
    private readonly inner: IMembershipSource,
    private readonly hostPlayerId: string,
  ) {}

  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    const row = await this.inner.lookupMembership(
      principalId,
      campaignSessionId,
    );
    if (row === null || principalId !== this.hostPlayerId) return row;
    return { ...row, role: 'gm' };
  }

  public currentMembershipRevision(campaignSessionId: string): Promise<number> {
    return this.inner.currentMembershipRevision(campaignSessionId);
  }
}
