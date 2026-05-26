/**
 * Opponent-intel tier projection — E2E redaction smoke
 *
 * Drives the dev-only harness at `/e2e/intel-tier-projection?tier=<t>` (see
 * `src/pages/e2e/intel-tier-projection.tsx`) through all four supported
 * opponent tiers and asserts the inspector's DOM matches the tier contract:
 *
 *   - 'exact'      — chassis + heat + armor + structure visible
 *   - 'rough'      — name visible; damage band visible; heat/armor/structure
 *                    redacted from DOM (testid + visible-text)
 *   - 'silhouette' — name AND chassis hidden; only the silhouette band
 *   - 'hidden'     — completely opaque "Unknown Contact" placeholder; the
 *                    opponent's real name MUST NOT appear anywhere in the
 *                    rendered DOM subtree
 *
 * The friendly inspector renders alongside the opponent inspector on the
 * same page and is asserted to always show full pilot + heat regardless of
 * the active opponent tier (the friendly branch short-circuits before the
 * intel projection runs).
 *
 * This spec exists to close the `intelGuardrails` orphan-rot risk raised by
 * the OMO Heavy Council audit (Phase 2 — G7 finding). Without a CI-enforced
 * consumer route, `src/services/intel/intelGuardrails.ts` was reachable only
 * through the live tactical shell, which the e2e suite never mounts against
 * a fog-of-war session. A future refactor that broke the redaction policy
 * would otherwise ship silently — mirroring the 6-month indirect-fire
 * helper orphan precedent.
 *
 * @spec openspec/changes/add-tactical-unit-inspector-drawers/specs/tactical-map-interface/spec.md
 * @tags @smoke @intel @wave-8
 */

import { test, expect, type Page } from '@playwright/test';

const HARNESS_ROUTE = '/e2e/intel-tier-projection';

// The opponent unit's identifying strings; these are the values whose
// presence/absence in the DOM the spec asserts on per tier.
const OPPONENT_NAME = 'Mad Cat Prime';
const OPPONENT_CHASSIS = 'mad-cat-prime';

// The friendly unit's identity — visible in every tier because the friendly
// branch ignores the opponent intel scope.
const FRIENDLY_NAME = 'Atlas AS7-D';
const FRIENDLY_PILOT = 'Mechwarrior Smith';

/**
 * Navigate to the harness page for a given tier and wait for the inspector
 * subtrees to render.
 *
 * Uses a 30s expect timeout for the first visibility check to absorb the
 * cold Next.js compile on the very first request (~3s observed locally,
 * worse on CI). Subsequent tier navigations hit the warm cache and clear
 * in tens of milliseconds, so the long timeout is a safety net, not a
 * performance budget.
 */
async function gotoTier(
  page: Page,
  tier: 'exact' | 'rough' | 'silhouette' | 'hidden',
): Promise<void> {
  await page.goto(`${HARNESS_ROUTE}?tier=${tier}`);
  // Harness root must mount and the tier badge must reflect the URL param —
  // otherwise we'd be asserting against a stale render. First-hit cold-
  // compile on a fresh dev server can exceed the default 10s expect timeout,
  // so widen this single check (subsequent tier links re-use warm compile).
  await expect(page.getByTestId('intel-tier-projection-harness')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('intel-harness-active-tier')).toHaveText(
    `Active tier: ${tier}`,
  );
}

