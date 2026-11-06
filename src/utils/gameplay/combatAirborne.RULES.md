# Native target airborne fact

`deriveTargetIsAirborne` owns the target fact used by weapon-attack hydration.
It replaces the independently supplied `IUnitGameState.isAirborne`; a stale
true/false flag cannot override native state. Without an established combat
envelope/elevation mapping it returns `undefined`, not a guessed flight fact.
The attacker flag and unrelated physical/movement eligibility remain separate.

Pinned MegaMek: `48fcb2f64a1b3f2d575707ce5653dad64927b587`.

- `Entity.java:15944-15948` is
  `(!destroyed && altitude > 0) || mode == AERODYNE || mode == SPHEROID`.
  Preserve that precedence: destruction gates altitude only.
- `IAero.java:945-962` restores AERODYNE/SPHEROID on liftOff, including
  liftOff(0); `IAero.java:964-979` sets WHEELED and altitude/elevation0 on land.
  The transported aerospace lifecycle maps grounded to landed/WHEELED and
  airborne/taking-off/landing to flight mode, under Root's pinned-source
  lifecycle ruling. No additional native mode transition was identified for
  those local labels. Both construction designations satisfy the same flight
  mode disjunction, so this boolean query tests their union; it neither guesses
  the designation nor stores a new mode. A destroyed flight-mode aerospace
  unit still satisfies the independent mode branch, as native does.
- `Entity.java:14126-14148` rejects destroyed VTOL/WiGE, requires that motion
  mode, rejects building/bridge level >= elevation, otherwise uses elevation>0.
  The existing vehicle altitude controls represent that relative elevation;
  map base elevation and unit height are not substitutes. Unspecified vehicle
  altitude stays unknown. Other combat-envelope families remain unestablished
  by this bounded slice.

Session attack hydration reads existing GameCreated `hexTerrain` at the
target's current position, with current `terrainOverrides` taking precedence.
Projection forwards its current grid features through both volley and
per-weapon paths; the runner already forwards those features. No producer,
event, schema or terrain data changes are needed.

Hydration's optional fourth argument supplies terrain solely for the native
airborne fact. It defaults to the existing third argument (the runner path).
Session/projection supply the new context separately so that this prerequisite
does not enable unrelated Terrain Master SPA consumers which previously had
no terrain input in those paths. Their existing third-argument contract and
arithmetic stay unchanged.

Existing physical `isAirborneVTOLOrWiGEForPhysicalAttack` and movement
`isAirborneAeroState` answer different eligibility questions with different
destruction, terrain and supported-mode contracts. They are not copies of
this full native target predicate and are not replaced here. No Anti-Air
modifier, quirk registry, catalog/converter, source binding or BV rule changes.
No complete native airborne/gameplay parity is claimed for other families.
