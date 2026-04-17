/**
 * Edge triggers — reroll abilities for specific failure types (11).
 * Source: MegaMek OptionsConstants.java — edge trigger block.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { edge } from './builders';

export const EDGE_SPAS: readonly ISPADefinition[] = [
  edge({
    id: 'edge_when_headhit',
    displayName: 'Edge: Head Hit',
    description: 'Reroll a head hit.',
  }),
  edge({
    id: 'edge_when_tac',
    displayName: 'Edge: Through Armor Crit',
    description: 'Reroll a through-armor critical.',
  }),
  edge({
    id: 'edge_when_ko',
    displayName: 'Edge: Pilot KO',
    description: 'Reroll a pilot-blackout consciousness check.',
  }),
  edge({
    id: 'edge_when_explosion',
    displayName: 'Edge: Critical Explosion',
    description: 'Reroll a critical that would trigger an ammo explosion.',
  }),
  edge({
    id: 'edge_when_masc_fails',
    displayName: 'Edge: MASC / Supercharger Failure',
    description: 'Reroll a MASC / Supercharger failure check.',
  }),
  edge({
    id: 'edge_when_aero_alt_loss',
    displayName: 'Edge: Aero Altitude Loss',
    description: 'Reroll an atmospheric altitude-loss check.',
  }),
  edge({
    id: 'edge_when_aero_explosion',
    displayName: 'Edge: Aero Critical Explosion',
    description: 'Reroll an aero critical explosion.',
  }),
  edge({
    id: 'edge_when_aero_ko',
    displayName: 'Edge: Aero Pilot KO',
    description: 'Reroll an aerospace / Conventional / Small-Craft pilot KO.',
  }),
  edge({
    id: 'edge_when_aero_lucky_crit',
    displayName: 'Edge: Aero Lucky Crit',
    description: 'Reroll an aerospace crit triggered by a natural 12.',
  }),
  edge({
    id: 'edge_when_aero_nuke_crit',
    displayName: 'Edge: Aero Nuke Crit',
    description: 'Reroll a nuclear missile SI damage roll.',
  }),
  edge({
    id: 'edge_when_aero_unit_cargo_lost',
    displayName: 'Edge: Transport Cargo Lost',
    description:
      'Reroll a transported-unit-loss check (DropShip / JumpShip / WarShip / Space Station).',
  }),
];
