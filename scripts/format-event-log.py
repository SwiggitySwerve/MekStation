"""Convert a swarm-runner NDJSON event log into a readable companion .txt file.

Usage:
    python scripts/format-event-log.py <path-to-game.jsonl>

Reads each event in the JSONL file and renders one line per event using a
**fixed-width columnar prefix** + variable per-category summary, so post-hoc
analysis with ``awk``, ``grep``, and ``cut`` works without per-event-type
regexes.

Prefix layout (matches `quick-session` spec — Readable Event-Log Companion
Columnar Layout):

    s<seq:5d> t<turn:2d> <phase:8s> <side:9s> <actor:14s> <action:24s>  <summary>

| Column | Width | Source |
|---|---|---|
| ``s<seq>`` | 6 (``s`` + 5-digit zero-padded) | ``event.sequence`` |
| ``t<turn>`` | 3 (``t`` + 2-digit zero-padded) | ``event.turn`` |
| ``phase`` | 8 (left-padded) | ``event.phase`` |
| ``side`` | 9 (left-padded) | ``event.side`` if defined; else ``'system'`` for events without ``actorId``; else fallback to ``actorId``-prefix lookup |
| ``actor`` | 14 (right-truncated) | ``event.actorId`` if defined; else ``'-'`` left-padded |
| ``action`` | 24 (left-padded) | ``event.type`` lowercased |

After the action column, two literal spaces separate the prefix from the
per-category summary. Hex coordinates are rendered in MegaMek-standard
4-digit ``CCRR`` notation (column 01-99, row 01-99) via the
``coord_to_board_label`` helper.

The companion file lands at ``<input>.readable.txt``.

This script is read-only with respect to the source NDJSON. It must NOT
re-sort, filter, or mutate event payloads.
"""

import json
import os
import sys


# --- Hex coordinate rendering ----------------------------------------------------


def axial_to_offset(q, r):
    """Convert axial (q, r) to MegaMek offset (col, row).

    The simulation engine stores coordinates in the axial system used by
    ``IHexCoordinate`` (q increases east, r increases southeast). MegaMek
    boards address hexes as 4-digit ``CCRR`` strings where column and row
    are 1-indexed integers. Inverse of ``convertOffsetToAxial`` in
    ``src/lib/parsers/megaMekBoard.ts``.

    The offset system used by MegaMek is "odd-q" vertical layout:
        col = q + 1
        row = r + (q - (q & 1)) // 2 + 1  (with origin shifted to 1-indexed)
    """
    col = q + 1
    row = r + ((q - (q & 1)) >> 1) + 1
    return col, row


def coord_to_board_label(coord):
    """Render an IHexCoordinate dict as MegaMek 4-digit ``NNNN`` notation.

    Returns ``'-'`` if the coordinate is missing or malformed so empty
    payload slots fail gracefully rather than crashing the formatter.
    Negative or out-of-range columns/rows are clamped into the printable
    2-digit range with absolute value; this is a debug-companion utility,
    not a wire format.
    """
    if not isinstance(coord, dict):
        return '-'
    if 'q' not in coord or 'r' not in coord:
        return '-'
    try:
        col, row = axial_to_offset(int(coord['q']), int(coord['r']))
    except (TypeError, ValueError):
        return '-'
    # Clamp to printable 2-digit range; absolute value ensures negative
    # axial coords (engine offsets boards around the origin) still produce
    # a recognizable 4-digit label.
    col = abs(col) % 100
    row = abs(row) % 100
    return '{:02d}{:02d}'.format(col, row)


# --- Side derivation -------------------------------------------------------------


def derive_side(envelope):
    """Resolve the side column source for an event envelope.

    Envelope-then-fallback semantics per
    ``add-event-log-query-and-unified-readable-format`` (quick-session
    delta — Readable Event-Log Companion Columnar Layout):

    1. ``event.side`` (post-PR-B envelope denormalization) — primary
       source. Returned verbatim ('player' / 'opponent').
    2. Fallback for legacy NDJSON streams written before PR B: derive
       from the ``actorId`` prefix using the canonical
       ``MetricsCollector.sideFromUnitId`` rules.
    3. ``'system'`` for events with neither side nor a matching actor
       prefix (turn lifecycle, game-ended, initiative-rolled, etc.).
    """
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


# --- Per-category summary formatters --------------------------------------------


