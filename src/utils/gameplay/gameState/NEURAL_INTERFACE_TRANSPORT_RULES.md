# Native neural-interface transport

`IGameConfig.neuralInterfaceMode` carries the raw native game option through
GameCreated. `IGameUnit.hasDNICockpitMod` carries verified construction evidence.
The reducer retains both on runtime unit state, separately from the legacy
`neuralInterfaceActive` jack-in flag. Missing inputs remain missing; null, blank,
unknown and explicitly false inputs survive transport unchanged.
Construction without an equipment/critical-slot inventory keeps hardware unknown.

Hardware hydration accepts the native DNI cockpit internal/display identities
from equipment or critical slots. BA NIU is a separate item; its misleading
local catalog name cannot establish DNI hardware. No catalog data changes here.

Authority: MegaMek 48fcb2f6 OptionsConstants.java:416, Entity.java:13356-13379,
NeuralInterfaceMode.java:91-119, MiscType.java:4979-5017 and
EquipmentTypeLookup.java:172. Mode is session configuration, never a design fact.

The SPA owner `src/lib/spa/neuralInterface.ts` alone interprets native activity.
PSR transport does not calculate activity or change represented modifiers.
Q-gaps owns Hard Pilot integration. Higher-level engine/runner/host option
authoring, equipment alias repair and full native gameplay parity remain separate.
