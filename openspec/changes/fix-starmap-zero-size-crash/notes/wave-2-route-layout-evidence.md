## Wave 2 (D2 — route layout fix) — verified no-op

**Task 2.1** claimed the campaign starmap page's display container lacked a definite height and needed a `flex-1 min-h-0` fill fix. Verified against current code (`main` at commit `bd94ded0b`, unchanged through this wave): that premise does not hold.

- `src/pages/gameplay/campaigns/[id]/starmap.tsx:240-243` wraps `<StarmapDisplay />` in:
  ```tsx
  <div
    className="border-border-theme h-[600px] w-full overflow-hidden rounded border"
    data-testid="starmap-container"
  >
  ```
  `h-[600px]` is an explicit, definite, non-zero height utility — not a flex-derived or conditionally-collapsing height.
- `git log -1 --format=%cd -- 'src/pages/gameplay/campaigns/[id]/starmap.tsx'` → `2026-07-02 03:28:50 -0600`. The file (including this wrapper div) has been unchanged since before the 2026-07-07 playtest finding that reported the crash, and no commit since has touched it. The zero-height condition described in the proposal was not present at the time of the finding.
- `src/components/ui/PageLayout.tsx` (the shared page chrome ancestor) has no conditional-hidden, `display:none`, CSS transition/animation, or tab-panel-hiding logic that could zero out a descendant's box at mount. It's a plain `min-h-screen` wrapper with static header/breadcrumb markup.
- Given `h-[600px]` on the direct ancestor and `height:100%` on `StarmapDisplay`'s own outer div (`StarmapDisplay.tsx:174`, unchanged by Wave 1), the measured container height should resolve to 600px on any standard layout pass — a CSS-only zero-height bug is not supported by the current DOM/CSS chain.

**Task 2.2** — checked all sibling campaign tabs (`src/pages/gameplay/campaigns/[id]/*.tsx`: acquisitions, contract-market, finances, forces, gm-ledger, hiring, index, log, mech-bay, medical-bay, missions, personnel, prestige-morale, repair-bay, salvage). None of them embed a Konva/canvas-based display or share the `starmap-container` wrapper pattern — they're all table/list/form-driven tabs with no fixed-height canvas host. There is no shared wrapper to fix, and no other zero-height container pattern was found anywhere under this route tree.

**Conclusion**: the 2026-07-07 crash was not caused by a zero-height route wrapper. It is fully explained by the measurement-timing race that Wave 1's `StarmapDisplay` guard fixes directly: the mount-time `updateSize()` call could read `clientWidth`/`clientHeight` before the browser had committed layout for the freshly-mounted route (or during a transient 0-size tick), and the pre-Wave-1 code had no guard against acting on that zero reading — it set `stageSize` to `{0,0}` and rendered the Konva `<Stage>` at those dimensions, which is what threw. Wave 1's defer-until-valid-measurement guard (see `StarmapDisplay.tsx:48,61-73,178-207`) closes that race regardless of root layout cause, and the delta spec's "Campaign starmap route provides a sized container" scenario is satisfied by the pre-existing `h-[600px]` wrapper — no route file change is required.

Task 2.1 and 2.2 are ticked as verified-no-op. No files under `src/pages/` were modified in this wave.
