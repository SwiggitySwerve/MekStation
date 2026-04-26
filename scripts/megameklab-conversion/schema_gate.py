"""
schema_gate.py — Python side of the cross-language schema bridge.

Wraps ``jsonschema.Draft7Validator`` with per-shape compiled validators
backed by the canonical JSON Schemas at
``public/data/equipment/_schema/*.json``. The TypeScript side consumes
the same schemas via ``scripts/generate-zod-schemas.mjs`` (Zod). Keeping
both languages anchored on the same JSON Schema source eliminates the
silent drift that surfaced as the ``"bv": null`` audit (PR #405): once
this module is wired into ``blk_common.write_*_json`` choke points,
Python writers fail loudly when the on-disk shape diverges from what
the TypeScript readers expect.

Usage::

    from schema_gate import validate_weapon

    errors = validate_weapon(weapon_dict)
    if errors:
        raise ValueError(f"weapon failed schema: {errors}")

The choke point is **default-on**: ``blk_common.write_*_json`` calls run
this validator unless ``MEKSTATION_VALIDATE_WRITES`` is explicitly set
to ``0`` / ``false`` / ``no`` / ``off``. Default flipped after PR #429
verified corpus conformance and the strict CI gate turned green.

The 6 public ``validate_<shape>`` functions reuse a single compiled
``Draft7Validator`` per shape (compile-once-reuse). Compilation is lazy
so importers that only need one shape don't pay the upfront cost of
loading all 6 schema files.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from jsonschema import Draft7Validator


# ---------------------------------------------------------------------------
# Schema location resolution
# ---------------------------------------------------------------------------
# This module lives at ``scripts/megameklab-conversion/schema_gate.py``;
# the schemas live at ``public/data/equipment/_schema/*.json``. Walking
# up two parents lands on the repo root regardless of CWD, so converters
# invoked from arbitrary working directories still find the schemas.
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_SCHEMA_DIR = _REPO_ROOT / "public" / "data" / "equipment" / "_schema"

_SCHEMA_FILES = {
    "weapon": "weapon-schema.json",
    "unit": "unit-schema.json",
    "ammunition": "ammunition-schema.json",
    "electronics": "electronics-schema.json",
    "misc_equipment": "misc-equipment-schema.json",
    "physical_weapon": "physical-weapon-schema.json",
}

# Lazy-compiled validators. Populated on first call to ``_get_validator``.
_VALIDATORS: Dict[str, Draft7Validator] = {}


def _get_validator(shape: str) -> Draft7Validator:
    """
    Return the compiled validator for ``shape``, compiling lazily on first
    use. Compiled validators are cached for the life of the process so
    converters batching thousands of records pay the JSON-Schema cost
    exactly once per shape.
    """
    if shape in _VALIDATORS:
        return _VALIDATORS[shape]
    if shape not in _SCHEMA_FILES:
        raise ValueError(
            f"schema_gate: unknown shape {shape!r}; "
            f"valid shapes are {sorted(_SCHEMA_FILES)}"
        )
    schema_path = _SCHEMA_DIR / _SCHEMA_FILES[shape]
    if not schema_path.is_file():
        raise FileNotFoundError(
            f"schema_gate: schema file missing at {schema_path}"
        )
    with schema_path.open(encoding="utf-8") as fh:
        schema = json.load(fh)
    validator = Draft7Validator(schema)
    _VALIDATORS[shape] = validator
    return validator


def _format_errors(shape: str, errors: List[Any]) -> List[str]:
    """
    Render ``jsonschema`` ValidationError objects into ``[<path>: <msg>]``
    strings. Keeps callers from having to introspect the jsonschema
    exception class — they get a list of plain strings suitable for
    logging or raising.
    """
    out: List[str] = []
    for err in errors:
        path = ".".join(str(p) for p in err.absolute_path) or "<root>"
        out.append(f"{shape}.{path}: {err.message}")
    return out


def _validate(shape: str, data: Any) -> List[str]:
    """
    Validate ``data`` against ``shape``. Returns an empty list on
    success; otherwise a list of human-readable error strings.

    Returning a list (rather than raising) lets the caller decide whether
    to log, accumulate across a batch, or abort. The blk_common write
    helpers raise on non-empty lists; ``run_schema_validation_only.py``
    accumulates and reports.
    """
    validator = _get_validator(shape)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.absolute_path))
    if not errors:
        return []
    return _format_errors(shape, errors)


# ---------------------------------------------------------------------------
# Public per-shape entry points
# ---------------------------------------------------------------------------

def validate_weapon(data: Any) -> List[str]:
    """Validate a single weapon dict against ``weapon-schema.json``."""
    return _validate("weapon", data)


def validate_unit(data: Any) -> List[str]:
    """Validate a single unit dict against ``unit-schema.json``."""
    return _validate("unit", data)


def validate_ammunition(data: Any) -> List[str]:
    """Validate a single ammunition dict against ``ammunition-schema.json``."""
    return _validate("ammunition", data)


def validate_electronics(data: Any) -> List[str]:
    """Validate a single electronics dict against ``electronics-schema.json``."""
    return _validate("electronics", data)


def validate_misc_equipment(data: Any) -> List[str]:
    """Validate a single misc-equipment dict against ``misc-equipment-schema.json``."""
    return _validate("misc_equipment", data)


def validate_physical_weapon(data: Any) -> List[str]:
    """Validate a single physical-weapon dict against ``physical-weapon-schema.json``."""
    return _validate("physical_weapon", data)


# Lookup map used by ``run_schema_validation_only.py`` and any future
# harness that wants to iterate every shape generically.
SHAPE_VALIDATORS = {
    "weapon": validate_weapon,
    "unit": validate_unit,
    "ammunition": validate_ammunition,
    "electronics": validate_electronics,
    "misc_equipment": validate_misc_equipment,
    "physical_weapon": validate_physical_weapon,
}


__all__ = [
    "validate_weapon",
    "validate_unit",
    "validate_ammunition",
    "validate_electronics",
    "validate_misc_equipment",
    "validate_physical_weapon",
    "SHAPE_VALIDATORS",
]
