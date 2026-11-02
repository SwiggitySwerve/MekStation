import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import megamek.client.ui.clientGUI.calculationReport.TextCalculationReport;
import megamek.common.Configuration;
import megamek.common.MPCalculationSetting;
import megamek.common.battleArmor.BattleArmor;
import megamek.common.battleValue.BVCalculator;
import megamek.common.equipment.EquipmentType;
import megamek.common.loaders.MekFileParser;
import megamek.common.units.Aero;
import megamek.common.units.Entity;
import megamek.common.units.Infantry;
import megamek.common.units.ConvInfantry;
import megamek.common.units.Mek;
import megamek.common.units.ProtoMek;
import megamek.common.verifier.TestEntity;

/**
 * Pinned-MegaMek reference exporter for all in-scope unit families.
 * One compact JSONL row per source: BV aggregate, construction weight terms, SI, armor and engine facts.
 * Extends LoadedEntityProbe/CorpusLoadProbe (same loader entry, same BV mode, same weight-method capture).
 * Args: mekfilesRoot, listFile (one relative .blk/.mtf path per line), outJsonl.
 */
public class VehicleAeroReferenceExporter {
    // Map.of iterates in a per-JVM order; sorted keys keep the output byte-reproducible.
    static final ObjectMapper JSON = new ObjectMapper().configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

    static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    static byte[] blobBytes(byte[] checkout) {
        ByteArrayOutputStream blob = new ByteArrayOutputStream(checkout.length);
        for (int i = 0; i < checkout.length; i++) {
            if (checkout[i] == '\r' && i + 1 < checkout.length && checkout[i + 1] == '\n') continue;
            blob.write(checkout[i]);
        }
        return blob.toByteArray();
    }

    static Object read(Object object, String name) {
        try { return object.getClass().getMethod(name).invoke(object); }
        catch (ReflectiveOperationException ex) { return Map.of("error", ex.toString()); }
    }

    static Map<String, Object> failure(String stage, Throwable ex) {
        return Map.of("stage", stage, "exceptionClass", ex.getClass().getName(), "message", String.valueOf(ex.getMessage()));
    }

    static List<Object> locations(Entity entity) {
        List<Object> locations = new ArrayList<>();
        for (int i = 0; i < entity.locations(); i++) {
            Map<String, Object> location = new LinkedHashMap<>();
            location.put("index", i);
            location.put("name", entity.getLocationName(i));
            location.put("originalArmor", entity.getOArmor(i));
            location.put("originalInternal", entity.getOInternal(i));
            location.put("armorType", entity.getArmorType(i));
            location.put("barRating", entity.getBARRating(i));
            if (entity.hasRearArmor(i)) location.put("originalRearArmor", entity.getOArmor(i, true));
            locations.add(location);
        }
        return locations;
    }

    static Map<String, Object> construction(Entity entity) {
        Map<String, Object> construction = new LinkedHashMap<>();
        TestEntity verifier = TestEntity.getEntityVerifier(entity);
        if (verifier == null) {
            construction.put("status", "no-verifier-dispatch");
            return construction;
        }
        construction.put("verifierClass", verifier.getClass().getName());
        // Overlapping subtotals and design capacity: never sum these.
        Map<String, Object> weights = new TreeMap<>();
        for (Method method : verifier.getClass().getMethods()) {
            if (method.getName().contains("Weight") && method.getParameterCount() == 0 && method.getReturnType() == double.class) {
                weights.put(method.getName(), read(verifier, method.getName()));
            }
        }
        construction.put("weightMethods", weights);
        StringBuffer errors = new StringBuffer();
        construction.put("valid", verifier.correctEntity(errors));
        construction.put("diagnostics", errors.toString());
        return construction;
    }

