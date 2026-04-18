# Tasks: Add Multiplayer Lobby and Matchmaking (2-8)

## 1. Team Layout Primitives

- [x] 1.1 Define `TeamLayout` enum: `'1v1'`, `'2v2'`, `'3v3'`, `'4v4'`,
      `'ffa-2'`, `'ffa-3'`, `'ffa-4'`, `'ffa-5'`, `'ffa-6'`, `'ffa-7'`,
      `'ffa-8'`
- [x] 1.2 Derive seat count: team layouts → 2 sides × N seats; FFA
      layouts → N sides × 1 seat
- [x] 1.3 Derive default side names: `'Alpha'`, `'Bravo'`, `'Charlie'`,
      ... for each side

## 2. Seat Slot Data Model

- [x] 2.1 Define `IMatchSeat` with `{slotId, side, seatNumber,
occupant: IPlayerRef | null, kind: 'human' | 'ai', ready: boolean,
aiProfile?: string}`
- [x] 2.2 Seats live on `IMatchMeta` under `seats: IMatchSeat[]`
- [x] 2.3 Seat `slotId` format: `{side}-{seatNumber}` e.g. `alpha-1`,
      `bravo-2`

## 3. Match Creation Expansion

- [x] 3.1 `POST /api/multiplayer/matches` accepts `{config,
layout: TeamLayout, aiSlots?: string[]}`
- [x] 3.2 Server generates `matchId`, invite `roomCode` (6-char,
      reusing `roomCodes.ts`), and initializes seats
- [x] 3.3 If `aiSlots` is provided at creation, those slots are pre-
      marked `kind: 'ai'`
- [x] 3.4 Host is auto-assigned to the first open human seat

## 4. Room Code Invite Flow

- [x] 4.1 Match meta stores both `matchId` (internal) and `roomCode`
      (shareable)
- [x] 4.2 `GET /api/multiplayer/invites/:roomCode` returns `{matchId,
status}` so a joiner can resolve code → match
- [x] 4.3 Joining: client hits the resolve endpoint, then connects to
      the WebSocket with the resolved match id
- [x] 4.4 Invite codes expire when the match enters `status: 'active'`

## 5. Seat Assignment Intents

- [x] 5.1 Intent `OccupySeat {slotId}`: a joining player occupies an
      unoccupied human seat
- [x] 5.2 Intent `LeaveSeat {slotId}`: player leaves; seat becomes
      unoccupied
- [x] 5.3 Intent `ReassignSeat {slotId, toSide, toSeat}` (host only):
      moves an occupant to a different seat
- [x] 5.4 Intent `SetAiSlot {slotId, aiProfile}` (host only): toggles
      a seat to AI
- [x] 5.5 Intent `SetHumanSlot {slotId}` (host only): toggles an AI
      seat back to unoccupied-human

## 6. Readiness Protocol

- [x] 6.1 Intent `ReadyToggle {slotId, ready: boolean}` for the slot
      owner
- [x] 6.2 AI slots are always considered ready
- [x] 6.3 All seats must be ready AND no seat may be empty before
      launch
- [x] 6.4 Host-only intent `LaunchMatch` flips the match from `'lobby'`
      to `'active'` and emits `GameStarted`

## 7. Lobby UI

- [x] 7.1 New page `/gameplay/mp-lobby/[matchId]` (Wave 5 shipped at
      `/multiplayer/lobby/[roomCode]` instead — same purpose, route
      keys off the shareable invite code rather than the internal id)
- [x] 7.2 Renders seats grouped by side in a grid; each seat shows
      occupant name / AI profile / "empty" / "you"
      (`LobbyPanel.tsx` + `SeatRow.tsx`)
- [x] 7.3 Each seat has slot controls: self-occupy/leave for open
      seats, host controls for AI toggle, ready toggle for occupied
      seats (`SeatRow.tsx` exposes Occupy/Leave/SetAi/SetHuman/
      ReadyToggle intents wired through `useMultiplayerSession`)
- [ ] 7.4 Top banner shows room code with copy-to-clipboard and an
      "invite link" (absolute URL) → deferred: room code is rendered
      in the lobby header but copy-to-clipboard + absolute invite
      URL are not yet wired