def fmt_move(t, p, envelope):
    """MOVE: ``movement_declared`` / ``movement_locked``.

    Template: ``<from>-> <to> mp=<n>(s<sh>+t<th>) disp=<d> [<step-kinds>]``
    when ``payload.steps`` is present (post-PR-C); falls back to
    ``flags=<movementType>`` when absent (legacy stream).
    """
    if t == 'movement_locked':
        return 'unit={}'.format(p.get('unitId', '-'))

    from_label = coord_to_board_label(p.get('from'))
    to_label = coord_to_board_label(p.get('to'))
    mp = p.get('mpUsed', '-')
    sh = p.get('straightHexes')
    th = p.get('turningMpCost')
    disp = p.get('netDisplacement')
    steps = p.get('steps')

    parts = ['{}->{}'.format(from_label, to_label)]
    if sh is not None or th is not None:
        parts.append('mp={}(s{}+t{})'.format(
            mp, sh if sh is not None else '-', th if th is not None else '-',
        ))
    else:
        parts.append('mp={}'.format(mp))
    if disp is not None:
        parts.append('disp={}'.format(disp))
    if isinstance(steps, list) and steps:
        kinds = ','.join(s.get('kind', '?') for s in steps if isinstance(s, dict))
        parts.append('[{}]'.format(kinds))
    else:
        parts.append('flags={}'.format(p.get('movementType', '-')))
    return ' '.join(parts)


def fmt_weapon(t, p, envelope):
    """WEAPON: ``attack_declared`` / ``attack_resolved``.

    Template: ``-> <target> <weapon> roll=<r>/<tn> <HIT|MISS> loc=<l> dmg=<d>``
    """
    if t == 'attack_declared':
        weapons = p.get('weapons', [])
        weapon_str = (
            ','.join(w.get('weaponId', '?') for w in weapons[:3] if isinstance(w, dict))
            if weapons else '-'
        )
        return '->{} weapons={} TN={} count={}'.format(
            p.get('targetId', '-'), weapon_str, p.get('toHitNumber', '-'), len(weapons),
        )
    # attack_resolved
    hit = p.get('hit')
    hit_label = 'HIT' if hit else 'MISS' if hit is False else '-'
    return '->{} roll={}/{} {} loc={} dmg={}'.format(
        p.get('targetId', '-'),
        p.get('roll', '-'), p.get('toHitNumber', '-'),
        hit_label,
        p.get('hitLocation', '-'),
        p.get('damage', '-'),
    )


def fmt_melee(t, p, envelope):
    """MELEE: ``physical_attack_declared`` / ``physical_attack_resolved``.

    Template: ``-> <target> <attackType> roll=<r>/<tn> <HIT|MISS> dmg=<d> loc=<l>``
    """
    if t == 'physical_attack_declared':
        return '->{} type={} TN={}'.format(
            p.get('targetId', '-'),
            p.get('attackType', '-'),
            p.get('toHitNumber', '-'),
        )
    # physical_attack_resolved
    hit = p.get('hit')
    hit_label = 'HIT' if hit else 'MISS' if hit is False else '-'
    return '->{} roll={}/{} {} dmg={} loc={}'.format(
        p.get('targetId', '-'),
        p.get('roll', '-'), p.get('toHitNumber', '-'),
        hit_label,
        p.get('damage', '-'),
        p.get('hitLocation', '-'),
    )


def fmt_damage(t, p, envelope):
    """DAMAGE: ``damage_applied`` / ``transfer_damage``.

    Template: ``<location> dmg=<d> armor=<armorRemaining> struct=<structureRemaining>``
    """
    if t == 'transfer_damage':
        return '{} {}->{} dmg={}'.format(
            p.get('unitId', '-'),
            p.get('fromLocation', '-'),
            p.get('toLocation', '-'),
            p.get('damage', '-'),
        )
    # damage_applied
    return '{} dmg={} armor={} struct={}'.format(
        p.get('location', '-'),
        p.get('damage', '-'),
        p.get('armorRemaining', '-'),
        p.get('structureRemaining', '-'),
    )


def fmt_crit(t, p, envelope):
    """CRIT: ``critical_hit`` / ``critical_hit_resolved`` / ``component_destroyed``.

    Template: ``<location> slot=<n> <componentType>(<componentName>)``
    """
    if t == 'critical_hit':
        return '{} count={} component={}'.format(
            p.get('location', '-'),
            p.get('count', '-'),
            p.get('component', '-'),
        )
    # critical_hit_resolved or component_destroyed
    return '{} slot={} {}({})'.format(
        p.get('location', '-'),
        p.get('slotIndex', '-'),
        p.get('componentType', '-'),
        p.get('componentName', '-'),
    )


