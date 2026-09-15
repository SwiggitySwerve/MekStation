# Campaign Authority

## ADDED Requirements

### Requirement: Every campaign has exactly one source instance, owned by a server
A campaign SHALL be owned by exactly one source instance, hosted by the server process on the device that created it (or a device the source has been explicitly migrated to). The source instance SHALL be the only place campaign commands execute and the only authority for campaign state. Browser storage SHALL NOT be an authoritative home for any campaign state.

#### Scenario: Deep link resolves from the server, not browser storage
- **WHEN** any client (including a browser context that has never seen the campaign) navigates to a campaign route on the owning server
- **THEN** the campaign SHALL load from the server-side store, and the "Campaign not found" outcome SHALL occur only when the server genuinely does not own and does not replicate that campaign id

#### Scenario: A replica can never silently become a source
- **WHEN** an instance whose authority metadata says `replica` attempts to execute a campaign command locally
- **THEN** the command SHALL be rejected (or forwarded to the source) and the replica SHALL NOT append to the authoritative stream

### Requirement: All campaign mutations are commands appended to a durable event stream
Every campaign mutation SHALL be expressed as a command that the source validates and converts into one or more events appended to the campaign's event stream in the server-side event journal (stream type `campaign`, stream id = campaign id). The append SHALL be durable (fsynced by the journal) before the command is acknowledged to its submitter and before any broadcast occurs. Campaign state SHALL be a projection of the stream; the stream, not the projection, is the source of truth.

#### Scenario: Durable-before-acknowledge ordering
- **WHEN** a client submits a campaign command (advance day, accept contract, hire pilot, commit travel) and the process crashes immediately after acknowledgement
- **THEN** on restart the acknowledged events SHALL be present in the journal and reflected in the reprojected campaign state

#### Scenario: Command validation happens at the source only
- **WHEN** a command referencing state the submitter cannot see, or violating campaign rules, is submitted
- **THEN** the source SHALL reject it with a typed error and SHALL NOT append any event

### Requirement: The event stream is hash-chained and tamper-evident
Campaign events SHALL be appended through the existing canonical event journal so that each event carries the digest of its predecessor and a digest of its own canonical bytes. Any consumer SHALL be able to verify the chain of the stream (or of its scope-filtered projection, per campaign-access-projection) without trusting the transport.

#### Scenario: Chain verification detects a mutated historical event
- **WHEN** any stored event's payload is altered after append
- **THEN** chain verification SHALL fail at that event and the instance SHALL surface a corruption error rather than serving the altered history

