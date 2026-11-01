"""Vehicle source facts; contract and upstream citations: VEHICLE_QUALIFIERS_RULES.md."""

from __future__ import annotations

import math
from typing import Any, Dict


def parse_vehicle_qualifiers(tags: Dict[str, Any]) -> Dict[str, Any]:
    """Preserve explicit qualifiers without deriving construction defaults."""
    result: Dict[str, Any] = {}
    for tag, field in (('omni', 'isOmni'), ('trailer', 'isTrailer')):
        if tag in tags:
            result[field] = True  # Upstream uses exists(), not the tag's value.

    if 'clan_engine' in tags:
        raw = str(tags['clan_engine']).strip().lower()
        if raw not in ('true', 'false'):
            raise ValueError(f'Invalid BLK clan_engine: {tags["clan_engine"]!r}')
        result['clanEngine'] = raw == 'true'

    for tag, field, integer in (
        ('baseChassisTurretWeight', 'baseChassisTurretWeight', False),
        ('baseChassisTurret2Weight', 'baseChassisTurret2Weight', False),
        ('baseChassisSponsonPintleWeight', 'baseChassisSponsonPintleWeight', False),
        ('baseChassisFireConWeight', 'baseChassisFireConWeight', False),
        ('fuel', 'fuel', False),
        ('structural_tech_rating', 'structuralTechRating', True),
        ('engine_tech_rating', 'engineTechRating', True),
        ('armor_tech_rating', 'armorTechRating', True),
        ('internal_type', 'internalType', True),
    ):
        if tag not in tags:
            continue
        try:
            value = float(tags[tag])
        except (TypeError, ValueError) as exc:
            raise ValueError(f'Invalid BLK {tag}: {tags[tag]!r}') from exc
        if not math.isfinite(value) or (integer and not value.is_integer()):
            raise ValueError(f'Invalid BLK {tag}: {tags[tag]!r}')
        result[field] = int(value) if integer else value

    if 'fuelType' in tags:
        result['fuelType'] = str(tags['fuelType']).strip()
    if 'transporters' in tags:
        result['transporters'] = [
            line.strip() for line in str(tags['transporters']).splitlines() if line.strip()
        ]
    return result
