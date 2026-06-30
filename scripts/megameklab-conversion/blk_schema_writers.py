"""Schema-gated JSON write choke points for BLK conversion outputs."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

_VALIDATE_ENV_VAR = "MEKSTATION_VALIDATE_WRITES"
_DISABLE_VALUES = frozenset({"0", "false", "no", "off"})


def _validate_writes_enabled() -> bool:
    val = os.environ.get(_VALIDATE_ENV_VAR, "").strip().lower()
    return val not in _DISABLE_VALUES


def _maybe_validate(shape: str, data: Any) -> None:
    if not _validate_writes_enabled():
        return
    try:
        from schema_gate import SHAPE_VALIDATORS  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            f"{_VALIDATE_ENV_VAR}=1 set but schema_gate unavailable: {exc}"
        ) from exc
    validator = SHAPE_VALIDATORS.get(shape)
    if validator is None:
        raise ValueError(f"blk_common: no validator for shape {shape!r}")
    errors = validator(data)
    if errors:
        raise ValueError(
            f"blk_common.write_{shape}_json: schema validation failed:\n  - "
            + "\n  - ".join(errors[:8])
        )


def write_weapon_json(path: Path, data: Dict[str, Any]) -> None:
    _maybe_validate("weapon", data)
    _write_json(path, data)


def write_unit_json(path: Path, data: Dict[str, Any]) -> None:
    _maybe_validate("unit", data)
    _write_json(path, data)


def write_equipment_json(
    path: Path,
    shape: str,
    data: Dict[str, Any],
) -> None:
    _maybe_validate(shape, data)
    _write_json(path, data)


def _write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
