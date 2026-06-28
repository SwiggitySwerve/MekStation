"""Status and lifecycle event summaries for the readable log formatter."""

import json


def fmt_heat(t, p, envelope):
    if t == 'heat_effect_applied':
        return 'effect={} threshold={}'.format(
            p.get('effect', '-'),
            p.get('threshold', '-'),
        )
    amount = p.get('amount', 0)
    if t == 'heat_generated':
        sign = (
            '+{}'.format(amount)
            if isinstance(amount, (int, float)) and amount >= 0
            else str(amount)
        )
        b = p.get('breakdown', {}) or {}
        return 'gen={} total={} (w={} m={} t={})'.format(
            sign,
            p.get('newTotal', '-'),
            b.get('weapons', 0),
            b.get('movement', 0),
            b.get('terrain', 0),
        )
    sign = '-{}'.format(amount) if isinstance(amount, (int, float)) else str(amount)
    b = p.get('breakdown', {}) or {}
    return 'diss={} total={} sinks={} water={}'.format(
        sign,
        p.get('newTotal', '-'),
        b.get('baseDissipation', '-'),
        b.get('waterBonus', 0),
    )


def fmt_psr(t, p, envelope):
    if t == 'psr_triggered':
        return 'reason={} basePSR={} mod={}'.format(
            p.get('reason', '-'),
            p.get('basePilotingSkill', '-'),
            p.get('additionalModifier', '-'),
        )
    if t == 'psr_resolved':
        passed = p.get('passed')
        verdict = 'PASS' if passed else 'FAIL' if passed is False else '-'
        return 'tn={} roll={} {}'.format(
            p.get('targetNumber', '-'),
            p.get('roll', '-'),
            verdict,
        )
    if t == 'unit_fell':
        return 'loc={} reason={}'.format(
            p.get('location', '-'),
            p.get('reason', '-'),
        )
    if t == 'unit_stood':
        return 'tn={} roll={}'.format(
            p.get('targetNumber', '-'),
            p.get('roll', '-'),
        )
    return 'automatic={} tn={}'.format(
        p.get('automatic', '-'),
        p.get('targetNumber', '-'),
    )


def fmt_ammo(t, p, envelope):
    if t == 'ammo_consumed':
        return 'bin={} rounds={}'.format(
            p.get('binId', '-'),
            p.get('roundsConsumed', '-'),
        )
    return 'bin={} dmg={} loc={} source={}'.format(
        p.get('binId', '-'),
        p.get('damage', '-'),
        p.get('location', '-'),
        p.get('source', '-'),
    )


def fmt_lifecycle(t, p, envelope):
    if t == 'unit_destroyed':
        return '{} cause={}'.format(p.get('unitId', '-'), p.get('cause', '-'))
    if t == 'location_destroyed':
        return '{} via={}'.format(
            p.get('location', '-'),
            p.get('viaTransfer', '-'),
        )
    return 'wounds={} source={} consciousness={}'.format(
        p.get('totalWounds', '-'),
        p.get('source', '-'),
        p.get('consciousnessCheckRequired', '-'),
    )


def fmt_flow(t, p, envelope):
    if t == 'game_started':
        return 'gameId={} firstSide={}'.format(
            envelope.get('gameId', '-'),
            p.get('firstSide', '-'),
        )
    if t == 'game_ended':
        return 'winner={} reason={}'.format(
            p.get('winner', '-'),
            p.get('reason', '-'),
        )
    if t in {'turn_started', 'turn_ended'}:
        return 'turn={}'.format(envelope.get('turn', '-'))
    if t == 'phase_changed':
        return 'from={} to={}'.format(p.get('from', '-'), p.get('to', '-'))
    if t == 'initiative_rolled':
        return 'firstSide={} rolls={}'.format(
            p.get('firstSide', '-'),
            json.dumps(p.get('rolls', '-'))[:60],
        )
    return json.dumps(p)[:80]
