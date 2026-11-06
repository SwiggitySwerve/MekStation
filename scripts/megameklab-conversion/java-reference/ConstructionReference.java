import java.lang.reflect.Method;
import java.util.*;
import megamek.common.battleArmor.BattleArmor;
import megamek.common.verifier.*;

/** Read native contributions only; never sum the overlapping legacy weightMethods map. */
public final class ConstructionReference {
    static final double ABS = 1e-9, REL = 1e-12;

    static double number(TestEntity verifier, String method) throws Exception {
        Object raw;
        try { raw = verifier.getClass().getMethod(method).invoke(verifier); }
        catch (ReflectiveOperationException ex) { throw new IllegalStateException(method + ": " + Objects.toString(ex.getCause(), ex.toString()), ex); }
        double value = ((Number) raw).doubleValue();
        if (!Double.isFinite(value)) throw new IllegalStateException(method + " is nonfinite");
        return value;
    }

    static Map<String, Object> quantity(TestEntity verifier, String method, String unit) {
        try { return Map.of("value", number(verifier, method), "unit", unit); }
        catch (Exception ex) { return Map.of("status", "failed", "reason", ex.toString(), "unit", unit); }
    }

    static void put(Map<String, Double> terms, TestEntity verifier, String... methods) throws Exception {
        for (String method : methods) terms.put(method, number(verifier, method));
    }

    static Map<String, Double> weights(TestEntity verifier) throws Exception {
        Map<String, Double> terms = new LinkedHashMap<>();
        // Audited calculateWeightExact owners at MegaMek 48fcb2f6; no capacity or overlapping subterms.
        if (verifier instanceof TestBattleArmor armor) {
            for (int i = 0; i < ((BattleArmor) armor.getEntity()).getSquadSize(); i++) {
                Map<String, Double> trooper = new LinkedHashMap<>();
                put(trooper, armor, "getWeightStructure", "getWeightArmor", "getWeightMisc");
                trooper.put("getWeightMiscEquip", armor.getWeightMiscEquip(i));
                trooper.put("getWeightWeapon", armor.getWeightWeapon(i));
                trooper.put("getWeightAmmo", armor.getWeightAmmo(i));
                trooper.put("rounding", armor.calculateWeight(i) - trooper.values().stream().mapToDouble(Double::doubleValue).sum());
                for (var entry : trooper.entrySet()) terms.put("trooper." + i + "." + entry.getKey(), entry.getValue());
            }
        } else if (verifier instanceof TestAdvancedAerospace) {
            put(terms, verifier, "getWeightStructure", "getWeightEngine", "getWeightKFDrive", "getWeightLFBattery",
                "getWeightSail", "getWeightControls", "getWeightFuel", "getWeightHeatSinks", "getWeightArmor",
                "getWeightFireControl", "getWeightMiscEquip", "getWeightWeapon", "getWeightAmmo", "getWeightCarryingSpace",
                "getWeightHardpoints", "getWeightQuarters", "getWeightGravDecks", "getWeightLifeBoats");
        } else if (verifier instanceof TestSmallCraft) {
            put(terms, verifier, "getWeightStructure", "getWeightEngine", "getWeightControls", "getWeightFuel",
                "getWeightHeatSinks", "getWeightArmor", "getWeightMisc", "getWeightMiscEquip", "getWeightWeapon",
                "getWeightAmmo", "getWeightCarryingSpace", "getWeightQuarters");
        } else {
            // Reject a new native owner instead of silently applying a familiar formula.
            Class<?> owner = verifier.getClass().getMethod("calculateWeightExact").getDeclaringClass();
            if (!List.of(TestEntity.class, TestAero.class, TestSupportVehicle.class).contains(owner))
                throw new UnsupportedOperationException("Unaudited weight owner: " + owner.getName());
            put(terms, verifier, "getWeightEngine");
            if (!(verifier instanceof TestAero)) put(terms, verifier, "getWeightStructure");
            put(terms, verifier, "getWeightControls");
            if (verifier instanceof TestAero) put(terms, verifier, "getWeightFuel");
            put(terms, verifier, "getWeightHeatSinks", verifier.getEntity().hasPatchworkArmor() ? "getWeightAllocatedArmor" : "getWeightArmor",
                "getWeightMisc", "getWeightMiscEquip", "getWeightWeapon", "getWeightAmmo", "getWeightPowerAmp", "getWeightCarryingSpace");
            if (!(verifier instanceof TestAero)) put(terms, verifier, "getArmoredComponentWeight");
            if (verifier instanceof TestSupportVehicle) put(terms, verifier, "getFuelTonnage");
        }
        return terms;
    }

    static Map<String, Object> capture(TestEntity verifier) {
        Map<String, Object> result = new TreeMap<>(), quantities = new TreeMap<>(), settings = new TreeMap<>();
        for (Method method : TestEntityOption.class.getMethods()) {
            if (method.getParameterCount() == 0) settings.put(method.getName(), VehicleAeroReferenceExporter.read(verifier, method.getName()));
        }
        settings.put("gameYear", verifier.getGameYear());
        settings.put("ammoTechLevel", verifier.getEntity().getTechLevel());
        result.put("settings", settings);
        quantities.put("weightExact", quantity(verifier, "calculateWeightExact", "t"));
        quantities.put("weightRounded", quantity(verifier, "calculateWeight", "t"));
        quantities.put("weightDesign", quantity(verifier, "getWeight", "t"));
        quantities.put("armorPoints", quantity(verifier, "getTotalOArmor", "points"));
        quantities.put("criticalSlots", quantity(verifier, "totalCritSlotCount", "slots"));
        result.put("verifierQuantities", quantities);
        Map<String, Object> reconstruction = new TreeMap<>(Map.of("ok", false, "absoluteTolerance", ABS, "relativeTolerance", REL));
        result.put("reconstruction", reconstruction);
        try {
            double total = number(verifier, "calculateWeightExact");
            result.put("weightTotal", total);
            if (verifier instanceof TestInfantry) throw new UnsupportedOperationException("Native static TestInfantry.getWeightExact has no additive getter seam; detailed probe pending");
            Map<String, Double> terms = weights(verifier);
            if (terms.isEmpty() || terms.values().stream().anyMatch(v -> !Double.isFinite(v))) throw new IllegalStateException("Empty/nonfinite weight terms");
            double remainder = total - terms.values().stream().mapToDouble(Double::doubleValue).sum();
            result.put("weightTerms", terms);
            result.put("weightRemainder", remainder);
            reconstruction.put("ok", Math.abs(remainder) <= Math.max(ABS, REL * Math.abs(total)));
        } catch (Exception ex) {
            String status = ex instanceof UnsupportedOperationException ? "unsupported" : "failed";
            result.put("weightTermsStatus", Map.of("status", status, "reason", ex.toString()));
            reconstruction.put("status", status);
        }
        return result;
    }
}
