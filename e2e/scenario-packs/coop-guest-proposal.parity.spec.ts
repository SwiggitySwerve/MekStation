/**
 * coop-guest-proposal parity spec (umbrella 19.4) — loads the
 * hand-authored co-op GUEST pack via `loadCampaignPack` and hard-asserts
 * the invariant the pack exists to create: on a campaign carrying a guest
 * `coopSession`, the guest proposal surface and the sync posture banner it
 * carries actually mount at the target route. Blocking `expect`s only — no
 * capture-tolerant findings, no `@smoke` tag (spec: Parity Binding).
 *
 * A SECOND pack is required rather than a mode flag on the host one:
 * `coopSession.mode` is single-valued per campaign, and the two surfaces
 * split on it. One campaign cannot be both.
 *
 * Hand-authored for the same reason as its host sibling — see that spec's
 * header for why neither sanctioned minter can produce these.
 *
 * @spec openspec/specs/scenario-packs/spec.md
 */

import { expect, test } from '@playwright/test';

import { loadCampaignPack } from '../helpers/scenarioPackLoading';

test.describe(
  'scenario pack parity: coop-guest-proposal',
  { tag: ['@subsystem:economy'] },
  () => {
    test('the guest proposal surface and its sync banner mount on a guest co-op campaign', async ({
      page,
    }, testInfo) => {
      await loadCampaignPack(page, 'coop-guest-proposal', {
        workerIndex: testInfo.workerIndex,
      });

      // The loader's own goto already landed on the pack's targetRoute (the
      // finances sub-route) — assert render sanity, then the invariant:
      // without a guest `coopSession` both of these are absent.
      await expect(page.getByTestId('page-title')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('guest-proposal-surface')).toBeVisible({
        timeout: 20_000,
      });
      // The banner rides inside the proposal surface and carries the
      // lifecycle posture. In a single-browser sweep there is no grant
      // token, so it renders `blocked` — a real posture, not a placeholder.
      await expect(page.getByTestId('campaign-sync-state')).toBeVisible({
        timeout: 20_000,
      });
    });
  },
);
