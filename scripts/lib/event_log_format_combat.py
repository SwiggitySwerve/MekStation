"""Combat event summary helpers for the readable event-log formatter."""

from lib.event_log_format_core import coord_to_board_label


def fmt_move(t, p, envelope):
    if t == 'movement_locked':
        return 'unit={}'.format(p.get('unitId', '-'))

    parts = [
        '{}->{}'.format(
            coord_to_board_label(p.get('from')),
            coord_to_board_label(p.get('to')),
        )
    ]
    mp = p.get('mpUsed', '-')
    sh = p.get('straightHexes')
    th = p.get('turningMpCost')
    if sh is not None or th is not None:
        parts.append(
            'mp={}(s{}+t{})'.format(
                mp,
                sh if sh is not None else '-',
                th if th is not None else '-',
            )
        )
    else:
        parts.append('mp={}'.format(mp))
    if p.get('netDisplacement') is not None:
        parts.append('disp={}'.format(p.get('netDisplacement')))
    steps = p.get('steps')
    if isinstance(steps, list) and steps:
        parts.append(
            '[{}]'.format(
                ','.join(
                    s.get('kind', '?') for s in steps if isinstance(s, dict)
                )
            )
        )
    else:
        parts.append('flags={}'.format(p.get('movementType', '-')))
    return ' '.join(parts)


def fmt_weapon(t, p, envelope):
    if t == 'attack_declared':
        weapons = p.get('weapons', [])
        weapon_str = (
            ','.join(
                w.get('weaponId', '?')
                for w in weapons[:3]
                if isinstance(w, dict)
            )
            if weapons
            else '-'
        )
        return '->{} weapons={} TN={} count={}'.format(
            p.get('targetId', '-'),
            weapon_str,
            p.get('toHitNumber', '-'),
            len(weapons),
        )
    hit = p.get('hit')
    hit_label = 'HIT' if hit else 'MISS' if hit is False else '-'
    return '->{} roll={}/{} {} loc={} dmg={}'.format(
        p.get('targetId', '-'),
        p.get('roll', '-'),
        p.get('toHitNumber', '-'),
        hit_label,
        p.get('hitLocation', '-'),
        p.get('damage', '-'),
    )


def fmt_melee(t, p, envelope):
    if t == 'physical_attack_declared':
        return '->{} type={} TN={}'.format(
            p.get('targetId', '-'),
            p.get('attackType', '-'),
            p.get('toHitNumber', '-'),
        )
    hit = p.get('hit')
    hit_label = 'HIT' if hit else 'MISS' if hit is False else '-'
    return '->{} roll={}/{} {} dmg={} loc={}'.format(
        p.get('targetId', '-'),
        p.get('roll', '-'),
        p.get('toHitNumber', '-'),
        hit_label,
        p.get('damage', '-'),
        p.get('hitLocation', '-'),
    )


def fmt_damage(t, p, envelope):
    if t == 'transfer_damage':
        return '{} {}->{} dmg={}'.format(
            p.get('unitId', '-'),
            p.get('fromLocation', '-'),
            p.get('toLocation', '-'),
            p.get('damage', '-'),
        )
    return '{} dmg={} armor={} struct={}'.format(
        p.get('location', '-'),
        p.get('damage', '-'),
        p.get('armorRemaining', '-'),
        p.get('structureRemaining', '-'),
    )


def fmt_crit(t, p, envelope):
    if t == 'critical_hit':
        return '{} count={} component={}'.format(
            p.get('location', '-'),
            p.get('count', '-'),
            p.get('component', '-'),
        )
    return '{} slot={} {}({})'.format(
        p.get('location', '-'),
        p.get('slotIndex', '-'),
        p.get('componentType', '-'),
        p.get('componentName', '-'),
    )
