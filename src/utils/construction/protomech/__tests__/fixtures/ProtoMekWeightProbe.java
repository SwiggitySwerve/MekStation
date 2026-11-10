import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import megamek.common.Configuration;
import megamek.common.equipment.*;
import megamek.common.loaders.MekFileParser;
import megamek.common.units.*;
import megamek.common.verifier.*;

/** Extends C3's movement probe with direct original-verifier weight observations. */
public class ProtoMekWeightProbe {
  public static void main(String[] args) throws Exception {
    if (args[0].equals("--boundaries")) {
      EquipmentType.initializeTypes();
      List<Map<String,Object>> boundaries = new ArrayList<>();
      for (double tons : new double[]{2,3,5,6,7,8,9,10,15}) {
        ProtoMek p = new ProtoMek();
        p.setWeight(tons);
        for (String id : new String[]{"ProtoMechJumpJet","ExtendedJumpJetSystem","ProtoMechUMU","CLMyomerBooster","ProtoMagneticClamp","ProtoMechPartialWing","CLSRM2","CLStreakSRM2","CLLRM10","CLStreakLRM5"}) {
          Map<String,Object> row = new LinkedHashMap<>();
          row.put("tonnage",tons);row.put("id",id);
          row.put("mass",EquipmentType.get(id).getTonnage(p));
          boundaries.add(row);
        }
      }
      new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(new File(args[1]),boundaries);
      return;
    }
    Configuration.setUnitsDir(new File(args[0]));
    EquipmentType.initializeTypes();
    List<Map<String,Object>> rows = new ArrayList<>();
    for (String path : Files.readAllLines(Paths.get(args[2]))) {
      if (path.isBlank()) continue;
      Map<String,Object> row = new LinkedHashMap<>();
      row.put("path",path);
      try {
        ProtoMek p = (ProtoMek)new MekFileParser(new File(path)).getEntity();
        TestProtoMek t = (TestProtoMek)TestEntity.getEntityVerifier(p);
        row.put("name",p.getChassis()+" "+p.getModel());
        row.put("tonnage",p.getWeight()); row.put("engineRating",p.getEngine().getRating());
        row.put("walk",p.getOriginalWalkMP()); row.put("quad",p.isQuad());row.put("glider",p.isGlider());
        row.put("armorPoints",p.getTotalArmor());row.put("armorType",p.getArmorType(1));
        Map<String,Double> terms = new LinkedHashMap<>();
        terms.put("engine",t.getWeightEngine()); terms.put("structure",t.getWeightStructure());
        terms.put("armor",t.getWeightArmor());terms.put("controls",t.getWeightControls());
        terms.put("heatSinks",t.getWeightHeatSinks());terms.put("weapons",t.getWeightWeapon());
        terms.put("ammo",t.getWeightAmmo());
        terms.put("jumpJets",0d);terms.put("umu",0d);terms.put("myomer",0d);terms.put("ei",0d);
        terms.put("otherEquipment",0d);
        List<Map<String,Object>> mounts = new ArrayList<>();
        for (Mounted<?> m : p.getEquipment()) {
          EquipmentType et = m.getType();
          Map<String,Object> mount = new LinkedHashMap<>();
          mount.put("id",et.getInternalName());mount.put("name",et.getName());
          mount.put("location",p.getLocationAbbr(m.getLocation()));mount.put("tonnage",m.getTonnage());
          mount.put("heat",et.getHeat());mount.put("javaClass",et.getClass().getName());
          String kind = et instanceof AmmoType ? "ammo" : et instanceof WeaponType ? "weapons" : "otherEquipment";
          if (et instanceof MiscType) {
            if(et.hasFlag(MiscType.F_JUMP_JET))kind="jumpJets";
            else if(et.hasFlag(MiscType.F_UMU))kind="umu";
            else if(et.hasFlag(MiscType.F_MASC))kind="myomer";
            else if(et.hasFlag(MiscType.F_EI_INTERFACE))kind="ei";
            terms.put(kind,terms.get(kind)+m.getTonnage());
          }
          if(et instanceof AmmoType a) {
            mount.put("shots",m.getBaseShotsLeft());mount.put("kgPerShot",a.getKgPerShot());
            mount.put("oneShot",m.isOneShotAmmo());
          }
          mount.put("kind",kind);mounts.add(mount);
        }
        row.put("mounts",mounts);
        row.put("miscEquipmentTotal",t.getWeightMiscEquip());
        terms.put("motiveExtras",t.getWeightMisc());
        terms.put("carryingSpace",t.getWeightCarryingSpace());
        terms.put("powerAmp",t.getWeightPowerAmp());
        terms.put("armoredComponents",t.getArmoredComponentWeight());
        row.put("terms",terms);row.put("heatSinkCount",t.getCountHeatSinks());
        row.put("totalExact",t.calculateWeightExact());row.put("total",t.calculateWeight());
        row.put("maxOverweight",t.getMaxOverweight());row.put("minUnderweight",t.getMinUnderweight());
        StringBuffer wb=new StringBuffer();row.put("correctWeight",t.correctWeight(wb));row.put("weightMessage",wb.toString());
        StringBuffer cb=new StringBuffer();row.put("correctEntity",t.correctEntity(cb,p.getTechLevel()));row.put("entityMessage",cb.toString());
        row.put("weightCalculation",t.printWeightCalculation().toString());
      } catch(Throwable ex) {row.put("error",ex.toString());}
      rows.add(row);
    }
    new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(new File(args[1]),rows);
    java.lang.System.out.println("rows="+rows.size());
  }
}
