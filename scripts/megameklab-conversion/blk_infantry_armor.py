"""Infantry armor kit source facts: MegaMek 48fcb2f6 MiscType.create*InfArmor.

Aliases share one kit record; do not infer kit properties from display names.
Damage divisors come from the generated Java registry (scripts/equipment-catalog).
"""
import json
from pathlib import Path

_REGISTRY = Path(__file__).resolve().parents[2] / 'public/data/equipment/official/miscellaneous/java-registry.json'
_DIVISORS = {item['name']: float(item['damageDivisor'])
             for item in json.loads(_REGISTRY.read_text(encoding='utf-8'))['items'] if 'damageDivisor' in item}
# MiscType.java:3684-3716: deprecated for removal, so not generated.
_DIVISORS.update({'Vintage Bulletproof Vest': 1.0, 'Vintage Bomb Suit': 1.0})

# (Java internal name, lookup aliases): kit flags.
_KITS = {
    ('Ablative, Standard', 'ISAblativeStandard'): ('encumberingarmor',),
    ('Ablative, Concealed', 'ISAblativeConcealed'): (),
    ('Ablative/Flak, Standard', 'ISAblativeFlakStandard', 'CLAblativeFlakStandard'): (),
    ('Ablative/Flak, Concealed', 'ISAblativeFlakConcealed', 'CLAblativeFlakConcealed'): (),
    ('Ballistic Plate, Standard', 'ISBallisticPlateStandard', 'CLBallisticPlateStandard'): ('encumberingarmor',),
    ('Ballistic Plate, Concealed', 'BallisticPlateConcealed'): (),
    ('Clothing, Fatigues/Civilian/Non-Armored', 'Fatigues'): (),
    ('Clothing, Leather/Synthetic Hide', 'ClothingLeather'): (),
    ('Clothing, Light (e.g. Summer Wear/None)', 'ClothingLightNone'): (),
    ('Engineering Suit', 'ISEngineeringSuit', 'CLEngineeringSuit'): ('encumberingarmor', 'spacesuit'),
    ('Environment Suit, Light', 'ISEnvironmentSuitLight', 'CLEnvironmentSuitLight'): ('encumberingarmor', 'spacesuit'),
    ('Environment Suit, Hostile', 'ISEnvironmentSuitHostile', 'CLEnvironmentSuitHostile'): ('encumberingarmor', 'spacesuit'),
    ('Environment Suit, Marine', 'ISEnvironmentSuitMarine', 'CLEnvironmentSuitMarine'): ('spacesuit',),
    ('Flak, Standard', 'ISFlakStandard'): (),
    ('Flak, Concealed', 'ISFlakConcealed'): (),
    ('Heat Suit', 'HeatSuit'): (),
    ('MechWarrior Combat Suit', 'ISMechWarriorCombatSuit'): (),
    ('MekWarrior Kit (Basic)', 'MekWarriorKitBasic'): ('encumberingarmor',),
    ('MekWarrior Kit (Advanced)', 'MekWarriorKitAdvanced'): ('encumberingarmor',),
    ('MekWarrior Kit (Clan)', 'MekWarriorKitClan'): (),
    ('Aerospace Fighter Pilot Kit', 'AerospacePilotKit'): ('spacesuit',),
    ("Tanker's Smock", 'TankersSmock'): (),
    ('MechWarrior Cooling Suit', 'ISMechWarriorCoolingSuit'): (),
    ('MechWarrior Cooling Vest (Only)', 'MechWarriorCoolingVest'): (),
    ('Myomer, Suit', 'MyomerSuit'): ('encumberingarmor',),
    ('Myomer, Vest', 'MyomerVest'): (),
    ('Neo-Chainmail', 'NeoChainmail'): (),
    ('Parka',): (),
    ('Snowsuit', 'SnowSuit'): ('encumberingarmor',),
    ('Spacesuit',): ('encumberingarmor', 'spacesuit'),
    ('Spacesuit, Combat', 'SpacesuitCombat'): ('encumberingarmor', 'spacesuit'),
    ('Capellan Confederation Armor Kit (3050)', 'LiaoKit'): (),
    ('Clan Armor Kit (All)', 'ClanKit'): (),
    ('ComStar Infantry Kit', 'CSInfKit', 'ComstarKit'): (),
    ('Draconis Combine Infantry Kit', 'KuritaKit'): (),
    ('Federated Suns Infantry Kit', 'DavionKit'): (),
    ('Fed Suns/Fed Commonwealth Infantry Kit (3030-3066)', 'Fed Suns/Fed Commonweath Infantry Kit (3030-3066)', 'DavionKit3030', 'EarlyFedComKit'): (),
    ('Fed Suns Infantry Kit (3067+)', 'DavionKit3067', 'LateDavionKit'): ('encumberingarmor',),
    ('Free Rasalhague Republic Infantry Kit', 'FRRKit'): (),
    ('Free Worlds League Infantry Kit', 'MarikKit'): (),
    ('Free Worlds League Infantry Kit (3035+)', 'MarikKit3035', 'LateMarikKit'): ('encumberingarmor',),
    ('Lyran Commonwealth Infantry Kit', 'SteinerKit'): (),
    ('Lyran Alliance/Lyran Commonwealth (3060+) Infantry Kit', 'SteinerKit3060'): (),
    ('Magistracy of Canopus Infantry Kit', 'CanopianKit'): (),
    ('Marian Hegemony Infantry Kit', 'MarianKit'): (),
    ('SLDF Infantry Kit', 'SLDFKit'): (),
    ('Taurian Concordat/Calderon Infantry Kit', 'TaurianKit'): (),
    ('Word of Blake Infantry Kit', 'WoBKit'): (),
    ('Generic Infantry Kit', 'GenericKit'): (),
    ('Vintage Bulletproof Vest', 'BulletproofVest'): (),
    ('Vintage Bomb Suit', 'BombSuit'): ('encumberingarmor',),
    ('DEST Infiltration Suit', 'DESTSuit'): ('dest',),
    ('Sneak Suit (Camo)', 'ISSneakSuitCamo'): ('sneakcamo',),
    ('Sneak Suit (IR)', 'ISSneakSuitIR'): ('sneakir',),
    ('Sneak Suit (ECM)', 'ISSneakSuitECM'): ('sneakecm',),
    ('Sneak Suit (Camo/IR)', 'ISSneakSuitCamoIR'): ('sneakcamo', 'sneakir'),
    ('Sneak Suit (Camo/ECM)', 'ISSneakSuitCamoECM'): ('sneakcamo', 'sneakecm'),
    ('Sneak Suit (IR/ECM)', 'ISSneakSuitIRECM'): ('sneakir', 'sneakecm'),
    ('Sneak Suit (Camo/IR/ECM)', 'ISSneakSuitCamoIRECM'): ('sneakcamo', 'sneakir', 'sneakecm'),
}
ARMOR_KITS = {alias.lower(): (names[0], _DIVISORS[names[0]], flags)
              for names, flags in _KITS.items() for alias in names}


