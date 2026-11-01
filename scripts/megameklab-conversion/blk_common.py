"""
BLK Common Helpers — shared utilities for the 5 BLK converters.

Extracted on 2026-04-25 as part of the maintenance sweep that surfaced when
PR #405 had to add ``"bv": None`` to five separate ``build_manifest_entry``
returns: a clear signal that the converters had drifted into copy-paste
duplication. This module hosts every helper that was bit-for-bit identical
across::

    blk_aerospace_converter.py
    blk_battlearmor_converter.py
    blk_infantry_converter.py
    blk_protomech_converter.py
    blk_vehicle_converter.py

Type-specific logic — motion-type maps, location maps,
manifest-entry fields, parity targets — stays inside each converter. The
original extraction preserved outputs; current shared decoding rules and their
callers are documented in BLK_RULES.md.

Public surface (see ``__all__`` below):

* BLK parsing primitives (``remove_comments``, ``extract_tags``,
  ``parse_number``, ``get_string``, ``parse_armor_array``, ``map_armor_code``).
* enum_mappings re-exports with offline fallback (``default_mm_data_root``,
  ``map_tech_base``, ``map_rules_level``, ``map_engine_type``,
  ``map_armor_type``, ``map_year_to_era``, ``generate_id_from_name``,
  ``normalize_equipment_id``).
* Output helpers (``MANIFEST_BUDGET_BYTES``, ``write_manifest``,
  ``write_run_log``, ``write_parity_report``, ``setup_logger``).
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from blk_schema_writers import write_equipment_json, write_unit_json, write_weapon_json
from enum_mapping_tables import BLK_ENGINE_CODE_MAP


# ---------------------------------------------------------------------------
# enum_mappings re-export (with offline fallback)
# ---------------------------------------------------------------------------
# Each converter previously carried its own ``try/except ImportError`` block
# defining stub fallbacks. Centralise that here so the converters can simply
# ``from blk_common import map_tech_base`` etc. The real implementations live
# in ``enum_mappings.py`` (co-located); the fallbacks below only fire when the
# module is invoked from a context where ``enum_mappings`` is unavailable
# (e.g. ad-hoc import in a sibling script).

try:
    from enum_mappings import (  # noqa: F401  (re-exported)
        default_mm_data_root,
        generate_id_from_name,
        map_armor_type,
        map_engine_type,
        map_rules_level,
        map_tech_base,
        map_year_to_era,
        normalize_equipment_id,
    )
except ImportError:  # pragma: no cover — defensive fallback only

    def default_mm_data_root() -> str:
        env = os.environ.get("MM_DATA_ROOT")
        if env:
            return env
        if os.name == "nt":
            return r"E:\Projects\mm-data\data"
        return "/e/Projects/mm-data/data"

    def map_tech_base(v: str) -> str:
        m = {"Clan": "CLAN", "Mixed": "MIXED", "Both": "BOTH"}
        return m.get(v.strip(), "INNER_SPHERE")

    def map_rules_level(v: str) -> str:  # noqa: ARG001 — signature parity
        return "STANDARD"

    def map_engine_type(v: str) -> str:
        codes = {
            "0": "FUSION",
            "1": "XL",
            "2": "LIGHT",
            "3": "COMPACT",
            "4": "CLAN_XL",
            "5": "XXL",
            "6": "ICE",
            "7": "FUEL_CELL",
            "8": "FISSION",
        }
        return codes.get(v.strip(), "FUSION")

    def map_armor_type(v: str) -> str:  # noqa: ARG001 — signature parity
        return "STANDARD"

    def map_year_to_era(year: int) -> str:
        if year < 2781:
            return "STAR_LEAGUE"
        elif year < 3050:
            return "SUCCESSION_WARS"
        elif year < 3068:
            return "CLAN_INVASION"
        return "DARK_AGE"

    def generate_id_from_name(chassis: str, model: str) -> str:
        combined = f"{chassis}-{model}".lower()
        id_str = re.sub(r"[^a-z0-9\-]", "-", combined)
        while "--" in id_str:
            id_str = id_str.replace("--", "-")
        return id_str.strip("-")

    def normalize_equipment_id(name: str) -> str:
        id_str = name.lower()
        id_str = id_str.replace(" ", "-").replace("/", "-")
        id_str = re.sub(r"[^a-z0-9\-]", "", id_str)
        while "--" in id_str:
            id_str = id_str.replace("--", "-")
        return id_str.strip("-")


# MegaMek 48fcb2f6 EquipmentType.java:85-136. Codes are shared by unit families;
# technology is a separate source fact, not another set of numeric armor codes.
BAR_ARMOR_CODES = range(43, 52)
BLK_ARMOR_CODE_MAP: Dict[int, str] = {
    0: "STANDARD",
    1: "FERRO_FIBROUS",
    2: "REACTIVE",
    3: "REFLECTIVE",
    4: "HARDENED",
    5: "LIGHT_FERRO_FIBROUS",
    6: "HEAVY_FERRO_FIBROUS",
    7: "PATCHWORK",
    8: "STEALTH",
    9: "FERRO_FIBROUS_PROTO",
    10: "COMMERCIAL",
    11: "FERRO_CARBIDE",
    12: "LAMELLOR_FERRO_CARBIDE",
    13: "IMPROVED_FERRO_ALUMINUM",
    14: "INDUSTRIAL",
    15: "HEAVY_INDUSTRIAL",
    16: "FERRO_LAMELLOR",
    17: "PRIMITIVE",
    18: "ELECTRIC_DISCHARGE",
    19: "FERRO_ALUMINUM",
    20: "HEAVY_FERRO_ALUMINUM",
    21: "LIGHT_FERRO_ALUMINUM",
    22: "STEALTH",
    23: "ANTI_PENETRATIVE_ABLATION",
    24: "HEAT_DISSIPATING",
    25: "IMPACT_RESISTANT",
    26: "BALLISTIC_REINFORCED",
    27: "FERRO_ALUMINUM_PROTO",
    28: "STANDARD",
    29: "BA_STANDARD_PROTOTYPE",
    30: "BA_STANDARD_ADVANCED",
    31: "BA_STEALTH_BASIC",
    32: "STEALTH",
    33: "STEALTH_IMPROVED",
    34: "STEALTH_PROTOTYPE",
    35: "FIRE_RESISTANT",
    36: "MIMETIC",
    37: "REFLECTIVE",
    38: "REACTIVE",
    39: "PRIMITIVE",
    40: "PRIMITIVE_AERO",
    41: "AEROSPACE",
    42: "STANDARD_PROTOMEK",
    **dict.fromkeys(BAR_ARMOR_CODES, "BAR"),
}


# BLKFile.java:669-735. MTF numeric levels and aliases have different meanings.
BLK_TECH_TYPES = {
    "IS": ("INNER_SPHERE", "STANDARD"),
    "IS Level 1": ("INNER_SPHERE", "INTRODUCTORY"),
    "IS Level 2": ("INNER_SPHERE", "STANDARD"),
    "IS Level 3": ("INNER_SPHERE", "ADVANCED"),
    "IS Level 4": ("INNER_SPHERE", "EXPERIMENTAL"),
    "IS Level 5": ("INNER_SPHERE", "UNOFFICIAL"),
    "Clan": ("CLAN", "STANDARD"),
    "Clan Level 2": ("CLAN", "STANDARD"),
    "Clan Level 3": ("CLAN", "ADVANCED"),
    "Clan Level 4": ("CLAN", "EXPERIMENTAL"),
    "Clan Level 5": ("CLAN", "UNOFFICIAL"),
    **{
        f"Mixed ({chassis} Chassis){suffix}": ("MIXED", level)
        for chassis in ("IS", "Clan")
        for suffix, level in (("", "STANDARD"), (" Advanced", "ADVANCED"),
                              (" Experimental", "EXPERIMENTAL"), (" Unofficial", "UNOFFICIAL"))
    },
}


# ---------------------------------------------------------------------------
# BLK parsing primitives and serialized engine decoding
# ---------------------------------------------------------------------------

def maximum_thrust(safe_thrust: int) -> int:
    """Base aerospace maximum thrust; callers own parsing and missing-tag policy."""
    return math.ceil(safe_thrust * 1.5)


def validate_blk_tech_type(value: Optional[str]) -> str:
    """Accept exactly BLKFile.setTechLevel's source spellings (not MTF aliases)."""
    if value is None:
        raise ValueError("missing required <type> tag")
    if value not in BLK_TECH_TYPES:
        raise ValueError(f"Unsupported BLK tech type: {value!r}")
    return value


