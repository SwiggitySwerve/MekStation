"""Read-only subclass probes; generated Java and class hashes belong to reference identity."""
import json
import math
from pathlib import Path

STAGES = json.loads((Path(__file__).parent / 'java-reference/bv-stages.json').read_text())
CALCULATORS = ('Mek', 'CombatVehicle', 'Aero', 'DropShip', 'JumpShip', 'WarShip')


def write_probes(directory):
    sources = []
    for family in CALCULATORS:
        name = family + 'BVCalculator'
        code = ['package megamek.common.battleValue;', 'import java.util.*;',
                'import megamek.common.units.Entity;', 'import megamek.common.equipment.Mounted;',
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
            code.append(f'@Override protected void {method}() {{ double old={field}; super.{method}(); terms.put("{key}",{expression}); }}')
        code += ['@Override protected double processWeapon(Mounted<?> w, boolean show, boolean add, int count) {',
                 'double value=super.processWeapon(w,show,add,count);',
                 'if(show && add) terms.merge("weapon."+entity.getEquipmentNum(w)+"."+entity.getLocationAbbr(w.getLocation())+"."+w.getType().getInternalName(),value,Double::sum);',
                 'return value; }',
                 '@Override protected void processSummarize() { super.processSummarize();',
                 'terms.put("summaryModifier",baseBV/(defensiveValue+offensiveValue)); }',
                 '@Override protected void adjustBV() { super.adjustBV();',
                 'terms.put("adjustment",adjustedBV-Math.round(baseBV));',
                 'AssembledAmmo a=assembleAmmo();',
                 'a.ammoMap().forEach((k,v)->terms.put("ammo.available."+k,v));',
                 'a.weaponsForExcessiveAmmo().forEach((k,v)->terms.put("ammo.cap."+k,v)); }']
        if family in ('DropShip', 'JumpShip', 'WarShip'):
            code += ['@Override protected void processAmmo(int location) { double old=offensiveValue;',
                     'super.processAmmo(location); arcAmmo+=offensiveValue-old;',
                     'terms.put("ammo.arc."+arcName(location),offensiveValue-old); }']
        source = directory / ('Trace' + name + '.java')
        source.write_text('\n'.join(code + ['}']) + '\n', encoding='utf-8')
        sources.append(source)
    return sources


def reconstruction_errors(rows):
    errors = []
    for row in rows:
        try:
            bv = row['battleValue']
            if bv.get('termsUnsupported'):
                if row['path'].split('/')[0] in ('battlearmor', 'infantry', 'protomeks'):
                    continue  # Explicit fallback scope, never a per-term comparison pass.
                raise ValueError('unexpected unsupported family')
            terms = bv['terms']
            values = dict(defensiveValue=0., offensiveValue=0.)
            for key, (_, field, operation) in STAGES.items():
                value = terms[key]
                if not math.isfinite(value):
                    raise ValueError('nonfinite ' + key)
                if field not in values:
                    continue
                values[field] = values[field] * value if operation == '*' else values[field] + (-value if operation == '-' else value)
            values['baseBV'] = (values['defensiveValue'] + values['offensiveValue']) * terms['summaryModifier']
            values['adjustedBV'] = math.floor(values['baseBV'] + .5) + terms['adjustment']
            for key, value in values.items():
                if not math.isfinite(value) or not math.isclose(value, bv['aggregates'][key], rel_tol=1e-12, abs_tol=1e-9):
                    raise ValueError('reconstruction ' + key)
            if math.floor(values['adjustedBV'] + .5) != bv['total']:
                raise ValueError('reconstruction total')
        except (KeyError, TypeError, ValueError, OverflowError) as error:
            errors.append(dict(path=row['path'], error=str(error)))
    return errors
