# Ammunition readiness

`weapons.ts` owns ammo-dependency/count policies and per-weapon projection;
`state.ts` owns compatible-bin matching, totals and consumption. Callers use
these public functions. The existing missile classifier supplies family identity.

Known missiles without positive `ammoPerTon` need explicit finite, positive
whole-round state. Missing capacity is not energy behavior and does not supply
ammunition. No capacity or bin is guessed. This repairs damaging consumers
activated by ProtoMek weapon catalog corrections; it is not full ammo parity.

AI selection, coordinated fire, runway, mode cost, adaptation, damage previews
and runner firing use that distinction. Runner, engine and interactive-session
AI use live nonempty bin state. Without it, the runner retains its empty-map
fallback and the engine retains its legacy ammo map for ordinary weapons.
The adapter carries the resolved catalog ammo identity independently of the
display name and prefixed mount ID. Runner selection uses the mode's explicit
family, then that resolved identity, then its existing unprefixed mount convention.
Live runner and engine AI projections use that same selection contract. Older adapter inputs without
an explicit identity retain name-based projection.

Existing contracts remain distinct: ordinary AI allows an absent count for a
positive-capacity weapon, while damage preview also recognizes explicit zero
capacity as ammo-dependent. Energy and one-shot guards retain their behavior.
Consolidation is separately committed and compared before the correction.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587` identifies these LRM
types as LRM ammunition users. This slice establishes local readiness and
consumption behavior; native per-shot masses, quantities, mount locations,
implicit one-shot bins, cap grouping and full BV remain separate. Session
resolution already refuses ammo-fed attacks when no matching bin exists.

Per-weapon projection includes explicit firing-mode ammo families as well as the
base family, deduplicated through the existing normalization contract. Otherwise
connecting live bins would incorrectly suppress an MML supplied only with a mode's
ammunition. A selected mode still determines the bin actually consumed. This does
not repair the separate AI choice of mode when only a different mode has ammo.

The retained capacity checks in hydration read a numeric catalog field, and the
compendium page displays that field. They do not decide ammunition readiness.
Implicit one-shot bin creation remains outside this change: an unknown-capacity
one-shot missile, like other missiles, now needs explicit ammunition state.

Catalog-wide readiness checks include positive-capacity weapons and recognized
missiles. They verify supplied catalog-keyed bins, not native compatibility or
source loading. Three chemical lasers and the vehicle flamer still bypass the
runner's depletion guard through its existing energy-name classifier; their live
counts are covered but their firing parity remains open. Damage preview magnitude
also remains unverified: rack-total damage can be multiplied by cluster hits.
