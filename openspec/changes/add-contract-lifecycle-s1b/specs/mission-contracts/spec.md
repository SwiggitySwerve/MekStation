## ADDED Requirements

### Requirement: Contract-rules reader level

The system SHALL keep a reader level, the highest contract rules version this
build's processors implement, separate from the writer level and from the
validator's maximum, with writer <= reader <= validator maximum. A request
header `X-MekStation-Lifecycle-Rules` SHALL declare the sender's reader level;
an absent, malformed or repeated header SHALL mean level 1 and SHALL NOT cause
a 400.

#### Scenario: Header forms

- **GIVEN** a request with no header, `02`, `two`, `2, 2` or `0`
- **WHEN** the gate reads the sender's level
- **THEN** the level is 1 in every case

### Requirement: Reader gate on campaign routes

GET and PUT `/api/campaigns/[id]`, adopt, redeem and commands SHALL refuse a
reader below the rules level a contract in the stored or incoming body needs,
with HTTP 426, a `Cache-Control: no-store` header, an `Upgrade` header naming the
required level, and the body
`{kind:'refused', code:'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED', reason, error, requiredLifecycleRules, readerLifecycleRules, source}`.
The gate SHALL run after the route's authentication verdict and before any 409,
and SHALL leave stored data unchanged. A refused reader SHALL never receive a
contract through the conflict path.

#### Scenario: Conflict path

- **GIVEN** a stored version 2 contract and a stale `baseVersion` from a level 1 reader
- **WHEN** it PUTs the campaign
- **THEN** the answer is 426 with no `current` record, and the row is unchanged

#### Scenario: Authentication first

- **GIVEN** a live-hosted campaign holding a version 2 contract
- **WHEN** a caller with no bearer PUTs it
- **THEN** the answer is 401, not 426

### Requirement: Unreadable contract version

A contract whose version value no reader can interpret SHALL be shown read-only
to a reader that declares its level, with the diagnostic response header
`X-MekStation-Lifecycle-Diagnostic: unreadable-contract-version`, and writes
SHALL be refused with 422 `CAMPAIGN_LIFECYCLE_RULES_UNREADABLE`. A reader that
declares no level SHALL receive 426.

#### Scenario: Declared reader

- **GIVEN** a stored contract with version `"two"`
- **WHEN** a reader declaring level 1 GETs, then PUTs
- **THEN** the GET is 200 with the diagnostic header and the PUT is 422

### Requirement: Cache keyed by reader level

Every GET `/api/campaigns/[id]` response SHALL carry `Vary: X-MekStation-Lifecycle-Rules`,
and the service worker SHALL key cached campaign GETs on that header.

#### Scenario: Offline replay

- **GIVEN** a version 2 body cached for a level 2 reader
- **WHEN** a header-less request is made offline
- **THEN** the cached body is not returned

### Requirement: Inert contracts

The system SHALL treat a contract as inert when its required reader level exceeds
this build's reader level or its version is unreadable. One predicate owned by
the lifecycle rules module SHALL be the only test, and no processor, selector,
market accept or day pipeline SHALL act on an inert contract. An inert contract
SHALL be carried through load and save unchanged and shown read-only with no
launch action.

#### Scenario: Expiry

- **GIVEN** an active inert contract past its end date
- **WHEN** the day pipeline runs
- **THEN** the contract is unchanged and no payment is made

### Requirement: Local-storage seam

A campaign holding a contract above the reader level SHALL be persisted under
`<key>.lifecycle` with a tombstone under the key older code reads
(`campaign-store`, `missions-<id>`, `campaign-<id>`); a campaign holding none
SHALL write exactly the old bytes. Slots SHALL never be deleted automatically.
When the old key holds content of the same campaign that the tombstone did not
write, the slot SHALL win and the user SHALL be told, naming the campaign, that
changes made in an outdated tab were not kept.

#### Scenario: Outdated tab

- **GIVEN** a tombstone overwritten by an older tab
- **WHEN** the stores hydrate
- **THEN** the slot's campaign is loaded and the notice names it

### Requirement: Co-op start on a version 2 campaign

The system SHALL refuse to start a co-op session on a campaign holding a
contract above the reader level, with a named reason, until S6.

#### Scenario: Blocked start

- **GIVEN** a campaign holding a version 2 contract
- **WHEN** the host starts a co-op session
- **THEN** the start is refused with reason `contract-rules-not-supported-in-coop`

### Requirement: Desktop downgrade protection

Backup restore SHALL refuse a backup made by a newer app version before copying
anything or creating a safety backup. Startup SHALL refuse a database whose
recorded migration version exceeds the highest this build knows. The marker
migration S7 will add SHALL be designed and not activated.

#### Scenario: Newer backup

- **GIVEN** a backup recorded by app 0.3.0 and a running app 0.2.4
- **WHEN** restore is requested
- **THEN** it fails with a plain-language message and the data directory is unchanged

#### Scenario: Unreadable recorded version

- **GIVEN** a backup whose recorded app version is not a readable version
- **WHEN** restore is requested
- **THEN** it fails, the message quotes the raw recorded value as a value, and the data directory is unchanged

### Requirement: Refusal wording by shell

The 426 refusal SHALL tell a browser tab to reload and SHALL tell the desktop
shell to update the app, because a reload in the desktop shell serves the same
embedded build. The shell SHALL be told apart by the existing `isElectron()`
detection, and the desktop shell SHALL NOT offer a Reload action for the refusal.

#### Scenario: Desktop shell

- **GIVEN** the campaign page runs in the desktop shell and the server answers 426
- **WHEN** the refusal is shown
- **THEN** the sentence ends "Choose Help > Check for Updates... to update MekStation, then open this campaign again." and no Reload button is offered

The sentence SHALL name the update route by the label the Help menu item that
sends `help:check-updates` really has, and a test SHALL fail if that label and
the sentence drift.

#### Scenario: Menu label drift

- **GIVEN** the Help menu item that sends `help:check-updates` is relabelled
- **WHEN** the refusal tests run
- **THEN** `readSaveRefusal.desktop.test.ts` fails until the sentence names the new label

### Requirement: Gate on the first stage that writes version 2

The system SHALL NOT merge the first stage that writes contract rules version 2
(S7, which raises the writer constant from 1 to 2) until both exist: orphan-slot
recovery for `.lifecycle` slots, and a slot scheme that cannot drop an orphan
(today `campaign-store.lifecycle` is one slot per key, so a v2 write for a
different campaign would replace one). Until then the writer stays 1 and neither
loss can happen. This change implements neither; it records the gate. Its
regression test is the witness pair under
`contract-lifecycle/S1b-frozen-client/` (outside the repository):
`local-c.frozen.witness.test.tsx` (an older client starts on a tombstone and
writes; the v2 campaign becomes invisible in that profile) and
`local-c-after.new.witness.test.tsx` (the current tree reads the old key as it
stands and keeps the slot byte for byte). S7 SHALL re-run the pair and extend
`local-c-after` to assert the orphan is listed and survives a later v2 write.

#### Scenario: Orphan after an old-client write

- **GIVEN** an older client wrote over a tombstoned slot holding a v2 campaign
- **WHEN** S7 is proposed
- **THEN** orphan-slot recovery lists that campaign and a later v2 write for another campaign leaves its slot intact