def map_blk_tech_type(value: str, year: int) -> tuple[str, str]:
    """Decode tech base and rules level together; only legacy IS is year-sensitive."""
    tech_base, rules_level = BLK_TECH_TYPES[validate_blk_tech_type(value)]
    if value == "IS" and year == 3025:
        rules_level = "INTRODUCTORY"
    return tech_base, rules_level


def map_blk_engine_code(code: Any) -> str:
    """Decode BLK serialization, retaining the legacy default only for omission.

    Engine tech flags (including clan_engine) are separate from this code.
    Unknown or malformed codes must not silently become valid Fusion engines.
    """
    if code is None:
        return "FUSION"
    code_str = str(code).strip()
    try:
        return BLK_ENGINE_CODE_MAP[code_str]
    except KeyError:
        raise ValueError(f"Unsupported BLK engine_type code: {code!r}") from None


def remove_comments(content: str) -> str:
    """Strip ``#`` comment lines from BLK content."""
    lines = [ln for ln in content.splitlines() if not ln.strip().startswith("#")]
    return "\n".join(lines)


def extract_tags(content: str) -> Dict[str, Any]:
    """
    Extract all ``<Tag>value</Tag>`` blocks from BLK content.

    Multi-line values are preserved as newline-joined strings. Equipment
    blocks (tag names ending in ``Equipment``) are stored as lists of
    non-empty lines instead of a single joined string.
    """
    tags: Dict[str, Any] = {}
    pattern = re.compile(r"<([^/][^>]*)>\s*(.*?)\s*</\1>", re.DOTALL)
    for match in pattern.finditer(content):
        tag_name = match.group(1).strip()
        raw_value = match.group(2).strip()
        if tag_name.endswith("Equipment"):
            tags[tag_name] = [ln.strip() for ln in raw_value.splitlines() if ln.strip()]
        else:
            tags[tag_name] = raw_value
    return tags


