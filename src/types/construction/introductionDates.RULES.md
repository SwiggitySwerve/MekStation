# Construction introduction dates

The component definition modules own introduction dates. Readers use their
public definition lookups; cockpit readers that need a technology side use
`getCockpitIntroductionYear`. Mixed technology takes the earliest side, as
MegaMek `48fcb2f64` `TestEntity.java:1565-1569` does.

Introduction is the first available prototype, production or common date.
An approximate prototype is five years earlier (`TechAdvancement.java:691-697,
731-734`). These facts do not enable a BattleMech date validation rule.

- Command Console: 2620 (`Mek.java:3740-3749`).
- Heavy Ferro-Fibrous: 3051 (`ArmorType.java:487-510`). Its definition and the
  existing vehicle introduction lookup share the same constant.
- Compact Gyro: 3050 (`Mek.java:3685-3694`).
- Small Cockpit: IS 3055, Clan 3080 (`Mek.java:3730-3739`).
- XL Gyro: 3050 (`Mek.java:3677-3684`).

Other definition dates retain their current scope. Enabling the mech rule
requires a fresh source-backed evaluation with no Java-valid false rejection;
it must not substitute per-unit native dates or add chassis exceptions.
