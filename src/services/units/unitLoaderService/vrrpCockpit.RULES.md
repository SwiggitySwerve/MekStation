# Native VRRP cockpit projection

CockpitType owns the VRRP identity, native source tag, mass and system layout.
Loading and conversion consume that owner while retaining legacy exact/fuzzy
aliases. Append new definitions so default selection remains standard.

A converted STANDARD tag can lose a VRRP identity. Recover it only from the
complete native system signature: two head sensors without head cockpit/life
support, CT cockpit and life support, and life support at both side-torso slot0.
Keep an explicit recognized nonstandard cockpit and incomplete/absent evidence.
Normalize annotations with the existing critical-token parser.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`Mek.java:5797-5838` owns the torso/VRRP system distinction;
`TestMek.java:225-230` makes VRRP3t;
`MekCostCalculator.java:65` gives its1250000 cost.
Serialization retains the native tag already admitted by the unit schema.
