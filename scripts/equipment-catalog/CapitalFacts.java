import java.nio.file.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import megamek.common.equipment.*;

/** Read-only facts from MegaMek 48fcb2f64; bay containers are not equipment. */
public class CapitalFacts {
    public static void main(String[] args) throws Exception {
        EquipmentType.initializeTypes();
        var rows = new TreeMap<String, Object>();
        var ammoTypes = new HashSet<String>();
        for (var iterator = EquipmentType.getAllTypes(); iterator.hasMoreElements();) {
            var type = iterator.nextElement();
            if (!(type instanceof WeaponType weapon) || type instanceof megamek.common.weapons.bayWeapons.BayWeapon || !(weapon.isCapital() || weapon.isSubCapital() || weapon.getAtClass() == WeaponType.CLASS_SCREEN)) continue;
            var row = new LinkedHashMap<String, Object>();
            row.put("isCapital", weapon.isCapital());
            row.put("isSubCapital", weapon.isSubCapital());
            row.put("isScreen", weapon.getAtClass() == WeaponType.CLASS_SCREEN);
            row.put("damageByRange", List.of(weapon.getShortAV(), weapon.getMedAV(), weapon.getLongAV(), weapon.getExtAV()));
            row.put("ammoType", weapon.getAmmoType().name());
            row.put("rackSize", weapon.getRackSize());
            ammoTypes.add(weapon.getAmmoType().name());
            rows.put(type.getInternalName(), row);
        }
        ammoTypes.remove("NA");
        for (var iterator = EquipmentType.getAllTypes(); iterator.hasMoreElements();) {
            var type = iterator.nextElement();
            if (type instanceof AmmoType ammo && ammoTypes.contains(ammo.getAmmoType().name())) {
                var row = new LinkedHashMap<String, Object>();
                row.put("ammoType", ammo.getAmmoType().name());
                row.put("rackSize", ammo.getRackSize());
                rows.put(type.getInternalName(), row);
            }
        }
        new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(Path.of(args[0]).toFile(), rows);
    }
}
