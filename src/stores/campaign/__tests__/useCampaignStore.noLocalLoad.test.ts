/**
 * The campaign store has no local `loadCampaign`.
 *
 * It was the only reader of the `campaign-<id>` localStorage record, and
 * nothing in production called it: every route and page loads through
 * `useCampaignPersistenceStore.loadCampaign` (the server record). It merged the
 * separately persisted child-store blobs on top of the record, which tore
 * between the two writes (a lost contract-closure credit at 3 of 8 write
 * boundaries). The record is still written; nothing reads it.
 *
 * A local reload is `createCampaignStore()` (the zustand rehydrate of the
 * `campaign-store` blob), which `campaignDayCrashWindows.test.ts` covers at
 * every write boundary.
 *
 * @spec openspec/changes/remove-local-load-campaign/specs/campaign-persistence/spec.md
 */
import type { CampaignStore } from '../useCampaignStore.types';

import { createCampaignStore } from '../useCampaignStore';

// Compile-time: re-adding the member to `CampaignStore` makes this `never`
// and fails `npm run typecheck`.
type HasLoadCampaign = 'loadCampaign' extends keyof CampaignStore
  ? never
  : true;
const noLoadCampaignOnType: HasLoadCampaign = true;

describe('the campaign store has no local loadCampaign', () => {
  it('does not declare it on CampaignStore', () => {
    expect(noLoadCampaignOnType).toBe(true);
  });

  it('does not expose it on a created store', () => {
    const state = createCampaignStore().getState() as unknown as Record<
      string,
      unknown
    >;
    expect(state.loadCampaign).toBeUndefined();
  });
});
