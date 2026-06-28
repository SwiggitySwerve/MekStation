"""Shared column rendering helpers for the readable event-log formatter."""


def axial_to_offset(q, r):
    col = q + 1
    row = r + ((q - (q & 1)) >> 1) + 1
    return col, row


def coord_to_board_label(coord):
    if not isinstance(coord, dict):
        return '-'
    if 'q' not in coord or 'r' not in coord:
        return '-'
    try:
        col, row = axial_to_offset(int(coord['q']), int(coord['r']))
    except (TypeError, ValueError):
        return '-'
    col = abs(col) % 100
    row = abs(row) % 100
    return '{:02d}{:02d}'.format(col, row)


def derive_side(envelope):
    side = envelope.get('side')
    if side:
        return side
    actor = envelope.get('actorId')
    if isinstance(actor, str):
        if actor.startswith('player-'):
            return 'player'
        if actor.startswith('opponent-'):
            return 'opponent'
    return 'system'


def render_actor(actor):
    if not actor:
        return '{:>14s}'.format('-')
    if len(actor) > 14:
        return actor[:14]
    return '{:<14s}'.format(actor)


def render_prefix(envelope):
    seq = envelope.get('sequence', 0)
    turn = envelope.get('turn', 0)
    phase = str(envelope.get('phase', '-'))
    side = derive_side(envelope)
    actor = envelope.get('actorId')
    action = str(envelope.get('type', '-')).lower()

    return 's{:05d} t{:02d} {:<8s} {:<9s} {} {:<24s}'.format(
        int(seq) if isinstance(seq, (int, float)) else 0,
        int(turn) if isinstance(turn, (int, float)) else 0,
        phase[:8],
        side[:9],
        render_actor(actor),
        action[:24],
    )
