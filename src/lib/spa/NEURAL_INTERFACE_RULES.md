# Neural-interface activity

Public owner: `@/lib/spa/neuralInterface`. This pure SPA-domain module owns DNI
implant membership and native activation policy. Unit-quirk penalties remain
with `quirkModifiers`; this module neither creates nor suppresses a quirk.

At MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- [Entity.java:13365](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L13365)
  defines DNI membership as VDNI, Buffered VDNI or Prototype DNI. EI alone does
  not qualify. Buffered VDNI remains active DNI even without piloting relief.
- [Entity.java:13378](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L13378)
  delegates activity to the neural mode and DNI cockpit hardware.
- [NeuralInterfaceMode.java:102](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/enums/NeuralInterfaceMode.java#L102)
  trims stored mode values; absent, blank and unrecognized values mean Off.
  `grantsBenefit` at line151 requires an implant, with hardware additionally
  required in Full Tracking. Pilot Abilities Only needs no hardware.
- [Entity.java:8941](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L8941)
  applies Hard Pilot only when DNI is inactive. Its quirk and induced-quirk rules
  belong to Q-gaps, which must consume the verified activity contract.

`hasDNIImplant` uses the existing canonical SPA identity projection.
`hasActiveDNI` takes explicit native `mode` and `hasDNICockpitMod`; missing mode
means Off. It cannot reconstruct those inputs from a pilot ability or PSR bonus.

`hasRepresentedActiveDNI` is the separately named compatibility adapter for
existing combat `neuralInterfaceActive`: explicit false disables the interface;
absent preserves the existing implicit-active convention. An implant is still
required. Existing ranged and piloting modifier values and precedence stay intact.
This adapter does not establish native mode/hardware parity.

Current PSR transport carries SPA ids and the represented flag, but no native
mode/hardware inputs. Full native quirk integration needs that producer contract;
do not label it ready from the adapter, a catalog entry or a zero piloting bonus.
