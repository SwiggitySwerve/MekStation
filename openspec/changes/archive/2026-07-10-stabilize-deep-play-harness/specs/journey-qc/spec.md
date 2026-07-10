# journey-qc — Delta for stabilize-deep-play-harness

## MODIFIED Requirements

### Requirement: Two-Client Multiplayer Deep-Play Journey

Journey QC SHALL include a capture-tolerant two-client deep-play journey in the UX walkthrough audit that uses two browser contexts as separate clients. The journey SHALL provision two vault identities, drive a co-op campaign create-and-join flow and the `/multiplayer` 1v1 create-and-join lobby flow, and capture the join outcome and lobby state on both clients. The journey MUST record the connection or handshake outcome as a finding and MUST NOT hard-assert a successful networked session, so it captures either the connected flow or a current failure. The guest read-only ledger observation MUST be hydration-aware: it SHALL wait for the guest player-only ledger view to become visible before reading each redaction sub-fact, and its reload-survival sub-fact SHALL distinguish a slow post-reload mount from a genuine guest-to-GM authority flip by also asserting the GM control-plane surface is absent — so a pre-hydration loading shell is never recorded as a redaction leak.

#### Scenario: Co-op journey captures host and guest join outcome

- **WHEN** the two-client journey creates a co-op campaign on the host client and joins with the room code on the guest client
- **THEN** the journey SHALL capture the host room code and the guest join outcome on both surfaces
- **AND** the journey SHALL record a finding describing the resulting connection state instead of failing the run

#### Scenario: Connected guest sees a read-only GM ledger

- **GIVEN** the two-client co-op journey where the guest client successfully joined the shared campaign
- **WHEN** the guest navigates directly to the campaign GM ledger route (`/gameplay/campaigns/<id>/gm-ledger`)
- **THEN** the journey SHALL capture the guest's ledger view and record a finding for whether it is read-only: public summaries present, no approve or preview controls, no GM-private fields
- **AND** before reading each redaction sub-fact the journey SHALL wait for the guest player-only ledger view to become visible within a bounded wait, so a pre-hydration loading shell (which stamps the same `page-title`) is not mistaken for an authority regression
- **AND** the reload-survival sub-fact SHALL be a conjunction of (a) the guest player-only view reappearing after reload within a bounded wait AND (b) the GM control-plane surface being ABSENT after reload, so a slow guest mount is distinguished from a real guest-to-GM authority flip
- **AND** this guest-ledger check SHALL be guarded on join success and SHALL be skipped (not failed) when the guest did not connect

#### Scenario: 1v1 lobby journey captures both clients

- **WHEN** the two-client journey mints a token and creates a `/multiplayer` match on the host and joins it on the guest
- **THEN** the journey SHALL capture the lobby state on both clients
- **AND** the journey SHALL record a finding when either client does not reach an occupied-seat lobby state

## ADDED Requirements

### Requirement: Deep-Play Review Evidence Persistence

The UX walkthrough audit SHALL persist its review-grade text artifacts to version control while excluding its screenshot, video, and rendered-HTML artifacts. Specifically, the per-run `REVIEW.md`, `manifest.json`, and `journeys/*.json` for the `ux-walkthrough` evidence tree, and the `*.md` and `*.json` artifacts for the `playtest` evidence tree, SHALL be committable, while per-journey screenshot directories, videos, and `index.html` SHALL remain ignored. Because git cannot re-include a file whose parent directory is excluded, the ignore policy SHALL both (a) provide a negation ladder that re-includes only the text artifacts and (b) ensure no ancestor catch-all pattern excludes the `.sisyphus` directory itself, and SHALL carry a comment explaining the parent-directory-exclusion rule so the policy is not later collapsed back into a directory-level ignore.

#### Scenario: Review text is committable and screenshots are ignored

- **GIVEN** a completed `qc:ux-audit` run under `.sisyphus/evidence/ux-walkthrough/<runId>/`
- **WHEN** the repository ignore rules are evaluated for that run directory
- **THEN** `REVIEW.md`, `manifest.json`, and files under `journeys/` SHALL NOT be ignored
- **AND** the per-journey screenshot directories, video artifacts, and `index.html` SHALL remain ignored
- **AND** `git status` SHALL list only the review-text artifacts as untracked additions for that run

#### Scenario: Playtest evidence text is committable

- **GIVEN** a playtest evidence directory under `.sisyphus/evidence/playtest/<name>/`
- **WHEN** the repository ignore rules are evaluated
- **THEN** the `*.md` and `*.json` review artifacts SHALL NOT be ignored
- **AND** the screenshots under that directory SHALL remain ignored

#### Scenario: Ignore policy documents the parent-directory rule

- **WHEN** a reader inspects the `.sisyphus` ignore rules
- **THEN** a comment SHALL explain that git cannot re-include a file under an excluded parent directory
- **AND** the policy SHALL keep both the negation ladder and the non-directory-matching catch-all so a future edit does not silently re-hide the review text