def fmt_heat(t, p, envelope):
    """HEAT: ``heat_generated`` / ``heat_dissipated`` / ``heat_effect_applied``.

    Template: ``gen=<+n>/diss=<-n> total=<newTotal> effect=<threshold>``
    """
    if t == 'heat_effect_applied':
        return 'effect={} threshold={}'.format(
            p.get('effect', '-'),
            p.get('threshold', '-'),
        )
    amount = p.get('amount', 0)
    if t == 'heat_generated':
        sign = '+{}'.format(amount) if isinstance(amount, (int, float)) and amount >= 0 else str(amount)
        b = p.get('breakdown', {}) or {}
        return 'gen={} total={} (w={} m={} t={})'.format(
            sign, p.get('newTotal', '-'),
            b.get('weapons', 0), b.get('movement', 0), b.get('terrain', 0),
        )
    # heat_dissipated — amount is positive in payload, render with leading '-'
    sign = '-{}'.format(amount) if isinstance(amount, (int, float)) else str(amount)
    b = p.get('breakdown', {}) or {}
    return 'diss={} total={} sinks={} water={}'.format(
        sign, p.get('newTotal', '-'),
        b.get('baseDissipation', '-'), b.get('waterBonus', 0),
    )


def fmt_psr(t, p, envelope):
    """PSR: ``psr_triggered`` / ``psr_resolved`` / ``unit_fell`` / ``unit_stood`` / ``shutdown_check``.

    Template: ``<reason> tn=<n> roll=<r> <PASS|FAIL>``
    """
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
    # shutdown_check
    return 'automatic={} tn={}'.format(
        p.get('automatic', '-'),
        p.get('targetNumber', '-'),
    )


def fmt_ammo(t, p, envelope):
    """AMMO: ``ammo_consumed`` / ``ammo_explosion``.

    Templates:
      ammo_consumed   → ``bin=<binId> rounds=<n>``
      ammo_explosion  → ``bin=<binId> dmg=<d> loc=<l>``
    """
    if t == 'ammo_consumed':
        return 'bin={} rounds={}'.format(
            p.get('binId', '-'),
            p.get('roundsConsumed', '-'),
        )
    # ammo_explosion
    return 'bin={} dmg={} loc={} source={}'.format(
        p.get('binId', '-'),
        p.get('damage', '-'),
        p.get('location', '-'),
        p.get('source', '-'),
    )


def fmt_lifecycle(t, p, envelope):
    """LIFECYCLE: ``unit_destroyed`` / ``location_destroyed`` / ``pilot_hit``.

    Templates:
      unit_destroyed     → ``<unitId> cause=<cause>``
      location_destroyed → ``<location> via=<viaTransfer>``
      pilot_hit          → ``wounds=<n> source=<source>``
    """
    if t == 'unit_destroyed':
        return '{} cause={}'.format(p.get('unitId', '-'), p.get('cause', '-'))
    if t == 'location_destroyed':
        return '{} via={}'.format(
            p.get('location', '-'),
            p.get('viaTransfer', '-'),
        )
    # pilot_hit
    return 'wounds={} source={} consciousness={}'.format(
        p.get('totalWounds', '-'),
        p.get('source', '-'),
        p.get('consciousnessCheckRequired', '-'),
    )


def fmt_flow(t, p, envelope):
    """FLOW: ``game_started`` / ``game_ended`` / ``turn_started`` / ``turn_ended`` / ``phase_changed`` / ``initiative_rolled``.

    Per-event minimal: winner, phase, turn-number, etc.
    """
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
    if t == 'turn_started':
        return 'turn={}'.format(envelope.get('turn', '-'))
    if t == 'turn_ended':
        return 'turn={}'.format(envelope.get('turn', '-'))
    if t == 'phase_changed':
        return 'from={} to={}'.format(p.get('from', '-'), p.get('to', '-'))
    if t == 'initiative_rolled':
        return 'firstSide={} rolls={}'.format(
            p.get('firstSide', '-'),
            json.dumps(p.get('rolls', '-'))[:60],
        )
    return json.dumps(p)[:80]


# --- Category dispatch ----------------------------------------------------------


_MOVE_TYPES = {'movement_declared', 'movement_locked'}
_WEAPON_TYPES = {'attack_declared', 'attack_resolved'}
_MELEE_TYPES = {'physical_attack_declared', 'physical_attack_resolved'}
_DAMAGE_TYPES = {'damage_applied', 'transfer_damage'}
_CRIT_TYPES = {'critical_hit', 'critical_hit_resolved', 'component_destroyed'}
_HEAT_TYPES = {'heat_generated', 'heat_dissipated', 'heat_effect_applied'}
_PSR_TYPES = {
    'psr_triggered', 'psr_resolved', 'unit_fell', 'unit_stood', 'shutdown_check',
}
_AMMO_TYPES = {'ammo_consumed', 'ammo_explosion'}
_LIFECYCLE_TYPES = {'unit_destroyed', 'location_destroyed', 'pilot_hit'}
_FLOW_TYPES = {
    'game_started', 'game_ended', 'turn_started', 'turn_ended',
    'phase_changed', 'initiative_rolled', 'initiative_order_set',
    'game_created',
}


