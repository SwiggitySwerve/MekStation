import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import megamek.common.Configuration;
import megamek.common.equipment.AmmoType;
import megamek.common.equipment.EquipmentType;
import megamek.common.equipment.Mounted;
import megamek.common.equipment.WeaponType;
import megamek.common.loaders.MekFileParser;
import megamek.common.units.Entity;
import megamek.common.units.ProtoMek;
import megamek.common.verifier.TestEntity;
import megamek.common.verifier.TestProtoMek;

/**
 * Pinned-oracle probe for ProtoMek equipment placement (row 4.1, PR a-4).
 * Original MegaMek classes only (pin 48fcb2f64). args: unitsDir outJson listFile
 *
 * For every BLK in listFile: load with MekFileParser, ask the original TestEntity factory for the
 * verifier, and report TestProtoMek.hasIllegalEquipmentCombinations (the slot, weight, weapon-flag
 * and location rules at TestProtoMek.java:296-380), the whole correctEntity verdict, and every
 * mount with the facts those rules read.
 */
public class ProtoEDPArmorProbe {
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
                row.put("entityClass", entity.getClass().getSimpleName());
                if (!(entity instanceof ProtoMek proto)) {
                    row.put("error", "not a ProtoMek");
                    rows.add(row);
                    continue;
                }
                row.put("chassis", proto.getChassis());
                row.put("model", proto.getModel());
                row.put("mulId", proto.getMulId());
                row.put("tonnage", proto.getWeight());
                row.put("quad", proto.isQuad());
                row.put("glider", proto.isGlider());
                row.put("ultra", proto.getWeight() > TestProtoMek.MAX_STD_TONNAGE);
                row.put("hasMainGun", proto.hasMainGun());
                row.put("canonUnitWithInvalidBuild", proto.canonUnitWithInvalidBuild());
                TestEntity verifier = TestEntity.getEntityVerifier(entity);
                row.put("verifierClass", verifier == null ? null : verifier.getClass().getSimpleName());
                TestProtoMek test = (TestProtoMek) verifier;
                                row.put("armorPoints", proto.getTotalArmor());
                row.put("armorCode", proto.getArmorType(ProtoMek.LOC_TORSO));
                row.put("armorWeight", test.getWeightAllocatedArmor());
                row.put("labArmorWeight", test.getWeightArmor());
                row.put("totalWeight", test.calculateWeight());
                row.put("totalBV", proto.calculateBattleValue(false, false, false));
                row.put("structureWeight", test.getWeightStructure());
                row.put("engineWeight", test.getWeightEngine());
                row.put("controlsWeight", test.getWeightControls());
                row.put("sinksWeight", test.getWeightHeatSinks());
                row.put("miscWeight", test.getWeightMiscEquip());
                row.put("weaponWeight", test.getWeightWeapon());
                row.put("ammoWeight", test.getWeightAmmo());
                if (proto.getArmorType(ProtoMek.LOC_TORSO) == 18) {
                    int[] original = new int[proto.locations()];
                    double labArmor = proto.getLabArmorTonnage();
                    for (int loc = 0; loc < proto.locations(); loc++) {
                        original[loc] = proto.getOArmor(loc);
                        proto.initializeArmor(0, loc);
                    }
                    List<Map<String, Object>> examples = new ArrayList<>();
                    for (int points : new int[] {1, 3, 31}) {
                        proto.initializeArmor(points, ProtoMek.LOC_TORSO);
                        proto.setArmorTonnage(test.getWeightAllocatedArmor());
                        Map<String, Object> example = new LinkedHashMap<>();
                        example.put("points", points);
                        example.put("allocated", test.getWeightAllocatedArmor());
                        example.put("total", test.calculateWeight());
                        examples.add(example);
                    }
                    row.put("armorExamples", examples);
                    for (int loc = 0; loc < proto.locations(); loc++) {
                        proto.initializeArmor(original[loc], loc);
                    }
                    proto.setArmorTonnage(labArmor);
                }
                StringBuffer illegal = new StringBuffer();
                row.put("hasIllegalEquipmentCombinations", test.hasIllegalEquipmentCombinations(illegal));
                row.put("illegalMessage", illegal.toString().trim());
                StringBuffer all = new StringBuffer();
                row.put("correctEntity", test.correctEntity(all, proto.getTechLevel()));
                row.put("correctEntityMessage", all.toString().trim());
                Map<String, Object> limits = new LinkedHashMap<>();
                for (int loc = 0; loc < proto.locations(); loc++) {
                    Map<String, Object> l = new LinkedHashMap<>();
                    l.put("abbr", proto.getLocationAbbr(loc));
                    l.put("maxSlots", TestProtoMek.maxSlotsByLocation(loc, proto));
                    l.put("maxWeight", TestProtoMek.maxWeightByLocation(loc, proto));
                    limits.put(String.valueOf(loc), l);
                }
                row.put("limits", limits);
                List<Map<String, Object>> mounts = new ArrayList<>();
                for (Mounted<?> m : proto.getEquipment()) {
                    Map<String, Object> mount = new LinkedHashMap<>();
                    EquipmentType type = m.getType();
                    mount.put("internalName", type.getInternalName());
                    mount.put("name", type.getName());
                    mount.put("class", type.getClass().getSimpleName());
                    mount.put("location", m.getLocation());
                    mount.put("locationAbbr", m.getLocation() < 0 ? "none" : proto.getLocationAbbr(m.getLocation()));
                    mount.put("tonnage", m.getTonnage());
                    mount.put("requiresSlot", TestProtoMek.requiresSlot(type));
                    mount.put("ammo", type instanceof AmmoType);
                    mount.put("weapon", type instanceof WeaponType);
                    mount.put("protoWeapon", type instanceof WeaponType && type.hasFlag(WeaponType.F_PROTO_WEAPON));
                    mounts.add(mount);
                }
                row.put("mounts", mounts);
            } catch (Throwable ex) {
                row.put("error", ex.toString());
            }
            rows.add(row);
        }
        new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(new File(args[1]), rows);
        System.out.println("rows=" + rows.size());
    }
}
