# Multiplayer availability

`modeAvailability.ts` owns release status and limitation copy for hosted
matches, co-op campaigns and peer-to-peer matches. It has no runtime imports,
environment reads or browser globals.

`available` hides the notice and permits launch subject to existing readiness
rules. `preview` shows the limitation without blocking launch. `disabled`
shows the limitation and blocks launch. Status changes belong here; callers
must use the public selectors rather than duplicate the status rule.

`ModeAvailabilityNotice` renders the text. Compact notices belong in menus
or under a parent that already discloses the full sentence. P2P launch is
guarded at the button, launch helper and launched-navigation listener.

README.md, docs/features/gm-two-player-campaign.md and
docs/releases/v2.2.0-topology.md contain handwritten availability blocks.
The documentation Jest contract enforces verbatim copy and requires removing
a mode's block when it becomes available. A status change restores the UI;
update the documentation in the same change so that contract passes.
