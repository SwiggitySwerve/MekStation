"""Convert a swarm-runner NDJSON event log into a readable companion file.

Usage:
    python scripts/format-event-log.py <path-to-game.jsonl>

The companion file lands at ``<input>.readable.txt``. Source NDJSON is read
without sorting, filtering, or mutation.
"""

import json
import os
import sys

from lib.event_log_format_core import render_prefix
from lib.event_log_format_summaries import fmt_summary


DEFAULT_EVENT_LOG = (
    'simulation-reports/games/2026-05-07T00-40-00-129Z/sim-46.jsonl'
)
FORMAT_DESCRIPTION = (
    'Format: s<seq> t<turn> <phase:8> <side:9> <actor:14> <action:24>'
    '  <action-summary>\n'
)
HEX_DESCRIPTION = (
    'Hex labels: MegaMek 4-digit (NNNN where 01-02 = column, '
    '03-04 = row, 1-indexed)\n'
)


def read_events(src):
    events = []
    with open(src) as f:
        for line in f:
            line = line.strip()
            if line:
                events.append(json.loads(line))
    return events


def write_readable_log(src, out, events):
    with open(out, 'w') as f:
        turn_min = min(e.get('turn', 0) for e in events)
        turn_max = max(e.get('turn', 0) for e in events)
        f.write(
            '=== {} - {} events, turns {}-{} ===\n'.format(
                os.path.basename(src),
                len(events),
                turn_min,
                turn_max,
            )
        )
        f.write('Source: {}\n'.format(src))
        f.write(FORMAT_DESCRIPTION)
        f.write(HEX_DESCRIPTION)
        f.write('=' * 100 + '\n\n')

        last_turn = -1
        for event in events:
            turn = event.get('turn', 0)
            if turn != last_turn:
                f.write('\n----- TURN {} -----\n'.format(turn))
                last_turn = turn
            summary = fmt_summary(
                event.get('type', '-'),
                event.get('payload', {}) or {},
                event,
            )
            f.write('{}  {}\n'.format(render_prefix(event), summary))


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EVENT_LOG
    out = src.replace('.jsonl', '.readable.txt')

    events = read_events(src)
    if not events:
        print('No events found in {}'.format(src), file=sys.stderr)
        sys.exit(1)

    write_readable_log(src, out, events)

    print('Written: {}'.format(out))
    print('Lines: {}'.format(sum(1 for _ in open(out))))
    print('Size: {} bytes'.format(os.path.getsize(out)))


if __name__ == '__main__':
    main()
