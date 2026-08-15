# Order parameters and isotropy subgroups

Background for the symmetry-lowering tools of `crystod-group`: how a complex or
pseudoreal irrep is turned into the physically irreducible real form that an
order parameter actually lives in (`--supergroup`, section 13), how the
symmetry-mode decomposition of a distorted structure is constructed
(`--supergroup-cif`, section 16), and how both are validated against the
ISOTROPY and Bilbao reference implementations.

## Complex- and pseudoreal-type irreps (doubled real form)

When the Frobenius-Schur indicator of the induced irrep vanishes (complex
type) or is -1 (pseudoreal type) — as at zone-boundary points of
non-symmorphic space groups, where the translation phases are genuinely
complex — the real order parameter transforms as the **physically
irreducible doubled real form** (the realification of D + D*), the
dimension doubles, and the output of `crystod-group --supergroup` carries
the ISOTROPY-style pair label:

```bash
crystod-group --supergroup Ia-3d --irrep P2
```

```
* Irrep *
P1P2: order parameter dimension 8 (star of 2 arm(s) x small dim 2 x 2; complex-type irrep -> physically irreducible real form)

* Order parameter directions and isotropy subgroups *
irrep                                               subgroup           size  index
P1P2(a,a,b,b;-a,a,-b,b)                             23 I222            4     48
P1P2(a,-a,b,-b;a,a,b,b)                             24 I2_12_12_1      4     48
P1P2(0,0,0,0;0,a,0,b)                               82 I-4             4     48
P1P2(2a,2b,2c,2d;a+b-c+d,a+b+c-d,a-b+c+d,-a+b+c+d)  2 P-1              4     96
P1P2(0,a,0,b;c,d,d,-c)                              5 C2               4     96
P1P2(a,b,c,d;-a,b,-c,d)                             5 C2               4     96
P1P2(a,b,c,d;e,f,g,h)                               1 P1               4     192
```

+k/-k pairs whose -k star is tabulated separately pair across the stars
(I-42d `P1` -> `P1PA1`, P3 `H1` -> `H1HA1`); conjugate-gauge and
origin-choice tabulations are matched automatically, and real-type irreps
whose induced matrices are complex (P3 of Ia-3d) are realified exactly
through the antilinear real structure of the group-averaged intertwiner.

## Symmetry-mode analysis: algorithm internals and AMPLIMODES validation

In the symmetry-mode analysis of `crystod-group --supergroup-cif`
(section 16 of the `crystod-group` page), the direction and
isotropy-subgroup columns are computed with the same induced-irrep
machinery as `crystod-group --supergroup` (the isotropy-subgroup
construction described on this page),
non-invariant subgroup lattices are enlarged to the largest
parent-invariant sublattice (complete k stars, exact amplitude rescaling),
polar subgroups get the minimum-distortion origin (acoustic component
removed), the lattice matching tolerates strong relaxation (principal
strains up to 20%), and a projector-completeness check closes every run.
Validated against the Bilbao AMPLIMODES output (SrTiO3 Pm-3m -> I4/mcm:
R5- 0.3303 A; F-centred ZrO2 Fm-3m -> P4_2/nmc: X2- 0.5773 A), the
ferroelectric BaTiO3 -> P4mm and large-tilt AlF3 -> R-3c cases, and the
modulation structures of `crystod-phonon --modulation` (section 25). If you
use this feature, please cite:
D. Orobengoa, C. Capillas, M. I. Aroyo and J. M. Perez-Mato, "AMPLIMODES:
symmetry-mode analysis on the Bilbao Crystallographic Server",
J. Appl. Cryst. 42, 820-833 (2009).

## Validation of `crystod-group --supergroup` against ISOSUBGROUP

`crystod-group --supergroup` is the offline counterpart of **ISOSUBGROUP**
of the ISOTROPY Software Suite (https://iso.byu.edu), and is validated
against it exhaustively: a
sweep over the 910 downloaded ISOSUBGROUP tables in `SUBGROUP/` (space
groups 16-230, every parameter-free high-symmetry k point — 3535 irreps;
`script/validate_isosubgroup.py`) reproduces the complete (subgroup, size,
index) multiset of every strata table, 3533 of 3535 irreps agreeing (25 up
to the enantiomorphic partner — a representative choice within one stratum
orbit — and 44 up to a verified irrep-label difference between the ISO-IR
data files used by crystod and the ISOTROPY/ISOSUBGROUP software, recorded
in `SUBGROUP/VALIDATION.md` and printed as a note under the output whenever
an affected irrep or an enantiomorphic subgroup appears); the only
exceptions are the W point of Ibca (spgrep cannot construct its pseudoreal
small irreps) and the rhombohedral L star of R-3m, whose reference table is
built on a 6-dimensional `L1` with no one-to-one counterpart among the
crystod `L1+`/`L1-` irreps (dimension 3 each). If you use this feature,
please cite: H. T. Stokes,
S. van Orden and B. J. Campbell, "Tool for Generating Isotropy Subgroups of
Crystallographic Space Groups", J. Appl. Cryst. 49, 1849-1853 (2016).