    static Map<String, Object> familyFacts(Entity entity) {
        Map<String, Object> facts = new LinkedHashMap<>();
        facts.put("originalJumpMP", entity.getOriginalJumpMP());
        facts.put("bvWalkMP", entity.getWalkMP(MPCalculationSetting.BV_CALCULATION));
        facts.put("bvRunMP", entity.getRunMP(MPCalculationSetting.BV_CALCULATION));
        facts.put("bvJumpMP", entity.getJumpMP(MPCalculationSetting.BV_CALCULATION));
        if (entity instanceof Mek mek) {
            facts.put("structureType", mek.getStructureType());
            facts.put("cockpitType", mek.getCockpitType());
            facts.put("gyroType", mek.getGyroType());
            facts.put("gyroMultiplier", mek.getGyroMultiplier());
            facts.put("armoredComponentBV", mek.getArmoredComponentBV());
            facts.put("heatCapacity", mek.getHeatCapacity());
            facts.put("heatSinks", mek.getNumberOfSinks());
            facts.put("industrial", mek.isIndustrial());
            facts.put("tsm", mek.hasTSM(true));
            facts.put("industrialTSM", mek.hasIndustrialTSM());
            facts.put("nullSignature", mek.hasNullSig());
            facts.put("voidSignature", mek.hasVoidSig());
            facts.put("chameleonShield", mek.hasChameleonShield());
        }
        if (entity instanceof Infantry infantry) {
            facts.put("squadSize", infantry.getSquadSize());
            facts.put("squadCount", infantry.getSquadCount());
            facts.put("shootingStrength", infantry.getShootingStrength());
            facts.put("antiMek", infantry.canMakeAntiMekAttacks());
        }
        if (entity instanceof BattleArmor armor) {
            facts.put("camoSystem", armor.hasCamoSystem());
            facts.put("stealth", armor.isStealthy());
            facts.put("stealthName", armor.getStealthName());
            facts.put("mimetic", armor.isMimetic());
            facts.put("fireResistant", armor.isFireResistant());
            facts.put("reflective", armor.isReflective());
            facts.put("reactive", armor.isReactive());
        }
        if (entity instanceof ConvInfantry infantry) {
            facts.put("damageDivisor", infantry.calcDamageDivisor());
            facts.put("specializations", infantry.getSpecializations());
            facts.put("secondaryWeaponsPerSquad", infantry.getSecondaryWeaponsPerSquad());
            facts.put("primaryWeapon", infantry.getPrimaryWeapon() == null ? null : infantry.getPrimaryWeapon().getInternalName());
            facts.put("secondaryWeapon", infantry.getSecondaryWeapon() == null ? null : infantry.getSecondaryWeapon().getInternalName());
            facts.put("dest", infantry.hasDEST());
            facts.put("sneakCamo", infantry.hasSneakCamo());
            facts.put("sneakIR", infantry.hasSneakIR());
            facts.put("sneakECM", infantry.hasSneakECM());
        }
        if (entity instanceof ProtoMek proto) {
            facts.put("glider", proto.isGlider());
            facts.put("quad", proto.isQuad());
            facts.put("mainGun", proto.hasMainGun());
        }
        return facts;
    }

    static Map<String, Object> battleValue(Entity entity) throws Exception {
        BVCalculator calculator = BVCalculator.getBVCalculator(entity);
        int total = calculator.calculateBV(true, true, true, new TextCalculationReport());
        Map<String, Object> aggregates = new TreeMap<>();
        for (String name : List.of("defensiveValue", "offensiveValue", "baseBV", "tagBV", "adjustedBV")) {
            Field field = BVCalculator.class.getDeclaredField(name);
            field.setAccessible(true);
            aggregates.put(name, field.getDouble(calculator));
        }
        Map<String, Object> result = new TreeMap<>(Map.of("mode", "ignoreC3=true,ignoreSkill=true,ignoreTAG=true", "total", total,
            "calculatorClass", calculator.getClass().getName(), "aggregates", aggregates));
        if (Boolean.getBoolean("bv.terms")) {
            if (entity instanceof Infantry || entity instanceof ProtoMek) {
                result.put("termsUnsupported", "BA, infantry and ProtoMek probes deferred (bounded first slice)");
            } else {
                BVCalculator probe = (BVCalculator) Class.forName("megamek.common.battleValue.Trace" + calculator.getClass().getSimpleName())
                    .getConstructor(Entity.class).newInstance(entity);
                int tracedTotal = probe.calculateBV(true, true, true, new TextCalculationReport());
                for (String name : aggregates.keySet()) {
                    Field field = BVCalculator.class.getDeclaredField(name);
                    field.setAccessible(true);
                    double expected = (double) aggregates.get(name), actual = field.getDouble(probe);
                    if (Math.abs(actual - expected) > 1e-12 * Math.max(1, Math.abs(expected)))
                        throw new IllegalStateException("Probe changed aggregate " + name);
                    aggregates.put(name, actual);
                }
                if (tracedTotal != total) throw new IllegalStateException("Probe changed total");
                result.put("terms", probe.getClass().getField("terms").get(probe));
            }
        }
        return result;
    }

