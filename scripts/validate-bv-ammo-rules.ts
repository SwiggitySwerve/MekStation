export type AmmoResolutionRule = {
  re: RegExp;
  ids: (m: RegExpMatchArray) => string[];
};
export const AMMO_RESOLUTION_RULES: AmmoResolutionRule[] = [
  { re: /^(?:is\s*)?ammo\s+ac[/-](\d+)$/, ids: (m) => [`ac-${m[1]}-ammo`] },
  {
    re: /^(?:is\s*)?ammo\s+ac[/-](\d+)\s+primitive$/,
    ids: (m) => [`ammo-ac-${m[1]}-primitive`],
  },
  { re: /^(?:is\s*)?ac(\d+)\s*ammo$/, ids: (m) => [`ac-${m[1]}-ammo`] },
  { re: /^(?:is\s*)?ammo\s+lrm-(\d+)$/, ids: (m) => [`ammo-lrm-${m[1]}`] },
  { re: /^(?:is\s*)?lrm(\d+)\s*ammo$/, ids: (m) => [`ammo-lrm-${m[1]}`] },
  { re: /^(?:is\s*)?ammo\s+srm-(\d+)$/, ids: (m) => [`ammo-srm-${m[1]}`] },
  { re: /^(?:is\s*)?srm(\d+)\s*ammo$/, ids: (m) => [`ammo-srm-${m[1]}`] },
  {
    re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+lrm$/,
    ids: (m) => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?ammo\s+mml-(\d+)\s+srm$/,
    ids: (m) => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?mml(\d+)\s+lrm\s*ammo$/,
    ids: (m) => [`mml-${m[1]}-lrm-ammo`, `ammo-lrm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?mml(\d+)\s+srm\s*ammo$/,
    ids: (m) => [`mml-${m[1]}-srm-ammo`, `ammo-srm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?mrm(\d+)\s*ammo$/,
    ids: (m) => [
      `mrm-${m[1]}-ammo`,
      `ammo-mrm-${m[1]}`,
      `mrm-${m[1]}`,
      `mrm-ammo`,
    ],
  },
  {
    re: /^(?:is\s*)?ammo\s+mrm-(\d+)$/,
    ids: (m) => [
      `mrm-${m[1]}-ammo`,
      `ammo-mrm-${m[1]}`,
      `mrm-${m[1]}`,
      `mrm-ammo`,
    ],
  },
  {
    re: /^(?:is\s*)?ultraac(\d+)\s*ammo$/,
    ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
  },
  {
    re: /^(?:is\s*)?ammo\s+ultra\s*ac[/-](\d+)$/,
    ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
  },
  {
    re: /^(?:is\s*)?ultra\s*ac[/-](\d+)\s*ammo$/,
    ids: (m) => [`is-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
  },
  {
    re: /^(?:is\s*)?lbxac(\d+)\s*ammo$/,
    ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
  },
  {
    re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,
    ids: (m) => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
  },
  {
    re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,
    ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
  },
  {
    re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,
    ids: (m) => [`is-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
  },
  {
    re: /^(?:is\s*)?lb\s*(\d+)-x\s*(?:ac\s*)?slug\s*ammo$/,
    ids: (m) => [`is-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
  },
  { re: /^(?:is\s*)?rotaryac(\d+)\s*ammo$/, ids: (m) => [`rotaryac${m[1]}`] },
  { re: /^(?:is\s*)?ammo\s+lac[/-](\d+)$/, ids: (m) => [`ammo-lac-${m[1]}`] },
  { re: /^(?:is\s*)?lac(\d+)\s*ammo$/, ids: (m) => [`ammo-lac-${m[1]}`] },
  {
    re: /^(?:is\s*)?ammo\s+hvac[/-](\d+)$/,
    ids: (m) => [`hvac-${m[1]}-ammo`],
  },
  {
    re: /^(?:is\s*)?ammo\s+extended\s*lrm-(\d+)$/,
    ids: (m) => [`ammo-extended-lrm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?enhancedlrm(\d+)\s*ammo$/,
    ids: (m) => [`enhancedlrm${m[1]}`],
  },
  {
    re: /^(?:is\s*)?ammo\s+thunderbolt-(\d+)$/,
    ids: (m) => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`],
  },
  {
    re: /^(?:is\s*)?thunderbolt(\d+)\s*ammo$/,
    ids: (m) => [`thunderbolt-${m[1]}-ammo`, `lrm-ammo`],
  },
  { re: /^(?:is\s*)?gauss\s*ammo$/, ids: (_) => [`gauss-ammo`] },
  {
    re: /^(?:is\s*)?light\s*gauss\s*ammo$/,
    ids: (_) => [`light-gauss-ammo`],
  },
  {
    re: /^(?:is\s*)?heavy\s*gauss\s*ammo$/,
    ids: (_) => [`heavy-gauss-ammo`],
  },
  {
    re: /^(?:is\s*)?improvedheavygauss\s*ammo$/,
    ids: (_) => [`improvedheavygauss`],
  },
  {
    re: /^(?:is\s*)?sbgauss(?:rifle)?\s*ammo$/,
    ids: (_) => [`silver-bullet-gauss`],
  },
  {
    re: /^silver\s*bullet\s*gauss\s*ammo$/,
    ids: (_) => [`silver-bullet-gauss`],
  },
  {
    re: /^(?:is\s*)?plasmarifle?\s*ammo$/,
    ids: (_) => [`plasma-rifle-ammo`, `isplasmarifleammo`],
  },
  {
    re: /^(?:is\s*)?plasma\s*rifle\s*ammo$/,
    ids: (_) => [`plasma-rifle-ammo`, `isplasmarifleammo`],
  },
  { re: /^(?:is\s*)?fluidgun\s*ammo$/, ids: (_) => [`fluid-gun-ammo`] },
  { re: /^(?:is\s*)?(?:heavy\s*)?flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
  { re: /^(?:is\s*)?vehicle\s*flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
  { re: /^(?:is\s*)?mg\s*ammo$/, ids: (_) => [`mg-ammo`] },
  { re: /^(?:is\s*)?ammo\s+mg$/, ids: (_) => [`mg-ammo`, `ammo-mg-full`] },
  {
    re: /^(?:is\s*)?machine\s*gun\s*ammo$/,
    ids: (_) => [`mg-ammo`, `ammo-mg-full`],
  },
  {
    re: /^(?:is\s*)?heavy\s*machine\s*gun\s*ammo$/,
    ids: (_) => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`],
  },
  {
    re: /^(?:is\s*)?light\s*machine\s*gun\s*ammo$/,
    ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
  },
  { re: /^(?:is\s*)?ams\s*ammo$/, ids: (_) => [`ams-ammo`] },
  { re: /^(?:is\s*)?ammo\s+inarc$/, ids: (_) => [`inarc-ammo`] },
  { re: /^(?:is\s*)?ammo\s+narc$/, ids: (_) => [`narc-ammo`] },
  {
    re: /^(?:is\s*)?arrowiv\s*(?:cluster\s*)?ammo$/,
    ids: (_) => [`arrowivammo`],
  },
  { re: /^(?:is\s*)?arrowiv\s*homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
  {
    re: /^(?:is\s*)?ammo\s+lrtorpedo-(\d+)$/,
    ids: (m) => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?ammo\s+srtorpedo-(\d+)$/,
    ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?ammo\s+heavy\s*rifle$/,
    ids: (_) => [`heavy-rifle-ammo`],
  },
  {
    re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,
    ids: (_) => [`heavy-rifle-ammo`],
  },
  {
    re: /^(?:is\s*)?ammo\s+medium\s*rifle$/,
    ids: (_) => [`medium-rifle-ammo`],
  },
  {
    re: /^(?:is\s*)?medium\s*rifle\s*ammo$/,
    ids: (_) => [`medium-rifle-ammo`],
  },
  {
    re: /^(?:is\s*)?ammo\s+light\s*rifle$/,
    ids: (_) => [`light-rifle-ammo`],
  },
  {
    re: /^(?:is\s*)?light\s*rifle\s*ammo$/,
    ids: (_) => [`light-rifle-ammo`],
  },
  { re: /^(?:is\s*)?ammo\s+nail[/-]rivet$/, ids: (_) => [`mg-ammo`] },
  { re: /^(?:is\s*)?magshotgr\s*ammo$/, ids: (_) => [`magshotgr-ammo`] },
  { re: /^(?:is\s*)?apds\s*ammo$/, ids: (_) => [`ams-ammo`] },
  {
    re: /^(?:is\s*)?snipercannonammo$/,
    ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
  },
  {
    re: /^(?:is\s*)?longtomcannonammo$/,
    ids: (_) => [`longtomcannonammo`, `islongtomcannonammo`],
  },
  {
    re: /^(?:is\s*)?thumpercannonammo$/,
    ids: (_) => [`thumpercannonammo`, `isthumpercannonammo`],
  },
  { re: /^(?:mek\s*)?taser\s*ammo$/, ids: (_) => [`taser-ammo`] },
  {
    re: /^(?:is\s*)?streaksrm(\d+)\s*ammo$/,
    ids: (m) => [
      `is-streak-srm-${m[1]}-ammo`,
      `streak-srm-${m[1]}-ammo`,
      `streak-srm-ammo`,
    ],
  },
  {
    re: /^(?:is\s*)?streak\s*srm\s*(\d+)\s*ammo$/,
    ids: (m) => [
      `is-streak-srm-${m[1]}-ammo`,
      `streak-srm-${m[1]}-ammo`,
      `streak-srm-ammo`,
    ],
  },
  {
    re: /^(?:is\s*)?ammo\s+streak\s*srm-(\d+)$/,
    ids: (m) => [
      `is-streak-srm-${m[1]}-ammo`,
      `streak-srm-${m[1]}-ammo`,
      `streak-srm-ammo`,
    ],
  },
  {
    re: /^(?:is\s*)?lrt(\d+)\s*ammo$/,
    ids: (m) => [`ammo-lrtorpedo-${m[1]}`, `ammo-lrm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?srt(\d+)\s*ammo$/,
    ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
  },
  {
    re: /^(?:is\s*)?light\s*mg\s*ammo(?:\s*\(\d+\))?$/,
    ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
  },
  { re: /^(?:is\s*)?impgauss\s*ammo$/, ids: (_) => [`impgaussammo`] },
  { re: /^(?:is\s*)?arrowiv\s+ammo$/, ids: (_) => [`arrowivammo`] },
  { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
  { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/, ids: (_) => [`arrowivammo`] },
  {
    re: /^(?:is\s*)?sniper\s*cannon\s*ammo$/,
    ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
  },
  {
    re: /^(?:is\s*)?long\s*tom\s*cannon\s*ammo$/,
    ids: (_) => [`longtomcannonammo`, `islongtomcannonammo`],
  },

  {
    re: /^cl(?:an)?\s*ammo\s+lrm-(\d+)$/,
    ids: (m) => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*lrm(\d+)\s*ammo$/,
    ids: (m) => [`clan-ammo-lrm-${m[1]}`, `ammo-lrm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+srm-(\d+)$/,
    ids: (m) => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*srm(\d+)\s*ammo$/,
    ids: (m) => [`clan-ammo-srm-${m[1]}`, `ammo-srm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+atm-(\d+)$/,
    ids: (m) => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+er$/,
    ids: (m) => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+atm-(\d+)\s+he$/,
    ids: (m) => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`],
  },
  {
    re: /^cl(?:an)?\s*atm(\d+)\s*ammo$/,
    ids: (m) => [`clan-ammo-atm-${m[1]}`, `atm-standard-ammo`],
  },
  {
    re: /^cl(?:an)?\s*atm(\d+)\s+er\s*ammo$/,
    ids: (m) => [`clan-ammo-atm-${m[1]}-er`, `atm-er-ammo`],
  },
  {
    re: /^cl(?:an)?\s*atm(\d+)\s+he\s*ammo$/,
    ids: (m) => [`clan-ammo-atm-${m[1]}-he`, `atm-he-ammo`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+iatm-(\d+)$/,
    ids: (m) => [`clan-ammo-iatm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*ultraac(\d+)\s*ammo$/,
    ids: (m) => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
  },
  {
    re: /^cl(?:an)?\s*ultra\s*ac[/-](\d+)\s*ammo$/,
    ids: (m) => [`clan-uac-${m[1]}-ammo`, `uac-${m[1]}-ammo`],
  },
  {
    re: /^cl(?:an)?\s*lbxac(\d+)\s*ammo$/,
    ids: (m) => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
  },
  {
    re: /^cl(?:an)?\s*lbxac(\d+)\s+cl\s*ammo$/,
    ids: (m) => [`clan-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
  },
  {
    re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?ammo$/,
    ids: (m) => [`clan-lb-${m[1]}-x-ammo`, `lb-${m[1]}-x-ammo`],
  },
  {
    re: /^cl(?:an)?\s*lb\s*(\d+)-x\s*(?:ac\s*)?cluster\s*ammo$/,
    ids: (m) => [`clan-lb-${m[1]}-x-cluster-ammo`, `lb-${m[1]}-x-cluster-ammo`],
  },
  {
    re: /^cl(?:an)?\s*rotaryac(\d+)\s*ammo$/,
    ids: (m) => [`clanrotaryac${m[1]}`, `rac-${m[1]}-ammo`],
  },
  {
    re: /^cl(?:an)?\s*streaksrm(\d+)\s*ammo$/,
    ids: (m) => [
      `clan-streak-srm-${m[1]}-ammo`,
      `clan-streak-srm-${m[1]}`,
      `streak-srm-ammo`,
    ],
  },
  {
    re: /^cl(?:an)?\s*streak\s*srm\s*(\d+)\s*ammo$/,
    ids: (m) => [
      `clan-streak-srm-${m[1]}-ammo`,
      `clan-streak-srm-${m[1]}`,
      `streak-srm-ammo`,
    ],
  },
  {
    re: /^cl(?:an)?\s*streaklrm(\d+)\s*ammo$/,
    ids: (m) => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*streak\s*lrm\s*(\d+)\s*ammo$/,
    ids: (m) => [`clan-streak-lrm-${m[1]}-ammo`, `clan-streak-lrm-${m[1]}`],
  },
  { re: /^cl(?:an)?\s*gauss\s*ammo$/, ids: (_) => [`gauss-ammo`] },
  {
    re: /^cl(?:an)?\s*apgaussrifle\s*ammo$/,
    ids: (_) => [`ap-gauss-ammo`, `apgaussrifle`],
  },
  { re: /^cl(?:an)?\s*impgauss\s*ammo$/, ids: (_) => [`impgaussammo`] },
  {
    re: /^cl(?:an)?\s*improvedlrm(\d+)\s*ammo$/,
    ids: (m) => [`clanimprovedlrm${m[1]}ammo`],
  },
  {
    re: /^cl(?:an)?\s*machine\s*gun\s*ammo$/,
    ids: (_) => [`mg-ammo`, `ammo-mg-full`],
  },
  { re: /^cl(?:an)?\s*mg\s*ammo$/, ids: (_) => [`mg-ammo`, `ammo-mg-full`] },
  {
    re: /^cl(?:an)?\s*heavy\s*machine\s*gun\s*ammo$/,
    ids: (_) => [`heavy-mg-ammo`, `heavy-machine-gun-ammo-full`],
  },
  {
    re: /^cl(?:an)?\s*light\s*machine\s*gun\s*ammo$/,
    ids: (_) => [`light-mg-ammo`, `light-machine-gun-ammo-full`],
  },
  {
    re: /^cl(?:an)?\s*ams\s*ammo$/,
    ids: (_) => [`clan-ams-ammo`, `ams-ammo`],
  },
  {
    re: /^cl(?:an)?\s*arrowiv\s*(?:cluster\s*|homing\s*)?ammo$/,
    ids: (_) => [`arrowivammo`],
  },
  {
    re: /^cl(?:an)?\s*plasmacannon\s*ammo$/,
    ids: (_) => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`],
  },
  {
    re: /^cl(?:an)?\s*plasma\s*cannon\s*ammo$/,
    ids: (_) => [`clan-plasma-cannon-ammo`, `clplasmacannonammo`],
  },
  { re: /^cl(?:an)?\s*(?:heavy\s*)?flamer\s*ammo$/, ids: (_) => [`mg-ammo`] },
  {
    re: /^cl(?:an)?\s*mediumchemlaser\s*ammo$/,
    ids: (_) => [`clan-medium-chemical-laser-ammo`],
  },
  {
    re: /^cl(?:an)?\s*protomech\s*ac[/-](\d+)\s*ammo$/,
    ids: (m) => [`clan-protomech-ac-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+lrtorpedo-(\d+)$/,
    ids: (m) => [`clan-ammo-lrtorpedo-${m[1]}`, `clan-ammo-lrm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+srtorpedo-(\d+)$/,
    ids: (m) => [`ammo-srtorpedo-${m[1]}`, `ammo-srm-${m[1]}`],
  },
  {
    re: /^cl(?:an)?\s*ammo\s+sc\s*mortar-(\d+)$/,
    ids: (m) => [`clan-sc-mortar-${m[1]}-ammo`, `is-sc-mortar-${m[1]}-ammo`],
  },
  {
    re: /^cl(?:an)?\s*imp\s*ammo\s*(?:ac|srm)(\d+)$/,
    ids: (m) => [
      `impammoac${m[1]}`,
      `impammosrm${m[1]}`,
      `climpammosrm${m[1]}`,
    ],
  },

  {
    re: /^hag[/-](\d+)\s*ammo$/,
    ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
  },
  {
    re: /^hyper-assault\s*gauss\s*rifle[/-](\d+)\s*ammo$/,
    ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
  },

  // Clan HAG ammo (CLHAG20 Ammo, etc.)
  {
    re: /^cl(?:an)?\s*hag(\d+)\s*ammo$/,
    ids: (m) => [`hag-${m[1]}-ammo`, `gauss-ammo`],
  },

  // IS Sniper/Thumper (non-cannon) ammo
  {
    re: /^(?:is\s*)?sniperammo$/,
    ids: (_) => [`snipercannonammo`, `issnipercannonammo`],
  },
  {
    re: /^(?:is\s*)?thumperammo$/,
    ids: (_) => [`thumpercannonammo`, `isthumpercannonammo`],
  },

  // IS Arrow IV with space (ISArrowIV Ammo vs ISArrowIVAmmo)
  { re: /^(?:is\s*)?arrowiv\s+ammo$/, ids: (_) => [`arrowivammo`] },
  { re: /^(?:is\s*)?arrowiv\s+homing\s*ammo$/, ids: (_) => [`arrowivammo`] },
  { re: /^(?:is\s*)?arrowiv\s+cluster\s*ammo$/, ids: (_) => [`arrowivammo`] },

  // Clan Improved LRM ammo (ClanImprovedLRM15Ammo, etc.)
  {
    re: /^cl(?:an)?\s*improved\s*lrm(\d+)\s*ammo$/,
    ids: (m) => [
      `clanimprovedlrm${m[1]}ammo`,
      `clan-improved-lrm-${m[1]}-ammo`,
    ],
  },

  // IS Heavy/Medium/Light Rifle ammo
  {
    re: /^(?:is\s*)?heavy\s*rifle\s*ammo$/,
    ids: (_) => [`heavy-rifle-ammo`],
  },
  {
    re: /^(?:is\s*)?medium\s*rifle\s*ammo$/,
    ids: (_) => [`medium-rifle-ammo`],
  },
  {
    re: /^(?:is\s*)?light\s*rifle\s*ammo$/,
    ids: (_) => [`light-rifle-ammo`],
  },

  // IS HVAC ammo
  {
    re: /^(?:is\s*)?hvac[/-](\d+)\s*ammo$/,
    ids: (m) => [`hvac-${m[1]}-ammo`],
  },

  // IS LB-X 5 (missing from some patterns)
  {
    re: /^(?:is\s*)?lbxac(\d+)\s+cl\s*ammo$/,
    ids: (m) => [`lb-${m[1]}-x-cluster-ammo`],
  },

  // IS Extended LRM ammo
  {
    re: /^(?:is\s*)?extended\s*lrm-?(\d+)\s*ammo$/,
    ids: (m) => [`ammo-extended-lrm-${m[1]}`],
  },

  // IS Enhanced LRM ammo (ISEnhancedLRM5 Ammo, etc.)
  {
    re: /^(?:is\s*)?enhanced\s*lrm(\d+)\s*ammo$/,
    ids: (m) => [`enhancedlrm${m[1]}`],
  },

  // IS SB Gauss Rifle ammo
  {
    re: /^(?:is\s*)?sb\s*gauss\s*(?:rifle\s*)?ammo$/,
    ids: (_) => [`silver-bullet-gauss`],
  },

  // IS Improved Heavy Gauss ammo
  {
    re: /^(?:is\s*)?improved\s*heavy\s*gauss\s*ammo$/,
    ids: (_) => [`improvedheavygauss`],
  },

  // IS APDS ammo (Anti-Personnel Defense System)
  { re: /^(?:is\s*)?apds\s*ammo$/, ids: (_) => [`ams-ammo`] },

  // Clan AP Gauss Rifle ammo
  {
    re: /^cl(?:an)?\s*ap\s*gauss\s*(?:rifle\s*)?ammo$/,
    ids: (_) => [`ap-gauss-ammo`, `apgaussrifle`],
  },
];
