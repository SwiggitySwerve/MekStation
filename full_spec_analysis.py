#!/usr/bin/env python3
import os
import re
from pathlib import Path
from collections import defaultdict

specs_dir = Path("E:\Projects\MekStation\openspec\specs")
src_dir = Path("E:\Projects\MekStation\src")

# Categorize specs
categories = {
    "CAMPAIGN": ["campaign-", "day-progression", "faction-standing", "mission-contracts", "contract-types", "turnover-retention", "random-events", "scenario-generation", "simulation-system"],
    "GAMEPLAY": ["combat-", "damage-", "critical-", "heat-", "movement-", "physical-", "weapon-", "armor-", "fall-", "shutdown-", "piloting-", "indirect-", "environmental-", "secondary-target-", "to-hit-", "ecm-", "quirk-", "spa-"],
    "CONSTRUCTION": ["engine-", "gyro-", "heat-sink-", "internal-structure-", "cockpit-", "armor-system", "movement-system", "construction-", "equipment-", "hardpoint-", "critical-slot-", "omnimech-", "superheavy-"],
    "EQUIPMENT": ["weapon-", "ammunition-", "electronics-", "equipment-", "ammo-"],
    "UI_COMPONENTS": ["armor-diagram", "customizer-", "equipment-browser", "equipment-tray", "mobile-loadout-tray", "multi-unit-tabs", "overview-", "unit-info-banner", "confirmation-dialogs", "toast-notifications", "balanced-grid", "color-system", "app-", "desktop-", "storybook-"],
    "PERSONNEL": ["personnel-", "medical-", "awards", "skills-", "audit-timeline"],
    "ECONOMY": ["financial-", "markets-", "acquisition-", "repair", "repair-maintenance"],
    "DATA_MODELS": ["core-", "database-", "unit-entity-", "unit-store-", "unit-validation-", "unit-versioning", "serialization-", "persistence-", "event-store", "vault-sync", "data-"],
    "SYSTEM": ["formula-registry", "rules-level-", "era-temporal-", "tech-base-", "tech-rating-", "battle-value-", "weight-class-", "force-", "game-", "quick-session", "record-sheet-", "release-build-", "mm-data-", "mtf-parity-", "validation-", "code-formatting-", "storybook-", "hex-coordinate-", "terrain-", "starmap-", "tactical-map-"],
}

# Read all specs
specs = {}
for spec_dir in sorted(specs_dir.iterdir()):
    if not spec_dir.is_dir() or spec_dir.name == "README.md":
        continue
    
    spec_file = spec_dir / "spec.md"
    if not spec_file.exists():
        continue
    
    with open(spec_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Check status
    is_tbd = "TBD - created by archiving" in content
    is_draft = "Status" in content and "Draft" in content
    
    # Check for implementation
    spec_name = spec_dir.name
    search_patterns = [
        spec_name,
        spec_name.replace("-", "_"),
        spec_name.replace("-", ""),
        spec_name.split("-")[0]
    ]
    
    found_impl = False
    for pattern in search_patterns:
        # Search in src
        for src_file in src_dir.rglob("*.ts"):
            if pattern in src_file.name or pattern in src_file.parent.name:
                found_impl = True
                break
        if found_impl:
            break
    
    # Categorize
    category = "OTHER"
    for cat, keywords in categories.items():
        if any(kw in spec_name for kw in keywords):
            category = cat
            break
    
    specs[spec_name] = {
        "is_tbd": is_tbd,
        "is_draft": is_draft,
        "found_impl": found_impl,
        "category": category,
        "path": str(spec_dir)
    }

# Analyze by status
by_status = defaultdict(list)
by_category = defaultdict(lambda: {"IMPLEMENTED": 0, "NOT_IMPLEMENTED": 0, "TBD": 0})

for spec_name, info in specs.items():
    if info["is_tbd"]:
        status = "TBD"
    elif info["found_impl"]:
        status = "IMPLEMENTED"
    else:
        status = "NOT_IMPLEMENTED"
    
    by_status[status].append(spec_name)
    
    if info["found_impl"]:
        by_category[info["category"]]["IMPLEMENTED"] += 1
    elif info["is_tbd"]:
        by_category[info["category"]]["TBD"] += 1
    else:
        by_category[info["category"]]["NOT_IMPLEMENTED"] += 1

# Print report
print("=" * 80)
print("COMPREHENSIVE SPEC IMPLEMENTATION ANALYSIS")
print("=" * 80)
print()

print(f"TOTAL SPECS: {len(specs)}")
print(f"  - IMPLEMENTED: {len(by_status['IMPLEMENTED'])}")
print(f"  - NOT_IMPLEMENTED: {len(by_status['NOT_IMPLEMENTED'])}")
print(f"  - TBD (Archiving): {len(by_status['TBD'])}")
print()

print("=" * 80)
print("BY CATEGORY")
print("=" * 80)
for cat in sorted(by_category.keys()):
    stats = by_category[cat]
    total = stats["IMPLEMENTED"] + stats["NOT_IMPLEMENTED"] + stats["TBD"]
    print(f"\n{cat}: {total} specs")
    print(f"  - Implemented: {stats['IMPLEMENTED']}")
    print(f"  - Not Implemented: {stats['NOT_IMPLEMENTED']}")
    print(f"  - TBD: {stats['TBD']}")

print()
print("=" * 80)
print("NOT IMPLEMENTED SPECS (Potential Gaps)")
print("=" * 80)
if by_status["NOT_IMPLEMENTED"]:
    for spec in sorted(by_status["NOT_IMPLEMENTED"]):
        print(f"  - {spec}")
else:
    print("  (None - all specs either implemented or marked TBD)")

print()
print("=" * 80)
print("TBD SPECS (Archiving - Purpose Needs Update)")
print("=" * 80)
print(f"Total: {len(by_status['TBD'])} specs")
for spec in sorted(by_status["TBD"])[:10]:
    print(f"  - {spec}")
if len(by_status["TBD"]) > 10:
    print(f"  ... and {len(by_status['TBD']) - 10} more")