    public static void main(String[] args) throws Exception {
        Path root = Path.of(args[0]);
        Configuration.setUnitsDir(root.toFile());
        EquipmentType.initializeTypes();
        try (BufferedWriter output = Files.newBufferedWriter(Path.of(args[2]), StandardCharsets.UTF_8)) {
            int count = 0;
            for (String relative : Files.readAllLines(Path.of(args[1]), StandardCharsets.UTF_8)) {
                if (relative.isBlank()) continue;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("path", relative);
                String stage = "source-read";
                try {
                    // The read-only snapshot is checked out with CRLF; the pinned git blobs are LF. Parse and hash the blob bytes.
                    byte[] bytes = blobBytes(Files.readAllBytes(root.resolve(relative)));
                    row.put("sha256", sha256(bytes));
                    stage = "entity-loading";
                    Entity entity = new MekFileParser(new ByteArrayInputStream(bytes), relative).getEntity();
                    if (entity == null) throw new IllegalStateException("Parser returned null entity");
                    row.put("entityClass", entity.getClass().getName());
                    row.put("concreteFamily", entity.getClass().getSimpleName());
                    row.put("chassis", entity.getChassis());
                    row.put("model", entity.getModel());
                    row.put("tonnage", entity.getWeight());
                    row.put("originalWalkMP", entity.getOriginalWalkMP());
                    row.put("movementMode", entity.getMovementMode().toString());
                    if (entity instanceof Mek || entity instanceof Infantry || entity instanceof ProtoMek) {
                        row.put("familyFacts", familyFacts(entity));
                    }
                    if (entity instanceof Aero aero) {
                        row.put("structuralIntegrity", aero.getOSI());
                        row.put("originalFuel", aero.getOriginalFuel());
                    }
                    if (entity.getEngine() != null) {
                        row.put("engine", Map.of("rating", entity.getEngine().getRating(),
                            "ownerAwareRating", entity.getEngine().getRating(entity),
                            "engineType", entity.getEngine().getEngineType(),
                            "name", entity.getEngine().getShortEngineName()));
                    }
                    row.put("locations", locations(entity));
                    row.put("mountCount", entity.getEquipment().size());
                    List<String> failed = new ArrayList<>();
                    entity.getFailedEquipment().forEachRemaining(failed::add);
                    row.put("failedEquipment", failed);
                    stage = "construction";
                    row.put("construction", construction(entity));
                    stage = "battle-value";
                    row.put("battleValue", battleValue(entity));
                    row.put("status", "loaded");
                } catch (Exception | LinkageError ex) {
                    // A failure after loading keeps the loaded facts and records the failed stage.
                    row.put(row.containsKey("entityClass") ? "stageFailure" : "failure", failure(stage, ex));
                    row.put("status", row.containsKey("entityClass") ? "loaded" : "failed");
                }
                output.write(JSON.writeValueAsString(row));
                output.newLine();
                output.flush();
                if (++count % 250 == 0) System.out.println("ROWS_COMPLETED " + count);
            }
            System.out.println("LIST_COMPLETED " + count);
        }
    }
}
