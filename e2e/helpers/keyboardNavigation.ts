import { expect, type Locator, type Page } from '@playwright/test';

/** Reach controls by browser Tab order; never programmatically focus them. */
export async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let i = 0; i < 160; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

export async function activate(
  page: Page,
  target: Locator,
  keyboard: boolean,
): Promise<void> {
  if (!keyboard) return target.click();
  await tabTo(page, target);
  await page.keyboard.press('Enter');
}

export async function fill(
  page: Page,
  target: Locator,
  value: string,
  keyboard: boolean,
  initialValue: string,
): Promise<void> {
  if (keyboard) await tabTo(page, target);
  // Both modes can select before the dialog's controlled value initializes.
  await expect(target).toHaveValue(initialValue);
  if (keyboard) {
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.insertText(value);
  } else {
    await target.fill(value);
  }
  await expect(target).toHaveValue(value);
  if (keyboard) await page.keyboard.press('Tab');
}