- [x] 7.5 Launch button visible only to the host when readiness is
      satisfied (`LobbyPanel.tsx` gates Launch on
      `isHost && canLaunch(seats)`)

## 8. AI Slot Wiring

- [ ] 8.1 Server spawns a `BotPlayer` per AI slot when the match
      launches → deferred: stub log fires on launch; the in-process
      `BotPlayer` driver that converts AI events to intents is a
      separate change (Wave 5 left this as a follow-up)
- [ ] 8.2 Bot players run inside the server process; they consume
      events and produce intents through an in-process bus (not
      WebSocket) → deferred: same as 8.1
- [ ] 8.3 Bot profiles: `'basic'`, `'aggressive'`, `'cautious'`
      (existing `BotPlayer` flavors) → deferred: profiles defined
      but not yet selectable in the in-process driver

## 9. Player Join/Leave Mid-Lobby

- [ ] 9.1 Player disconnect during lobby auto-clears their seat after
      60 seconds → deferred: lobby-phase auto-clear timer not wired
      (Wave 4's `PendingPeerTracker` only handles in-game pause); a
      lobby-specific timeout is a follow-up
- [ ] 9.2 Auto-cleared seat becomes `null` occupant (still human kind);
      host can invite a replacement or toggle to AI → deferred:
      depends on 9.1
- [ ] 9.3 Host disconnect during lobby does NOT delete the match; it
      pauses all lobby actions and shows `"Host reconnecting..."`
      → deferred: depends on 9.1 — lobby-phase pause flow not yet
      modeled

## 10. Launching Into 2-8 Match

- [x] 10.1 On `LaunchMatch`, server emits `GameCreated` with side
      assignments derived from seats (Wave 3b: status flips to
      `active`, `LobbyUpdated` broadcasts, and the engine itself
      appends `GameCreated` + `GameStarted` during launch — verified
      in `ServerMatchHost.test.ts`)
- [x] 10.2 Server persists the `seat → side` map on `IMatchMeta`
- [ ] 10.3 All clients transition from lobby page to combat page
      `/gameplay/games/[matchId]` → deferred: lobby route exists at
      `/multiplayer/lobby/[roomCode]` but the dedicated multiplayer
      combat page is still TBD (current lobby page surfaces a
      placeholder note that the engine has launched)

## 11. Tests

- [x] 11.1 Lobby state machine + intent integration tests pass
      (covers: 2v2 occupy + launch, host-only authz, canLaunch gate,
      LeaveSeat, room code expiry on launch)
- [ ] 11.2 Integration test: create `'ffa-4'` with 2 humans and 2 AI
      slots; verify bots generate valid intents in-process →
      deferred: depends on 8.1/8.2 — bot driver not wired. Wave 5
      integration test does cover a 1v1 with `aiSlots=['bravo-1']`
      launching cleanly though
- [x] 11.3 Integration test: host toggles a human slot to AI after
      one player joins that slot; player is kicked from the seat
      (covered as unit test on `setAiSlot` evicting occupant in
      `lobbyStateMachine.test.ts`)
- [ ] 11.4 Integration test: sixth player tries to join a `'2v2'`
      match; server responds `Error {code: 'MATCH_FULL'}` →
      deferred: there is no `MATCH_FULL` code today; over-capacity
      occupy attempts surface as `INVALID_INTENT` with reason
      `Slot ... is already occupied`; reconciling the error code is
      a follow-up

## 12. Spec Compliance

- [ ] 12.1 Every requirement in the `multiplayer-server` MODIFIED
      delta has at least one GIVEN/WHEN/THEN scenario → deferred:
      scenario backfill at archive time
- [ ] 12.2 Every requirement in the `multiplayer-sync` MODIFIED delta
      has at least one GIVEN/WHEN/THEN scenario → deferred: same as
      12.1
- [ ] 12.3 `openspec validate add-multiplayer-lobby-and-matchmaking-2-8
--strict` passes clean → deferred: run as part of archive step
      (non-strict validate run during this audit pass)
