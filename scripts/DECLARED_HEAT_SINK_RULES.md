# Declared heat sinks in BV inputs

The movement/heat input owner caps its engine-integrated sink assumption at
the source's declared sink count as well as engine capacity. Capacity alone
does not create sinks. Keep the existing critical-grid recovery and heat-type
multipliers. In particular, Raider JL-3B declares four double sinks: eight heat
dissipation and twelve heat efficiency, rather than sixteen and twenty-two.
Its combat ICE engine generates two running heat; industrial structure retains
the native exemption. The two corrections belong to the same Raider heat path.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`MtfFile.java:570-598` adds only expected sinks not already allocated;
`Mek.java:2198-2210` bounds that inventory by engine capacity;
`MekBVCalculator.java:313-315` starts heat efficiency at six plus capacity.
`Engine.java:715-724` supplies combat ICE/fuel-cell running heat and the
industrial exemption.
