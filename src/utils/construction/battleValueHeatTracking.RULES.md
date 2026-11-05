# Industrial Mech running heat

The shared heat-tracking owner charges zero running heat when the Mech adapter
identifies industrial structure. This flag is independent of the existing
industrial-cockpit offensive modifier. Jump heat and ordinary structure retain
their current rules.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`Mek.java:6348-6349,7361-7362` identifies industrial Meks by structure;
`Engine.java:715-724` returns zero running heat for them;
`MekBVCalculator.java:338-355` chooses running/jumping heat for heat efficiency.
Enforcement: `validate-bv-industrial-heat.test.ts`, through both the heat owner
and the public Mech calculator with a standard cockpit.
