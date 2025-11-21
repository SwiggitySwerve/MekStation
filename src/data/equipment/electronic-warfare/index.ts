import { Equipment } from '../types';
import { TARGETING_COMPUTERS } from '../targeting-computers';

export const GUARDIAN_ECM: Equipment = {
  id: 'guardian_ecm',
  name: 'Guardian ECM',
  category: 'Electronic Warfare',
  baseType: 'Guardian ECM',
  description: 'Guardian Electronic Counter-Measures Suite',
  requiresAmmo: false,
  introductionYear: 2040,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1.5,
      crits: 2,
      heat: 0,
      minRange: 0,
      cost: 200000,
      battleValue: 61
    }
  }
};

export const ANGEL_ECM: Equipment = {
  id: 'angel_ecm',
  name: 'Angel ECM',
  category: 'Electronic Warfare',
  baseType: 'Angel ECM',
  description: 'Angel Electronic Counter-Measures Suite - Advanced ECM system',
  requiresAmmo: false,
  introductionYear: 3055,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 2,
      crits: 2,
      heat: 0,
      minRange: 0,
      cost: 750000,
      battleValue: 87
    }
  }
};

export const CLAN_ECM: Equipment = {
  id: 'clan_ecm',
  name: 'ECM Suite',
  category: 'Electronic Warfare',
  baseType: 'Clan ECM Suite',
  description: 'Clan Electronic Counter-Measures Suite',
  requiresAmmo: false,
  introductionYear: 2824,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 200000,
      battleValue: 61
    }
  }
};

export const BEAGLE_ACTIVE_PROBE: Equipment = {
  id: 'beagle_active_probe',
  name: 'Beagle Active Probe',
  category: 'Electronic Warfare',
  baseType: 'Beagle Active Probe',
  description: 'Active sensor probe for enhanced detection',
  requiresAmmo: false,
  introductionYear: 2650,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1.5,
      crits: 2,
      heat: 0,
      minRange: 0,
      cost: 200000,
      battleValue: 12
    }
  }
};

export const CLAN_ACTIVE_PROBE: Equipment = {
  id: 'clan_active_probe',
  name: 'Active Probe',
  category: 'Electronic Warfare',
  baseType: 'Clan Active Probe',
  description: 'Clan active sensor probe for enhanced detection',
  requiresAmmo: false,
  introductionYear: 2824,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 200000,
      battleValue: 12
    }
  }
};

export const BLOODHOUND_ACTIVE_PROBE: Equipment = {
  id: 'bloodhound_active_probe',
  name: 'Bloodhound Active Probe',
  category: 'Electronic Warfare',
  baseType: 'Bloodhound Active Probe',
  description: 'Advanced active sensor probe with improved range',
  requiresAmmo: false,
  introductionYear: 3067,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 2,
      crits: 3,
      heat: 0,
      minRange: 0,
      cost: 500000,
      battleValue: 25
    }
  }
};

export const TAG: Equipment = {
  id: 'tag',
  name: 'TAG',
  category: 'Electronic Warfare',
  baseType: 'Target Acquisition Gear',
  description: 'Target Acquisition Gear for enhanced targeting',
  requiresAmmo: false,
  introductionYear: 3049,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 31
    },
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 50000,
      battleValue: 31
    }
  }
};

export const LIGHT_TAG: Equipment = {
  id: 'light_tag',
  name: 'Light TAG',
  category: 'Electronic Warfare',
  baseType: 'Light Target Acquisition Gear',
  description: 'Lightweight Target Acquisition Gear',
  requiresAmmo: false,
  introductionYear: 3058,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 40000,
      battleValue: 15
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 40000,
      battleValue: 15
    }
  }
};

export const C3_MASTER: Equipment = {
  id: 'c3_master',
  name: 'C3 Master',
  category: 'Electronic Warfare',
  baseType: 'C3 Master Computer',
  description: 'Command, Control & Communications Master Unit',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 5,
      crits: 5,
      heat: 0,
      minRange: 0,
      cost: 1500000,
      battleValue: 12
    }
  }
};

