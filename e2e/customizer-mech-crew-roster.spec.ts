/**
 * Tripod and QuadVee crew seats: assign in the Overview Crew card, save to the
 * library (SQLite), reload, reopen the saved unit, print on Letter and A4, and
 * read the seat names and skills from the printed sheet.
 *
 * Real catalog, save API and sheet renderer throughout. The print harness only
 * records the real popup document instead of opening an OS dialog.
 *
 * @spec openspec/specs/record-sheet-export/spec.md
 */

import { expect, test, type Locator, type Page } from '@playwright/test';

// Re-pin from the current checkout through the real loader (run at repo root):
// npx tsx scripts/e2e/pin-mech-crew-save-losses.ts
import saveLosses from './fixtures/mech-crew-save-losses.json';
import {
  expectPrintWindowClosesAfterPrint,
  installPrintHarness,
  printCaptures,
} from './helpers/recordSheetPrintHarness';

interface ISeat {
  readonly role: 'Pilot' | 'Gunner' | 'Tech Officer';
  /** Absent: the seat stays unassigned and prints blank. */
  readonly pilot?: { name: string; gunnery: number; piloting: number };
}
interface ICase {
  readonly sourceId: keyof typeof saveLosses.units;
  readonly label: string;
  readonly chassis: string;
  readonly model: string;
  /** Set in the Structure tab before the crew is assigned. */
  readonly tonnage?: number;
  readonly seats: readonly ISeat[];
}

const cases: readonly ICase[] = [
  {
    sourceId: 'triskelion-trk-4v',
    label: 'tripod with a blank gunner seat',
    chassis: 'Triskelion',
    model: 'TRK-4V',
    seats: [
      { role: 'Pilot', pilot: { name: 'Kerr Vance', gunnery: 3, piloting: 4 } },
      { role: 'Gunner' },
    ],
  },
  {
    sourceId: 'triskelion-trk-4v',
    label: 'tripod edited to 105 tons gains a Tech Officer seat',
    chassis: 'Triskelion',
    model: 'TRK-4V',
    tonnage: 105,
    seats: [
      { role: 'Pilot', pilot: { name: 'Mina Doyle', gunnery: 4, piloting: 4 } },
      { role: 'Gunner' },
      {
        role: 'Tech Officer',
        pilot: { name: 'Rafe Okoye', gunnery: 6, piloting: 2 },
      },
    ],
  },
  {
    sourceId: 'poseidon-psd-v2',
    label: 'superheavy tripod with repeated names',
    chassis: 'Poseidon',
    model: 'PSD-V2',
    seats: [
      { role: 'Pilot', pilot: { name: 'Ada Row', gunnery: 2, piloting: 5 } },
      { role: 'Gunner', pilot: { name: 'Ada Row', gunnery: 4, piloting: 3 } },
      {
        role: 'Tech Officer',
        pilot: { name: 'Ines Cole', gunnery: 5, piloting: 6 },
      },
    ],
  },
  {
    sourceId: 'boreas-a',
    label: 'QuadVee with a blank pilot seat',
    chassis: 'Boreas',
    model: 'A',
    seats: [
      { role: 'Pilot' },
      { role: 'Gunner', pilot: { name: 'Gil Marr', gunnery: 1, piloting: 7 } },
    ],
  },
];

