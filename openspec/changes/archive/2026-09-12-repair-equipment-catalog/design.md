# Equipment catalog repair design

## Filtering

Carry optional ammunition compatibility metadata through the normalized JSON catalog. The deprecated fallback constants currently contain no ammunition. Match declared compatibleWeaponIds exactly. For imported records without declarations, match conservative full normalized IDs/names after recognized ammunition wrappers. Never substring-match sizes or erase weapon-family distinctions. A contextual empty loadout has no compatible weapon; standalone browsing keeps ammunition visible. Non-ammunition is independent of this filter.

Use one category interpretation across controls and store. Electronics is primary; Other covers remaining utility categories and explicit secondary classifications. Show All clears stale legacy category restrictions. Derive visible results, count and page from the same current equipment/filter/sort/unit snapshot; effects must not leave results one change behind.

## Presentation

Use existing category tokens for a translucent background layer or scoped color mix. Do not reduce opacity on text, Add controls, focus or details. Preserve fixed toolbars, independent list scrolling, mobile category scrolling and 44px controls. Desktop catalog rows share one six-column grid (name, category, weight, criticalSlots, heat, actions) with a sticky header inside the same scrolling region so headings and values sit on the same tracks, including a shared scrollbar gutter; the actions track is 44px. Collapsed desktop rows stay within 48px. Visible Add is a plus glyph drawn smaller inside a 44px hit target, with opaque icon and translucent fill. Add and place is offered only in that row's expanded details. Mobile stays readable without horizontal page overflow.

## Add and place

Keep Add for unassigned copies from the collapsed row. Add and place is available from expanded details and opens a chooser before mutation. Calculate variable weight/critical slots through the same conversion as Add. Preview configuration, fixed occupancy, contiguous space and equipment restrictions through existing Critical Slots primitives. Explain split allocation that cannot be completed by one location and point to Critical Slots; never partially place it. Revalidate on confirmation. Read-only, cancelled or rejected actions leave no item/history entry. Fixed OmniMech equipment cannot be displaced. Commit addition plus placement in the existing per-unit transaction for one Undo/Redo. Preserve normal browser-draft/library persistence.

## Evidence and ownership

Parent owns implementation/integration. Grok CLI 4.6 high reviews verified public source; a write-capable launch was rejected by automatic approval review, while the read-only alternative was allowed. Capability drift is limited to modified interview-protocol skill content; no routing/global changes. Preserve unrelated chassis/model work and preview data.

## Validation

Cover actual ammo mismatches, independent categories, no-weapon/standalone cases, direct real-store hook updates and pagination. Verify normal/variable/restricted/occupied/fixed/stale/split/cancelled placement with one Undo/Redo and draft recovery. Run focused tests, typecheck, lint, formatting, strict OpenSpec and build. Exercise desktop/mobile against isolated test data, restore the existing-data preview and record preservation checks.
