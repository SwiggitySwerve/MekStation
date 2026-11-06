"""Edit only top-level quirk values while retaining every construction byte."""
from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any

QUIRK_FIELDS = frozenset({'quirks', 'weaponQuirks'})


@dataclass(frozen=True)
class _Member:
    key: str
    start: int
    value_start: int
    value_end: int
    separator: int


def _object(raw: bytes) -> tuple[str, int, list[_Member]]:
    text = raw.decode('utf8')
    if not isinstance(json.loads(text), dict):
        raise ValueError('Quirk document must be an object')
    opening = len(text) - len(text.lstrip())
    decoder = json.JSONDecoder()
    members: list[_Member] = []
    seen = set()
    cursor = opening + 1

    def whitespace(position):
        while position < len(text) and text[position] in ' \t\r\n':
            position += 1
        return position

    while text[whitespace(cursor)] != '}':
        start = cursor
        key, end = decoder.raw_decode(text, whitespace(cursor))
        if key in seen:
            raise ValueError(f'Duplicate top-level key: {key}')
        seen.add(key)
        colon = whitespace(end)
        value_start = whitespace(colon + 1)
        _, value_end = decoder.raw_decode(text, value_start)
        separator = whitespace(value_end)
        members.append(_Member(key, start, value_start, value_end, separator))
        if text[separator] == '}':
            break
        cursor = separator + 1
    return text, opening, members


def core_bytes(raw: bytes) -> bytes:
    """Remove only quirk members; retain other values, spelling and whitespace."""
    text, opening, members = _object(raw)
    kept = []
    for index, member in enumerate(members):
        if member.key in QUIRK_FIELDS:
            continue
        part = text[member.start:member.value_end]
        if index < len(members) - 1:
            part += text[member.value_end:member.separator]
        kept.append(part)
    tail = members[-1].value_end if members else opening + 1
    return (text[:opening + 1] + ','.join(kept) + text[tail:]).encode('utf8')


def assert_quirk_only_change(before: bytes, after: bytes) -> None:
    if core_bytes(before) != core_bytes(after):
        raise ValueError('Bytes outside quirk fields changed')


def patch_quirk_fields(raw: bytes, fields: dict[str, Any]) -> bytes:
    """Set supplied quirk fields; omit absent additions and preserve equal values."""
    if set(fields) - QUIRK_FIELDS:
        raise ValueError('Only quirk fields may be patched')
    text, opening, members = _object(raw)
    newline = '\r\n' if '\r\n' in text else '\n'
    edits = []
    present = set()

    def render(value):
        return json.dumps(value, indent=2, ensure_ascii=False).replace('\n', newline + '  ')

    for member in members:
        present.add(member.key)
        if member.key in fields and json.loads(text[member.value_start:member.value_end]) != fields[member.key]:
            edits.append((member.value_start, member.value_end, render(fields[member.key])))
    additions = [
        newline + '  ' + json.dumps(key) + ': ' + render(value)
        for key, value in fields.items() if key not in present
    ]
    if additions:
        position = members[-1].value_end if members else opening + 1
        edits.append((position, position, (',' if members else '') + ','.join(additions)))
    for start, end, replacement in sorted(edits, reverse=True):
        text = text[:start] + replacement + text[end:]
    after = text.encode('utf8')
    assert_quirk_only_change(raw, after)
    return after
