# Source critical facts in custom BattleMech saves

The custom writer preserves native engine cells only while the source engine,
rating, frame, configuration, gyro and cockpit still describe the current layout.
It preserves armored qualifiers only on an existing compatible system or the
surviving mounted identity at that source cell. Occupied mounted cells win over
source systems. Removed/replaced systems and equipment do not donate qualifiers.

MTFVocabulary owns exact native system identities. equipmentResolution owns
token decorations and mounted identity resolution; its existing ammunition
source-token path uses the same identity check. The writer keeps existing mount
spelling, ammo tokens and positions, adding only the retained armored qualifier
and the current mount's rear marker. It does not copy unrelated raw grid cells.

This is transport, not engine placement or BV calculation. The topology owner
remains slotOperations/topology.ts. Old documents are not rebuilt on load.
In particular, preserving source XXL cells must not infer engine technology or
change the BV consumer: C1 owns retiring the side-torso cell-count inference.
