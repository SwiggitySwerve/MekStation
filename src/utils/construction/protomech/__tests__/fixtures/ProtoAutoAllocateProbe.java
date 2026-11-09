import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import megamek.common.TechConstants;
import megamek.common.equipment.EquipmentType;
import megamek.common.equipment.IArmorState;
import megamek.common.units.Entity;
import megamek.common.units.EntityMovementMode;
import megamek.common.units.ProtoMek;
import megamek.common.verifier.TestProtoMek;
import megameklab.util.UnitUtil;

/**
 * Pinned-oracle probe for ProtoMek auto armor allocation (row 4.1, PR a-3).
 *
 * The three methods below are copied byte-for-byte from megameklab/ui/protoMek/PMStructureTab.java
 * at megameklab 62bf193 (see verbatim-methods.java.txt); the stub members stand in for the Swing
 * panels they call. Everything else is the original MegaMek and MegaMekLab classes (UnitUtil,
 * TestProtoMek, ProtoMek) at their pins. args: outJson
 */
public class ProtoAutoAllocateProbe {
    // ---- stubs for PMStructureTab members the copied methods touch ----
    static final class PanArmor { int points; int getArmorPoints() { return points; } }
    static final class PanAllocation { void setFromEntity(Entity e) { } }
    static final class Refresh {
        void refreshPreview() { }
        void refreshSummary() { }
        void refreshStatus() { }
    }
    final PanArmor panArmor = new PanArmor();
    final PanAllocation panArmorAllocation = new PanAllocation();
    final Refresh refresh = new Refresh();
    ProtoMek proto;
    ProtoMek getProtoMek() { return proto; }

    // ---- verbatim from PMStructureTab (annotation line removed) ----
    public void autoAllocateArmor() {
        double pointsToAllocate = panArmor.getArmorPoints();
        double maxArmor = UnitUtil.getMaximumArmorPoints(getProtoMek());

        if (pointsToAllocate > maxArmor) {
            pointsToAllocate = maxArmor;
        }

        double percent = pointsToAllocate / maxArmor;

        for (int location = getProtoMek().firstArmorIndex(); location < getProtoMek().locations(); location++) {
            double allocate = Math.min(UnitUtil.getMaximumArmorPoints(getProtoMek(), location) * percent,
                  pointsToAllocate);
            getProtoMek().initializeArmor((int) allocate, location);
            pointsToAllocate -= (int) allocate;
        }

        allocateLeftoverPoints(pointsToAllocate);

        panArmorAllocation.setFromEntity(getProtoMek());
        refresh.refreshPreview();
        refresh.refreshSummary();
        refresh.refreshStatus();
    }

    private void allocateLeftoverPoints(double points) {
        while (points >= 1) {
            // Assign with the priority torso, legs, head, arms, main gun (if any). If there are exactly two points
            // left after the legs, skip the head and assign them symmetrically to the arms
            if (!getProtoMek().isQuad()) {
                addArmorPoint(ProtoMek.LOC_TORSO);
                points--;
                if (points > 0) {
                    addArmorPoint(ProtoMek.LOC_LEG);
                    points--;
                }
                if ((points > 0) && (points != 2)) {
                    addArmorPoint(ProtoMek.LOC_HEAD);
                    points--;
                }
                if (points >= 2) {
                    addArmorPoint(ProtoMek.LOC_LEFT_ARM);
                    addArmorPoint(ProtoMek.LOC_RIGHT_ARM);
                    points -= 2;
                }
            } else {
                // For quads, we have no arm armor, and we prioritize the legs over the torso.
                addArmorPoint(ProtoMek.LOC_LEG);
                points--;
                if (points > 0) {
                    addArmorPoint(ProtoMek.LOC_TORSO);
                    points--;
                }
                if (points > 0) {
                    addArmorPoint(ProtoMek.LOC_HEAD);
                    points--;
                }
            }
            if ((points > 0) && getProtoMek().hasMainGun()) {
                addArmorPoint(ProtoMek.LOC_HEAD);
                points--;
            }
        }
    }

    private void addArmorPoint(int location) {
        if (getProtoMek().getOArmor(location) < UnitUtil.getMaximumArmorPoints(getProtoMek(), location)) {
            getProtoMek().initializeArmor(getProtoMek().getOArmor(location) + 1, location);
            refresh.refreshSummary();
            refresh.refreshPreview();
        }
    }
    // ---- end verbatim ----

    static ProtoMek build(int tonnage, String chassis, boolean mainGun) {
        ProtoMek p = new ProtoMek();
        p.setWeight(tonnage);
        p.setTechLevel(TechConstants.T_CLAN_TW);
        p.setOriginalWalkMP(1);
        p.setArmorType(EquipmentType.T_ARMOR_STANDARD_PROTOMEK);
        p.setArmorTechLevel(p.getTechLevel());
        switch (chassis) {
            case "quad" -> { p.setMovementMode(EntityMovementMode.QUAD); p.setIsQuad(true); p.setIsGlider(false); }
            case "glider" -> { p.setMovementMode(EntityMovementMode.WIGE); p.setIsQuad(false); p.setIsGlider(true); }
            default -> { p.setMovementMode(EntityMovementMode.BIPED); p.setIsQuad(false); p.setIsGlider(false); }
        }
        p.setHasMainGun(mainGun);
        p.autoSetInternal();
        for (int loc = 0; loc < p.locations(); loc++) {
            p.initializeArmor(0, loc);
        }
        if (!mainGun) {
            p.initializeArmor(IArmorState.ARMOR_NA, ProtoMek.LOC_MAIN_GUN);
        }
        return p;
    }

