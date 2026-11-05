Split explosive mounts retain all occupied locations in penalty inputs. The
shared hasExplosiveEquipmentPenalty policy decides protection; all slots are
charged when either location is exposed. Gauss criticals with one unambiguous
represented mount share its location membership; ambiguous multiple mounts
retain the prior critical-local inputs. No CASE predicate is duplicated.
Pinned MegaMek 48fcb2f64 MekBVCalculator.java:196-198,238-250.
validate-bv-split-gauss.test.ts covers both torso layouts and protection states.
