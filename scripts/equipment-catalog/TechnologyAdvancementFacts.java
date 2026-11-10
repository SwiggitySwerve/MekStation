import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import megamek.common.Configuration;
import megamek.common.TechAdvancement;
import megamek.common.TechAdvancement.AdvancementPhase;
import megamek.common.equipment.EquipmentType;

/** Raw equipment facts only. No entity loads, identity guesses or legality caches. */
public final class TechnologyAdvancementFacts {
    private static Map<String, Object> rawFact(TechAdvancement advancement) {
        var sides = new LinkedHashMap<String, Object>();
        for (boolean clan : new boolean[] {false, true}) {
            var stages = new LinkedHashMap<String, Object>();
            for (var phase : AdvancementPhase.values()) {
                var stage = new LinkedHashMap<String, Object>();
                stage.put("year", clan ? advancement.getClanAdvancement(phase)
                        : advancement.getISAdvancement(phase));
                stage.put("approximate", clan ? advancement.getClanApproximate(phase)
                        : advancement.getISApproximate(phase));
                stages.put(phase.name().toLowerCase(java.util.Locale.ROOT), stage);
            }
            sides.put(clan ? "CLAN" : "IS", stages);
        }
        var factions = new LinkedHashMap<String, Object>();
        factions.put("prototype", advancement.getPrototypeFactions().stream()
                .map(Enum::name).sorted().toList());
        factions.put("production", advancement.getProductionFactions().stream()
                .map(Enum::name).sorted().toList());
        factions.put("extinct", advancement.getExtinctionFactions().stream()
                .map(Enum::name).sorted().toList());
        factions.put("reintroduced", advancement.getReintroductionFactions().stream()
                .map(Enum::name).sorted().toList());
        var fact = new LinkedHashMap<String, Object>();
        fact.put("techBase", advancement.getTechBase().name());
        fact.put("staticTechLevel", advancement.getStaticTechLevel().name());
        fact.put("advancement", sides);
        fact.put("factions", factions);
        return fact;
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            throw new IllegalArgumentException("Usage: TechnologyAdvancementFacts <mekfiles> <scratch-output.json>");
        }
        Configuration.setUnitsDir(Path.of(args[0]).toFile());
        EquipmentType.initializeTypes();
        var facts = new TreeMap<String, Object>();
        for (var types = EquipmentType.getAllTypes(); types.hasMoreElements();) {
            var type = types.nextElement();
            String name = type.getInternalName();
            if (name == null || name.isEmpty() || facts.containsKey(name)) {
                throw new IllegalStateException("Missing or duplicate native identity: " + name);
            }
            facts.put(name, rawFact(type.getTechAdvancement()));
        }
        if (facts.isEmpty()) throw new IllegalStateException("Empty equipment registry");
        // CREATE_NEW refuses accidental replacement of an earlier extraction.
        byte[] bytes = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsBytes(facts);
        Files.write(Path.of(args[1]), bytes, java.nio.file.StandardOpenOption.CREATE_NEW);
        System.out.println("equipment=" + facts.size());
    }
}