function libraryRow(
  page: Page,
  dialog: Locator,
  unit: { chassis: string; model: string },
) {
  const cell = (n: number, text: string) =>
    page.locator(`td:nth-child(${n})`, {
      hasText: new RegExp(
        `^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
      ),
    });
  return dialog
    .getByRole('row')
    .filter({ has: cell(1, unit.chassis) })
    .filter({ has: cell(2, unit.model) });
}

async function openFromLibrary(
  page: Page,
  chassis: string,
  model: string,
  source: 'canonical' | 'custom',
) {
  await page
    .getByRole('button', {
      name: /^(Load from Library|Add Unit \(Ctrl\+O\))$/,
    })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Add Unit', exact: true });
  await expect(dialog.getByText('Loading units...')).toBeHidden({
    timeout: 60_000,
  });
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill(`${chassis} ${model}`);
  await dialog.getByRole('combobox').first().selectOption(source);
  const row = libraryRow(page, dialog, { chassis, model });
  await expect(row).toHaveCount(1);
  await row.click();
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function section(page: Page, name: string) {
  await page
    .getByRole('tablist', { name: 'Unit configuration tabs' })
    .getByRole('tab', { name, exact: true })
    .click();
}

/**
 * Pinned at saveLosses.sourceCommit from the real canonical loader:
 * mapToUnitState -> equipmentMapping -> criticalSlotEquipment diagnostics.
 * noticeGroups pins presentation at saveLosses.groupingSourceCommit, referencing
 * the unchanged entry list by index rather than replacing its membership.
 * Compare every source cell before acknowledging the product's save-loss gate.
 * o3a recovers native structure/armor markers, including center-leg cells.
 * Poseidon's center-leg AP pods remain in PR-D's (C2) acceptance set.
 */
async function confirmCriticalSlotLoss(page: Page, unit: ICase) {
  const pinned = saveLosses.units[unit.sourceId];
  const expected = pinned.entries;
  const confirmation = page.getByRole('dialog', {
    name: 'Save with missing critical-slot entries?',
    exact: true,
  });
  if (expected.length === 0) {
    await expect(confirmation).toHaveCount(0);
    return;
  }

  await expect(confirmation).toBeVisible();
  const region = confirmation.getByRole('region', {
    name: 'Unrecovered critical-slot entries',
    exact: true,
  });
  const indexes = pinned.noticeGroups.flatMap((group) =>
    group.kinds.flatMap((kind) => kind.entryIndexes),
  );
  // Presentation indexes must remain a permutation of the original pinned list.
  expect([...indexes].sort((a, b) => a - b)).toEqual(
    expected.map((_, index) => index),
  );
  const entryText = (index: number) => {
    const { text, location, slot } = expected[index];
    return `${text} — ${location} [${slot}]`;
  };
  await expect(region.getByRole('listitem')).toHaveText(indexes.map(entryText));
  await expect(region.getByRole('heading', { level: 3 })).toHaveText(
    pinned.noticeGroups.map(
      (group) =>
        `${group.title} (${group.kinds.flatMap((kind) => kind.entryIndexes).length})`,
    ),
  );
  for (const group of pinned.noticeGroups) {
    const count = group.kinds.flatMap((kind) => kind.entryIndexes).length;
    const section = region
      .getByRole('heading', {
        level: 3,
        name: `${group.title} (${count})`,
        exact: true,
      })
      .locator('..');
    await expect(section.getByRole('heading', { level: 4 })).toHaveText(
      group.kinds.map((kind) => `${kind.title} (${kind.entryIndexes.length})`),
    );
    for (const kind of group.kinds) {
      const kindSection = section
        .getByRole('heading', {
          level: 4,
          name: `${kind.title} (${kind.entryIndexes.length})`,
          exact: true,
        })
        .locator('..');
      await expect(kindSection.getByRole('listitem')).toHaveText(
        kind.entryIndexes.map(entryText),
      );
    }
  }
  await confirmation
    .getByRole('button', { name: 'Save anyway', exact: true })
    .click();
}

async function expectSeatFields(page: Page, seats: readonly ISeat[]) {
  for (const { role, pilot } of seats) {
    await expect(page.getByLabel(`${role} Name`)).toHaveValue(
      pilot?.name ?? '',
    );
    await expect(page.getByLabel(`${role} Gunnery`)).toHaveValue(
      pilot ? String(pilot.gunnery) : '',
    );
    await expect(page.getByLabel(`${role} Piloting`)).toHaveValue(
      pilot ? String(pilot.piloting) : '',
    );
  }
}

/** Print through the product's Print control and read the crew fields of the popup sheet. */
async function sheetCrew(page: Page) {
  const before = (await printCaptures(page)).length;
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  await expect
    .poll(async () => (await printCaptures(page)).length)
    .toBe(before + 1);
  const svg = await (
    await popup
  )
    .locator('body > svg')
    .evaluate((el) => el.outerHTML);
  await expectPrintWindowClosesAfterPrint(page);
  return page.evaluate((markup) => {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const text = (id: string) =>
      doc.getElementById(id)?.textContent?.trim() ?? null;
    return [0, 1, 2].map((i) => ({
      label: text(`crewName${i}`),
      name: text(`pilotName${i}`),
      gunnery: text(`gunnerySkill${i}`),
      piloting: text(`pilotingSkill${i}`),
    }));
  }, svg);
}

test.describe('Tripod and QuadVee crew seats', () => {
  test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  test.setTimeout(240_000);
  test.describe.configure({ retries: 0 });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
    );
    await installPrintHarness(page);
  });

  for (const unit of cases) {
    test(`${unit.label}: assign, save, reload, reopen and print @customizer`, async ({
      page,
      request,
    }, info) => {
      let savedId: string | undefined;
      try {
        await page.goto('/customizer');
        await openFromLibrary(page, unit.chassis, unit.model, 'canonical');
        if (unit.tonnage) {
          await section(page, 'Structure');
          await page
            .getByRole('spinbutton', { name: 'Tonnage', exact: true })
            .fill(String(unit.tonnage));
          await expect(
            page.getByRole('spinbutton', { name: 'Tonnage', exact: true }),
          ).toHaveValue(String(unit.tonnage));
        }
        await section(page, 'Overview');
        const card = page.getByTestId('overview-crew');
        await expect(card).toBeVisible();
        await expect(page.locator('[data-testid^="crew-seat-"]')).toHaveCount(
          unit.seats.length,
        );

        for (const { role, pilot } of unit.seats) {
          if (!pilot) continue;
          await page.getByLabel(`${role} Name`).fill(pilot.name);
          await page.getByLabel(`${role} Gunnery`).fill(String(pilot.gunnery));
          await page
            .getByLabel(`${role} Piloting`)
            .fill(String(pilot.piloting));
        }
        await expectSeatFields(page, unit.seats);

        await page
          .getByRole('button', { name: 'Save active unit to library' })
          .click();
        const save = page.getByRole('dialog', {
          name: 'Save Unit',
          exact: true,
        });
        const chassis = `Crew ${unit.chassis} ${Date.now()}-${info.workerIndex}`;
        const model = `Roster ${unit.model}`;
        await save.getByLabel('Chassis Name').fill(chassis);
        await save.getByLabel('Variant Designation').fill(model);
        const posted = page.waitForResponse(
          (r) =>
            r.url().endsWith('/api/units/custom') &&
            r.request().method() === 'POST',
        );
        await save.getByRole('button', { name: 'Save', exact: true }).click();
        await confirmCriticalSlotLoss(page, unit);
        const response = await posted;
        expect(response.ok()).toBe(true);
        savedId = (await response.json()).data.id;
        expect(savedId).toBeTruthy();
        await expect(save).toBeHidden();

        // The saved record carries the seats (SQLite row, not just the draft).
        const record = await request.get(`/api/units/custom/${savedId}`);
        expect(record.ok()).toBe(true);
        const stored = (await record.json()).parsedData;
        const assigned = unit.seats.flatMap((seat, slotIndex) =>
          seat.pilot ? [{ slotIndex, ...seat.pilot }] : [],
        );
        expect(stored.crewSeats).toEqual(assigned);

        await page.reload();
        await section(page, 'Overview');
        await expectSeatFields(page, unit.seats);

        // Close the draft so the library must fetch the saved server copy.
        await page
          .getByRole('button', {
            name: `Close ${chassis} ${model}`,
            exact: true,
          })
          .click();
        const fetched = page.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/units/custom/${savedId}`) &&
            r.request().method() === 'GET',
          { timeout: 60_000 },
        );
        await openFromLibrary(page, chassis, model, 'custom');
        expect((await fetched).ok()).toBe(true);
        await section(page, 'Overview');
        await expectSeatFields(page, unit.seats);
        await expect(page.getByTestId('overview-crew')).toBeVisible();

        await section(page, 'Preview');
        await expect(
          page.locator('canvas[data-testid$="record-sheet-canvas"]'),
        ).toBeVisible();
        const expectSheet = async () => {
          const crew = await sheetCrew(page);
          unit.seats.forEach(({ role, pilot }, i) => {
            expect(crew[i]).toEqual({
              label: `${role}:`,
              name: pilot?.name ?? '',
              gunnery: pilot ? String(pilot.gunnery) : '',
              piloting: pilot ? String(pilot.piloting) : '',
            });
          });
        };
        await expect(
          page.getByRole('combobox', { name: 'Paper Size' }),
        ).toHaveValue('letter');
        await expectSheet();
        await page
          .getByRole('combobox', { name: 'Paper Size' })
          .selectOption('a4');
        await expectSheet();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      } finally {
        if (savedId) await request.delete(`/api/units/custom/${savedId}`);
      }
    });
  }
});
