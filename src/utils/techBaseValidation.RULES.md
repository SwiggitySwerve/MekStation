# Component selection technology membership

`techBaseValidation.compatibility.ts` owns the mode decision for component
selection membership. It imports only technology enums. Consumers supply a
membership callback; this leaf module does not resolve equipment identities or
infer supported sides from a binary catalog field.

- Mixed mode accepts membership on either existing technology side, in
  `ALL_TECH_BASES` order and with the existing short circuit.
- Fixed or omitted mode checks only the supplied component side. The explicit
  mode does not override that side: the caller owns component configuration.
- A value supported on neither side remains unsupported in Mixed mode.
- Existing component filters own their membership tables. Defaults, fallback
  order, and per-side selection memory remain in their existing modules.

`getFullyValidatedSelections` preserves a supported Mixed selection before
consulting memory. Fixed-mode selection restores supported memory first, then
keeps a supported current value, then uses the existing default. An omitted
memory side does not activate memory restoration.

The production consumer is the BattleMech store's technology-switch action
through `techBaseValidation.ts`, its registry, and selection-memory helpers.
The separate `construction/techBaseValidation.ts` has a legacy compatibility
policy that permits IS components on Clan units; it is a different contract
and is not changed by this extraction.

This selection owner is not a complete construction-legality verifier. MegaMek
48fcb2f64 `TestEntity.java:1238-1459` also considers the composite technology
level, advancement dates, ammunition, ignored components, and family verifier
policy. Non-mech enforcement remains pending a native technology-facts producer
decision. No non-mech validator consumes this helper in this change.