### Requirement: Client storage is a cache, never a source
Clients (browser stores and packaged-app local stores for replicas' UI) MAY cache campaign projections keyed by instance id and stream revision for fast load and offline reading. On load, a cached projection SHALL be validated against the owning instance's stream head; a stale or divergent cache SHALL be replaced by replay/refetch, never merged by field.

#### Scenario: Stale cache is refreshed, not trusted
- **WHEN** a client with a cached projection at revision N connects to an instance whose stream head is revision M > N
- **THEN** the client SHALL apply events N+1..M (or refetch the projection) before rendering authoritative state

### Requirement: Existing browser-local campaigns are adopted, not stranded
The implementation SHALL provide a one-time adoption path that imports a browser-persisted campaign into the server store as the source instance, preserving its observable state, and thereafter demotes the browser copy to cache.

#### Scenario: Legacy campaign adoption
- **WHEN** a device with a pre-existing browser-persisted campaign loads the campaigns index after this capability ships
- **THEN** the campaign SHALL be offered for adoption into the local server store and, once adopted, SHALL deep-link correctly from any client of that server

### Requirement: Prepared journal append builds the batch inside one immediate transaction
`SQLiteEventJournalWriter` SHALL expose a concrete `appendPreparedWithExtension` method that is not part of generic `IEventJournal`. The method SHALL run one `this.db.transaction(...).immediate()` whose body calls `prepare(db)` first, then parses and canonicalizes `prepared.raw`, then calls `extend(db, context, append)` on the same handle. `prepare(db)` SHALL be contractually read-only: source/head reads only, with no SQL writes, external side effects, or retained statements/handles. P0a SHALL NOT add a runtime read-only database proxy or SQL parser; the contract for trusted internal callbacks plus real tests is sufficient. Both `prepare` and `extend` SHALL complete synchronously entirely during the transaction: they SHALL NOT `await`, return thenables, schedule timers/microtasks/deferred work, initiate external I/O, or retain `db`/`context`/`append` for later use. For the `TResult` contract, the `result` field of a refused `prepare` return and the direct `extend` return SHALL be synchronous; the defensive guard SHALL inspect the direct `prepare` return before its discriminator, `prepared.result` when it is refused, and the direct `extend` return, rejecting any Promise or thenable before commit and rolling back. Scheduling remains prohibited. The thenable guard is defensive only and cannot guarantee rollback of arbitrary scheduled or external side effects; P0a SHALL NOT promise a general runtime sandbox or detection of arbitrary scheduled closures. A source-command layer SHALL define its dedicated rollback error; `extend` SHALL throw that error on post-append source-write failure; the concrete writer SHALL propagate it unchanged through and out of the immediate transaction. Only the source-command caller SHALL catch AFTER rollback and map a typed refusal. A catch that returns a refusal inside the transaction is forbidden. P0a MAY characterize this with a dedicated fixture error plus a caller-side catch outside the writer; the writer SHALL NOT add a campaign producer or campaign error taxonomy. Existing `append` and `appendWithExtension` behavior SHALL remain compatible. This requirement is a preparation API freeze; it SHALL NOT be read as an implemented producer, private-envelope replay, or production cutover. `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` SHALL remain false.

#### Scenario: Prepare is contractually read-only
- **WHEN** `prepare` runs inside the immediate transaction
- **THEN** it SHALL perform source/head reads only
- **AND** it SHALL NOT execute SQL writes, retain statements or handles, or cause external side effects
- **AND** P0a SHALL NOT introduce a runtime read-only database proxy or SQL parser

#### Scenario: Prepare refuses before any append or write
- **WHEN** `prepare` returns `{ kind: 'refused', result }`
- **THEN** the writer SHALL return that typed result without parsing, canonicalizing, appending, or writing extension rows
- **AND** every relevant table SHALL be unchanged (command receipt, stream head, extension rows, and any other table `prepare` is permitted to touch)

#### Scenario: Prepared baseline is canonicalized inside the transaction
- **WHEN** `prepare` returns `{ kind: 'ready', context, raw }` whose payload includes a prepared baseline
- **THEN** `AppendEventBatchSchema.parse` and `canonicalizeCommandIdentityV1` SHALL run inside the same immediate transaction after prepare
- **AND** those baseline bytes SHALL be included in the command digest and event digest chain

#### Scenario: Duplicate event IDs are rejected as the current writer
- **WHEN** the prepared batch contains two events with the same `eventId`
- **THEN** the writer SHALL throw `Duplicate eventId` as `appendWithExtension` does today
- **AND** receipt, events, head, and extension rows SHALL roll back

#### Scenario: Thrown failure after prepare rolls back receipt, events, head, and extension rows
- **WHEN** parse, canonicalization, journal append, or the extension throws
- **THEN** the immediate transaction SHALL roll back journal receipt, events, and head together with any extension rows written on the borrowed handle

#### Scenario: Source-write failure after append throws a dedicated rollback error
- **WHEN** `append()` inside `extend` has already written journal rows and the subsequent same-handle source write fails
- **THEN** `extend` SHALL throw the source-command layer's dedicated rollback error (returning a failure object after append is forbidden because that return would commit)
- **AND** the concrete writer SHALL propagate that error unchanged through and out of the immediate transaction
- **AND** only the source-command caller SHALL catch AFTER rollback and map a typed refusal; a catch that returns a refusal inside the transaction is forbidden
- **AND** journal receipt, events, head, and source rows SHALL roll back

#### Scenario: Callbacks complete synchronously inside the transaction
- **WHEN** `prepare` or `extend` is invoked
- **THEN** the callback SHALL finish all of its work synchronously during the transaction
- **AND** it SHALL NOT `await`, schedule timers/microtasks/deferred work, initiate external I/O, or retain `db`/`context`/`append` for later use

#### Scenario: Thenable callback results are rejected before commit
- **WHEN** `prepare` directly returns a Promise or thenable, `prepare` returns `{ kind: 'refused', result }` whose `result` is a Promise or thenable, or `extend` directly returns a Promise or thenable
- **THEN** the writer SHALL reject that result before the immediate transaction commits and the transaction SHALL roll back
- **AND** this thenable guard is defensive only and cannot guarantee rollback of arbitrary scheduled or external side effects
- **AND** scheduling remains prohibited; P0a SHALL NOT promise a general runtime sandbox or automatic detection of arbitrary scheduled closures
- **AND** the callbacks SHALL remain synchronous with no nested `saveCampaign`

#### Scenario: Existing append paths stay compatible
- **WHEN** a caller uses `append` or `appendWithExtension` with a prebuilt batch
- **THEN** parse-then-transaction ordering and typed conflict returns SHALL match current `SQLiteEventJournalWriter` behavior
- **AND** `IEventJournal` SHALL still expose only prebuilt `append`

#### Scenario: P0a characterizations cover commit, prepare snapshot, rollback, refusal, and returned thenables
- **WHEN** P0a is implemented
- **THEN** tests SHALL prove actual SQLite commit then reopen, snapshot read of the passed `db` during prepare, rollback after append when a dedicated fixture rollback error is thrown, refused prepare leaving every relevant table unchanged, malformed and duplicate IDs, returned-thenable rejection/rollback, and a caller-side catch outside the writer mapping that fixture error after rollback
- **AND** those tests SHALL NOT be treated as already present, as campaign-producer coverage, as a writer-owned campaign error taxonomy, or as automatic scheduled-work detection

### Requirement: Private source replay and AcceptContract producer remain sequenced after P0a
P0a SHALL NOT admit private envelope replay or the toolbar source command. P0b SHALL require a journal-private envelope carrying the exact persisted source record, source row version, source body digest, and root public revision captured under the prepared transaction, preserving unrelated source body as baseline input. Full accepted contract and remaining market SHALL live only in that private envelope, not on public `campaignEvent` or `ICampaignAuthoritativeState`. Conditional absence SHALL preserve legacy canonical hashes. Borrowed-handle campaign writes SHALL use CAS and a `sourceReplayFence` that rejects later generic whole-envelope overwrites. Source snapshot/cache version, original command receipt revision, and current journal revision SHALL remain distinct. Private/public identity mismatch or unsupported replay schema SHALL block or rebuild with no silent compact fallback. P1 SHALL remain not implementation-ready until P0b: actual `acceptContractOffer` toolbar source command; stable `contractId` and authenticated actor fingerprint excluding `expectedRevision`; duplicate lookup before offer read; server-derived name and employer from the stored offer using exact opaque `employerId` with no invented aliases; current public head after later commands plus original receipt revision. Existing active-seat `/commands` authorization SHALL remain; its response and guest/room-code data SHALL stay compact. Full private HTTP readback SHALL remain blocked until a source-only audience contract that NAMES THE READBACK AUDIENCE, its concrete caller, and its authentication story exists; the envelope-carriage audience contract admitted by D12 (2026-09-15) is NOT that contract and SHALL NOT be read as releasing this gate. Browser-generated offer persistence SHALL NOT be assumed. The actual source command SHALL NOT be replaced by a co-op archival API.

#### Scenario: P0a does not ship a campaign producer or cutover
- **WHEN** only the P0a prepared-append API is in scope
- **THEN** no campaign source producer, flag flip, or migration cutover SHALL be treated as admitted
- **AND** compact public events and room-code hydration SHALL keep their current shapes

#### Scenario: P0b private baseline is the persisted source row, not compact genesis
- **WHEN** private contract replay is later admitted
- **THEN** the baseline SHALL be the exact `SerializedCampaign` row, version, body digest, and root public revision captured under the transaction
- **AND** compact `CampaignSnapshotPublished` genesis SHALL NOT be used as that full-source baseline

#### Scenario: P1 AcceptContract stays compact on the current active-seat command route
- **WHEN** a seated caller uses `POST /api/campaigns/[id]/commands` after P0b
- **THEN** authorization SHALL remain the existing active-seat gate
- **AND** that HTTP response and guest/room-code data SHALL NOT include private full contract, remaining market, or source materialization metadata
- **AND** full private HTTP readback SHALL still require a separate verified source-only audience contract that names the readback audience, its caller, and its authentication story, which the D12 envelope-carriage contract does not supply

### Requirement: Full contract and remaining market are source-only, narrowed at the stored-envelope boundary
The full accepted `IContract` and the remaining `ICampaignContractMarket` SHALL be source-only facts. Their VALUES SHALL be carried on a journal-private field of the stored campaign journal envelope, a sibling of `campaignEvent`, and SHALL NOT appear on `ICampaignAuthoritativeState`, on any `campaignEvent` payload, on a grant-projected delivery item, on a room-code guest hydration snapshot, on the co-op mirror, or on any HTTP response. No grant scope -- `campaign`, `team:`, `player:`, or the GM all-scopes grant -- SHALL entitle a recipient to those values over the wire; the audience is the source instance's own server process and its persisted `SerializedCampaign` record.

One carve-out is explicit and accepted. The per-event delivery identity (`projectedEventIdentity`, the journal `eventDigest`) commits to the whole stored payload including the journal-private field, because the journal's digest material covers `payload`. Only that one-way commitment SHALL cross the boundary, never the private values, and the source SHALL NOT expose any surface that confirms a candidate private payload against a delivered identity. The private field SHALL remain inside the digest material so it keeps the journal's hash-chain tamper-evidence.

The narrowing from a stored journal row to a wire campaign event SHALL be the single `envelopeOf` projection that returns the stored `campaignEvent` and nothing else, and every wire read path SHALL obtain campaign events through it. This is an ADDED obligation, not a description of current behavior: grant projection narrows inline today and SHALL be routed through `envelopeOf` as part of the implementation that introduces the journal-private field, so that the two narrowing sites collapse to one. A field-redacting projector over campaign-scope payloads SHALL NOT be introduced as the enforcing boundary. A guest-visible contract detail, if a future product requirement demands one, SHALL be introduced as a new event type stamped with its own scope carrying exactly that fact, not by widening a campaign-scope payload.

The journal-private field SHALL be conditionally constructed and absent when no admitted private payload exists. The implementation SHALL NOT write it as an empty object or as an enumerable `undefined` property, because the journal canonicalizer rejects `undefined` and hashes exactly the enumerable own keys, and the campaign state digest hashes the canonical state; either shape would change the digest of unchanged history.

This requirement admits an ENVELOPE-CARRIAGE audience contract only -- where the private values live and which wire types may not name them. It SHALL NOT be read as admitting a producer implementation, a full private HTTP readback, a widened `/commands` response, or a production cutover; `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` SHALL remain false. In particular it SHALL NOT be read as satisfying the readback gate above merely because it is a source-only audience contract: that gate additionally requires a named readback audience, caller, and authentication story, none of which this requirement supplies. This requirement also constrains READ paths and wire types only; a bulk stored-row copy path (export, backup, replay-to-another-host, support bundle) would carry the private field and SHALL require its own decision.

#### Scenario: Campaign-scope guest or observer never receives full contract or market
- **GIVEN** a campaign whose source has committed an accepted contract carrying full `IContract` detail and a remaining contract market on the journal-private envelope field
- **WHEN** a campaign-scope grant is projected for delivery, or a room-code guest hydration snapshot is composed and republished, or the co-op guest mirror applies the delivered events
- **THEN** the delivered events, the composed hydration snapshot, and the resulting `ICampaignAuthoritativeState` SHALL contain only the existing compact accepted-contract representation
- **AND** they SHALL NOT contain employer, target, payment terms, salvage rights, morale level, AtB contract type, or any market offer
- **AND** the absence SHALL follow from `envelopeOf` narrowing the stored row to `campaignEvent` at every wire read path including grant projection, not from a field-redacting projector applied after the fact
- **AND** deleting the `envelopeOf` narrowing SHALL turn each of these leak assertions red, which requires grant projection to obtain its events through `envelopeOf` rather than inline

#### Scenario: Host and source retain the full private fact
- **GIVEN** the same committed accepted contract on the source instance
- **WHEN** the source replays its own campaign stream from the journal, or reopens its SQLite journal after restart
- **THEN** the source SHALL recover the full `IContract` and the remaining market from the journal-private envelope field together with its persisted source record baseline
- **AND** the recovered private facts SHALL NOT be re-emitted onto any `campaignEvent`, delivery item, hydration snapshot, or HTTP response as a consequence of that replay
- **AND** the GM all-scopes grant SHALL receive no more of the full contract or the remaining market than any other campaign-scope recipient -- namely none -- because grant scope does not govern this boundary; the GM's wider entitlement under D4 (the raw stream, and `CampaignSnapshotPublished` rows a restricted grant does not receive) is unchanged and orthogonal to it

#### Scenario: Legacy envelope without a private payload stays byte-identical
- **GIVEN** a legacy stored campaign journal envelope or authoritative state written before any private payload existed
- **WHEN** it is replayed, canonicalized, or digested
- **THEN** the journal-private field SHALL be absent rather than an empty object or an enumerable `undefined` property
- **AND** the canonical bytes and the resulting state digest SHALL be unchanged from their pre-existing values
