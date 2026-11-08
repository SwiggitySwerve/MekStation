# Refit order lifecycle

The refit package owns order status, admission and conflict rules. Consumers
use its predicates instead of repeating status classifications.

- Active means `in-progress`, preserving K6 deployment readiness exactly.
- Open means `proposed` or active. A new order requires no other open order
  for the owned campaign unit. Terminal history does not reserve the unit.
- Cancellation changes only an open order's status to `cancelled`.
  Completed and cancelled orders are terminal no-ops. Hours, validation
  history, estimates and targets remain intact. Cancelled orders cannot
  advance, consume hours or apply their target configuration.
- Orders record no payments or parts reservations. Cancellation cannot
  refund an estimate or invent inventory. Future purchasing/reservation
  work must use existing finance and inventory owners.
- Old saves may contain duplicate open orders. Reads and serialization
  preserve every order. The day processor pauses all orders for that unit,
  reports a warning and continues unrelated units. Explicit cancellation
  by order ID resolves the conflict without choosing a target implicitly.
- Campaign actions refuse guest writes and stale campaign contexts before
  mutation. Host changes use the existing versioned campaign save path.
  Refits have no dedicated journal intent; no protocol is introduced here.

## Pinned MekHQ

At `e7adc2c`, `MekHQ/src/mekhq/campaign/parts/Refit.java`:
`begin` (1173) refuses an already refitting unit; `cancel` (1919) clears
the refit, releases parts and removes procurement without a cash refund;
`releaseNewPart` (1950) returns acquired spares through the quartermaster,
retains arrival/brand-new data and avoids unobtained parts. Installed parts
remain installed and ammunition is unloaded. `ForceShoppingList.java`
`removeOrdersForRefit` (195) retains purchased parts in transit. `Unit.java`
(8297) holds one nullable refit per unit.

MekStation does not yet represent those reservations or purchases; K8
implements the lifecycle rules over facts actually recorded on its orders.
