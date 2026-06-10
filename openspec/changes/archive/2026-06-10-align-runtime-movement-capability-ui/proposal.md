# Proposal: Align Runtime Movement Capability UI

## Why

Runtime conversion and mount state can change a unit's movement motive, height,
available MP, and jump legality after import. The movement projection and commit
validator already resolve that state, but the gameplay movement legend and
command capability can still read the raw import-time capability.

That creates a player-facing trust problem: the map may project grounded LAM
Fighter or QuadVee vehicle movement correctly while adjacent UI still suggests
the old Mek-mode MP or jump availability.

## What Changes

- Resolve runtime movement capability before building gameplay movement legend
  MP, motive, and jump availability.
- Pass the resolved capability to gameplay movement range derivation, hovered
  projection, planning-panel heat profile, and command surfaces.
- Add focused hook coverage for grounded LAM Fighter conversion so the real
  gameplay surface exposes wheeled cruise/flank MP and blocks jump selection.

## Out of Scope

- New conversion or mount/dismount actions.
- Changing the underlying runtime capability resolver.
- Broad browser coverage for every runtime conversion profile.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/components/gameplay/pages/gameSession/GameSessionPage.movement.ts`,
  `src/components/gameplay/GameplayLayout.tsx`,
  `src/components/gameplay/pages/gameSession/GameSessionPage.movement.test.ts`
- Tests: focused gameplay movement-planning hook coverage
