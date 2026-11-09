/**
 * Synthetic support chassis for pinned tests: the Jifty JI-50 corpus BLK with
 * only the equipment blocks (and optionally engine code and tonnage) edited.
 * The pinned MekFileParser loads the same text, so Java values are probed from
 * the identical bytes.
 */
export const SUPPORT_HOISTS =
  'Lift Hoist/Arresting Hoist\nLift Hoist/Arresting Hoist';

export const supportChassisBlk = (
  front: string,
  rear: string = SUPPORT_HOISTS,
  engine = '0',
  tonnage = '60.0',
) => `<UnitType>
SupportTank
</UnitType>

<Name>
Heat Probe
</Name>

<Model>
HP-1
</Model>

<year>
3074
</year>

<type>
IS Level 2
</type>

<motion_type>
Tracked
</motion_type>

<transporters>
cargobay:13.0:1:1::-1:0
</transporters>

<cruiseMP>
4
</cruiseMP>

<engine_type>
${engine}
</engine_type>

<armor_type>
47
</armor_type>

<armor_tech_rating>
3
</armor_tech_rating>

<armor_tech_level>
1
</armor_tech_level>

<armor>
27
20
20
25
</armor>

<Body Equipment>
Armored Chassis
</Body Equipment>

<Front Equipment>
${front}
</Front Equipment>

<Right Equipment>
</Right Equipment>

<Left Equipment>
</Left Equipment>

<Rear Equipment>
${rear}
</Rear Equipment>

<barrating>
6
</barrating>

<structural_tech_rating>
3
</structural_tech_rating>

<engine_tech_rating>
3
</engine_tech_rating>

<tonnage>
${tonnage}
</tonnage>

<fuel>
0.0
</fuel>
`;
