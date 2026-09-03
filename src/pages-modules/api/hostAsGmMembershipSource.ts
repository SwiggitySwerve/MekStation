/**
 * Private-record writes require role `gm`. Campaign GMs now emit that
 * role from the durable seat; a tactical host still arrives as
 * `player`. This wrapper remaps the match host for that write only so
 * rewind private records keep working on non-campaign matches.
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