def parse_number(value: Any) -> Optional[float]:
    """Parse a string as a number, returning ``None`` if not parseable."""
    if value is None:
        return None
    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return None


def get_string(tags: Dict[str, Any], *keys: str) -> Optional[str]:
    """Try multiple tag-name candidates; return the first non-empty value."""
    for key in keys:
        val = tags.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return None


def parse_armor_array(raw: Any) -> List[int]:
    """Parse a BLK armor block — newline-delimited string or list — to ints."""
    if raw is None:
        return []
    lines = raw if isinstance(raw, list) else str(raw).strip().splitlines()
    result: List[int] = []
    for ln in lines:
        ln = ln.strip()
        if ln:
            try:
                result.append(int(float(ln)))
            except ValueError:
                pass
    return result


def map_armor_code(code: Any, armor_map: Dict[int, str], *, strict: bool = False) -> str:
    """
    Map a numeric ``armor_type`` code to its enum string using the converter-
    specific ``armor_map``. Strict callers reject unknown or malformed codes;
    legacy BA/ProtoMek callers retain their existing missing/unknown policy.
    """
    if code is None:
        return "STANDARD"
    if strict:
        try:
            return armor_map[int(str(code).strip())]
        except (KeyError, ValueError, TypeError):
            raise ValueError(f"Unsupported BLK armor_type code: {code!r}") from None
    try:
        return armor_map.get(int(float(str(code))), "STANDARD")
    except (ValueError, TypeError):
        return "STANDARD"


# ---------------------------------------------------------------------------
# Output helpers — manifest, parity report, run-log
# ---------------------------------------------------------------------------

#: Per-type unit manifests larger than this defeat lazy loading on first paint.
MANIFEST_BUDGET_BYTES: int = 5 * 1024 * 1024  # 5 MB


def setup_logger(name: str, verbose: bool) -> logging.Logger:
    """Configure root logging consistently across converters and return a child."""
    log_level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(levelname)s %(message)s", stream=sys.stderr)
    return logging.getLogger(name)


