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
            for (var flag : flagClass.getEnumConstants()) {
                if (type.getFlags().get((EquipmentFlag) flag)) flags.add(((Enum<?>) flag).name());
            }
            row.put("flags", flags);
        }
        mapper.writerWithDefaultPrettyPrinter().writeValue(Path.of(args[0]).toFile(), rows);
    }
}
