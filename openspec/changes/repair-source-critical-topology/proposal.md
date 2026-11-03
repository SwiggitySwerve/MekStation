# Repair native cockpit critical topology

After #2607 and #2608, 513 Java-valid BattleMechs are still rejected locally. The fixed-system overlap class is the largest one with one owner: slot validation assumes the standard head layout for every cockpit, so small, torso-mounted and command-console designs report equipment overlapping systems that Java never places there. Great Turtle GTR-2 also needs the `(ARMORED)` critical marker removed before its weapon assignments resolve.

Follow pinned MegaMek 48fcb2f64: Mek.java:5692-5702 (small), 5719-5727 (command console) and 5797-5838 (torso-mounted); MtfFile.java:952-956 and 1010-1020 (armored, OmniPod and rear markers). `CockpitType.getCockpitSystemSlots` owns cockpit head and auxiliary positions; cockpit slot counts must match it. Slot validation receives the selected cockpit. Placement checks, the four TestMek canon exceptions and intro-year behaviour stay as they are.

The editor critical grid, auto-fill, loadout and preview consumers still draw the standard head. A follow-up wires them to the same owner. No catalog, mass or BV formula changes.

## Measured agreement

On fixed main 0cea1296d, across all 9,815 sources: Java-valid mechs rejected locally go from 513 to 412 (101 rows become valid, all Java-valid), and fixed-system overlap rows from 136 to 16. Every family's agreement is otherwise unchanged, with no new disagreement, no BV/status change and no unloadable row. Evidence is in `unit-loading/L-VAL-MECH/source-topology-claude/`.