def write_manifest(
    manifest_entries: List[Dict[str, Any]],
    manifest_path: Path,
    type_name: str,
    logger: logging.Logger,
) -> int:
    """
    Write the per-type ``units-manifest.json`` and enforce the 5 MB budget.

    Returns the number of errors logged (0 on success, 1 on budget overrun).
    The on-disk shape is identical to what each converter produced before
    extraction: ``{type, count, units: sorted([...])}`` with the same
    ``json.dumps(..., indent=2, ensure_ascii=False)`` formatting.
    """
    manifest_data = {
        "type": type_name,
        "count": len(manifest_entries),
        "units": sorted(manifest_entries, key=lambda u: (u["chassis"], u["model"])),
    }
    manifest_path.write_text(
        json.dumps(manifest_data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    logger.info(f"Manifest written: {manifest_path} ({len(manifest_entries)} units)")

    manifest_bytes = manifest_path.stat().st_size
    if manifest_bytes > MANIFEST_BUDGET_BYTES:
        logger.error(
            f"Manifest size {manifest_bytes} bytes exceeds 5 MB budget — "
            "trim per-entry metadata or split the manifest."
        )
        return 1
    logger.info(f"Manifest size OK: {manifest_bytes} bytes (budget 5 MB)")
    return 0


def write_parity_report(
    type_name: str,
    parity_records: List[Dict[str, Any]],
    parity_failures: int,
    report_path: Path,
    logger: logging.Logger,
) -> None:
    """Write the per-type parity report to ``validation-output/``."""
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(
            {
                "type": type_name,
                "fixture_count": len(parity_records),
                "failures": parity_failures,
                "records": parity_records,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    logger.info(f"Parity report written: {report_path}")


def write_run_log(
    run_log: Dict[str, Any],
    log_path: Path,
    logger: logging.Logger,
) -> None:
    """
    Print the run-log to stdout (machine-readable) and persist it to
    ``validation-output/`` for CI / parity-regression auditing.
    """
    print(json.dumps(run_log))
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.write_text(json.dumps(run_log, indent=2), encoding="utf-8")
    logger.info(f"Run log written: {log_path}")


# ---------------------------------------------------------------------------
# Cross-language schema-bridge write choke points
# ---------------------------------------------------------------------------
# Every Python writer that produces JSON consumed by the TypeScript
# runtime should funnel through these helpers. They are guarded by the
# ``MEKSTATION_VALIDATE_WRITES`` env var:
#
#   * unset / "1" / "true" / "yes" / "on"  -> validation ENABLED (default).
#                                              Validates against the canonical
#                                              JSON Schema before writing. A
#                                              non-empty error list raises
#                                              ``ValueError`` so existing
#                                              run-log error counters catch it.
#   * "0" / "false" / "no" / "off"          -> validation DISABLED. Writer
#                                              behaves like a plain
#                                              ``json.dump``. Use only as an
#                                              escape hatch for legacy data
#                                              regeneration runs that need to
#                                              tolerate pre-bridge corpus
#                                              drift.
#
# Default-on was flipped after PR #429 verified the entire 5-shape corpus
# round-trips clean and the ``--strict`` CI gate flipped green. Treating
# validation as the default means new writers can never silently drift
# again — they fail loudly during local dev instead.
#
# The helpers are intentionally tiny: schema_gate is the single source
# of truth for what "valid" means; this layer just decides when to call it.

__all__ = [
    # enum_mappings re-exports
    "default_mm_data_root",
    "generate_id_from_name",
    "map_armor_type",
    "map_engine_type",
    "map_rules_level",
    "map_tech_base",
    "map_year_to_era",
    "normalize_equipment_id",
    # BLK parsing primitives
    "remove_comments",
    "extract_tags",
    "parse_number",
    "get_string",
    "parse_armor_array",
    "map_armor_code",
    "map_blk_tech_type",
    "BLK_ARMOR_CODE_MAP",
    "map_blk_engine_code",
    "maximum_thrust",
    "validate_blk_tech_type",
    # Output helpers
    "MANIFEST_BUDGET_BYTES",
    "setup_logger",
    "write_manifest",
    "write_parity_report",
    "write_run_log",
    # Schema-bridge write choke points (PR-A1)
    "write_weapon_json",
    "write_unit_json",
    "write_equipment_json",
]
