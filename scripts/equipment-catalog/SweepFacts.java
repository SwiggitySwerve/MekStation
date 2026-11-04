import java.nio.file.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import megamek.common.equipment.*;
public class SweepFacts {
    @SuppressWarnings("unchecked")
    public static void main(String[] args) throws Exception {
        EquipmentFacts.main(args);
        var mapper = new ObjectMapper();
        var rows = mapper.readValue(Path.of(args[0]).toFile(), TreeMap.class);
        for (var iterator = EquipmentType.getAllTypes(); iterator.hasMoreElements();) {
            var type = iterator.nextElement();
            var row = (Map<String, Object>) rows.get(type.getInternalName());
            row.putAll(Map.of("prototypeYear", type.getPrototypeDate(), "productionYear", type.getProductionDate(), "commonYear", type.getCommonDate()));
            var flags = new TreeSet<String>();
            Class<?> flagClass = Class.forName("megamek.common.equipment." + (type instanceof AmmoType ? "enums.AmmoTypeFlag" : type instanceof WeaponType ? "WeaponTypeFlag" : "enums.MiscTypeFlag"));
            for (var flag : flagClass.getEnumConstants())
                if (type.getFlags().get((EquipmentFlag) flag)) flags.add(((Enum<?>) flag).name());
            row.put("flags", flags);
            // Vehicle slots: EquipmentType.java:172-173 and :433-442. Null where Java needs the
            // unit: Blue Shield tanks (MiscType.java:1315-1320), SV BAR 10 armor (ArmorType.java:283-292)
            // and MEK_SLOT_COST over variable critical slots (EquipmentType.java:76, MiscType.java:1071-1073).
            var blueShield = type instanceof MiscType misc && misc.hasFlag(MiscType.F_BLUE_SHIELD);
            var bar10 = type instanceof ArmorType armor && armor.getArmorType() == EquipmentType.T_ARMOR_SV_BAR_10;
            var svSlots = type.getSupportVeeSlots(null);
            row.put("tankSlots", blueShield ? null : type.getTankSlots(null));
            row.put("supportVehicleSlots", bar10 || svSlots == EquipmentType.CRITICAL_SLOTS_VARIABLE ? null : svSlots);
        }
        mapper.writerWithDefaultPrettyPrinter().writeValue(Path.of(args[0]).toFile(), rows);
    }
}
