"""Pinned source weapon quirks, keyed by location, slot and expected type name."""
from __future__ import annotations

import re
from typing import Dict, List


def append_weapon_quirk(result: Dict[str, List[str]], entry: str) -> None:
    """MtfFile.java:645-649 / BLKFile.java:225-230, MegaMek 48fcb2f64."""
    parts = [part.strip() for part in entry.split(':')]
    if len(parts) != 4:
        raise ValueError(f'Invalid native weapon quirk: {entry!r}')
    quirk, location, raw_slot, weapon = parts
    if (not quirk or not location or not weapon or
            re.fullmatch(r'[0-9]+', raw_slot) is None or int(raw_slot) > 9007199254740991):
        raise ValueError(f'Invalid native weapon quirk: {entry!r}')
    key = f'{location}:{int(raw_slot)}:{weapon}'
    result.setdefault(key, []).append(quirk)
