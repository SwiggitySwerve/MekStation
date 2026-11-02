"""Reviewed primary/secondary names used by mm-data 50f7efef infantry.

Each is an InfantryWeapon name/alias at MegaMek 48fcb2f6. New names fail closed
until reviewed; full equipment catalog identity resolution belongs to the loader.
"""
INFANTRY_WEAPONS = frozenset((
    'aa weapon (mk. 1, light)|aa weapon (mk. 2, man-portable)|auto-pistol|auto-pistol (m&g)|auto-pistol (magnum)|'
    'auto-pistol (nambu)|auto-pistol (serrek 7875d)|auto-shotgun|autocannon (bearhunter superheavy)|'
    'autocannon (semi-portable)|blade (dagger/knife/bayonet)|blade (vibro-blade)|blade (vibro-katana)|'
    'ceres arms crowdbuster|elephant gun|flamer (heavy)|flamer (man-portable)|gauss cannon (grand mauler)|'
    'gauss rifle (gungnir heavy support)|gauss rifle (thunderstroke ii)|gauss rifle (thunderstroke)|'
    'gauss rifle (tsunami heavy)|gauss rifle, light (david)|gauss rifle, light (king david)|gauss submachine gun|'
    'grenade launcher|grenade launcher (compact)|gyrojet rifle|gyroslug rifle|infantryassaultrifle|infantryautogl|'
    'infantryautoglinferno|infantryfederatedbarrettm42b|infantryfederatedbarrettm61a|infantryhrr|'
    'infantryheavygrenadelauncherinferno|infantryheavymortar|infantryheavysrm|infantrylrm|infantrylrr|'
    'infantrylightmortar|infantrymrr|infantryminigrenadeinferno|infantryoneshotmrm|infantrysrmlight|infantrystandardsrm|'
    'infantrytag|laser (hellbore assault)|laser pistol (blazer)|laser pistol (sunbeam)|laser rifle|laser rifle (blazer)|'
    'laser rifle (er [sunbeam starfire])|laser rifle (er)|laser rifle (ebony assault)|laser rifle (intek)|'
    'laser rifle (magna)|laser rifle (marx xx)|laser rifle (mauser 1200 lss)|laser rifle (mauser 960)|'
    'laser rifle (mauser iic ias)|laser rifle (maxell pl-10)|machine gun (portable)|machine gun (semi-portable)|'
    'machine gun (support)|needler pistol|needler rifle|needler rifle (m&g flechette)|needler rifle (shredder heavy)|'
    'needler, support (firedrake)|particle cannon (semi-portable)|particle cannon (support)|'
    'pistol (sternsnacht heavy [claymore])|plasma rifle (man-portable)|pulse laser rifle (inner sphere)|'
    'rifle (bolt-action)|rifle (federated long)|rifle (imperator ax-22 assault)|rifle (m&g g-150)|rifle (makeshift)|'
    'rifle (striker carbine)|rifle (tk assault)|rifle (zeus heavy)|rocket launcher (v-law)|smg (gunther mp-20)|'
    'shotgun (avenger ccw)|shotgun (combat)|sniper rifle (bolt action)|sniper rifle (hammel marksman)|'
    'sniper rifle (minolta 9000 advanced sniper system)|sonic stunner|stunstick|submachine gun|support laser|'
    'support laser (er heavy, clan)|support laser (er, is)|support laser (er, semi-portable)|support laser (heavy)|'
    'support laser (semi-portable)|support ppc (snub-nose)|support pulse laser|tranq gun'
).split('|'))

FIELD_EQUIPMENT = frozenset((
    'autocannon/10|autocannon/2|autocannon/20|autocannon/5|clapgaussrifle|clapgaussrifle ammo|clarrowiv|clarrowivammo|'
    'clgaussrifle|cllbxac10|cllbxac2|cllbxac20|cllbxac5|clprotomechac2|clprotomechac4|clprotomechac8|clrotaryac2|'
    'clrotaryac2 ammo|clrotaryac5|clrotaryac5 ammo|clultraac10|clultraac2|clultraac20|clultraac5|clan gauss ammo|'
    'clan lb 10-x cluster ammo|clan lb 2-x cluster ammo|clan lb 20-x cluster ammo|clan lb 5-x cluster ammo|'
    'clan protomech ac/2 ammo|clan protomech ac/4 ammo|clan protomech ac/8 ammo|clan ultra ac/10 ammo|'
    'clan ultra ac/2 ammo|clan ultra ac/20 ammo|clan ultra ac/5 ammo|hyper velocity auto cannon/10|'
    'hyper velocity auto cannon/2|hyper velocity auto cannon/5|is ammo ac/10|is ammo ac/2|is ammo ac/20|is ammo ac/5|'
    'is ammo hvac/10|is ammo hvac/2|is ammo hvac/5|is ammo heavy rifle|is ammo lac/2|is ammo lac/5|is ammo light rifle|'
    'is ammo medium rifle|is gauss ammo|is lb 10-x cluster ammo|is lb 2-x cluster ammo|is lb 20-x cluster ammo|'
    'is lb 5-x cluster ammo|is light gauss ammo|is ultra ac/10 ammo|is ultra ac/2 ammo|is ultra ac/20 ammo|'
    'is ultra ac/5 ammo|isarrowiv|isarrowivammo|isgaussrifle|islbxac10|islbxac2|islbxac20|islbxac5|islightgaussrifle|'
    'islongtom|islongtomammo|isrotaryac2|isrotaryac2 ammo|isrotaryac5|isrotaryac5 ammo|issbgr|issniper|issniperammo|'
    'issnipercannon|issnipercannonammo|isthumper|isthumperammo|isthumpercannon|isthumpercannonammo|isultraac10|'
    'isultraac2|isultraac20|isultraac5|light auto cannon/2|light auto cannon/5|rifle (cannon, heavy)|'
    'rifle (cannon, light)|rifle (cannon, medium)|silver bullet gauss ammo'
).split('|'))

TROOPER_EQUIPMENT = frozenset(
    "antimekgear|demolition charge|fire extinguisher|infantry bridge kit|light minesweeper|vibro-shovel".split("|")
)
