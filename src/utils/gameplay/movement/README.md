# Ground path pricing

This movement module owns ground path MP arithmetic. The construction and
movement rules are specified in [movement-system](../../../../openspec/specs/movement-system/spec.md).
Consumers use `calculateGroundPathMpCost` for one final facing or
`prepareGroundPathMpCost` when pricing several final facings of the same path.

Both contracts sum entry costs in path order, then add the existing turning
cost for the initial and final facings. Non-finite entry costs produce
`Infinity`. The provided movement context is passed to each entry unchanged,
preserving the existing ground-path contract. The similarly named
`calculations.calculatePathMovementCost` applies first-step context separately
and is not interchangeable with this entry sum.

A prepared price is local to one unchanged grid, path, movement mode, initial
facing and context. Prepare again after any input changes. There is no global
cache or reuse across candidate destinations or calls. Path search, tie order,
candidate ordering and MP cutoffs belong to their existing callers and do not
change when a price is prepared.

The frozen pre-optimization references in the adjacent tests independently
check the complete prices and ordered AI candidates. Runner equivalence tests
retain every event and result field, controlling only envelope UUID generation
and explicitly normalizing diagnostic timestamps and elapsed duration.
