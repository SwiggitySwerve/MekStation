# Phase declaration admission

`gameSessionActivation.ts` owns the commitment predicate. `Pending` and
`Planning` allow declarations; `Locked`, `Revealed`, and `Resolved` close them
until the next phase resets the lock state. Refusing a committed unit must
not change the session or append a combat event, journal batch, or receipt.

Multiple declarations before lock are valid: composed volleys contain one
group per target, and Melee Master permits its existing physical-attack
allowance. The existing physical count and limb restrictions still apply.

MegaMek pin `48fcb2f64`: `TWGameManager.java:10334–10357` refuses firing and
physical packets when the turn is invalid; `GameTurn.java:97–101,119–120`
requires a selectable entity; `Entity.java:2382–2384` requires `!done`.
`TWGameManager.java:10613–10616` marks committed actions done. Source paths:

- `megamek/src/megamek/server/totalWarfare/TWGameManager.java`
- `megamek/src/megamek/common/game/GameTurn.java`
- `megamek/src/megamek/common/units/Entity.java`
