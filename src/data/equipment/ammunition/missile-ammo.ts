import { Equipment } from '../types';

// SRM Ammunition
export const SRM_AMMO: Equipment = {
  id: 'srm_ammo',
  name: 'SRM Ammo',
  category: 'Ammunition',
  baseType: 'SRM Ammo',
  description: 'Ammunition for Short Range Missiles (all SRM types)',
  requiresAmmo: false,
  introductionYear: 2365,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      ammoPerTon: 100
    },
    Clan: {
      weight: 1,
      crits: 1,
      ammoPerTon: 100
    }
  }
};

export const SRM_AMMO_HALF: Equipment = {
  id: 'srm_ammo_half',
  name: 'SRM Ammo (Half)',
  category: 'Ammunition',
  baseType: 'SRM Ammo',
  description: 'Half-load ammunition for Short Range Missiles',
  requiresAmmo: false,
  introductionYear: 2365,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 50
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 50
    }
  }
};

// Streak SRM Ammunition
export const STREAK_SRM_AMMO: Equipment = {
  id: 'streak_srm_ammo',
  name: 'Streak SRM Ammo',
  category: 'Ammunition',
  baseType: 'Streak SRM Ammo',
  description: 'Ammunition for Streak Short Range Missiles',
  requiresAmmo: false,
  introductionYear: 2647,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      ammoPerTon: 100
    },
    Clan: {
      weight: 1,
      crits: 1,
      ammoPerTon: 100
    }
  }
};

export const STREAK_SRM_AMMO_HALF: Equipment = {
  id: 'streak_srm_ammo_half',
  name: 'Streak SRM Ammo (Half)',
  category: 'Ammunition',
  baseType: 'Streak SRM Ammo',
  description: 'Half-load ammunition for Streak Short Range Missiles',
  requiresAmmo: false,
  introductionYear: 2647,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 50
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 50
    }
  }
};

// LRM Ammunition
export const LRM_AMMO: Equipment = {
  id: 'lrm_ammo',
  name: 'LRM Ammo',
  category: 'Ammunition',
  baseType: 'LRM Ammo',
  description: 'Ammunition for Long Range Missiles (all LRM types)',
  requiresAmmo: false,
  introductionYear: 2295,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 1,
      crits: 1,
      ammoPerTon: 120
    },
    Clan: {
      weight: 1,
      crits: 1,
      ammoPerTon: 120
    }
  }
};

export const LRM_AMMO_HALF: Equipment = {
  id: 'lrm_ammo_half',
  name: 'LRM Ammo (Half)',
  category: 'Ammunition',
  baseType: 'LRM Ammo',
  description: 'Half-load ammunition for Long Range Missiles',
  requiresAmmo: false,
  introductionYear: 2295,
  rulesLevel: 'Standard',
  variants: {
    IS: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 60
    },
    Clan: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 60
    }
  }
};

// Streak LRM Ammunition
export const STREAK_LRM_AMMO: Equipment = {
  id: 'streak_lrm_ammo',
  name: 'Streak LRM Ammo',
  category: 'Ammunition',
  baseType: 'Streak LRM Ammo',
  description: 'Ammunition for Streak Long Range Missiles',
  requiresAmmo: false,
  introductionYear: 3080,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 1,
      crits: 1,
      ammoPerTon: 120
    }
  }
};

export const STREAK_LRM_AMMO_HALF: Equipment = {
  id: 'streak_lrm_ammo_half',
  name: 'Streak LRM Ammo (Half)',
  category: 'Ammunition',
  baseType: 'Streak LRM Ammo',
  description: 'Half-load ammunition for Streak Long Range Missiles',
  requiresAmmo: false,
  introductionYear: 3080,
  rulesLevel: 'Standard',
  variants: {
    Clan: {
      weight: 0.5,
      crits: 1,
      ammoPerTon: 60
    }
  }
}; 