"""Read-only subclass probes; generated Java and class hashes belong to reference identity."""
import json
import math
from pathlib import Path

STAGES = json.loads((Path(__file__).parent / 'java-reference/bv-stages.json').read_text())
CALCULATORS = ('Mek', 'CombatVehicle', 'Aero', 'DropShip', 'JumpShip', 'WarShip', 'ProtoMek', 'Infantry', 'BattleArmor')


def write_probes(directory):
    sources = []
    for family in CALCULATORS:
        name = family + 'BVCalculator'
        code = ['package megamek.common.battleValue;', 'import java.util.*;',
                'import megamek.common.units.Entity;', 'import megamek.common.units.ConvInfantry;',
                'import megamek.common.battleArmor.BattleArmor;', 'import megamek.common.equipment.Mounted;',
                'import megamek.common.equipment.MiscType;', 'import java.util.function.Predicate;',
                f'public class Trace{name} extends {name} {{',
                'public final Map<String,Double> terms = new TreeMap<>();',
                'double arcAmmo = 0;', f'public Trace{name}(Entity e) throws Exception {{ super(e);']
        if family in ('DropShip', 'JumpShip', 'WarShip'):
            code += ['var field=LargeAeroBVCalculator.class.getDeclaredField("collectedWeapons");',
                     'field.setAccessible(true); field.set(this,new LinkedHashMap<>());']
        code.append('}')
        for key, (method, field, operation) in STAGES.items():
            if field not in ('defensiveValue', 'offensiveValue'):
                continue
            expression = {'+': f'{field}-old', '-': f'old-{field}', '*': f'old==0?1:{field}/old'}[operation]
            if key == 'speedFactor':
                expression = 'getOffensiveSpeedFactorMultiplier()'
            if key == 'weaponBV':
                expression = 'offensiveValue-old-arcAmmo'
            if key == 'ammoBV':
                expression = 'offensiveValue-old+arcAmmo'
            before = 'weaponCall=0;' if family == 'Infantry' and key == 'weaponBV' else ''
            after = 'finishInfantryWeapons();' if family == 'Infantry' and key == 'weaponBV' else ''
            code.append(f'@Override protected void {method}() {{ {before} double old={field}; super.{method}(); terms.put("{key}",{expression}); {after} }}')
        code += ['@Override protected double processWeapon(Mounted<?> w, boolean show, boolean add, int count) {',
                 'double value=super.processWeapon(w,show,add,count);',
                 'if(show && add) { terms.merge("weapon."+entity.getEquipmentNum(w)+"."+entity.getLocationAbbr(w.getLocation())+"."+w.getType().getInternalName(),value,Double::sum);',
                 'traceInfantryWeapon(w,value);' if family == 'Infantry' else '', '}',
                 'return value; }',
                 '@Override protected void processSummarize() { super.processSummarize();',
                 'terms.put("summaryModifier",defensiveValue+offensiveValue==0?1:baseBV/(defensiveValue+offensiveValue));',
                 'snapshotTrooper();' if family == 'BattleArmor' else '', '}',
                 '@Override protected void adjustBV() { super.adjustBV();',
                 'terms.put("adjustment",adjustedBV-Math.round(baseBV));',
                 'AssembledAmmo a=assembleAmmo();',
                 'a.ammoMap().forEach((k,v)->terms.put("ammo.available."+k,v));',
                 'a.weaponsForExcessiveAmmo().forEach((k,v)->terms.put("ammo.cap."+k,v)); }']
        if family in ('ProtoMek', 'BattleArmor'):
            code += ['@Override protected double offensiveEquipmentBV(MiscType m,int loc) {',
                     'double value=super.offensiveEquipmentBV(m,loc);',
                     'terms.put("equipment.native."+loc+"."+m.getInternalName(),value); return value; }']
        if family == 'Infantry':
            code += INFANTRY_HOOKS.splitlines()
        if family == 'BattleArmor':
            code += BA_HOOKS.splitlines()
        if family in ('DropShip', 'JumpShip', 'WarShip'):
            code += ['@Override protected void processAmmo(int location) { double old=offensiveValue;',
                     'super.processAmmo(location); arcAmmo+=offensiveValue-old;',
                     'terms.put("ammo.arc."+arcName(location),offensiveValue-old); }']
        source = directory / ('Trace' + name + '.java')
        source.write_text('\n'.join(code + ['}']) + '\n', encoding='utf-8')
        sources.append(source)
    return sources


INFANTRY_HOOKS = '''
int weaponCall=0;
void traceInfantryWeapon(Mounted<?> w,double value) {
    ConvInfantry i=(ConvInfantry)entity;
    String key;
    if(w.getLocation()==ConvInfantry.LOC_FIELD_GUNS) key="fieldGunWeaponBV";
    else {
        int primary=i.getPrimaryWeapon()==null?0:1, secondary=i.getSecondaryWeapon()==null?0:1;
        key=weaponCall<primary?"infantry.primaryWeaponBV":weaponCall<primary+secondary?"infantry.secondaryWeaponBV":"infantry.antiMekWeaponBV";
        weaponCall++;
    }
    terms.merge(key,value,Double::sum);
}
void finishInfantryWeapons() {
    double men=Math.max(0,entity.getOInternal(ConvInfantry.LOC_INFANTRY));
    double primary=terms.getOrDefault("infantry.primaryWeaponBV",0.0), secondary=terms.getOrDefault("infantry.secondaryWeaponBV",0.0);
    double guns=terms.getOrDefault("fieldGunWeaponBV",0.0), anti=terms.getOrDefault("infantry.antiMekWeaponBV",0.0);
    terms.put("primaryBV",men==0?0:primary/men); terms.put("secondaryBV",men==0?0:secondary/men);
    terms.put("fieldGunWeaponBV",guns); terms.put("infantry.antiMekWeaponBV",anti);
    terms.put("infantry.weaponRemainderBV",terms.get("weaponBV")-primary-secondary-guns-anti);
}
'''