def kit_divisor(name):
    """Generated damage divisor of a Java kit name, or None."""
    kit = ARMOR_KITS.get(name.lower())
    return kit[1] if kit else None


def infantry_armor(legacy_kit, equipment, custom_divisor, custom_flags, augmentations, beast_divisor, custom_name=None):
    """BLKInfantryFile load order; ConvInfantry.calcDamageDivisor, without crew skill."""
    if legacy_kit is not None and legacy_kit.lower() not in ARMOR_KITS:
        raise ValueError(f"Unknown infantry armor kit: {legacy_kit!r}")
    # Legacy kit is equipped before Troopers Equipment; Java applies the first kit.
    names = ([legacy_kit] if legacy_kit is not None else []) + equipment
    kit = next((ARMOR_KITS[n.lower()] for n in names if n.lower() in ARMOR_KITS), None)
    divisor = kit[1] if kit else custom_divisor
    has_armor = kit is not None or custom_divisor != 1 or bool(custom_flags) or bool(custom_name)
    if not has_armor and 'tsm_implant' in augmentations:
        divisor = 0.5
    if divisor == 0.5 and 'dermal_camo_armor' in augmentations:
        divisor = 1.0
    if 'dermal_armor' in augmentations:
        divisor += 1
    return (kit[0] if kit else None), divisor * beast_divisor, list(kit[2] if kit else custom_flags)
