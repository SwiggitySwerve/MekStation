# Equipment catalog browser-worker report

Owned files only:

- `e2e/customizer-equipment-catalog.spec.ts`
- `.sisyphus/equipment-catalog-20260910/browser-worker/**`

No product code, server, git, or other-spec edits.

## Failure

`toBeDisabled()` on `dialog.getByRole('option', { name: /^Head / })` failed:

```
Locator resolved to <option disabled value="Head">Head · 0 free — No contiguous space</option>
Expected: disabled
Received: enabled
```

Playwright 1.57.0 `elementState("disabled")` retargets with follow-label. The option lives inside a wrapping `<label>`, so `retarget()` replaces the option with `enclosingLabel.control` — the enabled `<select>`. Native `isNativelyDisabled` does honor `OPTION`'s `disabled` attribute; the matcher never reached that check.

## Fix (test-only)

Replaced the retargeted matcher with the native DOM property, and asserted confirm-button gating before a valid location is chosen.

Changed lines in `e2e/customizer-equipment-catalog.spec.ts` (after `npx oxfmt`):

```
116-122
  await expect(dialog.getByRole('option', { name: /^Head / })).toHaveJSProperty(
    'disabled',
    true,
  );
  await expect(
    dialog.getByRole('button', { name: 'Add and place', exact: true }),
  ).toBeDisabled();
```

Was:

```
await expect(dialog.getByRole('option', { name: /^Head / })).toBeDisabled();
```

Acceptance coverage kept:

- electronics independent of ammo-visibility toggle
- SRM / LRM / Gauss ammo exact visibility through add / undo / redo
- cancel leaves draft unchanged
- Left Arm slot 6 for Small Laser
- one Undo / Redo and cold reload
- mobile placement, opaque row text, translucent fill, no horizontal overflow

## Commands

Format:

```
npx oxfmt e2e/customizer-equipment-catalog.spec.ts
```

Result: exit 0.

Isolated Playwright run (already-running production `http://localhost:3634`, copied config, worker-local output):

```
npx playwright test --config=../2026-09-16-evidence-distilled/equipment-catalog-20260910.md (formerly .sisyphus/equipment-catalog-20260910/browser-worker/browser.config.cjs)
```

Config copy: `../2026-09-16-evidence-distilled/equipment-catalog-20260910.md` (formerly `.sisyphus/equipment-catalog-20260910/browser-worker/browser.config.cjs`)

- `testMatch`: `customizer-equipment-catalog.spec.ts` only
- `baseURL`: `http://localhost:3634`
- `outputDir`: `browser-worker/browser-artifacts`
- JSON reporter: `browser-worker/browser-results.json`
- no webServer / no server management

Result:

```
Running 2 tests using 1 worker
[1/2] electronics and compatible ammo update without changing unrelated filters @customizer
[2/2] add and place cancels cleanly and persists with one undo on desktop and mobile @customizer
  2 passed (8.7s)
exit 0
```

No subsequent harness defects. No product defects to report.
