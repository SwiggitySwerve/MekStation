"""Convert a swarm-runner NDJSON event log into a readable companion .txt file.

Usage:
    python scripts/format-event-log.py <path-to-game.jsonl>

Reads each event in the JSONL file and renders one line per event using the
canonical payload field names emitted by the engine. Hex coordinates are
rendered in MegaMek-standard 4-digit ``NNNN`` notation (column 01-99,
row 01-99) so the output is recognizable to anyone familiar with BattleTech
boards.

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


# --- Event payload formatters ----------------------------------------------------


def fmt_payload(t, p, envelope):
    if t == 'attack_declared':
        weapons = p.get('weapons', [])
        mods = p.get('modifiers', [])
        mod_str = ' '.join('{}:{}'.format(m.get('name', '?'), m.get('value', '?')) for m in mods[:3])
        return '{} -> {} weapons={} TN={} {}'.format(
            p.get('attackerId'), p.get('targetId'), len(weapons), p.get('toHitNumber'), mod_str,
        )
    if t == 'attack_resolved':
        # Engine emits `roll` (the 2d6 sum) and `toHitNumber` (the GATOR target). Earlier
        # versions of this formatter looked for `rolled2d6`/`rolledTN` which the engine
        # never emitted -- those fields produced `roll=-` / `TN=-` in every readable file.
        return 'hit={} loc={} dmg={} roll={} TN={}'.format(
            p.get('hit'), p.get('hitLocation', '-'), p.get('damage', '-'),
            p.get('roll', '-'), p.get('toHitNumber', '-'),
        )
    if t == 'damage_applied':
        # Engine emits `armorRemaining`/`structureRemaining` (post-application values).
        return '{} loc={} dmg={} armor={} struct={}'.format(
            p.get('targetId') or p.get('unitId'), p.get('location'), p.get('damage'),
            p.get('armorRemaining', '-'), p.get('structureRemaining', '-'),
        )
    if t == 'unit_destroyed':
        return 'unit={} CAUSE={}'.format(p.get('unitId'), p.get('cause'))
    if t == 'location_destroyed':
        return '{} loc={} viaTransfer={}'.format(
            p.get('unitId'), p.get('location'), p.get('viaTransfer'),
        )
    if t == 'transfer_damage':
        return '{} {} -> {} dmg={}'.format(
            p.get('unitId'), p.get('fromLocation'), p.get('toLocation'), p.get('damage'),
        )
    if t == 'critical_hit':
        return '{} loc={} component={} count={}'.format(
            p.get('unitId'), p.get('location'), p.get('component'), p.get('count'),
        )
    if t == 'critical_hit_resolved':
        return '{} {} slot={} component={} ({})'.format(
            p.get('unitId'), p.get('location'), p.get('slotIndex'),
            p.get('componentType'), p.get('componentName'),
        )
    if t == 'component_destroyed':
        return '{} {} component={} slot={}'.format(
            p.get('unitId'), p.get('location'), p.get('componentType'), p.get('slotIndex'),
        )
    if t == 'pilot_hit':
        return '{} totalWounds={} source={} consciousnessCheck={}'.format(
            p.get('unitId'), p.get('totalWounds'), p.get('source'),
            p.get('consciousnessCheckRequired'),
        )
    if t == 'unit_fell':
        # NB: the engine does NOT yet emit `location` or `reason` on this payload --
        # they are added by PR B. Until then, both render as `-`.
        return '{} loc={} reason={}'.format(
            p.get('unitId'), p.get('location', '-'), p.get('reason', '-'),
        )
    if t == 'psr_triggered':
        # `basePilotingSkill` is added by PR B; renders as `-` until then.
        return '{} reason={} basePSR={} mod={}'.format(
            p.get('unitId'), p.get('reason'),
            p.get('basePilotingSkill', '-'), p.get('additionalModifier', '-'),
        )
    if t == 'psr_resolved':
        # Engine emits `roll` (the 2d6 sum), not `rolled2d6`.
        return '{} TN={} roll={} passed={}'.format(
            p.get('unitId'), p.get('targetNumber'), p.get('roll', '-'), p.get('passed'),
        )
    if t == 'movement_declared':
        # Engine emits `from` and `to` as IHexCoordinate dicts; convert to MegaMek
        # 4-digit notation. `hexesMoved` is added by PR C; renders as `-` until then.
        from_label = coord_to_board_label(p.get('from'))
        to_label = coord_to_board_label(p.get('to'))
        return '{} type={} from={} to={} mp={} hexes={}'.format(
            p.get('unitId'), p.get('movementType'), from_label, to_label,
            p.get('mpUsed', '-'), p.get('hexesMoved', '-'),
        )
    if t == 'heat_generated':
        b = p.get('breakdown', {}) or {}
        return '{} amount={} (weapons={} movement={} terrain={})'.format(
            p.get('unitId'), p.get('amount'),
            b.get('weapons', 0), b.get('movement', 0), b.get('terrain', 0),
        )
    if t == 'heat_dissipated':
        # The engine does not emit `heatSinkCount`. The closest analogue is
        # `breakdown.baseDissipation` which is the per-turn sink-derived dissipation
        # (heat sinks contribute 1 each plus water bonus from `breakdown.waterBonus`).
        b = p.get('breakdown', {}) or {}
        return '{} amount={} sinks={} water={}'.format(
            p.get('unitId'), p.get('amount'),
            b.get('baseDissipation', '-'), b.get('waterBonus', 0),
        )
    if t == 'heat_effect_applied':
        return '{} threshold={} effect={}'.format(
            p.get('unitId'), p.get('threshold'), p.get('effect'),
        )
    if t == 'shutdown_check':
        return '{} automatic={} TN={}'.format(
            p.get('unitId'), p.get('automatic'), p.get('targetNumber', '-'),
        )
    if t == 'turn_ended':
        # The turn number lives on the envelope, not the payload.
        return 'turn={}'.format(envelope.get('turn', '-'))
    if t == 'physical_attack_declared':
        return '{} -> {} type={} TN={}'.format(
            p.get('attackerId'), p.get('targetId'),
            p.get('attackType'), p.get('toHitNumber', '-'),
        )
    if t == 'physical_attack_resolved':
        return 'hit={} dmg={} loc={}'.format(
            p.get('hit'), p.get('damage', '-'), p.get('hitLocation', '-'),
        )
    if t == 'ammo_consumed':
        # Engine emits `binId` and `roundsConsumed` -- earlier versions of this
        # formatter looked for `ammoBinId`/`amount` which never existed.
        return '{} bin={} rounds={}'.format(
            p.get('unitId'), p.get('binId', '-'), p.get('roundsConsumed', '-'),
        )
    if t == 'ammo_explosion':
        # Engine emits `binId`.
        return '{} bin={} loc={} dmg={} source={}'.format(
            p.get('unitId'), p.get('binId', '-'), p.get('location'),
            p.get('damage'), p.get('source'),
        )
    if t == 'game_started':
        # `firstSide` is on the payload; `gameId` is on the envelope.
        return 'gameId={} firstSide={}'.format(
            envelope.get('gameId', '-'), p.get('firstSide', '-'),
        )
    if t == 'game_ended':
        return 'winner={} reason={}'.format(p.get('winner', '-'), p.get('reason', '-'))
    return json.dumps(p)[:140]


# --- Driver ----------------------------------------------------------------------


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
        turn_min = min(e['turn'] for e in events)
        turn_max = max(e['turn'] for e in events)
        f.write('=== {} - {} events, turns {}-{} ===\n'.format(
            os.path.basename(src), len(events), turn_min, turn_max,
        ))
        f.write('Source: {}\n'.format(src))
        f.write('Format: s<sequence> t<turn> <event-type> <key payload fields>\n')
        f.write('Hex labels: MegaMek 4-digit (NNNN where 01-02 = column, 03-04 = row, 1-indexed)\n')
        f.write('=' * 100 + '\n\n')
        last_turn = -1
        for e in events:
            t = e['turn']
            if t != last_turn:
                f.write('\n----- TURN {} -----\n'.format(t))
                last_turn = t
            line = 's{:4d} t{:2d} {:26s} {}\n'.format(
                e['sequence'], t, e['type'],
                fmt_payload(e['type'], e.get('payload', {}), e),
            )
            f.write(line)

    print('Written: {}'.format(out))
    print('Lines: {}'.format(sum(1 for _ in open(out))))
    print('Size: {} bytes'.format(os.path.getsize(out)))


if __name__ == '__main__':
    main()
