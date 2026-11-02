"""Infantry armor kit source facts: MegaMek 48fcb2f6 MiscType.create*InfArmor.

Aliases share one kit record; do not infer kit properties from display names.
"""

# (name, lookup aliases): (damage divisor, kit flags).
_KITS = {
    ('Ablative, Standard', 'ISAblativeStandard'): (1.0, ('encumberingarmor',)),
    ('Ablative, Concealed', 'ISAblativeConcealed'): (1.0, ()),
    ('Ablative/Flak, Standard', 'ISAblativeFlakStandard', 'CLAblativeFlakStandard'): (1.0, ()),
    ('Ablative/Flak, Concealed', 'ISAblativeFlakConcealed', 'CLAblativeFlakConcealed'): (1.0, ()),
    ('Ballistic Plate, Standard', 'ISBallisticPlateStandard', 'CLBallisticPlateStandard'): (2.0, ('encumberingarmor',)),
    ('Ballistic Plate, Concealed', 'BallisticPlateConcealed'): (1.0, ()),
    ('Clothing, Fatigues/Civilian/Non-Armored', 'Fatigues'): (1.0, ()),
    ('Clothing, Leather/Synthetic Hide', 'ClothingLeather'): (1.0, ()),
    ('Clothing, Light (e.g. Summer Wear/None)', 'ClothingLightNone'): (0.5, ()),
    ('Engineering Suit', 'ISEngineeringSuit', 'CLEngineeringSuit'): (1.0, ('encumberingarmor', 'spacesuit')),
    ('Environment Suit, Light', 'ISEnvironmentSuitLight', 'CLEnvironmentSuitLight'): (1.0, ('encumberingarmor', 'spacesuit')),
    ('Environment Suit, Hostile', 'ISEnvironmentSuitHostile', 'CLEnvironmentSuitHostile'): (2.0, ('encumberingarmor', 'spacesuit')),
    ('Environment Suit, Marine', 'ISEnvironmentSuitMarine', 'CLEnvironmentSuitMarine'): (2.0, ('spacesuit',)),
    ('Flak, Standard', 'ISFlakStandard'): (1.0, ()),
    ('Flak, Concealed', 'ISFlakConcealed'): (1.0, ()),
    ('Heat Suit', 'HeatSuit'): (1.0, ()),
    ('MechWarrior Combat Suit', 'ISMechWarriorCombatSuit'): (1.0, ()),
    ('MekWarrior Kit (Basic)', 'MekWarriorKitBasic'): (0.5, ('encumberingarmor',)),
    ('MekWarrior Kit (Advanced)', 'MekWarriorKitAdvanced'): (1.0, ('encumberingarmor',)),
    ('MekWarrior Kit (Clan)', 'MekWarriorKitClan'): (1.0, ()),
    ('Aerospace Fighter Pilot Kit', 'AerospacePilotKit'): (1.0, ('spacesuit',)),
    ("Tanker's Smock", 'TankersSmock'): (2.0, ()),
    ('MechWarrior Cooling Suit', 'ISMechWarriorCoolingSuit'): (1.0, ()),
    ('MechWarrior Cooling Vest (Only)', 'MechWarriorCoolingVest'): (0.5, ()),
    ('Myomer, Suit', 'MyomerSuit'): (2.0, ('encumberingarmor',)),
    ('Myomer, Vest', 'MyomerVest'): (2.0, ()),
    ('Neo-Chainmail', 'NeoChainmail'): (1.0, ()),
    ('Parka',): (1.0, ()),
    ('Snowsuit', 'SnowSuit'): (1.0, ('encumberingarmor',)),
    ('Spacesuit',): (1.0, ('encumberingarmor', 'spacesuit')),
    ('Spacesuit, Combat', 'SpacesuitCombat'): (1.0, ('encumberingarmor', 'spacesuit')),
    ('Capellan Confederation Armor Kit (3050)', 'LiaoKit'): (1.0, ()),
    ('Clan Armor Kit (All)', 'ClanKit'): (2.0, ()),
    ('ComStar Infantry Kit', 'CSInfKit', 'ComstarKit'): (2.0, ()),
    ('Draconis Combine Infantry Kit', 'KuritaKit'): (1.0, ()),
    ('Federated Suns Infantry Kit', 'DavionKit'): (1.0, ()),
    ('Fed Suns/Fed Commonwealth Infantry Kit (3030-3066)', 'Fed Suns/Fed Commonweath Infantry Kit (3030-3066)', 'DavionKit3030', 'EarlyFedComKit'): (2.0, ()),
    ('Fed Suns Infantry Kit (3067+)', 'DavionKit3067', 'LateDavionKit'): (2.0, ('encumberingarmor',)),
    ('Free Rasalhague Republic Infantry Kit', 'FRRKit'): (1.0, ()),
    ('Free Worlds League Infantry Kit', 'MarikKit'): (1.0, ()),
    ('Free Worlds League Infantry Kit (3035+)', 'MarikKit3035', 'LateMarikKit'): (2.0, ('encumberingarmor',)),
    ('Lyran Commonwealth Infantry Kit', 'SteinerKit'): (1.0, ()),
    ('Lyran Alliance/Lyran Commonwealth (3060+) Infantry Kit', 'SteinerKit3060'): (2.0, ()),
    ('Magistracy of Canopus Infantry Kit', 'CanopianKit'): (1.0, ()),
    ('Marian Hegemony Infantry Kit', 'MarianKit'): (2.0, ()),
    ('SLDF Infantry Kit', 'SLDFKit'): (2.0, ()),
    ('Taurian Concordat/Calderon Infantry Kit', 'TaurianKit'): (1.0, ()),
    ('Word of Blake Infantry Kit', 'WoBKit'): (2.0, ()),
    ('Generic Infantry Kit', 'GenericKit'): (1.0, ()),
    ('Vintage Bulletproof Vest', 'BulletproofVest'): (1.0, ()),
    ('Vintage Bomb Suit', 'BombSuit'): (1.0, ('encumberingarmor',)),
    ('DEST Infiltration Suit', 'DESTSuit'): (1.0, ('dest',)),
    ('Sneak Suit (Camo)', 'ISSneakSuitCamo'): (1.0, ('sneakcamo',)),
    ('Sneak Suit (IR)', 'ISSneakSuitIR'): (1.0, ('sneakir',)),
    ('Sneak Suit (ECM)', 'ISSneakSuitECM'): (1.0, ('sneakecm',)),
    ('Sneak Suit (Camo/IR)', 'ISSneakSuitCamoIR'): (1.0, ('sneakcamo', 'sneakir')),
    ('Sneak Suit (Camo/ECM)', 'ISSneakSuitCamoECM'): (1.0, ('sneakcamo', 'sneakecm')),
    ('Sneak Suit (IR/ECM)', 'ISSneakSuitIRECM'): (1.0, ('sneakir', 'sneakecm')),
    ('Sneak Suit (Camo/IR/ECM)', 'ISSneakSuitCamoIRECM'): (1.0, ('sneakcamo', 'sneakir', 'sneakecm')),
}
ARMOR_KITS = {alias.lower(): (names[0], divisor, flags)
              for names, (divisor, flags) in _KITS.items() for alias in names}


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
