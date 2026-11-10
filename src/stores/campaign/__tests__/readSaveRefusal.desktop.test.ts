/**
 * S1b wording: the 426 sentence ends "Reload this page to update, then try
 * again." in a browser tab. In the desktop shell a reload serves the same
 * embedded build and updates nothing, so the client shows "Choose Help > Check
 * for Updates... to update MekStation, then open this campaign again." instead. The server cannot tell the two
 * apart, so it writes the browser form and the client picks by the existing
 * `isElectron()` detection.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  LIFECYCLE_UNREADABLE_CODE,
  LIFECYCLE_UNSUPPORTED_CODE,
  LIFECYCLE_UPDATE_GUIDANCE_BROWSER,
  LIFECYCLE_UPDATE_GUIDANCE_DESKTOP,
  LIFECYCLE_UPDATE_MENU_LABEL,
  lifecycleRefusalBody,
  type LifecycleRefusal,
} from '@/lib/campaign/persistence/lifecycleReaderGate';

import { readSaveRefusal } from '../useCampaignPersistenceStore';

function refusal(status: 426 | 422, required: number | null): LifecycleRefusal {
  return {
    kind: 'refuse',
    status,
    code:
      status === 426 ? LIFECYCLE_UNSUPPORTED_CODE : LIFECYCLE_UNREADABLE_CODE,
    reason:
      status === 426
        ? 'lifecycle-rules-unsupported'
        : 'lifecycle-rules-unreadable',
    requiredLifecycleRules: required,
    readerLifecycleRules: 1,
    source: 'stored',
  };
}

function setDesktop(on: boolean): void {
  if (on) {
    (window as unknown as { electronAPI: object }).electronAPI = {};
  } else {
    delete (window as unknown as { electronAPI?: object }).electronAPI;
  }
}

describe('the 426 sentence by shell', () => {
  afterEach(() => setDesktop(false));

  it.each([
    ['a known newer level', 2],
    ['a level nobody reads', null],
  ])(
    'browser tab, %s: the server sentence is shown unchanged',
    (_n, required) => {
      const body = lifecycleRefusalBody(refusal(426, required));
      expect(body.error).toContain(LIFECYCLE_UPDATE_GUIDANCE_BROWSER);
      expect(readSaveRefusal(body)?.message).toBe(body.error);
    },
  );

  it.each([
    ['a known newer level', 2],
    ['a level nobody reads', null],
  ])('desktop shell, %s: only the closing guidance changes', (_n, required) => {
    setDesktop(true);
    const body = lifecycleRefusalBody(refusal(426, required));
    const message = readSaveRefusal(body)?.message ?? '';
    expect(message).toBe(
      body.error.replace(
        LIFECYCLE_UPDATE_GUIDANCE_BROWSER,
        LIFECYCLE_UPDATE_GUIDANCE_DESKTOP,
      ),
    );
    expect(message).toContain(
      'Choose Help > Check for Updates... to update MekStation, then open this campaign again.',
    );
    expect(message).not.toMatch(/reload/i);
    expect(message).toMatch(/Nothing was changed\.$/);
  });

  it('desktop shell: the 422 sentence is not touched (it names no update step)', () => {
    setDesktop(true);
    const body = lifecycleRefusalBody(refusal(422, null));
    expect(readSaveRefusal(body)?.message).toBe(body.error);
  });

  it('pins the two approved forms word for word', () => {
    expect(LIFECYCLE_UPDATE_GUIDANCE_BROWSER).toBe(
      'Reload this page to update, then try again.',
    );
    expect(LIFECYCLE_UPDATE_GUIDANCE_DESKTOP).toBe(
      'Choose Help > Check for Updates... to update MekStation, then open this campaign again.',
    );
  });

  it('names the label the Help menu really has for help:check-updates', () => {
    const menu = readFileSync(
      join(process.cwd(), 'desktop/electron/MenuManager.ts'),
      'utf8',
    );
    const item = menu.match(
      /label:\s*'([^']+)',\s*click:\s*\(\)\s*=>\s*this\.sendCommand\('help:check-updates'\)/,
    );
    expect(item?.[1]).toBe(LIFECYCLE_UPDATE_MENU_LABEL);
    expect(LIFECYCLE_UPDATE_GUIDANCE_DESKTOP).toContain(`Help > ${item?.[1]}`);
  });
});
