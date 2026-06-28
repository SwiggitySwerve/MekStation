"""Event type dispatch for the readable event-log formatter."""

import json

from lib.event_log_format_combat import (
    fmt_crit,
    fmt_damage,
    fmt_melee,
    fmt_move,
    fmt_weapon,
)
from lib.event_log_format_status import (
    fmt_ammo,
    fmt_flow,
    fmt_heat,
    fmt_lifecycle,
    fmt_psr,
)

_MOVE_TYPES = {'movement_declared', 'movement_locked'}
_WEAPON_TYPES = {'attack_declared', 'attack_resolved'}
_MELEE_TYPES = {'physical_attack_declared', 'physical_attack_resolved'}
_DAMAGE_TYPES = {'damage_applied', 'transfer_damage'}
_CRIT_TYPES = {'critical_hit', 'critical_hit_resolved', 'component_destroyed'}
_HEAT_TYPES = {'heat_generated', 'heat_dissipated', 'heat_effect_applied'}
_PSR_TYPES = {
    'psr_triggered',
    'psr_resolved',
    'unit_fell',
    'unit_stood',
    'shutdown_check',
}
_AMMO_TYPES = {'ammo_consumed', 'ammo_explosion'}
_LIFECYCLE_TYPES = {'unit_destroyed', 'location_destroyed', 'pilot_hit'}
_FLOW_TYPES = {
    'game_started',
    'game_ended',
    'turn_started',
    'turn_ended',
    'phase_changed',
    'initiative_rolled',
    'initiative_order_set',
    'game_created',
}


def fmt_summary(t, p, envelope):
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
