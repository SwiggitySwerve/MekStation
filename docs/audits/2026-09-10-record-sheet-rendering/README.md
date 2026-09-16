# Record-sheet rendering repair — 2026-09-10

The local preview at http://localhost:3611 now runs build 1789083011905. Manual zoom survives resizing, Fit Width tracks the available width, and Letter/A4 preview, PDF, and print use the same filled sheet data. The critical table has larger aligned location headings, a stable number gutter, alternating row shading, clear six-slot divisions, and full equipment names fitted within the available column width.

## Reproduced failures and corrections

- The old preview changed manual 82% back to 67% after its container resized; Fit Width similarly reset to Fit Page. The shared zoom hook now stores manual, Fit Width, and Fit Page modes. Changing zoom does not regenerate the canvas. New staged render results commit only when their request remains current.
- Preview and export previously allocated a 12240×15840 canvas for both paper sizes. The new 4x path uses 2448×3168 for Letter and 2380×3368 for A4, with URL cleanup on success and failure. Letter estimated RGBA storage per canvas falls from 775,526,400 to 31,021,056 bytes (96%). This is a buffer calculation, not measured whole-process memory.
- ISO templates were given Letter margins and footer placement, clipping the lower sheet. Root-only geometry now respects ISO 559×806 content and expands it to A4 595×842; footer translation is 279.5,812. All 50 template root-size checks pass. Nested logo viewBoxes no longer supply page dimensions.
- Export uses compressed lossless PNG with existing jsPDF. A direct Chromium/jsPDF characterization showed the default PNG mode produced 23.3 MB for the same synthetic page that FAST compression reduced to 0.71 MB; FAST remains lossless.
- Print reserves its window synchronously and uses inline SVG. The toolbar awaits print/export, prevents duplicate actions, and exposes failures with Retry. Browser proof covers blocked popup recovery, selected paper, names, and cleanup after printing. Inline roots without a viewBox receive their intrinsic width/height as a viewBox so non-mech templates scale like the raster path; existing negative-margin viewBoxes remain unchanged.
- Critical-slot content, order, empty/Roll Again entries, hittable styling, copy identity, system-component exclusions, and multi-slot brackets across the sixth/seventh slot boundary are preserved.

## Measured outputs

| Paper  | Previous PDF bytes | Repaired PDF bytes | Reduction |
| ------ | -----------------: | -----------------: | --------: |
| Letter |          9,890,758 |          1,111,822 |     88.8% |
| A4     |          9,413,888 |          1,115,745 |     88.1% |

Both downloads have one page: Letter 612×792 pt, A4 595.28×841.89 pt. Their embedded images use FlateDecode instead of the previous JPEG DCTDecode and match the requested 4x canvas dimensions. First download observations were 2133→1121 ms for Letter and 2524→993 ms for A4. These single-run timings are observations, not a benchmark claim.

Final PDF samples are in output/pdf; evidence/output-files.json records absolute paths, sizes, and SHA-256 hashes.

## Verification

- Independent full TypeScript check: passed.
- Production build and standalone multiplayer hydration: passed.
- Printing/preview regressions: 47 suites, 532 tests, 5 snapshots passed.
- Browser suite: 5 scenarios passed on the rebuilt isolated server. Covered manual zoom/resize, Fit Width sizing, paper aspect and backing resolution, Atlas/Locust SVG identity and downloads, quad preview/export, existing workbench surfaces, and mobile navigation.
- Additional browser proof: manual 82% persisted after resize; Fit Width tracked 164%→168%; Letter/A4 downloads, synchronous popup reservation, blocked-popup Retry, and 390px mobile preview passed with no page errors.
- OpenSpec strict validation: 231 items passed. New repair-record-sheet-rendering change remains active; canonical specs and task checkboxes were not edited.
- Owned formatting: all 30 source/test files passed. Lint: zero errors, 85 warnings. One new nonblocking max-lines warning reports RecordSheetService at 402 counted lines; the other 84 warnings were present before the final print scaling change.
- Visual review: final Letter/A4 PDFs rendered at 150 DPI and critical details at 300 DPI. All eight critical locations had no horizontal text overflow; both footers were inside their page bounds. Browser-produced A4 print was also rendered and inspected; both print documents are one page.

## Preservation and evidence limits

All 95 preexisting dirty files outside the allowed ledger append retain their recorded byte hashes. The ledger retains its original 13 entries unchanged and adds only this repair. Final product hashes equal the build input snapshot. The preview retains its existing database directory and responds successfully at the original route. The isolated port 3636 server was stopped and its port release verified; port 3611 remains running. No commit, staging, branch change, or external publication was performed.

Product and test implementation used four Grok 4.6 CLI workers at high effort, with parent reproduction, review, integration checks, and visual acceptance. Raw attempts remain under ../2026-09-16-evidence-distilled/record-sheet-repair-20260910.md (formerly .sisyphus/record-sheet-repair-20260910); compact evidence is copied here. The whole repository test suite was not rerun for this printing change. Physical printer output was not exercised. Preview render errors still show an error sheet and retry on a subsequent unit/paper render; Print and Download PDF have explicit Retry controls.
