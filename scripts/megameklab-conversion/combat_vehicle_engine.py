"""Combat-vehicle engine rules; table facts are owned by construction/vehicle.

Source: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
Tank.java:1678-1773 and BLKTankFile.java:155-162. Not support construction.
"""
import json
import math
from pathlib import Path

_TABLE = json.loads((Path(__file__).resolve().parents[2] / 'src/utils/construction/vehicle/suspension.json').read_text(encoding='utf-8-sig'))


def suspension_factor(tonnage: float, motion_type: str) -> int:
    rule = _TABLE.get(motion_type)
    if rule is None:
        return 0
    for maximum, factor in rule['tiers']:
        if tonnage <= maximum:
            return factor
    maximum, factor = rule['tiers'][-1]
    if rule.get('navalExtension'):
        factor = math.ceil(tonnage / 10)
        return factor + factor % 5
    if 'stepTons' in rule:
        return factor + rule['stepFactor'] * math.ceil((tonnage - maximum) / rule['stepTons'])
    return factor


def combat_engine_rating(tonnage: float, cruise_mp: int, motion_type: str, *, engine_less: bool = False) -> int:
    if cruise_mp == 0 and engine_less:
        return 0
    return math.ceil(max(10, int(tonnage) * cruise_mp - suspension_factor(tonnage, motion_type)) / 5) * 5