def fmt_summary(t, p, envelope):
    """Dispatch to the per-category formatter based on event type.

    Falls back to ``json.dumps`` (truncated) for unmapped event types so
    new events surface in the readable file even before a per-category
    template is added — this keeps the formatter forward-compatible with
    new event types without requiring a script update for each one.
    """
    if t in _MOVE_TYPES:
        return fmt_move(t, p, envelope)
    if t in _WEAPON_TYPES:
        return fmt_weapon(t, p, envelope)
    if t in _MELEE_TYPES:
        return fmt_melee(t, p, envelope)
    if t in _DAMAGE_TYPES:
        return fmt_damage(t, p, envelope)
    if t in _CRIT_TYPES:
        return fmt_crit(t, p, envelope)
    if t in _HEAT_TYPES:
        return fmt_heat(t, p, envelope)
    if t in _PSR_TYPES:
        return fmt_psr(t, p, envelope)
    if t in _AMMO_TYPES:
        return fmt_ammo(t, p, envelope)
    if t in _LIFECYCLE_TYPES:
        return fmt_lifecycle(t, p, envelope)
    if t in _FLOW_TYPES:
        return fmt_flow(t, p, envelope)
    return json.dumps(p)[:120]


# --- Columnar prefix render -----------------------------------------------------


def render_actor(actor):
    """Render the actor column: 14 chars left-padded; ``-`` if absent.

    When ``actorId`` is longer than 14 chars (long synthetic ids in
    fixtures), it is right-truncated so column position stays fixed.
    """
    if not actor:
        return '{:>14s}'.format('-')
    if len(actor) > 14:
        return actor[:14]
    return '{:<14s}'.format(actor)


def render_prefix(envelope):
    """Render the fixed-width 71-char prefix per the spec format string.

    Layout:
        s<seq:5d> t<turn:2d> <phase:8s> <side:9s> <actor:14s> <action:24s>

    Column positions (0-indexed):
        0..5    seq        (``s`` + 5-digit zero-padded)
        6       sep
        7..9    turn       (``t`` + 2-digit zero-padded)
        10      sep
        11..18  phase      (8s, left-padded)
        19      sep
        20..28  side       (9s, left-padded)
        29      sep
        30..43  actor      (14s, left-padded)
        44      sep
        45..68  action     (24s, left-padded)

    The two literal spaces separating prefix from summary live at columns
    69 and 70; the summary begins at column 71.
    """
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


# --- Driver ---------------------------------------------------------------------


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'simulation-reports/games/2026-05-07T00-40-00-129Z/sim-46.jsonl'
    out = src.replace('.jsonl', '.readable.txt')

    events = []
    with open(src) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            events.append(json.loads(line))

    if not events:
        print('No events found in {}'.format(src), file=sys.stderr)
        sys.exit(1)

    with open(out, 'w') as f:
        turn_min = min(e.get('turn', 0) for e in events)
        turn_max = max(e.get('turn', 0) for e in events)
        f.write('=== {} - {} events, turns {}-{} ===\n'.format(
            os.path.basename(src), len(events), turn_min, turn_max,
        ))
        f.write('Source: {}\n'.format(src))
        f.write(
            'Format: s<seq> t<turn> <phase:8> <side:9> <actor:14> <action:24>'
            '  <action-summary>\n'
        )
        f.write('Hex labels: MegaMek 4-digit (NNNN where 01-02 = column, 03-04 = row, 1-indexed)\n')
        f.write('=' * 100 + '\n\n')
        last_turn = -1
        for e in events:
            t = e.get('turn', 0)
            if t != last_turn:
                f.write('\n----- TURN {} -----\n'.format(t))
                last_turn = t
            prefix = render_prefix(e)
            summary = fmt_summary(e.get('type', '-'), e.get('payload', {}) or {}, e)
            f.write('{}  {}\n'.format(prefix, summary))

    print('Written: {}'.format(out))
    print('Lines: {}'.format(sum(1 for _ in open(out))))
    print('Size: {} bytes'.format(os.path.getsize(out)))


if __name__ == '__main__':
    main()