    public static void main(String[] args) throws Exception {
        EquipmentType.initializeTypes();
        List<Map<String, Object>> rows = new ArrayList<>();
        String[] chassisList = { "biped", "quad", "glider" };
        for (int tonnage = 2; tonnage <= 15; tonnage++) {
            for (String chassis : chassisList) {
                for (boolean mainGun : new boolean[] { false, true }) {
                    ProtoMek probe = build(tonnage, chassis, mainGun);
                    int cap = TestProtoMek.maxArmorFactor(probe);
                    int[] points = { 0, 1, 2, 3, 5, 8, 13, cap / 2, cap - 3, cap - 1, cap, cap + 1, cap + 10, cap + 40 };
                    // Edited internal structure, head/torso/right arm/left arm/legs/main gun, as the editor allows.
                    int[][] deltas = { { 0, 0, 0, 0, 0, 0 } };
                    if (tonnage == 3 || tonnage == 5 || tonnage == 7 || tonnage == 9 || tonnage == 10
                        || tonnage == 12 || tonnage == 15) {
                        if (!chassis.equals("glider")) {
                            deltas = new int[][] { { 0, 0, 0, 0, 0, 0 }, { 0, 8, 0, 0, 0, 0 }, { 0, 0, 0, 0, 8, 0 },
                                { 0, 12, 0, 0, 12, 0 }, { 0, 20, 0, 0, 20, 0 } };
                        }
                    }
                    if ((tonnage == 3 || tonnage == 7 || tonnage == 10 || tonnage == 15) && !chassis.equals("glider")) {
                        // Reduced structure: location limits fall below the total cap, so points go unplaced.
                        int[][] reduced = { { 0, -1000, 0, 0, 0, 0 }, { 0, 0, 0, 0, -1000, 0 }, { 0, -1000, 0, 0, -1000, 0 },
                            { 0, -3, 0, 0, -3, 0 }, { -1000, -1000, 0, 0, -1000, -1000 } };
                        int[][] all = new int[deltas.length + reduced.length][];
                        System.arraycopy(deltas, 0, all, 0, deltas.length);
                        System.arraycopy(reduced, 0, all, deltas.length, reduced.length);
                        deltas = all;
                    }
                    for (int[] delta : deltas) {
                        boolean baseline = java.util.Arrays.stream(delta).allMatch(v -> v == 0);
                        boolean shrunk = java.util.Arrays.stream(delta).anyMatch(v -> v < 0);
                        List<Integer> seen = new ArrayList<>();
                        for (int pts : points) {
                            if (pts < 0 || seen.contains(pts)) continue;
                            if (!baseline && !shrunk && !(pts == cap || pts == cap / 2 || pts == cap - 1 || pts == 8 || pts == cap + 10 || pts == cap + 40)) continue;
                            seen.add(pts);
                            ProtoAutoAllocateProbe ctx = new ProtoAutoAllocateProbe();
                            ctx.proto = build(tonnage, chassis, mainGun);
                            int[] locs = { ProtoMek.LOC_HEAD, ProtoMek.LOC_TORSO, ProtoMek.LOC_RIGHT_ARM,
                                ProtoMek.LOC_LEFT_ARM, ProtoMek.LOC_LEG, ProtoMek.LOC_MAIN_GUN };
                            for (int i = 0; i < locs.length; i++) {
                                if (delta[i] != 0 && (locs[i] != ProtoMek.LOC_MAIN_GUN || mainGun)) {
                                    ctx.proto.initializeInternal(Math.max(0, ctx.proto.getOInternal(locs[i]) + delta[i]), locs[i]);
                                }
                            }
                            ctx.panArmor.points = pts;
                            ctx.autoAllocateArmor();
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("t", tonnage);
                            row.put("c", chassis);
                            row.put("mg", mainGun);
                            row.put("p", pts);
                            row.put("cap", cap);
                            int[] armor = new int[6];
                            int[] structure = new int[6];
                            for (int i = 0; i < locs.length; i++) {
                                armor[i] = Math.max(ctx.proto.getOArmor(locs[i]), 0);
                                structure[i] = Math.max(ctx.proto.getOInternal(locs[i]), 0);
                            }
                            row.put("a", armor);
                            row.put("s", structure);
                            row.put("e", !baseline);
                            rows.add(row);
                        }
                    }
                }
            }
        }
        new ObjectMapper().writeValue(new File(args[0]), rows);
        System.out.println("rows=" + rows.size());
    }
}
