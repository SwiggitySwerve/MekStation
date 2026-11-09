import java.nio.file.Path;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import megamek.common.equipment.*;
import megamek.common.interfaces.ITechnology;
import megamek.common.units.SupportTank;
import megamek.common.weapons.infantry.InfantryWeapon;

/** Independent read-only clip facts from MegaMek 48fcb2f64. */
public class InfantryClipFacts {
    private static void dates(ITechnology tech, Set<Integer> years) {
        // getSimpleLevel/isAvailableIn/isExtinct use these native date getters
        // (ITechnology.java:145-163,212-280). Include both sides of strict bounds.
        var values = new ArrayList<Integer>(List.of(tech.getPrototypeDate(), tech.getProductionDate(),
            tech.getCommonDate(), tech.getIntroductionDate(), tech.getExtinctionDate(), tech.getReintroductionDate()));
        for (boolean clan : new boolean[]{false, true}) {
            values.addAll(List.of(tech.getPrototypeDate(clan), tech.getProductionDate(clan),
                tech.getCommonDate(clan), tech.getIntroductionDate(clan), tech.getExtinctionDate(clan), tech.getReintroductionDate(clan)));
        }
        for (int date : values) {
            years.add(date);
            if (date > Integer.MIN_VALUE) years.add(date - 1);
            if (date < Integer.MAX_VALUE) years.add(date + 1);
        }
    }

    private static List<List<Object>> admission(WeaponType weapon, SupportTank owner) {
        var years = new TreeSet<Integer>();
        years.add(Integer.MIN_VALUE);
        dates(weapon, years);
        var ammo = AmmoType.getMunitionsFor(weapon.getAmmoType());
        if (ammo != null) for (AmmoType candidate : ammo) dates(candidate, years);
        var result = new ArrayList<List<Object>>();
        Boolean previous = null;
        for (int year : years) {
            owner.setYear(year);
            owner.setMixedTech(false);
            boolean pure = AmmoType.getOneshotAmmo(Mounted.createMounted(owner, weapon)) != null;
            owner.setMixedTech(true);
            boolean mixed = AmmoType.getOneshotAmmo(Mounted.createMounted(owner, weapon)) != null;
            Boolean value = pure == mixed ? Boolean.valueOf(pure) : null;
            if (result.isEmpty() || !Objects.equals(previous, value)) {
                result.add(Arrays.asList(year, value));
                previous = value;
            }
        }
        owner.setYear(3071);
        owner.setMixedTech(false);
        return result;
    }

    public static void main(String[] args) throws Exception {
        EquipmentType.initializeTypes();
        SupportTank owner = new SupportTank();
        owner.setYear(3071);
        var rows = new TreeMap<String, Object>();
        for (var iterator = EquipmentType.getAllTypes(); iterator.hasMoreElements();) {
            var type = iterator.nextElement();
            if (!(type instanceof WeaponType weapon)) continue;
            var row = new LinkedHashMap<String, Object>();
            row.put("javaClass", weapon.getClass().getSimpleName());
            row.put("name", weapon.getName());
            row.put("internalName", weapon.getInternalName());
            row.put("aliases", Collections.list(weapon.getNames()));
            row.put("infantryWeapon", weapon instanceof InfantryWeapon);
            row.put("ammoType", weapon.getAmmoType().name());
            row.put("rackSize", weapon.getRackSize());
            row.put("clipShots", weapon instanceof InfantryWeapon infantry ? infantry.getShots() : 0);
            row.put("oneShot", weapon.hasFlag(WeaponType.F_ONE_SHOT));
            List<List<Object>> timeline = weapon instanceof InfantryWeapon ? admission(weapon, owner) : List.of();
            row.put("admissionByYear", timeline);
            row.put("oneShotAmmoAdmitted", timeline.size() == 1 ? timeline.getFirst().get(1) : null);
            rows.put(weapon.getInternalName(), row);
        }
        AmmoType ammo = (AmmoType) EquipmentType.get(EquipmentTypeLookup.INFANTRY_AMMO);
        var generic = Map.of("group", ammo.getAmmoType() + ":" + ammo.getRackSize(), "battleValue", ammo.getBV(owner));
        new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(Path.of(args[0]).toFile(),
            Map.of("revision", "48fcb2f64a1b3f2d575707ce5653dad64927b587", "genericAmmo", generic, "weapons", rows));
    }
}
