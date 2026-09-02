/**
 * coop-host-review parity spec (umbrella 19.4) — loads the hand-authored
 * co-op HOST pack via `loadCampaignPack` and hard-asserts the invariant
 * the pack exists to create: on a campaign carrying a host `coopSession`,
 * the GM review surface actually mounts at the target route. Blocking
 * `expect`s only — no capture-tolerant findings, no `@smoke` tag (spec:
 * Parity Binding).
 *
 * This pack is HAND-AUTHORED rather than minted, and its genesis says so:
 * no sanctioned minter can produce it. The flow-checkpoint minter captures
 * a live GET against a registered flow and `e2e/flows/manifest.ts`
 * registers no co-op flow; the fast-forward minter dumps a headless
 * `fastForwardCampaign()` day-advance run, which never opens a co-op
 * session.
 *
 * NON-CLAIM: the GM review surface is asserted in its EMPTY state. A
 * pending proposal row lives in the in-memory runtime session
 * (`coopRuntimeSession.ts`: "not persisted campaign data") and has no
 * front-door control to create, so the `pending` posture is covered by
 * jest rows only and becomes assertable here when the sweep becomes
 * two-browser.
 *
 * @spec openspec/specs/scenario-packs/spec.md
 */

import { expect, test } from '@playwright/test';

import { loadCampaignPack } from '../helpers/scenarioPackLoading';

test.describe(
  'scenario pack parity: coop-host-review',
  { tag: ['@subsystem:navigation'] },
  () => {
    test('the GM review surface mounts on a host co-op campaign', async ({
      page,
    }, testInfo) => {
      await loadCampaignPack(page, 'coop-host-review', {
        workerIndex: testInfo.workerIndex,
      });

      // The loader's own goto already landed on the pack's targetRoute (the
      // campaign dashboard) — assert render sanity, then the invariant the
      // pack exists for: without a host `coopSession`,
      // `CampaignCoopRouteSurface` renders null and this element is absent.
      await expect(page.getByTestId('page-title')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('host-gm-review-surface')).toBeVisible({
        timeout: 20_000,
      });
    });
  },
);
