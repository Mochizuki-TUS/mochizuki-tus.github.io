# Order parameters and isotropy subgroups

Background for the symmetry-lowering tools of `crystod-group`: how a complex or
pseudoreal irrep is turned into the physically irreducible real form that an
order parameter actually lives in (`--parent`, section 02-10), how the reverse
lookup (`--child`, section 02-12) and the group-subgroup graph (`--graph`,
section 02-13) are built, how the symmetry-mode decomposition of a distorted
structure is constructed (`--supergroup-cif`, section 02-16), and how all of them
are validated against the ISOTROPY and Bilbao reference implementations. The
same machinery serves the daughter structures of `crystod-phonon --subgroup
--modulate` (section 04-11) and the magnetic isotropy subgroups of
`crystod-mag --parent` (section 05-04), which close the page.

## Isotropy subgroup of an order-parameter direction (`crystod-group --parent`)

*Command:* `crystod-group --parent` — [02-10. Isotropy subgroups](crystod-group.md#02-10-isotropy-subgroups---parent)

What the subgroup that `--parent` prints for an order-parameter direction is,
and which pair labels the partner rule gives.

When a distortion transforming as an irrep condenses, the symmetry drops from
the parent group to the **isotropy subgroup** H(eta) = {g : D(g) eta = eta},
which depends on the order-parameter direction eta.

For a complex- or pseudoreal-type irrep, taking as the partner of the pair
label the irrep with the same real form on every group element, lattice
translations included (see
[Complex- and pseudoreal-type irreps (doubled real form)](#complex--and-pseudoreal-type-irreps-doubled-real-form)),
gives the pair labels of the ISOSUBGROUP tables (`K2KA2` and `K3KA3` at K of
P3, `H3H6` and `H4H5` at H of P6_3/m).

## Complex- and pseudoreal-type irreps (doubled real form)

When the Frobenius-Schur indicator of the induced irrep vanishes (complex
type) or is -1 (pseudoreal type) — as at zone-boundary points of
non-symmorphic space groups, where the translation phases are genuinely
complex — the real order parameter transforms as the **physically
irreducible doubled real form** (the realification of D + D*), the
dimension doubles, and the output of `crystod-group --parent` carries
the ISOTROPY-style pair label:

```bash
crystod-group --parent Ia-3d --irrep P2
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

The partner named in the pair label is the tabulated irrep whose real form
is the same representation: the one with the same real part of the character
on every group element, lattice translations included. The characters of the
coset representatives alone do not decide it — at H of P6_3/m, P of I4/mcm
or K of P3 several irreps share them and differ only on the translations.
+k/-k pairs whose -k star is tabulated separately pair across the stars
(I-42d `P1` -> `P1PA1`, P3 `H1` -> `H1HA1`); conjugate-gauge and
origin-choice tabulations are matched automatically, and real-type irreps
whose induced matrices are complex (P3 of Ia-3d) are realified exactly
through the antilinear real structure of the group-averaged intertwiner.

## Reverse lookup of isotropy subgroups: coupled pairs and enantiomorphs (`crystod-group --child`)

*Command:* `crystod-group --parent SG --child H` — [02-12. Reverse lookup](crystod-group.md#02-12-reverse-lookup---child)

How `--child --coupled` searches the pairs of irreps, and why an
enantiomorphic partner type counts as a match in some parents and not in
others.

### How `crystod-group --child` searches the coupled pairs

Every isotropy subgroup of a coupled order parameter is `S1 & S2'`, with `S1`
the isotropy subgroup of a single stratum of the first irrep (the
representative of the table) and `S2'` any conjugate of one of the second,
and its fixed space is the sum of the fixed spaces in the two irreps. The
single strata of the cached table are the candidates; only irreps with a
stratum whose point group has an order divisible by that of H take part (and,
with `--size` and `--index`, whose size and index divide the requested ones),
and a candidate is identified with spglib only after its point group and cell
size match.

### Enantiomorphic partner types in the reverse lookup

In a parent with improper operations, the two members of an enantiomorphic
pair (P4_122/P4_322, P4_132/P4_332, ...) are stabilizers of order parameters
of one stratum related by an improper operation of the parent, so either may
be listed (section 02-10 of `crystod-group`). A stratum whose listed type is the
partner of H then counts as a match, and a `note:` names those rows.

A Sohncke parent (no improper operation, e.g. P4_222 or P3_1) is different:
there the two types are different, non-conjugate subgroups from
different strata, only rows of type H itself are listed and no note is
printed (`--parent P4_222 --child P4_122` gives `Z1` and `Z3`, while `Z2` and
`Z4` give P4_322, as in ISOSUBGROUP).

## Group-subgroup graphs of isotropy subgroups (`crystod-group --graph`)

*Command:* `crystod-group --parent SG --irrep IR [IR2 ...] --graph` — [02-13. Group-subgroup graph](crystod-group.md#02-13-group-subgroup-graph---graph)

When `--graph` joins two isotropy subgroups, and how the graph of the two
perovskite tilts R4+ and M3+ of Pm-3m compares with the tilt systems of
Howard and Stokes.

The group theory: a line joins two isotropy subgroups when one is a maximal
subgroup of a conjugate of the other among the nodes.

The 15 tilt systems of Howard and Stokes (a0a0a0 Pm-3m, a+a+a+ Im-3, a+b+c+
Immm, a0a0c+ P4/mbm, a0b+b+ I4/mmm, a0a0c- I4/mcm, a0b-b- Imma, a-a-a- R-3c,
a0b-c- C2/m, a-b-b- C2/c, a-b-c- P-1, a+a+c- P4_2/nmc, a0b+c- Cmcm, a+b-b-
Pnma, a+b-c- P2_1/m) are 15 of the 25 nodes, and the lines of the graph among
them are the 25 group-subgroup relations that their Fig. 1 draws (the
testsuite derives this list independently from the Glazer patterns of their
Table 1, by setting tilts equal or zero). The other ten nodes are
the strata in which one axis carries an in-phase and an out-of-phase tilt at
once (R-3, P2_1/c, Pmmn, and second embeddings of P4/mbm, Cmcm, C2/m, C2/c,
P2_1/m and P-1), which the tilt classification leaves out; the generic
P-1 with cell size 8 is the kernel.

## Symmetry-mode analysis: algorithm internals and AMPLIMODES validation

In the symmetry-mode analysis of `crystod-group --supergroup-cif`
(section 02-16 of the `crystod-group` page), the direction and
isotropy-subgroup columns are computed with the same induced-irrep
machinery as `crystod-group --parent` (the isotropy-subgroup
construction described on this page),
non-invariant subgroup lattices are enlarged to the largest
parent-invariant sublattice (complete k stars, exact amplitude rescaling),
polar subgroups get the minimum-distortion origin (acoustic component
removed), the lattice matching tolerates strong relaxation (principal
strains up to 20%), and a projector-completeness check closes every run.
The direction column names each mode by the ISOTROPY representative of its
stratum (the row that `--parent` lists), with one parent operation applied
to all modes so that the rows describe one domain of the child; the
direction of the child as given is named in a note under the table and is
`domain_label` in Python.
Validated against the Bilbao AMPLIMODES output (SrTiO3 Pm-3m -> I4/mcm:
R5- 0.3303 A; F-centred ZrO2 Fm-3m -> P4_2/nmc: X2- 0.5773 A), the
ferroelectric BaTiO3 -> P4mm and large-tilt AlF3 -> R-3c cases, and the
modulation structures of `crystod-phonon --modulation` (section 04-07). If you
use this feature, please cite:
D. Orobengoa, C. Capillas, M. I. Aroyo and J. M. Perez-Mato, "AMPLIMODES:
symmetry-mode analysis on the Bilbao Crystallographic Server",
J. Appl. Cryst. 42, 820-833 (2009).

### The atom mapping and its group-subgroup setting

Both structures are standardized by spglib, and the parent is expressed in
the primitive setting of the ISO-IR tables. The child primitive basis is
written as an integer matrix S over the parent primitive basis (rows; det S
is the cell multiplication), and the child atoms are placed at
x = Sᵀ x_child + p for an origin shift p. The first mapping is the one of
least total distortion Σ|u|² over the candidate matrices S (principal
strains up to 20%), each with a greedy nearest-site pairing and a
continuous origin refinement; a tie between settings that a symmetric
parent makes equivalent goes to the one closest to the orientation of the
input files.

That minimum is not necessarily a **group-subgroup setting**. The child is
idealized by spglib, so in a correct (S, p) every child operation (R, τ)
becomes a parent operation (W, v) with W = Sᵀ R S⁻ᵀ and an exact
translation part, and the subgroup H is the set of parent operations that
leave the mapped structure invariant to machine precision (10⁻⁸ Å). A
strained twin setting or a shifted origin can pair the atoms marginally
better while some child rotation is not a parent rotation in it, or an
origin can match the rotations but not the screw and glide translations;
then fewer operations are exact than the child's own group has, and
thresholding the spectrum of near-misses accepts pseudo-operations. The
mapping is therefore validated before the decomposition: (a) at least as
many exact operations as the child group has, (b) every child operation,
carried over by S and p, among them, and (c) a displacement field invariant
under them to machine precision, |u(gx) − R_g u(x)| ≤ 10⁻⁶ Å (a pairing can
break the symmetry of an invariant structure by exchanging atoms, and then
does so by an interatomic distance). None of the three depends on
`--tolerance`, which only sets how spglib identifies the two space groups.

A mapping that fails either test is redone in a group-subgroup setting:

1. **Sublattice.** Only the bases S in which Sᵀ R S⁻ᵀ is the rotation of a
   parent operation for every child rotation R are kept.
2. **Origin.** The translation parts give a congruence system
   (I − W_k) p ≡ v_k − Sᵀ τ_k (mod ℤ³) over the child operations. Stacking
   the matrices I − W_k and reducing them to diagonal form (U A V = D, U
   and V unimodular) yields every solution class modulo ℤ³ and the free
   (polar) directions; a nonzero residual of the compatibility conditions
   means that the translation parts fit no origin, so the child group is
   not a subgroup of the parent in that setting. Along polar directions the
   origin is not fixed by symmetry: the first child atom of every species
   is put level with each reference atom of its species, through the
   lattice image whose non-polar remainder is shortest, and each start is
   refined twice by the polar part of the mean displacement (the
   AMPLIMODES minimum-distortion origin).
3. **Pairing.** At each origin the atoms are paired by the optimal
   assignment per species (minimum image, at most 1.8 Å per atom). It is
   accepted only if the field it gives is invariant under the conjugated
   child operations; otherwise the reference is paired orbit by orbit with
   child atoms of the same stabilizer, the rest of each orbit following by
   symmetry, and a child atom half a lattice vector from its site (whose
   displacement the site symmetry fixes only modulo the lattice) is
   rejected. A parent operation kept by the child that fixes a different
   number of sites of one species in the reference and in the child (a
   Wyckoff conflict) excludes every symmetric pairing at that origin.
4. **Choice and members.** Among the valid (S, p) the least Σ|u|² wins
   (ties: the orientation rule above). The subgroup members are the child
   operations themselves, plus any parent operation that leaves both the
   structure and the field exactly invariant (the strain-only part of a
   ferroelastic lowering), and the structure and the field must be
   invariant under all of them to machine precision before the
   decomposition starts.

When no valid (S, p) exists the run stops with the reason: no sublattice
carries the child point group, the translation parts are incompatible,
every setting has a Wyckoff conflict, or no symmetric pairing stays within
1.8 Å. On a survey of materials-database structure pairs this step resolves
25 of the 32 pairs that a projection without it reports as "the distortion
is not fully captured" (7 stop with a specific error), and 66 of the 106
that it reports as "cannot separate the surviving from the broken parent
operations" (40 stop with a specific error). For every solved pair the
reference plus the displacement field has exactly the child's space group
(spglib, 10⁻³ Å). Since the displacement field is invariant under H, the final completeness check (the listed modes sum to
the whole field) can only fail on an internal inconsistency.

### Complex-type irreps: the D + D* projector

The displacement representation is decomposed star by star. For an induced
irrep τ of dimension d_τ, the isotypic projector over the star block is
P_τ = (d_τ/|G|) Σ_g χ_τ(g)* D(g), with the characters split per star arm
so that lattice translations enter as phases. A real displacement field u
has conjugate Fourier components on the arms k and −k, and for a
**complex-type** τ (Frobenius-Schur indicator 0) the conjugate irrep τ* is a
different irrep: the physically irreducible real representation is
ρ = τ ⊕ τ*, of real dimension 2 d_τ, with the real projector

  P_ρ = P_τ + P_τ*,

reported as one mode whose amplitude is |P_ρ u| and whose number of
independent modes is tr(P_ρ P_H). On a star that contains its −k arms, P_τ*
is the complex conjugate of P_τ with the arms k and −k exchanged; on a star
without them, P_τ* lives on the −k star, the projected field is
2 Re(P_τ û) and the mode count 2 Re tr(P_τ P_H), and the −k partner is not
listed again. The partner is recognized from the conjugate per-arm
characters, independently of the labels; the line carries both labels
(`GM2+GM3+`). A **pseudoreal** τ (indicator −1) is equivalent to its
conjugate, P_τ is already real, and the single name stays; a real-type τ
keeps the real part (P_τ + P_τ*)/2 = P_τ as before. In general
P_ρ = dim ρ/(e |G|) Σ_g χ_ρ(g) D(g) with e = 1, 2, 4 for real, complex
and pseudoreal type. The squared amplitudes of all lines add up to the
squared total distortion.

## Symmetry-mode analysis: settings, domains and comparison with AMPLIMODES (`crystod-group --supergroup-cif`)

*Command:* `crystod-group --supergroup-cif` — [02-16. Symmetry-mode analysis](crystod-group.md#02-16-symmetry-mode-analysis---supergroup-cif)

Which of the equivalent settings and order-parameter directions the mode
table of `--supergroup-cif` reports, how modes at non-special k points and
complex-type pairs are checked, and which differences from AMPLIMODES and
ISODISTORT are conventions. The examples (SrTiO3 Pm-3m -> I4/mcm, La3Ni2O7
I4/mmm -> Cmcm, PbZrO3 Pm-3m -> Pbam, K2SeO4 Pnma -> Pna2₁, FeS2 Pa-3) are
those of the command page.

### Transformation matrix of the symmetry-mode analysis and AMPLIMODES

The `* Transformation matrix (parent -> child) *` block uses the convention of
AMPLIMODES and of the International Tables: the columns of `P` are the child
conventional basis vectors in units of the parent conventional basis,
`(a', b', c') = (a, b, c) P`, and the last column is the child origin `p` in
parent fractional coordinates, so that a point with child coordinates `x'`
sits at `x = P x' + p` in the parent cell.

The child basis of the `* Transformation matrix (parent -> child) *` block is
the sublattice setting the analysis uses, the one closest to the orientation
of the input files among the equivalent ones, so the matrix can differ from
the AMPLIMODES one by a point operation of the parent (for SrTiO3 Pm-3m ->
I4/mcm it is exactly the AMPLIMODES matrix,
`[[1, 1, 0], [-1, 1, 0], [0, 0, 2]]` with origin `(1/2, 1/2, 1/2)`; for a
polar subgroup the origin along the polar direction is the one that minimizes
the distortion, as in AMPLIMODES).

### Which equivalent sublattice setting the symmetry-mode analysis reports

A symmetric parent leaves the sublattice basis degenerate: every basis S·W (W
a point operation of the parent) pairs the atoms equally well and merely
presents the *same* distortion in a rotated setting — 24 of them for a cubic
parent. CrystOD picks the one whose child axes are rotated least against the
parent axes, both lattices taken as the input files orient them (a CIF is
placed with *c* along *z* and *a* in the *xz* plane; a POSCAR keeps its
lattice vectors as written), so the displacement table and the per-irrep
VESTA files follow the axes of the subgroup file: PbTiO3 P4mm polarized along
*c* is shown polarized along *c* of the cubic cell, not along *b*, and a
POSCAR whose polar axis lies along Cartesian *y* comes out along *b*. When no
setting aligns the axes — standard settings that permute them, a √2×√2 cell,
a rhombohedral child in its hexagonal setting — the residual rotation is
printed with the cell relation, as in the La3Ni2O7 example of the command
page (Cmcm puts the long axis first: 90° plus the 45° in-plane rotation of
the √2 cell). Irrep, isotropy subgroup, number of modes and amplitude do not
depend on the setting, and neither does the direction column (next section).

### Which order-parameter direction the symmetry-mode table prints

The irreps of `--supergroup-cif` are labelled with the ISO-IR tables of
ISOTROPY, and the direction column follows ISOTROPY as well: it names each
order parameter by the ISOTROPY representative of its stratum, the row that
`crystod-group --parent SG --irrep IR` (section 02-10) and ISOSUBGROUP list for
that isotropy subgroup (for an irrep at a non-special k point, which these
tables do not list, the simplest direction of the stratum), whichever of the
domain-equivalent orientations the child file describes. When the child as
given sits on another direction of the same stratum (a parent operation
carries one onto the other), a `(direction: ...)` note under the table names
it; the note is saved in `sym_mode_<formula>` with the table. The SrTiO3
child of the command page sits on `R5-(a,0,0)`, and the table prints
`R5-(0,0,a)`, the I4/mcm row of `--parent Pm-3m --irrep R5-`. V2O3 R-3c ->
C2/c is the same case for a two-dimensional irrep (its structures are in
`debug9_V2O3/` of the example directory `example/02-16_symmetry_mode`, which is
not in the pip package):

```bash
crystod-group --supergroup-cif debug9_V2O3/POSCAR_V2O3_R-3c.cif --subgroup-cif debug9_V2O3/POSCAR_V2O3_C2c.cif --conventional
```

```
* Transformation matrix (parent -> child) *
R-3c (No. 167) -> C2/c (No. 15), conventional settings of the input files
  [     1     1  -1/3 ] [   1/3 ]
  [    -1     1   1/3 ] [   1/6 ]
  [     0     0   1/3 ] [   1/6 ]
(columns of P: the child basis vectors a', b', c' in parent units, (a', b', c') = (a, b, c) P;
 last column: the child origin p in parent fractional coordinates, x_parent = P x_child + p;
 the AMPLIMODES / Bilbao convention)

* Symmetry-mode decomposition *
k-vector         irrep   direction    isotropy subgroup   dim  amplitude (A)
(0,0,0)          GM1+    (a)          167 R-3c            2    0.0425
(0,0,0)          GM3+    (a,0)        15 C2/c             5    0.1222
(direction: GM3+ sits on its ISOTROPY representative as listed by
 crystod-group --parent 167 --irrep GM3+; the input child as given sits on the
 domain-equivalent direction GM3+ (0.577a,-a))
```

`GM3+(a,0)` is the C2/c row of `crystod-group --parent R-3c --irrep GM3+`;
the child file is the monoclinic domain `(0.577a,-a)` of the same stratum.
Only the label is moved to the representative: the cell relation, the
transformation matrix (P, p) above, the displacement table, the normalized
mode components and the VESTA files keep describing the child as given, in
the setting closest to the input files, and the number of modes and the
amplitude are the same for every domain. When the child already sits on the
representative, as the La3Ni2O7 child of the command page does, no note is
printed.

With several irreps the rows have to describe one domain together, so one
parent operation moves all of them: the largest mode that has
domain-equivalent directions is put on its `--parent` row, and each smaller
mode, in order of decreasing amplitude, on the simplest direction left to it
in that domain. A secondary mode can therefore read differently from its own
`--parent` row; the note then names the deciding mode and the
representatives of the other strata on their own. The Pbnm perovskite
(`POSCAR_ScF3_Pbnm` and the CaTiO3 pair of `example/02-16_symmetry_mode`)
prints `R4+(0,a,a)`, the Imma row of `--parent Pm-3m --irrep R4+`, with
`M3+(a;0;0)`, as in the coupled row `R4+(0,a,a) M3+(d;0;0)` (Pnma) of
`--parent Pm-3m --irrep R4+ M3+`, although M3+ on its own is tabulated as
`M3+(0;0;a)`. The isotropy-subgroup column is that of the direction the
child as given sits on in that irrep (74 Imma for R4+ of a Pnma child),
conjugate to the subgroup of the direction shown: the same type and index,
except for a child on the mirror-image domain of a stratum of an
enantiomorphic type (P4_32_12 for a row tabulated as P4_12_12), whose
partner type the note names. In Python, each entry of
`SymmetryModeAnalysis(...).modes` returns the printed direction, subgroup
and index from `label_info()`; `domain_label` is the direction of the child
as given and `representative_label` the representative of its stratum on
its own.

### Symmetry modes at non-special k points: gauge and AMPLIMODES agreement

For the PbZrO3 antiferroelectric (Pm-3m -> Pbam, with modes at the Sigma
point (1/4,1/4,0) and the S point (1/4,1/2,1/4)), every number agrees with
the Bilbao AMPLIMODES reference — the dominant
antipolar Pb mode `SM2` (1.2871 Å) and the octahedral tilt `R4+`
(1.5232 Å), with the secondary `S4`, `R5+`, `X3-` and `M5-` — including
each mode's isotropy subgroup. The command does not re-measure the
subgroups: testsuite section 02-16 freezes each single-mode displacement field
of this example into the parent structure and checks with spglib that it
measures as the isotropy subgroup in the table. The `(direction: ...)` note
is the one of *Which order-parameter direction the symmetry-mode table
prints* above: R4+, the
largest mode, sits on its `--parent Pm-3m --irrep R4+` row and fixes the
domain in which the other rows are written. Small irreps at such points are computed with spgrep at the exact
k and named/represented through the bundled ISO-IR tables (SM2, S4, ...);
since the ISOTROPY *web* tables fix their order-parameter axes with a phase
gauge that is not part of the bundled data, the direction *pattern* of a
line mode may differ from ISOSUBGROUP's while the subgroup, dimension and
amplitude — gauge-independent quantities — always agree.

The K2SeO4 lock-in ferroelectric (Pnma -> Pna2₁ at 3x the cell along *a*,
SM = (1/3,0,0)) again matches AMPLIMODES entry by entry (including the polar
`GM4-` that carries the spontaneous polarization of the lock-in phase).

### Symmetry-mode conventions that differ from AMPLIMODES and ISODISTORT

The physically meaningful columns — which irreps are active, their k-vectors,
isotropy subgroups, dimensions and amplitudes — reproduce AMPLIMODES and
ISODISTORT case for case. Four things can legitimately read differently, and
none of them is a disagreement about the distortion:

- **The origin of a polar subgroup is free**, so the amplitude of a polar
  irrep depends on where it is pinned. CrystOD places it at the minimum of
  the total distortion (the AMPLIMODES convention) and prints a `note: the
  subgroup is polar` line when it does. ISODISTORT pins the first orbit
  instead, which typically leaves its polar amplitude larger by exactly the
  removed rigid translation: the two differ by that translation and nothing
  else, so every other irrep is untouched.
- **Parity superscripts of a k ≠ 0 irrep depend on the parent's origin.**
  Two descriptions of the same crystal related by a translation that is in
  the Euclidean normalizer but not in the space group (rutile VO₂ with the
  metal at 2a rather than 2b) give the same subgroup and the same amplitude,
  but swap `R1+` and `R1-`.
- **The k-vector is printed in the parent's primitive basis**, while Bilbao
  quotes the conventional one. For a C-centred monoclinic parent the M point
  reads `(1/2,1/2,1/2)` here and `(0,1,1/2)` there — the same point.
- **Order-parameter directions are those of ISOTROPY.** The direction
  column is written in the basis of the bundled ISO-IR tables and names each
  stratum by its ISOTROPY representative, the row of `crystod-group --parent`
  and of ISOSUBGROUP, whatever domain the child file describes (the note
  under the table names that domain). AMPLIMODES gives the direction of the
  domain its transformation matrix describes, in the basis of the Bilbao
  representation matrices, so the letter pattern can differ (`(a,-a,-a)`
  against `(a,a,a)`) while naming the same stratum: for V2O3 R-3c -> C2/c
  AMPLIMODES prints `GM3+ (-0.500a,0.866a)`, where CrystOD prints
  `GM3+ (a,0)` and names the input domain `(0.577a,-a)` in the note. The
  isotropy subgroup column, which is basis-independent, is the one to
  compare.

### Complex-type mode pairs: the isotropy-subgroup check

A complex-type irrep and its complex conjugate are listed by
`--supergroup-cif` on one line because a real displacement field always
carries the two together, with conjugate coefficients, so they form one
physically irreducible order parameter (the D + D* projector above).

In the FeS2 (Pa-3) example, whose folding stars Γ and R carry complex-type
pairs, the squared amplitudes add up to the squared total distortion
(0.2540 Å), and freezing a pair's projected field into the parent gives
exactly the isotropy subgroup of its line.

### Group-subgroup remapping: acceptance and effect on earlier analyses

`--tolerance` (the spglib symmetry tolerance in Å, default 0.01 for
`--supergroup-cif`) enters the mapping checks only through the space groups
spglib identifies in the two files; it is not a threshold of the mapping. A
mapping is accepted when the child operations leave the mapped structure and
the displacement field invariant to machine precision (10⁻⁶ Å): spglib
idealizes the child, so a symmetric pairing always passes, and a pairing that
exchanges atoms breaks the symmetry by an interatomic distance, however weak
the distortion.

Analyses whose least-distortion mapping already is a group-subgroup setting
are not affected by the remapping (the NOTE line of the cell relation): on
2938 structure pairs of a materials survey and on the earlier inputs of
testsuite section 02-16 the cell relation, the displacements, the mode table and
the total are the same as without this step.

## Matching the order-parameter directions of imaginary phonon modes (`crystod-phonon --subgroup --modulate`)

*Command:* `crystod-phonon --subgroup --modulate` — [Generating the daughter structures](crystod-phonon.md#generating-the-daughter-structures---modulate)

How `crystod-phonon --subgroup --modulate` finds, for every order-parameter
direction of the isotropy-subgroup table of an imaginary phonon level, the
combination of degenerate modes (and of star arms) that realizes it, and why
some directions end up as a note instead of a structure file.

Which combination of the degenerate modes realizes which direction is not fixed
by any convention CrystOD could assume, so it is **measured, not assumed**:
candidate combinations are generated (all with positive coefficients first,
then the same ones with sign changes, which directions such as
`N1+(a;-a;a;a)` need), the space group of each generated
structure is determined with spglib, and the (space group, cell size, index)
triple is matched against the enumerated table. When two directions of one
irrep share that triple — `R5+` of Pm-3m puts both `(0,a,b)` and `(a,a,b)` at
C2/m, size 2, index 24 — the conventional cell metric separates them, so a
domain of one is never written out under the other's name, and the pattern of
zero and equal components decides which label a structure takes.

A direction that no candidate reproduces is **reported**, never guessed at
(the `note: no candidate reproduced ...; generate it with --modulation by
hand.` line of the command page). Every enumerated row therefore ends up either
as a file or as a note. The directions that need a note belong to large order
parameters (a multi-arm star times a degenerate level), where the candidate
search is cut off before it reaches them — not only low-symmetry ones: for X5-
of cubic ScF3 (three arms times a pair) the six-component directions such as
`X5-(a,a;a,a;a,a)` (R-3c) are among them.

## Validation of `crystod-group --parent` against ISOSUBGROUP

`crystod-group --parent` is the offline counterpart of **ISOSUBGROUP**
of the ISOTROPY Software Suite (https://iso.byu.edu), and is validated
against every reference table at hand: a
sweep over the 910 downloaded ISOSUBGROUP tables in `SUBGROUP/` (space
groups 62-230, every parameter-free high-symmetry k point — 3535 irreps;
`script/validate_isosubgroup.py 62 230`) reproduces the complete (subgroup,
size, index) multiset of every strata table under the same irrep label:
3506 irreps agree exactly and 28 up to the enantiomorphic partner (a
representative choice within one stratum orbit, printed as a note under the
output whenever an enantiomorphic subgroup appears); no table agrees only
under another label, so no label note is printed (results in
`SUBGROUP/VALIDATION.md`; the last full sweep ran on 2026-10-05 with v0.4.3
and took about 32 minutes). The one irrep of the 3535 not compared is the
six-dimensional L1 in the reference table of R-3m (No. 166) at L: the file
`SUBGROUP_SG166_L.txt` holds the L table of R-3c (No. 167), so it lists an
irrep that R-3m does not have (the L irreps of R-3m are L1+, L2+, L1- and
L2-, which `--parent 166 --kpoint L` enumerates). Four reference files hold
no result rows (SG 167 at F and GM, SG 207 at M and X), so those irreps are
not compared and are not counted in the 3535, and there are no reference tables for space groups 1-61.
If you use this feature,
please cite: H. T. Stokes,
S. van Orden and B. J. Campbell, "Tool for Generating Isotropy Subgroups of
Crystallographic Space Groups", J. Appl. Cryst. 49, 1849-1853 (2016).

## Magnetic isotropy subgroups (`crystod-mag --parent`)

*Command:* `crystod-mag --parent SG --qpoint K` — [05-04. Magnetic isotropy subgroups](crystod-mag.md#05-04-magnetic-isotropy-subgroups---parent)

Which magnetic space group a magnetic order of one irrep gives — the magnetic
counterpart of the isotropy subgroups of `crystod-group --parent` — and how
`crystod-mag --parent` identifies these groups and was validated against the
tables of the ISOTROPY Software Suite.

### The magnetic isotropy subgroup of a time-odd order parameter

The paramagnetic phase has the grey group G1' = G + θG, and a magnetic order
that transforms as one irrep lowers it to the magnetic isotropy subgroup

    H(η) = { g ∈ G : D(g) η = η } + { θg : D(g) η = −η }.

A moment is odd under time reversal, so θ acts as −1 on the order parameter
(the irrep is ISOTROPY's *m*GM4+; it is printed without the `m`, as everywhere
in `crystod-mag`).

In Pm-3m at Γ (`crystod-mag --parent Pm-3m --qpoint GM`), GM4+ is the
ferromagnet: moments along a cube axis give P4/mm'm', along [111] R-3m',
along [110] Cmm'm'. Because θ acts as −1, the group acting on the order
parameter is D(G) together with −D(G), and its strata include directions
that the structural table does not have: moments in a (100) plane (P2'/m')
or a (110) plane (C2'/m') are the general direction P-1 of
`crystod-group --parent Pm-3m --irrep GM4+`. The index [G1' : H] is the
number of magnetic domains (6 for P4/mm'm': ±x, ±y, ±z). At a k point off Γ
the subgroups are of type IV wherever a translation reverses the order
parameter (R4+ of Pm-3m: `I_c4/mcm`, `R_I-3c`, ...).

### How crystod-mag identifies the magnetic isotropy subgroups

Each stabilizer is turned into a
structure of two generic orbits with generic moments and identified by
spglib, and the number of operations spglib finds must equal that of the
stabilizer. spglib's name is also checked against the type (from the
operations) and the space groups of the unitary operations and of all
operations: the BNS number begins with the family group for types I-III and
with the unitary group for type IV. spglib 2.x cannot name three type IV
groups, 37.184 `C_ccc2`, 37.185 `C_acc2` and 37.186 `C_Acc2` (unitary group
Ccc2): its database holds operations of type Cmc2_1 for two of them, so it
returned 36.177 or 36.179 or nothing. They are named from their unitary and
family groups (`Ccc2.1'_c[Cmm2]`, `Ccc2.1'_a[Pcc2]`, `Ccc2.1'_A[Fmm2]`). The
same check runs inside `mag.magnetic_space_group`, so `crystod-mag --qpoint`
names these three groups correctly as well.

### Order-parameter directions of the spin bases (`crystod-mag --qpoint`)

*Command:* `crystod-mag -c POSCAR --element EL --qpoint K` — [05-06. Order-parameter directions of the spin bases](crystod-mag.md#05-06-order-parameter-directions-of-the-spin-bases)

A spin basis of `crystod-mag --qpoint` at q ≠ 0 is a real field over the
magnetic cell, S_j(T) = Re[η w_j exp(2πi q·T)]. At a q that is not
time-reversal invariant the amplitude η of a d-dimensional copy is complex,
so the real order-parameter space of the copy is spanned by the 2d fields of
the rows w_k and i w_k (for the one-dimensional K3 of YMnO3 in P6_3/mmc: a rotation of the
Mn moments of one layer by +δ and of the other by −δ as the phase turns).
The operations of the crystal that take q to +q or −q, combined with the
translations of the magnetic cell and with θ (−1 on the fields), act on that
space by orthogonal matrices (the operations taking q to another arm leave
it); its strata are enumerated as for `crystod-mag --parent`, by the closure
of the fixed spaces under intersection, keeping V = Fix(Stab(V)) and one
representative per orbit. The index of a stratum is 2 |G/T| N_cell / |Stab|
in the whole grey group (|G/T| the coset representatives of the space group,
N_cell the cells of the magnetic cell, |Stab| counted in the magnetic cell);
the size is N_cell divided by the number of cell translations in the
stabilizer. A stratum is matched to the row of the `--parent` table of its
irrep with the same BNS number (of the spin field, or of a generic field for
more free parameters), index and free parameters, the size deciding a tie;
the components of the table may differ from these coefficients by an
orthogonal change of basis, the groups do not. For YMnO3 at K the matching
is one to one: K3 has the strata (a;0.974a) 193.255, (0.282a;a) 193.259 and
(a;b) 188.218, and spglib finds 72 = 2 · 24 · 9 / 6 operations in the 3x3x1
cell for both one-parameter directions.

When an irrep occurs more than once, the copies spgrep projects out are an
arbitrary basis of the multiplicity space, and the operations that take q to
−q (antilinear on the q component of the field) mix them. The copies are then
re-chosen: a generic symmetric matrix that commutes with the operations and
with the turn of the phase by 90 degrees (J: w → i w; it commutes with the
little group of q and anticommutes with the operations taking q to −q) has
eigenspaces that are irreducible and kept by J, each the real space of one
new copy, and each new copy is the projection of an old one onto it, so that
its rows keep the matrices of the irrep.

### Validation of `crystod-mag --parent` against ISOTROPY data_magnetic.txt

For every special k point of the 230 space groups, the
multiset of (BNS number, free parameters) of every irrep equals the magnetic
isotropy subgroups tabulated in the ISOTROPY Software Suite
(`data_magnetic.txt`: 16721 subgroups of 4777 irreps). Two kinds of
difference are allowed: an enantiomorphic partner as the representative of a
stratum (28 irreps), and the spelling of a complex pair whose partner lies at
-k (`P1PA1` here, `P1P1` there). Testsuite section 05-04 repeats the comparison
for 24 space groups when ISOTROPY's data files are in `iso/`, and for all 230
with `CRYSTOD_MAG_ISO_SWEEP=1`. It also checks that every spin basis of
`crystod-mag --qpoint` for AlNi3 and TiO2 has a magnetic isotropy subgroup of
its irrep as its group.

### Coupled magnetic order parameters

*Command:* `crystod-mag --parent SG --irrep A B ...` — [Several irreps (coupled order parameters)](crystod-mag.md#several-irreps-coupled-order-parameters)

An order that condenses several irreps at once has an order parameter
η = (η₁, η₂, ...) in the direct sum of the irreps, and lowers G1' to the
stabilizer of that vector,

$$
H(\eta) = \{ g \in G : D_j(g)\,\eta_j = \eta_j \ \forall j \}
\;+\; \{ \theta g : s_j D_j(g)\,\eta_j = \eta_j \ \forall j \},
$$

where every irrep carries a time-reversal parity: $s_j = -1$ for a time-odd
(magnetic) irrep, the only kind the command line takes, and $s_j = +1$ for a
time-even (structural) irrep, available from Python
(`mag.coupled_magnetic_isotropy_subgroups(..., parities=[...])`) so that a
distortion and a magnetic order can be combined. The matrices acting on η are
block diagonal, $\mathrm{diag}(D_1(g), D_2(g), \dots)$ and
$\mathrm{diag}(s_1 D_1(g), s_2 D_2(g), \dots)$, so every fixed space is a
direct sum of per-irrep subspaces and the amplitudes of different irreps are
independent free parameters (`R4+(a,0,0) M3+(d;0;0)`).

**Completeness.** The directions are the strata of this block-diagonal
matrix group, enumerated exactly as for one irrep and as in the structural
coupled table of `crystod-group --parent SG --irrep A B`: the fixed spaces of
every element, closed under intersection, keeping the isotropy subspaces
V = Fix(Stab(V)) and one representative per orbit under G1'. The isotropy
subgroups of one orbit are conjugate in G1', so the table holds one row per
conjugacy class of stabilizers. The coupled table keeps the strata whose
generic vector has a nonzero part in every irrep; a stratum with a zero part
is a direction of fewer irreps.

**Secondary order parameters.** A direction of one irrep alone need not be a
stratum of the direct sum: when its subgroup also fixes a vector of another
irrep, the fixed space of that subgroup in the direct sum has both parts
nonzero, and the one-irrep subgroup appears in the coupled table with the
induced (secondary) amplitude written out and the same group, size and index.
In Pm-3m GM4+ + GM5+, 8 of the 12 one-irrep strata are of this kind (the
ferromagnet along [011], Cmm'm', induces GM5+; along z, P4/mm'm', it does
not); in P6_3/mmc GM2+ + K5, 7 of the 15; in Pm-3m R4+ + M3+, none. The
other one-irrep strata are exactly the strata of the direct sum with one
nonzero part.

**Identification.** Each stabilizer is identified as for one irrep (two
generic orbits with generic moments, spglib, operation count checked); the
size is the cell of the translations without θ, and the index
[G1' : H] = 2 |G/T| N / |H ∩ (G1'/T_N)| over the common translation grid N of
the irreps. A time-even irrep alone has θ in its stabilizer: its table holds
the grey groups H1' of the structural table.

**Validation.** No tabulated oracle of coupled magnetic order parameters was
available, so the engine was checked in four independent ways.

- *One irrep.* Over every k point of all 230 space groups (4889 irreps,
  16923 rows) the coupled machinery with one irrep reproduces the one-irrep
  table of `crystod-mag --parent` (labels, BNS number and symbol, size,
  index, free parameters, type, UNI symbol) without a difference.
- *All irreps time-even.* With every parity +1 the coupled table is, row by
  row, the coupled table of `crystod-group --parent` (labels, space group,
  size, index), every row the grey group of the structural subgroup (198 rows
  over 20 pairs and triples).
- *Explicit arrangements.* For every coupled direction a decorated supercell
  of the parent was built independently of the enumeration: two species on
  general positions, the time-odd irreps written as moments and the
  time-even ones as displacements, each as the projection of a random field
  onto the irrep rows with the same irrep matrices (covariance checked to
  1e-15), the direction read back from the printed label with random
  amplitudes (rounded irrational factors such as `0.529b` moved back onto the
  fixed space of the operations that nearly fix the vector). spglib then gave
  the magnetic space group, the cell of the translations without θ and the
  number of operations. Over 23 cases (Pm-3m R4+ + M3+, GM4+ + R4+,
  GM4+ + GM5+, X3- + X5+, M3+ + M5-, GM4+ + R4+ + M3+; P4/mmm, P6_3/mmc
  including the K and H points, Pnma, I4/mmm with two X irreps, the complex pair
  GM2+GM3+ of Pm-3; the mixed-parity R4+ (even) with mGM4+, mR5+, mR4+, with
  M3+ (even) + mGM4+, with mGM4+ + mR5+; and single tables, including grey
  groups) and two random structures per direction, 758 comparisons of BNS
  number, size and index agree without exception. Where spglib could not name
  a large supercell, the arrangement was named in the primitive cell of the
  translations spglib found.
- *Internal checks.* For 20 cases (354 coupled rows): the index equals
  |G1'/T_N| over the number of stabilizer elements and times the order of H
  gives |G1'/T_B|; every row is an isotropy subgroup
  (Stab(Fix(H)) = H); every coupled subgroup lies in the stabilizer of each
  of its parts, whose stratum is a row of that irrep's table; every
  one-irrep row lifted to the direct sum is a stratum with the same group;
  and no two coupled rows are conjugate in G1'. `--order-parameter` applied
  to the printed label of every coupled row gives back its group.

Testsuite section 05-10 repeats a sample of each check, including the spglib
comparison for Pm-3m R4+ + M3+ and for R4+ (even) + mGM4+.

### Arrangements of the magnetic isotropy subgroups on a crystal (`crystod-mag -c ... --irrep`)

*Command:* `crystod-mag -c POSCAR --element EL --irrep IR [IR2 ...]` — [Magnetic arrangements of given irreps](crystod-mag.md#05-01-magnetic-arrangements-of-given-irreps---irrep-with--c)

The table of `--parent` is a statement about order-parameter vectors η in the
space of the real, physically irreducible full-star matrices $D^\nu(g)$. To
place a row on a crystal, CrystOD builds spin modes that transform with
exactly these matrices. The spins of the magnetic sites of a supercell $S$
commensurate with every arm span $W_S$ (dimension $3N_S$); an operation
$g = \{R|t\}$ acts as $(O(g)\,S)(g\mathbf r) = \det(R)\,R\,S(\mathbf r)$, and
time reversal θ as $-1$. With the projection operators

$$
P^\nu_{ij} = \frac{d_\nu}{|G/T_S|} \sum_{g \in G/T_S} D^\nu_{ij}(g)\, O(g),
\qquad \psi^{(\nu,c)}_i = P^\nu_{i1}\,\phi_c ,
$$

one set $\Psi^{(\nu,c)} = (\psi_1, \dots, \psi_{d_\nu})$ per copy $c$ satisfies
$O(g)\,\Psi = \Psi\,D^\nu(g)$ for every $g$ (checked numerically, residual
below $10^{-14}$). In practice the intertwiners are obtained as the averages
$X_\phi = |G/T_S|^{-1}\sum_g O(g)\,\phi\,e_1^{\mathsf T} D^\nu(g)^{\mathsf T}$,
the orthogonal projection onto $\mathrm{Hom}_G(D^\nu, O)$, which also covers
the doubled real form of complex and pseudoreal irreps (commutant of
dimension $e = 2, 4$; one intertwiner per copy is kept). The number of
copies $m_\nu$ follows from the characters and is checked against the
decomposition of the survey, which names the irreps independently.

**The group of an arrangement.** For a row with order parameter
$\eta = (\eta^{\nu})$ the arrangement is

$$
S = \sum_\nu A_\nu \sum_i \eta^\nu_i\, \psi^{(\nu,c_\nu)}_i .
$$

The map $\eta \mapsto S$ is linear, injective ($\Psi^{\mathsf T}\Psi \propto 1$)
and equivariant for G and for θ (both sides change sign), so
$h S = S \iff D(h)\,\eta = \eta$ for every $h \in G1'$:
$\mathrm{Stab}_{G1'}(S) = \mathrm{Stab}_{G1'}(\eta)$, the magnetic isotropy
subgroup of the row. Label, BNS group, size and index come from the table by
construction; spglib on the structure is an independent check, and so is
the count of elements of $G1'/T_S$ that fix $S$ and $\eta$.

**Copies and amplitudes.** Any injective intertwiner gives the same
stabilizer, so a mixture of copies with the same η has the same group; the
copies are chosen element by element, Wyckoff orbit by Wyckoff orbit and, at
q = 0, as the ferromagnetic combination (orthogonal to the intertwiners of
zero net moment) and the antiferromagnetic rest, so that they correspond to
the bases of `crystod-mag --qpoint`. A positive rescaling of every irrep's
part leaves every condition $s_j D_j(g)\eta_j = \eta_j$ unchanged, so
nonzero weights $A_\nu$ (each part scaled to largest moment 1, then
`--coefficients`; a negative weight is a positive one on another domain) and
other generic values of the letters do not change the group; they are not
fixed by symmetry. A zero weight removes an irrep and does change it, which
is why such weights are refused. In the coupled case the group is the
stabilizer of the vector of the direct sum, as in the coupled table above.
Equal weights can still make the parts cancel on some sites (Mn3GaN
R4-(0,0,a) M3-(0;0;d): 8 sites at 1 : 1); the default weights avoid that,
which changes neither the group nor the stratum.

**The check is made on the written moments.** The moments are rounded to
the 4 decimals of the `MAGMOM` line before the check, and spglib and the
count of fixing elements work with a moment tolerance of 3e-4 (largest
moment 1): rounding moves a component by at most 5e-5 and the image of a
rounded moment under a rotation by at most 1.4e-4, so symmetry-related
moments of hexagonal arrangements stay related, while a part whose largest
moment is below 1e-3 of the total would be lost in the file and is refused.

**Frames.** The matrices are defined in the primitive setting of the ISO-IR
tables. The primitive cell of the POSCAR is mapped onto it through the ISO-IR
frame that names the irreps of every `crystod-mag` report
($x_{\mathrm{conv}} = P x + p$), checked operation by operation, so that a
label means the irrep the survey calls by that name.

**Validation.** Over 21 structure-element combinations of `example/05-02`, `05-03`,
`05-06`, `05-09` and `test_mag` (every irrep of every special k point, 345 irreps
carried by the spins, 2423 rows, 4340 arrangements with their copies) and 25
coupled sets over 10 structures (pairs at one and at two k points, triples,
copies on two elements and on two Wyckoff orbits; 343 rows, 621
arrangements), spglib finds the table's group on every arrangement, the
tables equal those of `--parent`, and the one-parameter directions have the
groups of the corresponding `--qpoint` components. The irrep content of every
exported field, projected with the irreps of the `--qpoint` machinery, is the
requested irrep alone.

## Displacement patterns of the isotropy subgroups on a crystal (`crystod-phonon -c ... --irrep`)

*Command:* `crystod-phonon -c POSCAR --element EL --irrep IR [IR2 ...]` — [Displacement patterns of given irreps](crystod-phonon.md#04-01-displacement-patterns-of-given-irreps---irrep-with--c)

The construction of the magnetic arrangements above, with the spin replaced
by the displacement: a polar vector, even under time reversal. The
displacements of the chosen atoms of a supercell $S$ commensurate with every
arm span $W_S$ (dimension $3N_S$), and $g = \{R|t\}$ acts as
$(O(g)\,u)(g\mathbf r) = R\,u(\mathbf r)$, without the factor $\det(R)$ and
without time reversal, so that at a k point the representation is
$\Gamma_{\mathrm{disp}}(\mathbf k) = \Gamma_{\mathrm{perm}}(\mathbf k) \otimes
\Gamma_{\mathrm{vector}}$, the vibration representation of
`crystod-phonon --vibration` restricted to the chosen atoms. The same
average $X_\phi = |G/T_S|^{-1}\sum_g O(g)\,\phi\,e_1^{\mathsf T}
D^\nu(g)^{\mathsf T}$ gives displacement modes $\Psi^{(\nu,c)}$ with
$O(g)\,\Psi = \Psi\,D^\nu(g)$ for the matrices of the `crystod-group --parent`
tables, one per copy $c$, and the pattern of a row with order parameter
$\eta$ is

$$
u = \sum_\nu A_\nu \sum_i \eta^\nu_i\, \psi^{(\nu,c_\nu)}_i ,
$$

scaled to the largest displacement `--amplitude`. The map
$\eta \mapsto u$ is linear, injective and equivariant for $G$, so
$\mathrm{Stab}_G(u) = \mathrm{Stab}_G(\eta)$: the isotropy subgroup of the
row, its number, size and index taken from the table. The check is
independent: spglib on the displaced structure as written, its type from its
primitive cell (reliable on any supercell), the size from the atoms of that
primitive cell and the index from the order of its point group, and the
count of the elements of $G/T_S$ that fix $u$ and $\eta$. At q = 0 the
copies of an orbit are split into the combination with a net shift of the
orbit (the intertwiners orthogonal to those of zero net displacement) and the
rest; for a polar irrep the net shift of one orbit against the others is a
legitimate polar distortion, not the acoustic translation of the crystal
(that is the net shift of all atoms together).

A pattern is a direction in the space of symmetry-adapted displacements, not
a normal mode: a phonon or a frozen distortion of the row's symmetry is some
combination of the copies of its irreps, and the coefficients (like the
relative amplitudes of several irreps) come from the force constants, not
from symmetry. Over 11 structures of `example/` (P, I, C, F, R and hexagonal
lattices; every irrep of every special point carried by the displacements of
one element and of all atoms, with and without `--conventional`), 17 coupled
sets and three re-expressed primitive cells ($a' = a + b$), spglib finds the
row's group on every displaced structure, and the symmetry-mode analysis of
`crystod-group --supergroup-cif` finds only the requested irreps in the
displaced structures, on the directions of the rows.

The irrep labels are those of the frame of the structure
([Irrep labels and the frame of a structure](theory-representations.md#irrep-labels-and-the-frame-of-a-structure)):
a cell in the standard setting keeps its origin, and moving the origin to
another point of the same site symmetry permutes labels at the zone
boundary. On cubic SrTiO3 with Ti at the origin
(`example/04-01_phonon_irrep/SrTiO3`) the O displacements at R are
R1+ + R3+ + R4+ + R5+; with Sr at the origin
(`example/test_POSCARs/221_PPOSCAR_SrTiO3`) they are R2- + R3- + R4- + R5-,
and the patterns of `--irrep R5-` and `--irrep R5- M2+` there are, row by
row, the structures of `--irrep R4+` and `--irrep R4+ M3+` on the Ti-origin
cell (testsuite section 04-01).
