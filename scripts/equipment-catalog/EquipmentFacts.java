import java.nio.file.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import megamek.common.equipment.*;
import megamek.common.weapons.infantry.InfantryWeapon;
import megamek.common.loaders.MekFileParser;
public class EquipmentFacts {
    public static void main(String[] args) throws Exception {
        EquipmentType.initializeTypes();
        var protoAmmo = new TreeSet<String>();
        try (var files = Files.walk(Path.of(args[1], "protomeks"))) {
            for (var file : files.filter(path -> path.toString().endsWith(".blk")).toList()) {
                var entity = new MekFileParser(file.toFile()).getEntity();
                for (var mount : entity.getAmmo()) protoAmmo.add(mount.getType().getInternalName());
            }
        }
        var rows = new TreeMap<String, Object>();
        for (var iterator = EquipmentType.getAllTypes(); iterator.hasMoreElements();) {
            var type = iterator.nextElement();
            var row = new LinkedHashMap<String, Object>();
            row.put("criticalSlots", type.getBaseCriticalSlots());
            row.put("cost", type.getBaseCost());
            row.put("rulesLevel", type.getStaticTechLevel().name());
            row.put("introductionYear", type.getIntroductionDate());
            row.put("extinctionYear", type.getExtinctionDate());
            row.put("reintroductionYear", type.getReintroductionDate());
            row.put("isExplosive", type.isExplosive(null));
            row.put("kind", type instanceof AmmoType ? "ammunition" : type instanceof WeaponType ? "weapons" : "miscellaneous");
            if (type instanceof WeaponType weapon) {
                row.put("isPrototype", weapon.hasFlag(WeaponType.F_PROTOTYPE));
                row.put("category", type.getClass().getName().contains(".artillery.") ? "Artillery" : weapon.hasFlag(WeaponType.F_ENERGY) ? "Energy" : weapon.hasFlag(WeaponType.F_MISSILE) ? "Missile" : "Ballistic");
                row.put("damage", weapon instanceof InfantryWeapon infantry ? infantry.getInfantryDamage() : weapon.getDamage());
                var allowed = new ArrayList<String>();
                if (weapon.hasFlag(WeaponType.F_INFANTRY)) allowed.add("Infantry");
                if (weapon.hasFlag(WeaponType.F_BA_WEAPON)) allowed.add("Battle Armor");
                if (weapon.hasFlag(WeaponType.F_MEK_WEAPON)) allowed.addAll(List.of("BattleMech", "OmniMech", "IndustrialMech"));
                if (weapon.hasFlag(WeaponType.F_PROTO_WEAPON)) allowed.add("ProtoMech");
                if (weapon.hasFlag(WeaponType.F_TANK_WEAPON)) allowed.addAll(List.of("Vehicle", "VTOL", "Support Vehicle"));
                if (weapon.hasFlag(WeaponType.F_AERO_WEAPON)) allowed.addAll(List.of("Aerospace", "Conventional Fighter", "Small Craft", "DropShip", "JumpShip", "WarShip", "Space Station"));
                row.put("allowedUnitTypes", allowed);
                row.put("heat", weapon.getHeat());
                row.put("ranges", Map.of("minimum", Math.max(0, weapon.getMinimumRange()), "short", weapon.getShortRange(), "medium", weapon.getMediumRange(), "long", weapon.getLongRange(), "extreme", weapon.getExtremeRange()));
                row.put("ammoType", weapon.getAmmoType().name());
                row.put("rackSize", weapon.getRackSize());
            }
            if (type instanceof AmmoType ammo) {
                row.put("shots", ammo.getShots());
                row.put("kgPerShot", ammo.getKgPerShot());
                row.put("usedByProto", protoAmmo.contains(type.getInternalName()));
                row.put("ammoType", ammo.getAmmoType().name());
                row.put("category", switch (ammo.getAmmoType().name()) {
                    case "AC", "AC_ULTRA", "AC_LBX", "AC_ROTARY", "HYPER_VELOCITY", "RIFLE" -> "Autocannon";
                    case "HAG", "MAGSHOT" -> "Gauss";
                    case "MG", "MG_LIGHT", "MG_HEAVY" -> "Machine Gun";
                    case "LRM", "NLRM", "MML" -> "LRM";
                    case "SRM", "SRM_STREAK" -> "SRM";
                    case "MRM", "ATM", "NARC", "AMS" -> ammo.getAmmoType().name();
                    case "APDS" -> "AMS";
                    case "ARROW_IV", "MEK_MORTAR", "BA_TUBE", "CRUISE_MISSILE" -> "Artillery";
                    case "AR10", "HMASS", "LMASS", "MMASS", "SCC", "KILLER_WHALE", "KILLER_WHALE_T", "KRAKEN_T", "MANTA_RAY", "PIRANHA", "SCREEN_LAUNCHER", "STINGRAY", "SWORDFISH", "WHITE_SHARK" -> "Capital";
                    default -> "Other";
                });
                row.put("munitions", ammo.getMunitionType().stream().map(Enum::name).sorted().toList());
                row.put("rackSize", ammo.getRackSize());
                var compatible = new ArrayList<WeaponType>();
                for (var weapons = EquipmentType.getAllTypes(); weapons.hasMoreElements();) {
                    var candidate = weapons.nextElement();
                    if (candidate instanceof WeaponType weapon && AmmoType.isAmmoValid(ammo, weapon)) compatible.add(weapon);
                }
                row.put("compatible", compatible.stream().sorted(Comparator.comparing((WeaponType weapon) -> weapon.hasFlag(WeaponType.F_BA_WEAPON) != ammo.hasFlag(AmmoType.F_BATTLEARMOR)).thenComparing(weapon -> weapon.hasFlag(WeaponType.F_ONE_SHOT)).thenComparingInt(weapon -> weapon.getTechBase() == type.getTechBase() ? 0 : weapon.getTechBase() == megamek.common.enums.TechBase.ALL ? 1 : 2).thenComparing(EquipmentType::getInternalName)).map(EquipmentType::getInternalName).toList());
            }
            if (type instanceof MiscType misc && misc.hasFlag(MiscType.F_ARMOR_KIT)) row.put("damageDivisor", misc.getDamageDivisor());
            rows.put(type.getInternalName(), row);
        }
        new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(Path.of(args[0]).toFile(), rows);
    }
}