BA_HOOKS = '''
final Map<Integer,Map<String,Double>> troopers=new TreeMap<>();
int trooper() {
    try { var f=BattleArmorBVCalculator.class.getDeclaredField("currentTrooper"); f.setAccessible(true); return f.getInt(this); }
    catch(ReflectiveOperationException e) { throw new IllegalStateException(e); }
}
@Override protected void processDefensiveValue() { terms.clear(); super.processDefensiveValue(); }
void snapshotTrooper() {
    var snapshot=new TreeMap<>(terms);
    AssembledAmmo a=assembleAmmo();
    a.ammoMap().forEach((k,v)->snapshot.put("ammo.available."+k,v));
    a.weaponsForExcessiveAmmo().forEach((k,v)->snapshot.put("ammo.cap."+k,v));
    snapshot.put("defensiveValue",defensiveValue); snapshot.put("offensiveValue",offensiveValue); snapshot.put("baseBV",baseBV);
    troopers.put(trooper(),snapshot);
}
@Override protected void reportPossibleWeaponSection(String name,Predicate<Mounted<?>> filter) {
    double old=offensiveValue; super.reportPossibleWeaponSection(name,filter); terms.put("section."+name,offensiveValue-old);
}
@Override protected void processCalculations() {
    troopers.clear(); super.processCalculations();
    double strength=((BattleArmor)entity).getShootingStrength();
    var bases=troopers.values().stream().map(t->t.get("baseBV")).toList();
    double average=bases.stream().distinct().count()==1?bases.getFirst():bases.stream().mapToDouble(Double::doubleValue).sum()/strength;
    terms.put("squad.strength",strength); terms.put("squad.averageBV",average); terms.put("squad.factor",baseBV/average);
    terms.put("summaryModifier",baseBV/(defensiveValue+offensiveValue));
    troopers.forEach((i,t)->t.forEach((k,v)->terms.put("trooper."+i+"."+k,v)));
}
'''


def reconstruct(terms, adjusted=True):
    values = dict(defensiveValue=0., offensiveValue=0.)
    for key, (_, field, operation) in STAGES.items():
        if field not in values:
            continue
        value = terms[key]
        values[field] = values[field] * value if operation == '*' else values[field] + (-value if operation == '-' else value)
    values['baseBV'] = (values['defensiveValue'] + values['offensiveValue']) * terms['summaryModifier']
    if adjusted:
        values['adjustedBV'] = math.floor(values['baseBV'] + .5) + terms['adjustment']
    return values


def check_ba(terms, base):
    strength = terms['squad.strength']
    if strength <= 0 or int(strength) != strength:
        raise ValueError('invalid squad strength')
    indices = sorted({int(key.split('.')[1]) for key in terms if key.startswith('trooper.')})
    if indices != list(range(1, int(strength) + 1)):
        raise ValueError('missing trooper trace')
    bases = []
    for index in indices:
        trooper = {key.removeprefix(f'trooper.{index}.'): value for key, value in terms.items() if key.startswith(f'trooper.{index}.')}
        values = reconstruct(trooper, False)
        for key, value in values.items():
            if not math.isclose(value, trooper[key], rel_tol=1e-12, abs_tol=1e-9):
                raise ValueError('trooper reconstruction ' + index + '.' + key)
        bases.append(values['baseBV'])
    average = bases[0] if len(set(bases)) == 1 else sum(bases) / strength
    factor = (0.9 + 0.1 * strength) * strength
    for name, expected in (('squad.averageBV', average), ('squad.factor', factor)):
        if not math.isclose(terms[name], expected, rel_tol=1e-12, abs_tol=1e-9):
            raise ValueError('reconstruction ' + name)
    if not math.isclose(average * factor, base, rel_tol=1e-12, abs_tol=1e-9):
        raise ValueError('reconstruction squad baseBV')


def reconstruction_errors(rows):
    errors = []
    for row in rows:
        try:
            bv = row['battleValue']
            if bv.get('termsUnsupported'):
                raise ValueError('unexpected unsupported family')
            terms = bv['terms']
            for key, value in terms.items():
                if not math.isfinite(value):
                    raise ValueError('nonfinite ' + key)
            values = reconstruct(terms)
            if row['path'].startswith('battlearmor/'):
                check_ba(terms, values['baseBV'])
            for key, value in values.items():
                if not math.isfinite(value) or not math.isclose(value, bv['aggregates'][key], rel_tol=1e-12, abs_tol=1e-9):
                    raise ValueError('reconstruction ' + key)
            if math.floor(values['adjustedBV'] + .5) != bv['total']:
                raise ValueError('reconstruction total')
        except (KeyError, TypeError, ValueError, OverflowError) as error:
            errors.append(dict(path=row['path'], error=str(error)))
    return errors
