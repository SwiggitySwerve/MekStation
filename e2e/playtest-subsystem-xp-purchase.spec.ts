/**
 * W6 Group 4 — XP / ability purchase subsystem validation (task 4.4)
 *
 * The genuinely zero-e2e hole: drives an SPA purchase end-to-end through
 * the front door and hard-asserts the XP debit.
 *
 * START-STATE DECISION (design D6 ordered rule, path 1 — recorded per the
 * task-1.4 baseline): the pilot creation wizard at /gameplay/pilots/create
 * redirects on success to /gameplay/pilots/{id}?creating=1, where the
 * detail page opens `PilotAbilitiesPanel` in creation flow. Fresh creation
 * grants no spendable XP by itself, so the spec first takes a FLAW through
 * the same picker UI — `atow_combat_paralysis` (`xpCost: -25`,
 * `miscAndInfantrySPAs.ts`) — which GRANTS 25 XP front-door
 * (`PilotAbilitiesPanel` flaw-grant path). That covers the cheapest
 * positive SPA (`foot_cav`, `xpCost: 15`, same catalog file) with XP to
 * spare. No store writes anywhere — every state change flows through the
 * rendered picker (the D6 ban on faking XP via store injection).
 *
 * Hard invariants:
 *   - the flaw grants exactly 25 XP (pilot store read)
 *   - `owned-spa-foot_cav` renders after the purchase
 *   - the pilot's XP decremented by exactly the ability's cost (15) — the
 *     same math `spaAcquisition.test.ts` proves headlessly
 *   - repeat purchase of the same SPA is not offered (the picker excludes
 *     owned ids)
 */

import { test, expect } from '@playwright/test';

import { getStoreState } from './helpers/store';

test.setTimeout(120_000);

/** Catalog constants asserted exactly (src/lib/spa/catalog/miscAndInfantrySPAs.ts). */
const FLAW_ID = 'atow_combat_paralysis';
const FLAW_GRANT = 25;
const SPA_ID = 'foot_cav';
const SPA_COST = 15;

interface IPilotStoreState {
  readonly pilots: ReadonlyArray<{
    readonly id: string;
    readonly career?: { readonly xp: number };
    readonly abilities?: ReadonlyArray<{ readonly abilityId: string }>;
  }>;
}

/** Read one pilot's XP from the exposed pilot store. */
async function readPilotXp(
  page: import('@playwright/test').Page,
  pilotId: string,
): Promise<number> {
  const state = await getStoreState<IPilotStoreState>(page, 'pilot');
  const pilot = state.pilots.find((entry) => entry.id === pilotId);
  expect(pilot, `pilot ${pilotId} SHALL be in the pilot store`).toBeDefined();
  return pilot!.career?.xp ?? 0;
}

test.describe(
  'W6 — XP / ability purchase subsystem',
  { tag: ['@subsystem:experience'] },
  () => {
    test('front-door SPA purchase debits pilot XP by exactly the cost', async ({
      page,
    }) => {
      // ------------------------------------------------------------------
      // Establish the pilot through the front door (creation wizard).
      // ------------------------------------------------------------------
      await page.goto('/gameplay/pilots/create');
      await expect(
        page.getByRole('heading', { name: 'Choose Creation Mode' }),
      ).toBeVisible({ timeout: 20_000 });
      await page.getByRole('button', { name: /Template/ }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(
        page.getByRole('heading', { name: 'Pilot Identity' }),
      ).toBeVisible({ timeout: 10_000 });
      await page
        .getByPlaceholder('Enter pilot name')
        .fill('Subsystem XP Pilot');
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(
        page.getByRole('heading', { name: 'Select Experience Level' }),
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('button', { name: 'Create Pilot' }).click();
      // The negative lookahead excludes the wizard's own /create route —
      // the plain [^/?#]+ pattern matches it and resolves before redirect.
      await page.waitForURL(/\/gameplay\/pilots\/(?!create)[^/?#]+/, {
        timeout: 30_000,
      });
      const pilotId = new URL(page.url()).pathname.split('/').pop()!;

      // The abilities panel opens in creation flow on the detail page.
      const addAbility = page.getByTestId('add-ability-btn');
      await expect(
        addAbility,
        'the abilities panel SHALL be reachable front-door',
      ).toBeVisible({ timeout: 20_000 });

      // ------------------------------------------------------------------
      // Front-door XP grant: take a flaw through the picker.
      // ------------------------------------------------------------------
      const xpAtCreation = await readPilotXp(page, pilotId);

      await addAbility.click();
      await expect(page.getByTestId('spa-picker')).toBeVisible({
        timeout: 10_000,
      });
      await page
        .getByTestId(`spa-item-${FLAW_ID}`)
        .getByRole('button', { name: 'Select' })
        .click();
      await expect(
        page.getByTestId(`owned-spa-${FLAW_ID}`),
        'the flaw SHALL land on the owned list',
      ).toBeVisible({ timeout: 10_000 });

      const xpAfterFlaw = await readPilotXp(page, pilotId);
      expect(
        xpAfterFlaw - xpAtCreation,
        'the flaw SHALL grant exactly its |xpCost|',
      ).toBe(FLAW_GRANT);
      expect(
        xpAfterFlaw,
        'the pilot SHALL now afford the cheapest SPA',
      ).toBeGreaterThanOrEqual(SPA_COST);

      // ------------------------------------------------------------------
      // The purchase under test.
      // ------------------------------------------------------------------
      await addAbility.click();
      await expect(page.getByTestId('spa-picker')).toBeVisible({
        timeout: 10_000,
      });
      await page
        .getByTestId(`spa-item-${SPA_ID}`)
        .getByRole('button', { name: 'Select' })
        .click();
      await expect(
        page.getByTestId(`owned-spa-${SPA_ID}`),
        'the purchased SPA SHALL render on the owned list',
      ).toBeVisible({ timeout: 10_000 });

      const xpAfterPurchase = await readPilotXp(page, pilotId);
      expect(
        xpAfterFlaw - xpAfterPurchase,
        'XP SHALL decrement by exactly the ability cost',
      ).toBe(SPA_COST);

      // ------------------------------------------------------------------
      // Repeat purchase is not offered: the picker excludes owned ids.
      // ------------------------------------------------------------------
      await addAbility.click();
      await expect(page.getByTestId('spa-picker')).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByTestId(`spa-item-${SPA_ID}`),
        'an owned SPA SHALL NOT be offered again',
      ).toBeHidden();
    });
  },
);
