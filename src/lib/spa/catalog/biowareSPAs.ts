/**
 * Manei Domini bioware implants (26 total — 24 MD set + proto DNI + suicide).
 * Source: MegaMek OptionsConstants.java — MD implants block.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { bioware } from './builders';

export const BIOWARE_SPAS: readonly ISPADefinition[] = [
  bioware({
    id: 'artificial_pain_shunt',
    displayName: 'Artificial Pain Shunt',
    description: 'Damage immunity against specified attack types.',
  }),
  bioware({
    id: 'vdni',
    displayName: 'VDNI',
    description:
      'Vehicular Direct Neural Interface: reduced piloting/gunnery TNs while jacked in.',
    pipelines: ['to-hit', 'psr'],
  }),
  bioware({
    id: 'bvdni',
    displayName: 'Buffered VDNI',
    description: 'Buffered neural interface: reduced feedback damage.',
    pipelines: ['to-hit', 'psr'],
  }),
  bioware({
    id: 'pl_enhanced',
    displayName: 'Prosthetic Limbs, Enhanced',
    description: 'Infantry prosthetics: +1 damage with melee/carried weapons.',
    pipelines: ['damage'],
  }),
  bioware({
    id: 'pl_ienhanced',
    displayName: 'Prosthetic Limbs, Improved Enhanced',
    description: 'Multiple enhanced prosthetics stacking additional damage.',
    pipelines: ['damage'],
  }),
  bioware({
    id: 'pl_masc',
    displayName: 'Prosthetic Leg MASC',
    description: 'MASC-equipped prosthetic leg: bonus infantry speed.',
    pipelines: ['movement'],
  }),
  bioware({
    id: 'pl_extra_limbs',
    displayName: 'Prosthetic Limbs, Extraneous',
    description: 'Additional prosthetic limbs provide extra weapon mounts.',
    pipelines: ['special'],
  }),
  bioware({
    id: 'pl_tail',
    displayName: 'Prosthetic Tail, Enhanced',
    description: 'Melee damage bonus against adjacent targets.',
    pipelines: ['damage'],
  }),
  bioware({
    id: 'pl_glider',
    displayName: 'Prosthetic Wings, Glider',
    description: 'Parafoil glide capability for infantry.',
    pipelines: ['movement'],
  }),
  bioware({
    id: 'pl_flight',
    displayName: 'Prosthetic Wings, Powered Flight',
    description: 'Limited VTOL flight capability.',
    pipelines: ['movement'],
  }),
  bioware({
    id: 'cyber_imp_audio',
    displayName: 'Sensory Implant: Enhanced Audio',
    description: 'Functions as a 2-hex active probe for infantry detection.',
    pipelines: ['sensors'],
  }),
  bioware({
    id: 'cyber_imp_visual',
    displayName: 'Sensory Implant: IR/EM Optical',
    description: 'Functions as a 2-hex active probe and ignores smoke.',
    pipelines: ['sensors'],
  }),
  bioware({
    id: 'cyber_imp_laser',
    displayName: 'Sensory Implant: Laser/Telescopic',
    description: '-1 to-hit for ranged infantry attacks.',
    pipelines: ['to-hit'],
  }),
  bioware({
    id: 'mm_implants',
    displayName: 'Multi-Modal Sensory Implant',
    description: 'Combines audio/optical/laser implants.',
    pipelines: ['sensors', 'to-hit'],
  }),
  bioware({
    id: 'enh_mm_implants',
    displayName: 'Enhanced Multi-Modal Implants',
    description: 'Upgraded combined sensory package.',
    pipelines: ['sensors', 'to-hit'],
  }),
  bioware({
    id: 'comm_implant',
    displayName: 'Cybernetic Comm Implant',
    description: '-1 LRM spotting; -1 mine spotting.',
    pipelines: ['to-hit'],
  }),
  bioware({
    id: 'boost_comm_implant',
    displayName: 'Boosted Comm Implant',
    description: 'Comm implant features plus a C3i node.',
    pipelines: ['to-hit', 'special'],
  }),
  bioware({
    id: 'dermal_armor',
    displayName: 'Myomer Implants: Dermal Armor',
    description: 'Incoming damage reduced.',
    pipelines: ['damage'],
  }),
  bioware({
    id: 'dermal_camo_armor',
    displayName: 'Myomer Implants: Camouflage Armor',
    description: 'Camouflage bonuses to concealment.',
    pipelines: ['to-hit'],
  }),
  bioware({
    id: 'tsm_implant',
    displayName: 'Myomer Implants: Triple Strength',
    description: 'Enhanced physical attack damage.',
    pipelines: ['damage'],
  }),
  bioware({
    id: 'triple_core_processor',
    displayName: 'Triple-Core Processor',
    description: 'Combined combat and data-processing bonus.',
    pipelines: ['initiative', 'to-hit'],
  }),
  bioware({
    id: 'filtration_implants',
    displayName: 'Filtration Implants',
    description: 'Environmental hazard immunity (toxins, low-atmo).',
    pipelines: ['special'],
  }),
  bioware({
    id: 'gas_effuser_pheromone',
    displayName: 'Gas Effuser: Pheromone',
    description:
      'Area effect (pheromone) — area/psi support (not yet simulated).',
    pipelines: ['special'],
  }),
  bioware({
    id: 'gas_effuser_toxin',
    displayName: 'Gas Effuser: Toxin',
    description: 'Area effect (toxin) — area/psi support (not yet simulated).',
    pipelines: ['special'],
  }),
  bioware({
    id: 'proto_dni',
    displayName: 'Prototype Direct Neural Interface',
    description: 'Early-generation DNI implant — reduced neural bandwidth.',
    pipelines: ['to-hit', 'psr'],
  }),
  bioware({
    id: 'suicide_implants',
    displayName: 'Explosive Suicide Implants',
    description: 'Self-destruct on capture. Not simulated in combat.',
    pipelines: ['special'],
  }),
];
