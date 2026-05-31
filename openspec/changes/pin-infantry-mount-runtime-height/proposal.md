# Pin Infantry Mount Runtime Height

## Why

MegaMek derives conventional infantry height from the current mount object:
unmounted infantry is height 0, while mounted infantry uses the beast mount's
size height. MekStation already imports mounted-infantry height and exposes
runtime mount-state fields, but a stale generic runtime `unitHeight` could win
over a later dismount flag. That risks leaving map movement highlights and
commit validation on the old mounted silhouette after gameplay changes the
unit's mount state.

## What Changes

- Resolve conventional infantry mount-state height before a generic runtime
  `unitHeight` override when the live unit says it is dismounted.
- Preserve explicit runtime height for mounted infantry and for non-infantry
  conversion profiles.
- Prove projection and commit validation agree when a mounted-height state
  blocks a height-sensitive movement check and a dismounted runtime state clears
  that block.

## Out Of Scope

- Adding the gameplay action or UI control that mutates `infantryMounted`.
- Full infantry mount/dismount action timing, damage, or sequencing rules.
- Broad external MegaMek oracle sweeps beyond the source-pinned height
  precedence fixture.
