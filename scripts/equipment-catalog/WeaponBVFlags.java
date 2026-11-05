import java.nio.file.Path;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import megamek.common.equipment.*;
import megamek.common.weapons.lasers.clan.CLChemicalLaserWeapon;

/** Runtime flag facts from MegaMek 48fcb2f64, including inherited F_INFANTRY. */
public class WeaponBVFlags {
  public static void main(String[] args) throws Exception {
    EquipmentType.initializeTypes();
    var result = new TreeMap<String, Object>();
    for (var iterator = EquipmentType.getAllTypes(); iterator.hasMoreElements();) {
      var item = iterator.nextElement();
      if (!(item instanceof WeaponType w)) continue;
      var row = new LinkedHashMap<String, Object>();
      row.put("internalName", w.getInternalName());
      row.put("name", w.getName());
      row.put("tech", w.isClan() ? "CLAN" : "INNER_SPHERE");
      row.put("aliases", Collections.list(w.getNames()));
      row.put("directFire", w.hasFlag(WeaponType.F_DIRECT_FIRE));
      row.put("artemis", w.hasFlag(WeaponType.F_ARTEMIS_COMPATIBLE));
      row.put("riscLaser", (w.hasFlag(WeaponType.F_LASER) || w instanceof CLChemicalLaserWeapon) && !w.hasFlag(WeaponType.F_PULSE) && !w.isClan());
      row.put("apollo", w.getAmmoType() == AmmoType.AmmoTypeEnum.MRM);
      row.put("infantry", w.hasFlag(WeaponType.F_INFANTRY));
      result.put(w.getClass().getSimpleName(), row);
    }
    new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(Path.of(args[0]).toFile(), Map.of("revision", "48fcb2f64a1b3f2d575707ce5653dad64927b587", "weapons", result));
  }
}
