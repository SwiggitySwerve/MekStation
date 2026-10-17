# B8/B3 patch verification — 2026-10-17

Implementation source: `621388297b89898882ea6d8f4efcc3c1c446f688`.
The follow-up changes only packaging verification helpers and this evidence record;
neither is included in the packaged application's files.

## Icon packaging

`desktop/assets/icons` has tracked generated SVGs since `98c428fbe` and does not
ignore ICO/PNG files. The generator now rasterizes those existing sources with
the root's existing `sharp` dependency. The ICO and runtime PNG results are
committed alongside the SVGs. No new dependencies or artwork were introduced.

Windows and all three NSIS icon options reference `assets/icons/icon.ico`.
Executable resource editing is enabled independently of signing, which remains
disabled. The smoke helper preserves resource editing too. Runtime paths now
resolve from `dist/electron` to the packaged `assets/icons` directory.

Executed from a fresh isolated worktree on Windows x64:

```powershell
npm run electron:icons
npm run typecheck
npm run build # MEKSTATION_SKIP_NEXT_TYPECHECK=true; independent typecheck passed
npm --prefix desktop run build
npm --prefix desktop run rebuild:next-standalone
cd desktop
npx electron-builder --dir --win --x64
```

The production build, standalone hydration, and Electron ABI rebuild passed.
Hydration verified the root native binding was unchanged and SQLite loaded
under both plain Node and Electron 43.2.0. Builder exited successfully and logged
`file signing skipped via signExecutable configuration`.

Built `desktop/release/win-unpacked/MekStation.exe` SHA-256:
`cd7e4771f1ce7520153f733f9ae605e6ea747b3b5fa74b0b1f4a996e84a678c7`.

The builder's installed `resedit` library read the built PE's icon group 1,
language 1033. All six embedded PNG frames (16, 32, 48, 64, 128, 256 px) matched
the corresponding committed ICO frames byte-for-byte. Both ICO files in
`resources/app.asar` also matched their committed sources, and its compiled
`main.config.js` contained the corrected runtime paths.

`[System.Drawing.Icon]::ExtractAssociatedIcon` extracted the EXE's 32×32 icon.
Decoding that PNG and the committed ICO's 32×32 PNG frame with `sharp` produced
4,096 RGBA bytes each, with **zero differing channels**.

Committed `icon.ico` SHA-256:
`3b89d61a0ae62ac12c063d8dad5a1479af01b0d06b2833508587af900c68601d`.
Committed `tray.ico` SHA-256:
`c3e91c09a3ccc3b4dce232c2baff2104079cf43c53eb6c771e1d243fd199b1f6`.

## Live tray proof

Unset `ELECTRON_RUN_AS_NODE` and launched the unpacked EXE with a unique
`--user-data-dir` under `desktop/.tmp/b8-b3-proof`. Its main-process log contained:

```text
Creating system tray...
System tray created successfully
MekStation Desktop App initialized successfully
Server: MEKSTATION_LISTENER_READY {"schema":"mekstation-packaged-listener-ready/v1","configuredHostname":"127.0.0.1","boundAddress":"127.0.0.1","family":"IPv4","port":3001}
```

The smoke launch owned PID 48320. After proof, a window-close request found no
visible main window; the harness stopped only that launch's PID tree. Its
processes exited and port 3001 was no longer listening. No unrelated processes,
PID 47516, or T3/Chrome processes were terminated.

## Performance and checks

The existing gameplay performance tests repeatedly sample work and support
`PRINT_PERF_BUDGETS`. B3 follows those conventions with five fresh timeline
mounts, unmounting between samples. The median retains the original 500 ms
limit: three of five mounts must meet it. Isolated scheduling/GC pauses no longer
fail the test; a persistent slowdown still does. This is a jsdom mount-time
regression check, not a browser frame-rate measurement.

Five consecutive runs of the entire file:

```powershell
$env:PRINT_PERF_BUDGETS = '1'
node node_modules/jest/bin/jest.js --runTestsByPath src/__tests__/performance.test.tsx --runInBand
```

All five passed all 16 tests. Timeline medians were **5.86, 7.11, 6.02, 9.16,
9.15 ms**. Jest was invoked directly because the installed npm PowerShell
wrapper discarded `--runInBand` in an initial five-run pass; the results here
are from the corrected serial runs. Non-excluded process CPU over five-second
idle samples was 6.2% before serial runs and 5.5% before packaging. PID 47516 and T3/Chrome were
excluded from the contention assessment; no other processes were killed to
make the machine idle. Heavy local proof batches ran sequentially.

- Desktop `type-check`: passed, including the test TypeScript project.
- Desktop tests: 10 suites, 72 tests passed, including runtime icon paths and
  multi-frame ICO headers/payload boundaries.
- Root `typecheck`: passed, including the scripts TypeScript project.
- Root `lint`: passed, 0 errors and 87 existing warnings.
- Root `format:check`: passed.
- Packaged security: 38/38 checks passed. The previous loopback URL assertion
  expected a direct string argument removed by the earlier startup refactor.
  It now verifies both the exact loopback constant and `loadURL` using that
  constant. Application navigation behavior is unchanged.

Raw local logs, PE frame hashes, extracted icon PNG, and launch profile are in
`desktop/.tmp/b8-b3-proof/` (ignored build evidence). The root checkout at
`E:/Projects/Personal/MekStation` was not edited. This patch does not change
`openspec/planning/**` or `src/lib/multiplayer/**`.
