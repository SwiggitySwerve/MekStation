import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import megamek.common.Configuration;
import megamek.common.equipment.EquipmentType;
import megamek.common.equipment.Mounted;
import megamek.common.loaders.MekFileParser;
import megamek.common.units.Entity;
import megamek.common.units.ProtoMek;
import megamek.common.verifier.TestEntity;
import megamek.common.verifier.TestProtoMek;

/**
 * Pinned-oracle probe for ProtoMek movement construction rules (row 4.1, b3).
 * Original MegaMek classes only (pin 48fcb2f64). args: unitsDir outJson listFile
 *
 * Per BLK: original walk, run, jump and UMU MP, glider/quad/tonnage, TestProtoMek.maxJumpMP,
 * correctMovement (TestProtoMek.java:443-470) with its message, and the whole correctEntity
 * verdict, so a MekStation verdict can be compared per rule and in total.
 */
public class ProtoMekMovementProbe {
    public static void main(String[] args) throws Exception {
        Configuration.setUnitsDir(new File(args[0]));
        EquipmentType.initializeTypes();
        List<String> paths = Files.readAllLines(Paths.get(args[2]));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String raw : paths) {
            String path = raw.trim();
            if (path.isEmpty()) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("path", path);
            try {
                Entity entity = new MekFileParser(new File(path)).getEntity();
                if (!(entity instanceof ProtoMek proto)) {
                    row.put("error", "not a ProtoMek");
                    rows.add(row);
                    continue;
                }
                row.put("chassis", proto.getChassis());
                row.put("model", proto.getModel());
                row.put("tonnage", proto.getWeight());
                row.put("quad", proto.isQuad());
                row.put("glider", proto.isGlider());
                row.put("ultra", proto.getWeight() > TestProtoMek.MAX_STD_TONNAGE);
                row.put("movementMode", proto.getMovementModeAsString());
                row.put("walk", proto.getOriginalWalkMP());
                row.put("run", proto.getOriginalRunMP());
                row.put("jump", proto.getOriginalJumpMP());
                row.put("umu", proto.getAllUMUCount());
                row.put("maxJumpMP", TestProtoMek.maxJumpMP(proto));
                List<String> jumpEquipment = new ArrayList<>();
                for (Mounted<?> m : proto.getMisc()) {
                    String n = m.getType().getInternalName();
                    if (n.toLowerCase().contains("jump") || n.toLowerCase().contains("umu")
                          || n.toLowerCase().contains("wing")) {
                        jumpEquipment.add(n);
                    }
                }
                row.put("jumpEquipment", jumpEquipment);
                TestProtoMek test = (TestProtoMek) TestEntity.getEntityVerifier(entity);
                StringBuffer movement = new StringBuffer();
                row.put("correctMovement", test.correctMovement(movement));
                row.put("correctMovementMessage", movement.toString().trim());
                StringBuffer all = new StringBuffer();
                row.put("correctEntity", test.correctEntity(all, proto.getTechLevel()));
                row.put("correctEntityMessage", all.toString().trim());
                row.put("canonUnitWithInvalidBuild", proto.canonUnitWithInvalidBuild());
            } catch (Throwable ex) {
                row.put("error", ex.toString());
            }
            rows.add(row);
        }
        new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(new File(args[1]), rows);
        System.out.println("rows=" + rows.size());
    }
}
