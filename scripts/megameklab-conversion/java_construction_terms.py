"""Validate additive construction captures; unsupported quantities are never passes."""
import math

ABS_TOLERANCE, REL_TOLERANCE = 1e-9, 1e-12


def construction_errors(rows):
    errors = []
    for row in rows:
        try:
            if row['status'] != 'loaded' or 'stageFailure' in row:
                raise ValueError('load/stage failure')
            construction = row['construction']
            for key, quantity in construction.get('verifierQuantities', {}).items():
                if not quantity.get('unit') or type(quantity.get('value')) not in (int, float) or not math.isfinite(quantity['value']):
                    raise ValueError(f'{key}: {quantity}')
            result = construction['reconstruction']
            unavailable = construction.get('weightTermsStatus')
            if unavailable:
                raise ValueError(str(unavailable))
            terms = construction['weightTerms']
            if row['path'].startswith('infantry/'):
                # TestInfantry.getWeightExact: a mounted unit has only mount terms; otherwise trooper.base leads.
                kinds = {key.split('.')[0] for key in terms}
                if not (('mount.weight' in terms and kinds == {'mount'})
                        or ('trooper.base' in terms and kinds <= {'trooper', 'fieldWeapon', 'ammo'})):
                    raise ValueError('infantry weight terms need exactly one base: ' + ', '.join(sorted(terms)))
            numbers = [*terms.values(), construction['weightTotal'], construction['weightRemainder']]
            if not terms or any(type(value) not in (int, float) or not math.isfinite(value) for value in numbers):
                raise ValueError('empty/nonfinite construction weights')
            remainder = construction['weightTotal'] - sum(terms.values())
            if (result.get('ok') is not True or result['absoluteTolerance'] != ABS_TOLERANCE
                    or result['relativeTolerance'] != REL_TOLERANCE
                    or not math.isclose(construction['weightTotal'], sum(terms.values()), rel_tol=REL_TOLERANCE, abs_tol=ABS_TOLERANCE)
                    or not math.isclose(remainder, construction['weightRemainder'], rel_tol=REL_TOLERANCE, abs_tol=ABS_TOLERANCE)):
                raise ValueError('construction reconstruction mismatch')
        except (KeyError, TypeError, ValueError, AttributeError) as error:
            errors.append({'path': row['path'], 'reason': str(error)})
    return errors