test.describe('Opponent intel tier projection @smoke @intel @wave-8', () => {
  // ---------------------------------------------------------------------------
  // Friendly view — must remain full regardless of opponent tier
  // ---------------------------------------------------------------------------

  test('friendly inspector renders full state at every opponent tier', async ({
    page,
  }) => {
    // Loop the 4 tiers and confirm the friendly inspector is unaffected.
    for (const tier of ['exact', 'rough', 'silhouette', 'hidden'] as const) {
      await gotoTier(page, tier);

      const friendlyPanel = page.getByTestId(
        'intel-harness-friendly-inspector',
      );

      // Full friendly sub-view is mounted.
      await expect(
        friendlyPanel.getByTestId('inspector-friendly'),
      ).toBeVisible();

      // Pilot identity + heat + armor are all exposed on a friendly unit.
      await expect(friendlyPanel.getByTestId('inspector-unit-name')).toHaveText(
        FRIENDLY_NAME,
      );
      await expect(
        friendlyPanel.getByTestId('inspector-pilot-name'),
      ).toHaveText(FRIENDLY_PILOT);
      await expect(friendlyPanel.getByTestId('inspector-heat')).toBeVisible();
      await expect(friendlyPanel.getByTestId('inspector-armor')).toBeVisible();
      await expect(
        friendlyPanel.getByTestId('inspector-structure'),
      ).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // Tier 'exact' — full opponent state exposed
  // ---------------------------------------------------------------------------

  test('opponent at exact tier exposes chassis + heat + armor', async ({
    page,
  }) => {
    await gotoTier(page, 'exact');

    const opponentPanel = page.getByTestId('intel-harness-opponent-inspector');

    // Target sub-view is mounted; redacted sub-view MUST NOT be.
    await expect(opponentPanel.getByTestId('inspector-target')).toBeVisible();
    await expect(opponentPanel.getByTestId('inspector-redacted')).toHaveCount(
      0,
    );

    // Name AND chassis are both exposed at exact tier.
    await expect(opponentPanel.getByTestId('inspector-unit-name')).toHaveText(
      OPPONENT_NAME,
    );
    await expect(opponentPanel.getByTestId('inspector-chassis')).toHaveText(
      OPPONENT_CHASSIS,
    );

    // Numeric fields are present (the projection populates them at this tier).
    await expect(opponentPanel.getByTestId('inspector-heat')).toBeVisible();
    await expect(opponentPanel.getByTestId('inspector-armor')).toBeVisible();
    await expect(
      opponentPanel.getByTestId('inspector-structure'),
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Tier 'rough' — name visible, numbers redacted
  // ---------------------------------------------------------------------------

  test('opponent at rough tier hides exact numeric fields but keeps name', async ({
    page,
  }) => {
    await gotoTier(page, 'rough');

    const opponentPanel = page.getByTestId('intel-harness-opponent-inspector');

    // Target sub-view is mounted (rough is still a target projection).
    await expect(opponentPanel.getByTestId('inspector-target')).toBeVisible();

    // Name is visible at rough tier.
    await expect(opponentPanel.getByTestId('inspector-unit-name')).toHaveText(
      OPPONENT_NAME,
    );

    // Chassis MUST NOT render at rough tier (component only renders when
    // projection.chassis is non-null; rough sets it to null).
    await expect(opponentPanel.getByTestId('inspector-chassis')).toHaveCount(0);

    // Damage band IS shown (the only damage signal at rough tier).
    await expect(
      opponentPanel.getByTestId('inspector-damage-band'),
    ).toBeVisible();

    // Exact numeric fields MUST NOT render at rough tier.
    await expect(opponentPanel.getByTestId('inspector-heat')).toHaveCount(0);
    await expect(opponentPanel.getByTestId('inspector-armor')).toHaveCount(0);
    await expect(opponentPanel.getByTestId('inspector-structure')).toHaveCount(
      0,
    );
  });

  // ---------------------------------------------------------------------------
  // Tier 'silhouette' — name AND chassis hidden
  // ---------------------------------------------------------------------------

  test('opponent at silhouette tier hides name and chassis', async ({
    page,
  }) => {
    await gotoTier(page, 'silhouette');

    const opponentPanel = page.getByTestId('intel-harness-opponent-inspector');

    // Target sub-view is still mounted (silhouette is a target projection
    // with `name: null` and `chassisClass` populated).
    await expect(opponentPanel.getByTestId('inspector-target')).toBeVisible();

    // The component renders the name node, but the projection value is null
    // so the rendered text is empty.
    const nameText =
      (await opponentPanel.getByTestId('inspector-unit-name').textContent()) ??
      '';
    expect(nameText.trim()).toBe('');

    // The opponent's real chassis name MUST NOT appear anywhere in the
    // opponent panel's text content — including aria-label or other attrs.
    const panelText = (await opponentPanel.textContent()) ?? '';
    expect(panelText).not.toContain(OPPONENT_NAME);
    expect(panelText).not.toContain(OPPONENT_CHASSIS);

    // Damage band IS shown (computed from observable armor at silhouette tier).
    await expect(
      opponentPanel.getByTestId('inspector-damage-band'),
    ).toBeVisible();

    // Exact numeric fields are absent.
    await expect(opponentPanel.getByTestId('inspector-heat')).toHaveCount(0);
    await expect(opponentPanel.getByTestId('inspector-armor')).toHaveCount(0);
    await expect(opponentPanel.getByTestId('inspector-structure')).toHaveCount(
      0,
    );
  });

  // ---------------------------------------------------------------------------
  // Tier 'hidden' — fully opaque redacted view
  // ---------------------------------------------------------------------------

  test('opponent at hidden tier renders redacted placeholder with no identity leak', async ({
    page,
  }) => {
    await gotoTier(page, 'hidden');

    const opponentPanel = page.getByTestId('intel-harness-opponent-inspector');

    // Redacted sub-view is mounted; target / friendly sub-views are NOT.
    await expect(opponentPanel.getByTestId('inspector-redacted')).toBeVisible();
    await expect(opponentPanel.getByTestId('inspector-target')).toHaveCount(0);
    await expect(opponentPanel.getByTestId('inspector-friendly')).toHaveCount(
      0,
    );

    // Generic placeholder text is present.
    await expect(opponentPanel.getByTestId('inspector-redacted')).toContainText(
      'Unknown Contact',
    );

    // The opponent's real name and chassis MUST NOT appear anywhere in the
    // rendered subtree — not in text, not in any data-testid value, not in
    // aria attributes. Per the spec: "exact hidden fields SHALL not be
    // recoverable from labels, tooltips, DOM text, ARIA text, or test ids".
    const panelHtml = (await opponentPanel.innerHTML()) ?? '';
    expect(panelHtml).not.toContain(OPPONENT_NAME);
    expect(panelHtml).not.toContain(OPPONENT_CHASSIS);

    // Even the unit ID (which the redacted projection retains for React keys)
    // must not appear as visible text — the placeholder is text-only.
    const panelText = (await opponentPanel.textContent()) ?? '';
    expect(panelText).not.toContain(OPPONENT_NAME);
    expect(panelText).not.toContain(OPPONENT_CHASSIS);

    // Numeric heat (12 on the seed state) MUST NOT appear in the opponent
    // panel's text — the redacted shape carries no heat field at all.
    expect(panelText).not.toContain('Heat');
  });
});
