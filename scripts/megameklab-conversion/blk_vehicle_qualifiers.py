"""Vehicle source facts; contract and upstream citations: VEHICLE_QUALIFIERS_RULES.md."""

from __future__ import annotations

from typing import Any, Dict

from blk_unit_fields import parse_qualifier_number, parse_source_qualifiers


def parse_vehicle_qualifiers(tags: Dict[str, Any]) -> Dict[str, Any]:
    """Preserve explicit qualifiers without deriving construction defaults."""
    shared = parse_source_qualifiers(tags)
    # Writers preserve insertion order; retain the vehicle's established layout.
    result: Dict[str, Any] = {}
    if 'isOmni' in shared:
        result['isOmni'] = shared['isOmni']
    if 'trailer' in tags:
        result['isTrailer'] = True  # Upstream uses exists(), not the tag's value.
    if 'clanEngine' in shared:
        result['clanEngine'] = shared['clanEngine']

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
        result[field] = parse_qualifier_number(tags, tag, integer=integer)

    if 'fuelType' in tags:
        result['fuelType'] = str(tags['fuelType']).strip()
    if 'transporters' in shared:
        result['transporters'] = shared['transporters']
    return result
