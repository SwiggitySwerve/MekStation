## 1. Inspector Data

- [x] 1.1 Define unit inspector projection types for friendly, target, comparison, and redacted states
- [x] 1.2 Add selectors/adapters from session unit state and opponent intel projection

## 2. Inspector UI

- [x] 2.1 Build right-tray friendly and target inspector summaries
- [ ] 2.2 Add record sheet drawers for Armor/Structure, Weapons/Heat, Effects, Movement, and Pilot
  <!-- DEFERRED: PR-F foundation slice only; full drawer tabs are PR-G scope -->
- [ ] 2.3 Add contextual comparison panel for weapon and physical attack previews
  <!-- DEFERRED: depends on §2.2 drawer infrastructure; scheduled for PR-H -->

## 3. Responsive Modes

- [ ] 3.1 Implement peek, pinned, expanded, and mobile bottom-sheet variants
  <!-- DEFERRED: responsive mode variants require §2.2 drawer structure to be stable first -->
- [ ] 3.2 Ensure focus restoration and scroll containment in drawers
  <!-- DEFERRED: depends on §3.1 modal/drawer structure -->

## 4. Verification

- [x] 4.1 Component tests for exact friendly state and redacted opponent state
- [ ] 4.2 Component tests for record drawer tabs and comparison updates
  <!-- DEFERRED: requires §2.2 drawer tabs to exist -->
- [ ] 4.3 E2E test selecting friendly and enemy units across desktop and mobile shell variants
  <!-- DEFERRED: requires §3.1 responsive variants; E2E harness work -->