export const C3_SLAVE: Equipment = {
  id: 'c3_slave',
  name: 'C3 Slave',
  category: 'Electronic Warfare',
  baseType: 'C3 Slave Unit',
  description: 'Command, Control & Communications Slave Unit',
  requiresAmmo: false,
  introductionYear: 3050,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 250000,
      battleValue: 12
    }
  }
};

export const ARTEMIS_IV_FCS: Equipment = {
  id: 'artemis_iv_fcs',
  name: 'Artemis IV FCS',
  category: 'Electronic Warfare',
  baseType: 'Artemis IV FCS',
  description: 'Artemis IV Fire Control System for missile guidance',
  requiresAmmo: false,
  introductionYear: 2592,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 100000,
      battleValue: 0
    },
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 100000,
      battleValue: 0
    }
  }
};

export const APOLLO_MRM_FCS: Equipment = {
  id: 'apollo_mrm_fcs',
  name: 'Apollo MRM FCS',
  category: 'Electronic Warfare',
  baseType: 'Apollo MRM FCS',
  description: 'Apollo Medium Range Missile Fire Control System',
  requiresAmmo: false,
  introductionYear: 3058,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 125000,
      battleValue: 0
    }
  }
};

export const PPC_CAPACITOR: Equipment = {
  id: 'ppc_capacitor',
  name: 'PPC Capacitor',
  category: 'Electronic Warfare',
  baseType: 'PPC Capacitor',
  description: 'Capacitor system for enhancing PPC damage output',
  requiresAmmo: false,
  introductionYear: 3057,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 150000,
      battleValue: 0
    },
    Clan: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 150000,
      battleValue: 0
    }
  },
  special: ['Links to PPC', 'Damage Enhancement', '+5 Damage When Charged']
};

export const ARTEMIS_V_FCS: Equipment = {
  id: 'artemis_v_fcs',
  name: 'Artemis V FCS',
  category: 'Electronic Warfare',
  baseType: 'Artemis V FCS',
  description: 'Advanced Artemis V Fire Control System for missile guidance',
  requiresAmmo: false,
  introductionYear: 3071,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 200000,
      battleValue: 0
    }
  },
  special: ['Links to Missiles', 'Enhanced Guidance', 'LRM Only']
};

export const C3_BOOSTED_MASTER: Equipment = {
  id: 'c3_boosted_master',
  name: 'C3 Boosted Master',
  category: 'Electronic Warfare',
  baseType: 'C3 Boosted Master',
  description: 'Enhanced C3 Master with improved range and capacity',
  requiresAmmo: false,
  introductionYear: 3058,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 6,
      crits: 6,
      heat: 0,
      minRange: 0,
      cost: 1750000,
      battleValue: 0
    }
  },
  special: ['C3 Network', 'Enhanced Range', 'Increased Capacity']
};

export const RISC_LASER_PULSE_MODULE: Equipment = {
  id: 'risc_laser_pulse_module',
  name: 'RISC Laser Pulse Module',
  category: 'Electronic Warfare',
  baseType: 'RISC Laser Pulse Module',
  description: 'Radical Ionization Surge Crystal module for laser enhancement',
  requiresAmmo: false,
  introductionYear: 3144,
  rulesLevel: 'Advanced',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      heat: 0,
      minRange: 0,
      cost: 300000,
      battleValue: 0
    }
  },
  special: ['Links to Lasers', 'Pulse Conversion', 'Enhanced Accuracy']
};

export const ELECTRONIC_WARFARE: Equipment[] = [
  GUARDIAN_ECM,
  ANGEL_ECM,
  CLAN_ECM,
  BEAGLE_ACTIVE_PROBE,
  CLAN_ACTIVE_PROBE,
  BLOODHOUND_ACTIVE_PROBE,
  TAG,
  LIGHT_TAG,
  C3_MASTER,
  C3_SLAVE,
  ARTEMIS_IV_FCS,
  APOLLO_MRM_FCS,
  PPC_CAPACITOR,
  ARTEMIS_V_FCS,
  C3_BOOSTED_MASTER,
  RISC_LASER_PULSE_MODULE,
  ...TARGETING_COMPUTERS
];
