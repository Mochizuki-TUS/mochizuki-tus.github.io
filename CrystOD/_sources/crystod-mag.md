# crystod-mag

Symmetry-adapted spin bases (cluster multipoles / SAMM): every
symmetry-distinct magnetic order allowed on the sites of one element, printed
with its irrep, its per-atom spin directions, a ready-to-paste VASP or Quantum
ESPRESSO magnetization input, and a VESTA file with spin arrows.

| I want to ... | command |
|---|---|
| enumerate the magnetic orders at q = 0 | `crystod-mag -c POSCAR --element Ni --qpoint 0 0 0` |
| survey every special k point | `crystod-mag -c POSCAR --element Ni` |
| get a Quantum ESPRESSO input instead | `... --format qe` |
| build a magnetic supercell at q ≠ 0 | `crystod-mag -c POSCAR --element Ni --qpoint R` |
| get the magnetic space group, the responses allowed by symmetry and the altermagnet / AFM class of every basis vector | `crystod-mag -c POSCAR --element Ti --qpoint GM --classify-only` ([05-03](#05-03-magnetic-space-groups-and-collinear-classes---classify-only)) |
| list the operations of the paramagnetic group each arrangement keeps and breaks | `... --qpoint GM --show-operations` ([05-03](#05-03-magnetic-space-groups-and-collinear-classes---classify-only)) |
| know which magnetic space groups the magnetic orders of a k point give, without a structure file | `crystod-mag --parent Pm-3m --qpoint GM` ([05-04](#05-04-magnetic-isotropy-subgroups---parent)) |
| get every order-parameter direction of a magnetic order at q ≠ 0 (both phases of a complex order parameter) with its magnetic isotropy subgroup and a VESTA file | `crystod-mag -c POSCAR --element Mn --qpoint K` ([05-06](#05-06-order-parameter-directions-of-the-spin-bases)) |
| place those orders on a distorted (low-symmetry) structure and find, for each direction, the domain that is one irrep of that structure, with its magnetic space group and a MAGMOM line in its cell | `crystod-mag -c POSCAR --element Mn --qpoint K --subgroup-poscar CHILD` ([05-07](#05-07-spin-bases-aligned-with-a-subgroup-structure---subgroup-poscar)) |
| know which textures of the phonon angular momentum near Γ (s-, p-, d-wave, ...) and which nodal planes every arrangement, and the paramagnetic crystal, allow | `crystod-mag -c POSCAR --element Ti --qpoint GM --classify-only --phonon-angular-momentum` ([05-08](#05-08-phonon-angular-momentum-near-gm---phonon-angular-momentum)) |
| enumerate the magnetic orders of spins on two or more elements at once, with the copies of one irrep combined across the elements, or superpose listed orders of any irreps | `crystod-mag -c POSCAR --element Al Ni --qpoint GM` ([05-09](#05-09-several-magnetic-elements---element-a-b---superpose)) |
| get the actual moments on my crystal for every magnetic isotropy subgroup of one irrep (or of several coupled irreps), each with its group checked on the structure, MAGMOM and VESTA | `crystod-mag -c POSCAR --element Mn --irrep R4- M3-` ([05-01](#05-01-magnetic-arrangements-of-given-irreps---irrep-with--c)) |

## 05-01. Magnetic arrangements of given irreps (`--irrep` with `-c`)

*Example directory: `example/05-01_mag_irrep` (testsuite section 05-01); after pip install: `crystod-example 05-01`*

`crystod-mag --parent SG --irrep IR` tells which magnetic space group every
order-parameter direction of an irrep gives, without a structure. With a
structure and an element instead of `--parent`, every row of that table (with
several irreps, every row of the coupled table) is placed on the sites of the
element: the moments of the arrangement in a magnetic cell common to every arm
of every star, its magnetic space group identified again from the structure
and shown next to the table's, the spin listing, the `MAGMOM` line, one VESTA
file per row and the magnetic-cell POSCAR. An irrep that the spins of the
element do not carry is refused with the decomposition at its k point.

```{seealso}
**Theory:** [Arrangements of the magnetic isotropy subgroups on a crystal](theory-isotropy-subgroups.md#arrangements-of-the-magnetic-isotropy-subgroups-on-a-crystal-crystod-mag--c----irrep) —
the spin modes that transform with the matrices of the table, why the group of
every arrangement is the row's group by construction, copies, the free
amplitudes and the coupled case.
```

| Input | Command | Output |
|---|---|---|
| primitive POSCAR, magnetic element, one irrep | `crystod-mag -c POSCAR_Mn3GaN_Pm-3m --element Mn --irrep R4-` | terminal: the decomposition at the k point, the copies of the irrep, the magnetic cell, the table of `--parent Pm-3m --irrep R4-` with a row number and the column `structure` (the BNS group found on the arrangement), then one block per row (letters used, moment sizes, magnetic space group and point group, check, responses, collinear order, spin listing, `MAGMOM`); files: `POSCAR_<formula>_spin_<IR>_<row>_<BNS>.vesta` per row, `S<POSCAR name>_<IR>`, the report `samm_<formula>_<element>_<IR>` |
| several irreps | `... --irrep R4- M3-` | the table of every irrep alone (as `--parent`), then the coupled table with the check column, one block per coupled row |
| the same, tables only | add `--classify-only` | the tables with the check column; no blocks, no VESTA files; report `..._<IR>_classify` |
| one direction | add `--order-parameter "0 0 a 0 0 b"` | one block: the row of its stratum, its group from the table and from the structure; numbers are amplitudes |
| weights of the irreps | add `--coefficients 1 0.5` | every irrep's part scaled to largest moment 1, then weighted (finite, nonzero, none below 1e-3 of the largest; negative: the other domain) |
| two elements | `--element Al Ni --irrep GM4+` | one arrangement per choice of copies (Al FM, Ni FM, Ni AFM), tagged `c1`, `c2`, ... |
| one choice of copies | add `--copies 2 1` | one copy number per irrep, as listed under `* Copies in the spin representation *` |
| conventional cell (I, F, C, A, R lattices) | add `--conventional` | every arrangement written in the conventional cell times the smallest multiples commensurate with every arm (the same table and groups); a `Display cell:` line; names with `_conv`: `..._<BNS>[_c<copies>]_conv.vesta`, `S<POSCAR name>_<IR>_conv`, report `..._<IR>_conv` (`_conv_classify`, `_conv_op`) |

```bash
cd example/05-01_mag_irrep
crystod-mag -c POSCAR_Mn3GaN_Pm-3m --element Mn --irrep R4-
```

```
* Copies in the spin representation *
  R4-: 1 copy: Mn [AFM (q != 0)]

* Magnetic cell *
  Magnetic (commensurate) supercell: 2x2x2 (8 primitive cells, 40 atoms), common to every arm of R4-
  spin modes: |O(g) Psi - Psi D(g)| <= 2.3e-16 over the elements of G/T_S, Psi^T Psi = c 1 within 2.2e-16

* Order parameter directions and isotropy subgroups *
No.  irrep                subgroup           size  index structure
1    R4-(0,0,a)           139.540 I_c4/mmm   2     6     139.540 same
2    R4-(a,a,a)           166.102 R_I-3m     2     8     166.102 same
3    R4-(0,a,a)           74.562 I_bmma      2     12    74.562 same
4    R4-(a,a,b)           12.63 C_c2/m       2     24    12.63 same
5    R4-(0,a,b)           12.64 C_a2/m       2     24    12.64 same
6    R4-(a,b,c)           2.7 P_S-1          2     48    2.7 same

* 2: R4-(a,a,a) -> 166.102 R_I-3m *
  order parameter: a = 1
  reproduce: --order-parameter "0.57735 0.57735 0.57735"
  moments: equal on all 24 Mn sites (|m| = 1.0000)
  net moment over the magnetic cell: [0.0, 0.0, 0.0]
  magnetic space group: R_I-3m (BNS 166.102, type IV), 24 operations, 12 with time reversal
  magnetic point group: -3m1'
  UNI symbol: R-3m.1'_c[R-3m]; point group -3m.1'
  check (on the written moments): table 166.102, structure 166.102 same; 96 elements of G1'/T_S fix the moments, 96 the order parameter
  ...
```

How to read it:

- **Rows** are those of `crystod-mag --parent SG --irrep ...`, in the same
  order, with the same labels, groups, sizes and indices: the arrangement of
  a row is built from the order parameter the table identifies its group
  from, so its group is the row's group by construction. The column
  `structure` and the `check (on the written moments):` line are the
  independent check, made on the moments exactly as the `MAGMOM` line, the
  listing and the VESTA file carry them (4 decimals, moment tolerance 3e-4
  with the largest moment 1): spglib on the magnetic cell with all atoms and
  moments (in the cell of its translations without time reversal, the larger
  cell as fallback), and the numbers of elements of G1'/T_S that fix the
  moments and the order parameter. A disagreement is printed as a NOTE on
  the row.
- **Reproduce.** Every block ends its header with
  `reproduce: --order-parameter "..."` (and `--copies ...` when an irrep has
  several copies): those numbers, given back with the same `--irrep`, rebuild
  the same written moments, weights included.
- **Letters.** A row with several letters is shown with generic values (the
  ones printed, largest 1): other values with the same pattern of zero and
  equal components give the same group, and symmetry does not fix them. The
  `moments:` line tells whether the moments of that representative are equal
  on all sites, take several sizes or vanish on some sites.
- **Direction components** refer to the irrep basis of the table (as with
  `--parent`), not to the axes of the POSCAR: `GM4+(0,0,a)` of Mn3GaN puts
  the moments along y. The spin listing gives the moments.
- **Copies.** An irrep that occurs more than once (GM4+ twice on Mn of
  Mn3GaN; several elements or Wyckoff orbits) gives one arrangement per
  choice of copies (`c1`, `c2`, ... in the block titles and file names). The
  copies are split by element, by Wyckoff orbit and, at q = 0, into the
  ferromagnetic combination and the antiferromagnetic ones, named by
  multipole rank as the `--qpoint` report names its bases. Any mixture of
  copies with the same order parameter has the same group.
- **Several irreps.** The arrangements are those of the coupled rows (every
  irrep condensed); the parts are scaled to largest moment 1 each and
  weighted. Without `--coefficients` every row takes the first of the weight
  sets 1 : 1, 1 : 0.5, 1 : 0.75, 1 : 0.25, 1 : 0.6, 1 : 0.4 (three irreps:
  analogous sets) under which no site that a part reaches has a vanishing
  moment, and says why when it is not 1 : 1 (`weights: 1 : 1 would cancel the
  moments on 8 sites`; Mn3GaN R4- M3-: rows 1, 5, 6, 13 use 1 : 0.5). The
  `moments:` line separates sites that no irrep reaches (`zero on 8 sites (no
  moment in R4-, M3-)`) from moments that given `--coefficients` cancel
  (`cancelled on 8 sites by the weights`). `--irrep R4-` alone exports the
  rows of one irrep.
- **Many copies.** All choices of copies are exported while there are at
  most 6 per row; otherwise only the first, with a NOTE, and `--copies`
  selects another one. `--order-parameter` runs save their report as
  `..._op` and tag their blocks and files with the copies.
- **Conventional cell.** The magnetic cell is a diagonal supercell of the
  primitive cell, which is awkward to look at for a centred lattice.
  `--conventional` writes every arrangement in the conventional cell instead:
  the cell that `--qpoint --conventional` uses for the same POSCAR (the
  conventional matrix of the centring letter applied to the primitive cell as
  given, so the input should be the standard primitive cell of
  `phonopy --symmetry`, a PPOSCAR), times the smallest multiples along its
  axes for which k . T is an integer for every arm of every star. The spin
  modes, weights, rows and the counts over G1'/T_S stay on the diagonal
  magnetic cell (named in the `Magnetic (commensurate) supercell:` line); the
  moments are re-tiled onto the conventional cell, which is exact because the
  arrangement is periodic under every such translation. The spin listing, the
  `MAGMOM` line, the site counts of the `moments:` line, the net moment, the
  files and the column `structure` (spglib on the conventional cell as
  written) refer to the conventional cell, and the `reproduce:` line ends
  with `--conventional`. On a P lattice only the names and the `Display
  cell:` line change. An input primitive cell off the standard primitive
  setting gives a cell that is not the conventional one, and a NOTE under the
  `Display cell:` line says so (the arrangements hold for the cell as
  written).

:::{dropdown} Errors
An irrep that the spins of the element(s) do not carry, an unknown label, an
irrep given twice, `--qpoint` (the label carries its k point) and the options
of the `--qpoint` report (`--superpose`, `--show-operations`, `--subgroup-poscar`, `--phonon-angular-momentum`) stop
with an `ERROR:` line and no files; every invalid irrep is reported at once:

```
$ crystod-mag -c POSCAR_Mn3GaN_Pm-3m --element Mn --irrep R4+
ERROR: R4+ is not contained in the spin representation of Mn at R [0.5, 0.5, 0.5]; the decomposition there is 1.0 [R1-(1)] + 1.0 [R3-(2)] + 1.0 [R4-(3)] + 1.0 [R5-(3)]
```

`--coefficients` with a zero, nan or inf value, the wrong number of values
or a weight below 1e-3 of the largest (it would vanish in the written
moments), `--copies` beyond the copies of an irrep, and a `-c` file that is
not a POSCAR are refused the same way. On a structure off its ideal
positions whose irreps the survey cannot label at the given `--tolerance`,
the decomposition is printed with `irrep_N` names and a NOTE, the copies
come from the irrep matrices alone, and every row is still checked on the
written moments; symmetrizing the structure first is better.

The magnetic cell is the diagonal supercell commensurate with every arm of
every star; it is refused above 64 primitive cells or 12 cells along one
axis. With `--conventional` the conventional cell is refused above 12
conventional cells along one axis or 256 primitive cells; the ERROR names it
and suggests running without `--conventional`.
:::

:::{dropdown} Python API

```python
from phonopy.interface.vasp import read_vasp
from crystod import mag

result = mag.magnetic_irrep_arrangements(read_vasp("POSCAR_Mn3GaN_Pm-3m"), ["Mn"], ["R4-", "M3-"])
[(a.number, a.row.label, a.row.bns_number, a.check) for a in result.arrangements][:2]
# [(1, 'R4-(0,0,a) M3-(0;0;d)', '129.421', 'same'), (2, 'R4-(0,a,a) M3-(d;0;0)', '62.453', 'same')]
a = result.arrangements[0]              # mag.MagneticArrangement
a.letters, a.moment_text, a.magmoms.shape
one = mag.magnetic_irrep_arrangements(read_vasp("POSCAR_Mn3GaN_Pm-3m"), ["Mn"], ["R4-", "M3-"],
                                      order_parameter=["0", "0", "a", "0", "0", "b"])
one.stratum                             # 1
```

`MagneticIrrepAnalysis` has `irreps`, `kpoints`, `decompositions`, `copies`
(`IrrepCopy`: `irrep`, `number`, `element`, `orbit`, `kind`, `rank_name`,
`intertwiner`), `singles`, `rows`, `arrangements`, the magnetic cell
(`cell_matrix`, `supercell_lattice`, `supercell_symbols`,
`supercell_positions`: the written cell; `supercell_sizes`: the diagonal
cell of the spin modes; `conventional_centring`, `conventional_multiples`
with `conventional=True`) and `residuals`; `MagneticArrangement` has `row`,
`copies`, `tag`, `order_parameter`, `letters`, `field`, `magmoms`,
`net_moment`, `group`, `responses`, `collinear`, `check`, `note`,
`weight_reason`, `reproduce` (the `--order-parameter` numbers of the block)
and `vesta_name`; `magmoms` are the written (rounded) moments.
`copies=[i, j]` selects one choice of copies, `conventional=True` writes
the arrangements in the conventional cell (`magmoms` then follow its atoms;
`field` stays on the diagonal cell). The function writes no files.

:::

## 05-02. Symmetry-adapted spin bases

*Example directory: `example/05-02_spin_basis` (testsuite section 05-02); after pip install: `crystod-example 05-02`*

```{note}
The `example/...` paths on this page are those of a clone of the repository,
used from its root. After `pip install CrystOD`, run `crystod-example CC-NN` (the
number of the example directory) in your working directory first: it copies
that directory and the shared `test_POSCARs/` into `./example/`, and the
commands then run from there unchanged (see [crystod-example](crystod-example.md)).
```

Which magnetic orders can the moments on the sites of one element take in
this crystal? `crystod-mag` enumerates every symmetry-distinct ferromagnetic
and antiferromagnetic arrangement at a q point, sorted by irrep, and prints
each with its per-atom spin directions, a ready-to-paste VASP or Quantum
ESPRESSO magnetization input, a POSCAR of the magnetic cell and a VESTA file
with spin arrows. The enumeration follows the cluster-multipole /
symmetry-adapted multipole moment (SAMM) framework of M.-T. Suzuki *et al.*
[PRB **95**, 094406 (2017); PRB **99**, 174407 (2019)].

```{seealso}
**Theory:** [Spin bases as axial-vector SALCs](theory-representations.md#spin-bases-as-axial-vector-salcs-crystod-mag) —
why the spins are treated as axial vectors, how the FM dipole is split from
the higher multipoles and the multipole ranks are assigned, how complex and
two-dimensional irreps get real partners, and which combined directions
symmetry singles out.
```

| Input | Command | Output |
|---|---|---|
| primitive POSCAR, magnetic element, q point | `crystod-mag -c POSCAR --element Ni --qpoint 0 0 0` | terminal: the spin irrep decomposition, then every basis vector with its spins, net moment, magnetic space group and `MAGMOM` line; files: one VESTA file per component, the magnetic-cell POSCAR `S<POSCAR name>_<q>`, the report `samm_<formula>_<element>_<q>` |
| the same | add `--format qe` | the same with the Quantum ESPRESSO `&SYSTEM` input instead of `MAGMOM` |
| the same at q ≠ 0 | `--qpoint R` | the same in the commensurate magnetic supercell, with the order-parameter directions of every basis and their magnetic isotropy subgroups (`* Order-parameter directions *`, [05-06](#05-06-order-parameter-directions-of-the-spin-bases)) |
| primitive POSCAR, magnetic element | `crystod-mag -c POSCAR --element Ni` (no `--qpoint`) | terminal: the spin irrep decomposition at every special k point; file: the report `samm_<formula>_<element>_survey` (no magnetic-cell POSCAR, no VESTA files) |

```bash
crystod-mag -c example/test_POSCARs/221_PPOSCAR_AlNi3 --element Ni --qpoint 0 0 0
crystod-mag -c example/test_POSCARs/221_PPOSCAR_AlNi3 --element Ni --qpoint 0 0 0 --format qe

# survey mode: spin-multipole irreps at ALL special k points
crystod-mag -c example/test_POSCARs/221_PPOSCAR_AlNi3 --element Ni
```

The output opens with the magnetic sites and the complete irrep enumeration —
for the Ni 3c cluster of AlNi3 (the Mn3Ir geometry), 9 spin degrees of freedom
decompose into exactly three symmetry-adapted families:

```

* Structure *
  Space group: Pm-3m (#221)
  Magnetic sites: Ni x 3
    Ni1: [0.5, 0.5, 0.0]
    Ni2: [0.5, 0.0, 0.5]
    Ni3: [0.0, 0.5, 0.5]

* Selected Q point *
  Selected q-point: GAMMA = [0.0, 0.0, 0.0]

* Spin (axial-vector) representation *
  Spin (axial-vector) representation on Ni sites: 9 dimensions
  Decomposition: 2 x GM4+(3) + GM5+(3)

* Symmetry-adapted spin bases *
  GM4+(3): dim 3 [FM, dipole]
  GM4+(3): dim 3 [AFM, octupole]
  GM5+(3): dim 3 [AFM, octupole]
```

Every basis vector is then printed with its per-atom spin directions, net
moment, its magnetic space group and class (section
[05-03](#05-03-magnetic-space-groups-and-collinear-classes---classify-only)), and
the magnetization input. The [111] component of the GM4+ cluster
octupole is the experimentally realized 120-degree structure of Mn3Ir — note
the exactly vanishing net moment:

```
* GM4+(3) [AFM, octupole] *
  ...
  component 111:
    Ni1: S = [ 0.4082,  0.4082,  0.8165]
    Ni2: S = [ 0.4082, -0.8165, -0.4082]
    Ni3: S = [-0.8165,  0.4082, -0.4082]
    net moment: [0.0, 0.0, -0.0]
    magnetic space group: R-3m' (BNS 166.101, type III), 12 operations, 6 with time reversal
    magnetic point group: -3m'
    UNI symbol: R-3m'; point group -3m'
    allowed by symmetry: net magnetization along [11-1]; electric polarization none; linear magnetoelectric effect none; piezomagnetism 4 components
    collinear order: noncollinear (not classified)
    spin directions (all atoms, POSCAR order):
      Al1: [0, 0, 0]
      Ni2: [0.4082, 0.4082, 0.8165]
      Ni3: [0.4082, -0.8165, -0.4082]
      Ni4: [-0.8165, 0.4082, -0.4082]
    MAGMOM = 0 0 0   0.4082 0.4082 0.8165   0.4082 -0.8165 -0.4082   -0.8165 0.4082 -0.4082
...

* Output files *
  ...
  Spin basis written to: POSCAR_AlNi3_spin_GM4+_octupole_111.vesta
  ...
  Supercell POSCAR written to: S221_PPOSCAR_AlNi3_GM (atom order of the MAGMOM lines)
  Report written to: samm_AlNi3_Ni_GM (this output)
```

**How to read the output.**

- `* Spin (axial-vector) representation *`: the spin degrees of freedom of
  the magnetic sites (3 per site, 9 for the three Ni of AlNi3) and their
  irreps at q; `2 x GM4+(3)` is the three-dimensional irrep GM4+ occurring
  twice.
- `* Symmetry-adapted spin bases *`: one line per copy of an irrep. FM and
  AFM refer to the net moment; every AFM basis satisfies `sum_i S_i = 0`
  exactly. The copies of an irrep are named after the ranks at which it
  occurs among the magnetic multipoles, lowest first: dipole (rank 1, the FM
  copy), quadrupole (rank 2), octupole (rank 3), hexadecapole (rank 4), ...;
  an AFM basis is not always an octupole or higher (the in-plane orders of
  Cr2O3 are `GM3-(2) [AFM, quadrupole]`, section
  [05-03](#05-03-magnetic-space-groups-and-collinear-classes---classify-only)).
- For the Mn3Ir-type Ni 3c cluster of AlNi3, `9 dims = 2 x GM4+(3) + GM5+(3)`:
  the GM4+ (T1g) cluster dipole (FM), the GM4+ (T1g) cluster octupole (AFM:
  the experimentally realized 120-degree structure of Mn3Ir, which shares the
  irrep with the dipole and hence allows the anomalous Hall effect), and the
  GM5+ (T2g) cluster octupole (AFM).
- `component 111:` one exported arrangement of the basis, tagged by its
  direction (the tags are listed in section
  [05-03](#05-03-magnetic-space-groups-and-collinear-classes---classify-only));
  `Ni1: S = [...]` the spin of each magnetic site, `net moment` their sum.
- `magnetic space group` ... `collinear order`: the symmetry of the
  arrangement, the responses it allows and its class (section
  [05-03](#05-03-magnetic-space-groups-and-collinear-classes---classify-only)).
- `spin directions (all atoms, POSCAR order)` and `MAGMOM =`: printed by
  default for every basis vector, the spins of all atoms of the magnetic
  cell, in the atom order of the magnetic-cell POSCAR written by the run.
- Survey mode (no `--qpoint`): the spin (axial-vector) irrep decomposition is
  listed for every special k point of the space group — the magnetic
  counterpart of the `crystod` SALC survey (e.g. for AlNi3: GM:
  `2.0 [GM4+(3)] + 1.0 [GM5+(3)]`, R: `R2+ + R3+ + R4+ + R5+`, ...). At a
  time-reversal-invariant point a complex irrep and its conjugate are counted
  once under their pair label, as with `--qpoint` (`2.0 [GM3+GM4+(2)]` for the
  Ti sites of P4/m Ti2Ga3). The main command prints the same terms in the
  format of its orbital SALC, with the little group of every k point:
  `crystod -c POSCAR --element Ni --axial` (see
  [Spin configurations](crystod.md#spin-configurations---axial)).

:::{dropdown} Quantum ESPRESSO input (`--format qe`)

With `--format qe`, the same 120-degree octupole becomes (Ni split into three
types because the three spins point in three different directions):

```
    Quantum ESPRESSO noncollinear magnetization (&SYSTEM):
      noncolin = .true.
      ! type 1 (Al): Al1 -- non-magnetic
      ! type 2 (Ni1): Ni2  S = [0.4082, 0.4082, 0.8165]
      starting_magnetization(2) = 1.0000
      angle1(2) = 35.2611
      angle2(2) = 45.0000
      ! type 3 (Ni2): Ni3  S = [0.4082, -0.8165, -0.4082]
      starting_magnetization(3) = 1.0000
      angle1(3) = 114.0928
      angle2(3) = -63.4378
      ! type 4 (Ni3): Ni4  S = [-0.8165, 0.4082, -0.4082]
      starting_magnetization(4) = 1.0000
      angle1(4) = 114.0928
      angle2(4) = 153.4378
      ! angle1 = polar angle from the z axis (deg); angle2 = azimuth from the x axis in the xy plane (deg).
      ! Split Ni into the types above in ATOMIC_SPECIES / ATOMIC_POSITIONS to realize this spin arrangement.
```

- The Quantum ESPRESSO block: `noncolin = .true.` with per-type
  `starting_magnetization(i)` / `angle1(i)` (polar angle from z) /
  `angle2(i)` (azimuth from x) for the `&SYSTEM` namelist, where the magnetic
  element is split into one atom type per distinct spin direction (the atom
  membership of each type is printed as comments for
  `ATOMIC_SPECIES`/`ATOMIC_POSITIONS`).

:::

:::{dropdown} Combined directions of two- and three-dimensional bases

**Combined directions of two- and three-dimensional bases.** The components
of a two- or three-dimensional basis are the (a,0) / (a,0,0) directions of
its order parameter. The (a,a) / (a,a,0) direction, the equal-weight
combination of two components, is exported as well wherever symmetry singles
it out (it then has an isotropy subgroup of its own). A three-dimensional
`x`/`y`/`z` basis also gets `111` (x + y + z), the (a,a,a) direction; another
three-dimensional basis gets its first singled-out pair and the sum of the
three when singled out. A combination is named after the sum of the
component directions (the spin direction of a dipole), else in the
order-parameter notation over the components in their order: `aa` (two
components along the same axis), `aa0` and `aaa` (`comp<N>` components):

| crystal | basis | components | combination |
|---|---|---|---|
| AlNi3 (Pm-3m), Ni, Γ | GM4+ dipole | `z` P4/mm'm', `x`, `y` | `110` Cmm'm' (65.486), `111` R-3m' |
| AlNi3, Ni, M | M5+ / M5- | `x`, `y` / `z`, `z` | `110` P_Bmna / `aa` P_Bmma |
| CeRu2Si2 (I4/mmm), Ce, Γ | GM5+ dipole | `x`, `y` Im'm'm | `110` Fm'm'm (69.524) |
| TiO2 (P4_2/mnm), Ti, Γ | GM5+ dipole | `1m10`, `110` Cmm'm' | `x` Pnn'm' (58.398) |
| AlNi3, Ni, R | R4+ / R5+ | `comp1`-`comp3` | `aa0` I_bmma, `aaa` R_I-3c / R_I-3m |
| Y2Ir2O7 (Fd-3m), Ir, Γ | GM4+ octupole | `comp1`-`comp3` | `aa0` Imm'a' (74.559), `aaa` R-3m' |
| Pm-3, m-3, 23 (e.g. 200_PPOSCAR_NaCl7) | GM4+ | `x`, `y`, `z` | `111` only |
| hexagonal and trigonal (Cr2O3, LuFeO3) | E irreps | `x`, `y` or `comp1`, `comp2` | none |
| YMnO3 (P6_3/mmc), Mn, K | K3 / K5 | `comp1`, `comp2` / `z`, `z_2`, `z_3`, `z_4` (the rows w and i w) | none / `aa` Cm'c'm (63.462), then `dir1`-`dir3` |

Only singled-out arrangements are added: where the components of a
`comp<N>` basis are not the (a,0,0)-type partners, fewer combinations come
out (none for the Se GM4+ of Rb3AsSe16, Fd-3), never a general direction.
At q ≠ 0 the combinations are taken over the rows w of a copy only, and every
one-parameter order-parameter direction that neither a component nor a
combination lies on is exported as `dir<k>` (section
[05-06](#05-06-order-parameter-directions-of-the-spin-bases)).

:::

:::{dropdown} Output files

**Output files.**

- `POSCAR_<formula>_spin_<irrep>_<dipole|quadrupole|octupole|...>_<direction>.vesta`,
  one per component (e.g. `POSCAR_AlNi3_spin_GM4+_octupole_111.vesta` for the
  120-degree Mn3Ir-type state), with spin arrows on the magnetic atoms scaled
  so that the largest spin gets `--amplitude` Angstroms (default 1.5). At
  q ≠ 0 the multipole part is the q name, and the components include the
  partners i w and the `dir<k>` directions
  (`POSCAR_YMnO3_spin_K3_K_comp2.vesta`, `POSCAR_YMnO3_spin_K5_K_dir1.vesta`).
- `samm_<formula>_<element>_<q>` (samm = symmetry-adapted magnetic moments): the whole report of a `--qpoint` run,
  saved exactly as printed in the current directory, next to the VESTA files,
  so that `> file` is not needed: `samm_AlNi3_Ni_GM` above,
  `samm_AlNi3_Ni_R` for `--qpoint R` or `--qpoint 0.5 0.5 0.5`. The
  formula is the reduced formula of the primitive cell (as in the VESTA
  names), the element is `--element`, and the q point is named as in the line
  `Selected q-point:`, with `GM` for GAMMA; `--conventional` adds `_conv`, as
  it does to the VESTA names. A point off the special points is named by its
  line or plane (`DT` for `--qpoint 0 0 1/4`), so two points of one line share
  the name, as their VESTA files do. Warnings on the standard error stream
  are not in the file.
- `S<POSCAR name>_<q>`: the magnetic cell of the MAGMOM lines as a VASP 5
  POSCAR with direct coordinates, in the current directory. The name is `S`
  before the file name of `-c` without its directory, and the q part of the
  report name (`GM` for GAMMA, a character other than a letter, a digit, `+`
  or `-` replaced by `_`, `_conv` with `--conventional`):
  `-c POSCAR_VO2_P42mnm --qpoint A` (or `--qpoint 0.5 0.5 0.5`) writes
  `SPOSCAR_VO2_P42mnm_A`, `-c POSCAR --qpoint GM` writes `SPOSCAR_GM`, and
  `-c ../139_PPOSCAR_La3Ni2O7 --qpoint 0 0 0.5 --conventional` writes
  `S139_PPOSCAR_La3Ni2O7_X_conv`. Its cell and atom order are those of the
  `spin directions` listings, the MAGMOM lines and the VESTA files, so a
  MAGMOM line goes into the INCAR of a noncollinear run (`LNONCOLLINEAR =
  .TRUE.`) on this POSCAR as it is (it has 3 numbers per atom of the file).
  The species keep the blocks of the input (`V O` with `16 32` for the 2x2x2
  cell of VO2 at A), so the POTCAR of the input cell fits. At q = 0 the cell
  is the input cell itself (the conventional cell with `--conventional`).
- The line under `* Output files *` reads `(atom order of the MAGMOM lines)`,
  or `(atom order of the spin listings)` with `--format qe`, whose input has
  no MAGMOM line (the Quantum ESPRESSO types then group atoms by direction,
  not by position in the file).
- One report and one magnetic-cell POSCAR are written per run, and a file of
  the same name is overwritten; a run that stops with an `ERROR` writes
  neither.
- The survey mode (no `--qpoint`) and `--classify-only` write no VESTA file
  and no magnetic-cell POSCAR, but save their report, exactly as printed, as
  `samm_<formula>_<element>_survey` (`samm_AlNi3_Ni_survey`) and
  `samm_<formula>_<element>_<q>_classify` (`samm_TiO2_Ti_GM_classify`; the q
  part as above, `_conv` included), announced by `* Output files *` /
  `Report written to: ... (this output)` like the report of a `--qpoint` run.
  `--no-files` (only in these two modes) prints without saving; so does the
  environment variable `CRYSTOD_NO_REPORT=1`. `--classify-only` with
  `--subgroup-poscar` saves no file.

:::

:::{dropdown} Magnetic supercell at q ≠ 0

**Magnetic supercell at q ≠ 0.**

- For q != 0 (e.g. `--qpoint R`) the commensurate magnetic supercell is built
  automatically, with the Bloch phase applied to the spins and the
  MAGMOM/VESTA output referring to the supercell.
- The atoms of the supercell are listed atom by atom, as in the `SPOSCAR` of
  phonopy: each atom of the primitive cell is followed by its images in the
  other cells of the magnetic cell (for AlNi3 at R, the 2x2x2 cell lists
  `Al1` to `Al8` and then `Ni9` to `Ni32`), so the species blocks of the input
  stay grouped and the POTCAR of the input cell matches the `SPOSCAR_*` file.
  The same holds for the conventional cell of `--conventional`.
- The supercell takes the denominator of each coordinate of q along the
  primitive axes, up to 12; a q that does not fit such a cell (`0 0 0.15`,
  that is 3/20) is refused with an ERROR that names the smallest commensurate
  supercell (1x1x20), instead of a cell that would cut the modulation.

:::

:::{dropdown} Options

**Options.**

| option | meaning |
|---|---|
| `--element EL` | the magnetic element whose sites carry the spins |
| `--qpoint` | the q point, as a name (`GM`, `R`, ...) or three coordinates (`0 0 0`, `0.5 0.5 0.5`, `0 0 1/4`); without it, the survey of every special k point |
| `--format` | `vasp` (default) prints a noncollinear `MAGMOM` line; `qe` prints the Quantum ESPRESSO counterpart (above) |
| `--amplitude` | the arrow length of the largest spin in the VESTA files, in Angstrom (default 1.5) |
| `--conventional` | exports the spin structures in the conventional cell instead of the primitive cell (VESTA files get a `_conv` suffix, and for q != 0 the conventional cell is multiplied until the Bloch phase is commensurate, again with at most 12 cells per axis: NaCl at `1/5 1/7 0` is refused with `--conventional`, and the ERROR names the 5x7x1 primitive supercell that works without it); with `-c ... --irrep` the arrangements of every row in the conventional cell ([section 05-01](#05-01-magnetic-arrangements-of-given-irreps---irrep-with--c)); when the input primitive cell is not in the standard primitive setting of its centring (the PPOSCAR of `phonopy --symmetry` is), the cell written is not the conventional cell and a NOTE under the `Display cell:` line says so (the spin structures and their groups hold for the cell as written) |
| `--tolerance` | the symmetry tolerance (default 1e-5, a distance in Angstrom), used by spglib and for matching the sites onto each other, both in the spin representation and in the collinear classification. The Bloch phases are built from the site positions symmetrized by the space group, so a structure slightly off its ideal positions decomposes and classifies like the ideal one (an AlNi3 cell with the Ni coordinates off by about 1e-4 gives `2 x GM4+(3) + GM5+(3)` and the groups and classes of the ideal cell with `--tolerance 1e-2`; the listings keep the input positions) |
| `--classify-only`, `--show-operations` | the magnetic-group table alone; the operations kept and broken (section [05-03](#05-03-magnetic-space-groups-and-collinear-classes---classify-only)) |
| `--no-files` | survey and `--classify-only` only: print without saving `samm_<formula>_<element>_survey` / `samm_<formula>_<element>_<q>_classify` |
| `--subgroup-poscar CHILD` | at q ≠ 0: the bases placed on a distorted structure whose cell is a magnetic cell of q, every direction aligned with its structural domain (section [05-07](#05-07-spin-bases-aligned-with-a-subgroup-structure---subgroup-poscar)) |

:::

:::{dropdown} Requirements

**Requirements.** The input must be a primitive cell. It is used as given
(the spin listings and MAGMOM follow its atom order), and a conventional cell
or a supercell is refused with the same one-line ERROR in the survey and the
`--qpoint` modes (the PPOSCAR of `phonopy --symmetry` is a primitive cell).
For the two-atom cubic cell of bcc Fe:

```
ERROR: the input cell is not primitive (2 atoms, the primitive cell has 1); crystod-mag uses the cell as given (the spin listings and MAGMOM follow its atom order) and needs a primitive cell, such as the PPOSCAR of phonopy --symmetry (--conventional then exports the spin structures in the conventional cell).
```

:::

## 05-03. Magnetic space groups and collinear classes (`--classify-only`)

*Example directory: `example/05-03_magnetic_group` (testsuite section 05-03); after pip install: `crystod-example 05-03`*

Which of the magnetic orders that the symmetry of the crystal admits is an
altermagnet, and which one allows a magnetoelectric effect? Every spin basis
vector that `crystod-mag --qpoint` exports is also an arrangement of moments
with its own symmetry: for each exported component the command gives the magnetic space
group (MSG) of that arrangement, its magnetic point group (MPG), the
macroscopic responses the MPG allows by symmetry (a net magnetization, an
electric polarization, the linear magnetoelectric effect, piezomagnetism) and, for a collinear
arrangement, its class: ferromagnet, ferrimagnet, conventional
antiferromagnet, or altermagnet with its d-, g- or i-wave type.

```{seealso}
**Theory:** [Magnetic space groups and collinear classes of spin arrangements](theory-representations.md#magnetic-space-groups-and-collinear-classes-of-spin-arrangements-crystod-mag---classify-only) —
the BNS types and symbols, the magnetic point group and the UNI symbol, the
response tensors, the rules of the collinear classification and of the
altermagnet wave type, the real spin field at q ≠ 0, and the order-parameter
reading of the kept and broken operations.
```

| Input | Command | Output |
|---|---|---|
| primitive POSCAR, magnetic element, q point | `crystod-mag -c POSCAR --element Ti --qpoint GM --classify-only` | terminal: the list of bases and the table `* Magnetic groups and collinear classes *`; file: the report `samm_<formula>_<element>_<q>_classify` (no VESTA files, no magnetic-cell POSCAR) |
| the same | without `--classify-only` | the listing of section [05-02](#05-02-symmetry-adapted-spin-bases), each component with five more lines: MSG, MPG, UNI symbol, allowed responses, collinear order |
| the same | add `--show-operations` | the operations of the paramagnetic group that each component keeps and breaks ([below](#operations-kept-and-broken---show-operations)) |

`--classify-only` prints the table alone:

```bash
crystod-mag -c example/test_POSCARs/136_PPOSCAR_TiO2 --element Ti --qpoint GM --classify-only
```

```
...
* Symmetry-adapted spin bases *
  GM3+(1): dim 1 [FM, dipole]
  GM5+(2): dim 2 [FM, dipole]
  GM5+(2): dim 2 [AFM, octupole]
  GM2+(1): dim 1 [AFM, octupole]

* Magnetic groups and collinear classes *
basis                    component  MSG (BNS)             type  MPG      net magnetization  class                 MSG (UNI)
GM3+(1) [FM, dipole]     z          P4_2/mn'm' (136.501)  III   4/mm'm'  along z            ferromagnet           P4_2/mn'm'
GM5+(2) [FM, dipole]     1m10       Cmm'm' (65.486)       III   mm'm'    along [1-10]       ferromagnet           Cmm'm'
GM5+(2) [FM, dipole]     110        Cmm'm' (65.486)       III   mm'm'    along [110]        ferromagnet           Cmm'm'
GM5+(2) [FM, dipole]     x          Pnn'm' (58.398)       III   mm'm'    along x            ferromagnet           Pnn'm'
GM5+(2) [AFM, octupole]  1m10       Cmm'm' (65.486)       III   mm'm'    along [1-10]       altermagnet (d-wave)  Cmm'm'
GM5+(2) [AFM, octupole]  110        Cmm'm' (65.486)       III   mm'm'    along [110]        altermagnet (d-wave)  Cmm'm'
GM5+(2) [AFM, octupole]  x          Pnn'm' (58.398)       III   mm'm'    along y            altermagnet (d-wave)  Pnn'm'
GM2+(1) [AFM, octupole]  z          P4_2'/mnm' (136.499)  III   4'/mmm'  none               altermagnet (d-wave)  P4_2'/mnm'

MSG: magnetic space group from the moment directions (BNS number, type I-IV);
MPG: magnetic point group; net magnetization: the direction allowed by symmetry;
class: from the signs of the moments along their common axis only (nonrelativistic).
MSG and MPG symbols are in the standard BNS setting; directions are in the Cartesian axes of the input cell.
MSG (UNI): unified symbol (Campbell et al., Acta Cryst. A78, 99 (2022)), the BNS symbol with .1 (type I) or .1' (II); type IV: .1'_t[F], t the anti-translation, F the family space group.
...
* Output files *
  Report written to: samm_TiO2_Ti_GM_classify (this output)

...
Reference (collinear classes): L. Smejkal, J. Sinova and T. Jungwirth, Phys. Rev. X 12, 031042 (2022).
```

**How to read the output.**

- `component`: the tag of the listing and of the VESTA file name of the
  component: `x`, `y`, `z`, `110`, `111`, `1m10`, `aa`, ..., with `_2`, `_3`
  when the same tag occurs again in the same basis (`x_2` is the second `x`
  component and the file `..._x_2.vesta`), and `comp<N>` for a component
  without a single direction: the N-th basis vector of its space, counted
  from 1 like the mode numbers of the other commands
  (`POSCAR_AlNi3_spin_R4+_R_comp1.vesta` is the first of the three R4+
  components). At a q that is not time-reversal invariant a d-dimensional
  basis has 2d components, the rows w (`comp1` .. `comp<d>`) and their
  partners i w (`comp<d+1>` .. `comp<2d>`, or the axis tag of a collinear
  row); `dir<k>` is a one-parameter order-parameter direction exported on
  its own (section [05-06](#05-06-order-parameter-directions-of-the-spin-bases)).
- `MSG (BNS)`, `magnetic space group`: the group of the arrangement as spglib
  finds it, with its Belov-Neronova-Smirnova (BNS) symbol and number
  (`P4_2'/mnm'`, 136.499) and its type: I, no operation with time reversal;
  II, the grey group of a non-magnetic crystal; III, half of the operations
  combined with time reversal (primed); IV, a lattice translation combined
  with time reversal (the subscript of the lattice letter, `P_I`, `C_c`,
  `R_I`). The operations are counted in the magnetic cell.
- `MPG`, `magnetic point group`: derived from the BNS symbol and checked
  against the operations (a symbol that disagrees is printed with `?`).
- `MSG (UNI)`, `UNI symbol`: the unified symbol of Campbell et al., Acta
  Cryst. A78, 99 (2022): the BNS symbol with `.1` (type I) or `.1'` (type
  II), unchanged for type III (`P4_2'/mnm'`); a type IV group reads
  `.1'_t[F]`, t the anti-translation and F the family space group
  (`P_I4/mnc` is `P4/mnc.1'_I[I4/mmm]`).
- `net magnetization`, `allowed by symmetry`: the direction of a net
  magnetization the MPG allows, in the Cartesian axes of the input cell
  (`along z`, `in the xy plane`, `any direction`, `none`), and the numbers of
  independent components of the linear magnetoelectric tensor and of the
  piezomagnetic tensor. Symmetry decides what is allowed, not how large it
  is: an allowed response can be small. An AFM basis vector that shares its
  irrep with the FM dipole (the GM4+ octupoles of AlNi3) allows a net
  magnetization by symmetry although its own moments add up to zero.
- `electric polarization`, after the net magnetization: the direction of a
  spontaneous electric polarization the MPG allows, in the same words. The
  polarization is a time-even polar vector, so time reversal does not
  constrain it: it is allowed when the point group of the spatial parts of
  all operations is polar, and an MPG with `-1'` (Cr2O3, -3'm') forbids it as
  `-1` does. The direction is followed by `(induced by the spin order)` when
  the crystal without spins (the same structure, same tolerance) allows no
  polarization, and by `(the crystal without spins: along z)` when that
  crystal allows fewer components than the spin arrangement; nothing follows
  it when both allow the same components.
- `class`, `collinear order`, from the signs of the moments along their common
  axis only (nonrelativistic): `ferromagnet` and `ferrimagnet` (nonzero net
  moment), `compensated, sublattices not related by symmetry`,
  `antiferromagnet (T tau)` (a pure translation exchanges the sublattices) and
  `antiferromagnet (P T)` (the inversion does; the bands stay spin degenerate
  in the nonrelativistic limit), `altermagnet (d-wave)` / `(g-wave)` /
  `(i-wave)` (only rotations or mirrors exchange the sublattices), and
  `noncollinear (not classified)`. For an altermagnet the listing adds the
  lowest-order spin splitting allowed by symmetry (`~ k_x k_y` for rutile)
  and the spin-degenerate planes, in the Cartesian axes of the input cell.

:::{dropdown} More on reading the output

- Two frames meet in one row: the MSG and MPG symbols are those of the
  standard BNS setting, whatever the orientation of the input cell, while the
  net magnetization, the spin-splitting polynomials and the degenerate planes
  are given in the Cartesian axes of the input cell. A row
  `Pnn'm' ... mm'm' ... along y` is therefore consistent: the standard
  setting of Pnn'm' allows a moment along its own x axis, which is y of the
  input cell.
- `magnetic space group: not identified by spglib (N operations, M with time
  reversal)`: the MSG, type and MPG cells of the table hold `-`, and the
  responses and the class are still computed from the operations.
- At q = 0 every AFM basis vector has a zero net moment, and the closing
  sentence `All AFM bases satisfy sum_i S_i = 0` says so. A note under the
  table names every merged pair of a complex irrep and its conjugate
  (`GM3+GM4+(2)`, the label that `crystod-group --parent` prints for the same
  pair); each copy of such a pair has two real partners.

:::

:::{dropdown} The listing without `--classify-only`

Without `--classify-only` every component of the listing gets five more
lines after its net moment, here for the antiparallel pair along c (the
RuO2 / MnF2 order):

```
* GM2+(1) [AFM, octupole] *
  component z:
    Ti1: S = [ 0.0000,  0.0000,  1.0000]
    Ti2: S = [ 0.0000,  0.0000, -1.0000]
    net moment: [0.0, 0.0, 0.0]
    magnetic space group: P4_2'/mnm' (BNS 136.499, type III), 16 operations, 8 with time reversal
    magnetic point group: 4'/mmm'
    UNI symbol: P4_2'/mnm'; point group 4'/mmm'
    allowed by symmetry: net magnetization none; electric polarization none; linear magnetoelectric effect none; piezomagnetism 2 components
    collinear order: altermagnet (d-wave; spin splitting allowed by symmetry ~ k_x k_y; spin-degenerate planes perpendicular to [100], [010])
    spin directions (all atoms, POSCAR order):
...
```

:::

:::{dropdown} Moment directions versus sign pattern (MnO2)

**Moment directions versus sign pattern (MnO2).** The MSG uses the moment
directions, the class only their sign pattern, and the two can differ: in
MnO2 (Pnnm) the antiparallel pair along z has the type I group Pnnm and
along x the type III group Pnn'm' (standard setting; here it allows a net
magnetization along y of the input cell), while both are d-wave
altermagnets:

```bash
crystod-mag -c example/test_POSCARs/58_PPOSCAR_MnO2 --element Mn --qpoint GM --classify-only
```

```
...
* Magnetic groups and collinear classes *
basis                    component  MSG (BNS)        type  MPG    net magnetization  class                 MSG (UNI)
GM1+(1) [AFM, octupole]  z          Pnnm (58.393)    I     mmm    none               altermagnet (d-wave)  Pnnm.1
GM2+(1) [FM, dipole]     z          Pn'n'm (58.397)  III   m'm'm  along z            ferromagnet           Pn'n'm
GM4+(1) [FM, dipole]     y          Pnn'm' (58.398)  III   mm'm'  along y            ferromagnet           Pnn'm'
GM4+(1) [AFM, octupole]  x          Pnn'm' (58.398)  III   mm'm'  along y            altermagnet (d-wave)  Pnn'm'
GM3+(1) [FM, dipole]     x          Pnn'm' (58.398)  III   mm'm'  along x            ferromagnet           Pnn'm'
GM3+(1) [AFM, octupole]  y          Pnn'm' (58.398)  III   mm'm'  along x            altermagnet (d-wave)  Pnn'm'
...
```

:::

:::{dropdown} Magnetoelectric Cr2O3 and hematite

**Magnetoelectric Cr2O3 and hematite.** On the four Cr sites of R-3c
(`example/05-03_magnetic_group/Cr2O3/PPOSCAR_Cr2O3_R-3c`, rhombohedral primitive cell
with the hexagonal c axis along z), the order + - + - along c (GM1- z) is the
Cr2O3 order: R-3'c' (167.106), MPG -3'm', a conventional antiferromagnet
(`P T`) with the linear magnetoelectric effect allowed by symmetry,
`alpha_11 = alpha_22` and `alpha_33`. The order + - - + (GM1+ z, the
hematite order below the Morin transition) is the type I group R-3c
(167.103), a g-wave altermagnet with piezomagnetism allowed. With the
Python API, `format_magnetic_responses` prints the tensor forms:

```python
from phonopy.interface.vasp import read_vasp
from crystod import mag

result = mag.analyze_spin_basis(read_vasp("Cr2O3/PPOSCAR_Cr2O3_R-3c"), "Cr", "GM")
cr2o3 = next(c for c in result.components if c.label.startswith("GM1-"))
print(cr2o3.group.bns_symbol, cr2o3.group.magnetic_point_group)
print("\n".join(mag.format_magnetic_responses(cr2o3.responses)))
```

```
R-3'c' -3'm'
  net magnetization: forbidden by symmetry
  electric polarization: forbidden by symmetry
  linear magnetoelectric effect: allowed by symmetry, 2 independent components
    alpha  1        2        3
    1      alpha11  0        0
    2      0        alpha11  0
    3      0        0        alpha33
  piezomagnetism: forbidden by symmetry
```

The orders with the moments in the plane belong to the two-dimensional irreps
GM3+ and GM3-. Their partners are taken along the two-fold axis of R-3c that
lies along a (x of this cell) and perpendicular to it (y), and every
arrangement keeps a monoclinic group with that two-fold axis:

```bash
crystod-mag -c example/05-03_magnetic_group/Cr2O3/PPOSCAR_Cr2O3_R-3c --element Cr --qpoint GM --classify-only
```

```
...
GM3+(2) [FM, dipole]         x          C2/c (15.85)      I     2/m    along x            ferromagnet            C2/c.1
GM3+(2) [FM, dipole]         y          C2'/c' (15.89)    III   2'/m'  in the yz plane    ferromagnet            C2'/c'
GM3+(2) [AFM, octupole]      y          C2/c (15.85)      I     2/m    along x            altermagnet (g-wave)   C2/c.1
GM3+(2) [AFM, octupole]      x          C2'/c' (15.89)    III   2'/m'  in the yz plane    altermagnet (g-wave)   C2'/c'
GM3-(2) [AFM, quadrupole]    x          C2'/c (15.87)     III   2'/m   none               antiferromagnet (P T)  C2'/c
GM3-(2) [AFM, quadrupole]    y          C2/c' (15.88)     III   2/m'   none               antiferromagnet (P T)  C2/c'
GM3-(2) [AFM, quadrupole]    y_2        C2'/c (15.87)     III   2'/m   none               antiferromagnet (P T)  C2'/c
GM3-(2) [AFM, quadrupole]    x_2        C2/c' (15.88)     III   2/m'   none               antiferromagnet (P T)  C2/c'
...
```

The GM3+ octupole is the hematite order + - - + with the moments in the
plane: C2/c with the moments perpendicular to the two-fold axis, C2'/c' with
the moments along it, where a net magnetization perpendicular to the moments
(in the yz plane) is allowed by symmetry. The first GM3- copy is the order
+ - + - of Cr2O3 with the moments in the plane, the second the order + + - -.
Each AFM copy lists its partners in the order of the FM partners they
transform like, not by their own moment directions: the first octupole row
(moments along y) has the group of the FM dipole along x.

:::

:::{dropdown} Complex conjugate pairs

**Complex conjugate pairs.** In P4/m the irreps GM3+ and GM4+ (and GM3- and
GM4-) are one-dimensional and complex; each pair forms one real
two-dimensional space, listed under its pair label. For the Ti 4k sites of
Ti2Ga3 the in-plane FM dipole and the in-plane octupole both belong to
GM3+GM4+:

```bash
crystod-mag -c example/test_POSCARs/83_PPOSCAR_Ti2Ga3 --element Ti --qpoint GM --classify-only
```

```
...
  Decomposition: GM1+(1) + 2 x GM1-(1) + 2 x GM3+GM4+(2) + GM3-GM4-(2) + GM2+(1) + 2 x GM2-(1)

* Symmetry-adapted spin bases *
  GM1+(1): dim 1 [FM, dipole]
  GM1-(1): dim 1 [AFM, quadrupole]
  GM1-(1): dim 1 [AFM, hexadecapole]
  GM3+GM4+(2): dim 2 [FM, dipole]
  GM3+GM4+(2): dim 2 [AFM, octupole]
  GM3-GM4-(2): dim 2 [AFM, quadrupole]
  GM2+(1): dim 1 [AFM, octupole]
  GM2-(1): dim 1 [AFM, quadrupole]
  GM2-(1): dim 1 [AFM, quadrupole]

* Magnetic groups and collinear classes *
basis                          component  MSG (BNS)       type  MPG    net magnetization  class                  MSG (UNI)
GM1+(1) [FM, dipole]           z          P4/m (83.43)    I     4/m    along z            ferromagnet            P4/m.1
GM1-(1) [AFM, quadrupole]      comp1      P4/m' (83.46)   III   4/m'   none               noncollinear           P4/m'
GM1-(1) [AFM, hexadecapole]    comp1      P4/m' (83.46)   III   4/m'   none               noncollinear           P4/m'
GM3+GM4+(2) [FM, dipole]       x          P2'/m' (10.46)  III   2'/m'  in the xy plane    ferromagnet            P2'/m'
GM3+GM4+(2) [FM, dipole]       y          P2'/m' (10.46)  III   2'/m'  in the xy plane    ferromagnet            P2'/m'
GM3+GM4+(2) [AFM, octupole]    x          P2'/m' (10.46)  III   2'/m'  in the xy plane    altermagnet (d-wave)   P2'/m'
GM3+GM4+(2) [AFM, octupole]    y          P2'/m' (10.46)  III   2'/m'  in the xy plane    altermagnet (d-wave)   P2'/m'
GM3-GM4-(2) [AFM, quadrupole]  z          P2'/m (10.44)   III   2'/m   none               antiferromagnet (P T)  P2'/m
GM3-GM4-(2) [AFM, quadrupole]  z_2        P2'/m (10.44)   III   2'/m   none               antiferromagnet (P T)  P2'/m
GM2+(1) [AFM, octupole]        z          P4'/m (83.45)   III   4'/m   none               altermagnet (d-wave)   P4'/m
GM2-(1) [AFM, quadrupole]      comp1      P4'/m' (83.47)  III   4'/m'  none               noncollinear           P4'/m'
GM2-(1) [AFM, quadrupole]      comp1_2    P4'/m' (83.47)  III   4'/m'  none               noncollinear           P4'/m'
...
component: the tag of the listing and of the VESTA file name (comp<N>: the N-th basis vector of its space).
GM3+GM4+(2): a complex irrep and its conjugate, merged into one real space (the physically irreducible representation).
GM3-GM4-(2): a complex irrep and its conjugate, merged into one real space (the physically irreducible representation).
```

The in-plane octupole shares the pair with the dipole, so it allows a net
magnetization in the plane by symmetry although its own moments add up to
zero, as the GM4+ octupoles of AlNi3 do. In Python,
`SpinBasisAnalysis.pair_labels` lists the merged pairs.

:::

:::{dropdown} Classification at q != 0

**q != 0.** The classification refers to the real spin field of the magnetic
cell. At a q that is not time-reversal invariant that field depends on the
phase of the complex order parameter, and the components of a basis are its
real and imaginary parts, w and i w, which together span the real
order-parameter space; every one-parameter direction in it, with its
magnetic isotropy subgroup, is listed under `* Order-parameter directions *`
(section [05-06](#05-06-order-parameter-directions-of-the-spin-bases)). For the NiO-type
order on the Na sites of rock salt at L (moments along [111]):

```bash
crystod-mag -c example/test_POSCARs/225_PPOSCAR_NaCl --element Na --qpoint L --classify-only
```

```
...
* Magnetic groups and collinear classes *
basis                  component  MSG (BNS)         type  MPG    net magnetization  class                    MSG (UNI)
L2+(1) [AFM (q != 0)]  111        R_I-3c (167.108)  IV    -3m1'  none               antiferromagnet (T tau)  R-3c.1'_c[R-3m]
...
```

At a time-reversal-invariant q != 0 a complex irrep and its conjugate are
listed under their pair label, as at q = 0, also when they are
two-dimensional. For Zn at A of ZnO (P6_3mc) the decomposition is
`A2A3(2) + A5A6(4)`, the list of bases reads `A5A6(4): dim 4 [AFM (q != 0)]`,
and the table has its four real partners as `comp1` ... `comp4`: the real
parts of the two complex partners followed by their imaginary parts.

:::

:::{dropdown} Limits

**Limits.**

- Only collinear arrangements are classified; a noncollinear component gets
  `noncollinear (not classified)` (its MSG and responses are still given).
- The table describes the components as `crystod-mag` exports them: for an
  irrep of dimension two or three each exported component is one
  arrangement, and another partner direction can have another MSG.
- At q != 0 the components span the real order-parameter space of their
  basis (at a q that is not time-reversal invariant, the rows w and their
  partners i w), and every one-parameter direction of it is exported, so no
  magnetic isotropy subgroup depends on a phase convention; the components
  of a direction with two or more free parameters are not singled out
  (`free` in `* Order-parameter directions *`).
- The MPG symbol is derived from the BNS symbol and checked; the operations
  (`MagneticGroupInfo.rotations`, `.translations`, `.time_reversals`) are the
  authority.
- `--classify-only` needs `--qpoint`; the survey mode (no `--qpoint`) does
  not classify.
- At q = 0 the partners of a two- or three-dimensional irrep lie along
  directions that symmetry fixes; which of several equivalent choices is
  printed is a convention (in a trigonal or hexagonal crystal the a axis of
  the input cell and the direction perpendicular to it, whichever of the
  equivalent in-plane axes spglib calls a), and a rotated input cell gives the
  same groups and classes with the directions rotated. The partners of a
  merged complex pair are not fixed by symmetry and follow a convention
  ([Real partners of merged complex pairs and repeated irreps](theory-representations.md#real-partners-of-merged-complex-pairs-and-repeated-irreps)).

:::

:::{dropdown} Python API

**Python API.**

```python
from phonopy.interface.vasp import read_vasp
from crystod import mag

result = mag.analyze_spin_basis(read_vasp("136_PPOSCAR_TiO2"), "Ti", "GM")
for row in mag.magnetic_summary_rows(result):
    print(row)
component = result.components[-1]                 # GM2+(1) [AFM, octupole], z
component.group.bns_number, component.collinear.wave, component.collinear.spin_splitting
# ('136.499', 'd-wave', ('k_x k_y',))
```

`mag.magnetic_space_group(lattice, positions, numbers, magmoms)`,
`mag.macroscopic_responses(group)` and `mag.classify_collinear(...)` work on
any cell and spin field; their docstrings give the arguments.
`analyze_spin_basis` takes `--tolerance` as `symprec` and raises `ValueError`,
with the text of the ERROR lines of the command, for a cell that is not
primitive and for a q that does not fit a magnetic cell of at most 12 cells
along each axis. At q ≠ 0, `result.directions` lists the order-parameter
directions (`mag.OrderParameterDirection`) and every component carries
`direction_label` and `direction_subgroup` (section
[05-06](#05-06-order-parameter-directions-of-the-spin-bases)).

:::

### Operations kept and broken (`--show-operations`)

Which operations of the paramagnetic group does a magnetic order keep, and
which does it break? With `--show-operations` every component also lists the
operations of the paramagnetic group G + theta G (`I4/mmm1'`), one per coset
of the lattice translations, split into those the arrangement keeps and
those it breaks.

```{seealso}
**Theory:** [Operations kept and broken as an order-parameter condensation](theory-representations.md#operations-kept-and-broken-as-an-order-parameter-condensation) —
why the kept operations are those on which the time-odd order parameter
equals +1, and how they are matched to the operations of the crystal.
```

| Input | Command | Output |
|---|---|---|
| primitive POSCAR, magnetic element, q point | `crystod-mag -c POSCAR --element Cu --qpoint GM --show-operations` | the listing of section [05-02](#05-02-symmetry-adapted-spin-bases), each component with its kept and broken operations |
| the same | add `--classify-only` | the table, then the lists as a block `* Symmetry operations kept and broken *` after it |

For the Cu site of La2CuO4 (I4/mmm, the site of Ce in CeRu2Si2) with the
moments along c:

```bash
crystod-mag -c example/05-02_spin_basis/La2CuO4_I4mmm/139_PPOSCAR_La2CuO4 --element Cu --qpoint GM --show-operations
```

```
* GM3+(1) [FM, dipole] *
  component z:
    ...
    magnetic space group: I4/mm'm' (BNS 139.537, type III), 16 operations, 8 with time reversal
    ...
    operations of the paramagnetic group I4/mmm1' (16 {R|t} and 16 {R|t}' = theta{R|t}, one per coset; t in the conventional cell):
      kept (16):   {E|0} {C4z|0} {C2z|0} {C4z^3|0} {I|0} {IC4z|0} {IC2z|0} {IC4z^3|0}
                   {C2x|0}' {C2y|0}' {C2[110]|0}' {C2[1-10]|0}' {IC2x|0}' {IC2y|0}' {IC2[110]|0}' {IC2[1-10]|0}'
      broken (16): {C2x|0} {C2y|0} {C2[110]|0} {C2[1-10]|0} {IC2x|0} {IC2y|0} {IC2[110]|0} {IC2[1-10]|0}
                   {E|0}' {C4z|0}' {C2z|0}' {C4z^3|0}' {I|0}' {IC4z|0}' {IC2z|0}' {IC4z^3|0}'
```

**How to read the output.**

- `{R|t}'` is theta{R|t}, the operation followed by time reversal (the prime
  of the BNS symbols).
- R is named as in Bradley and Cracknell (E, I, `C4z`, `C4z^3`, `C2[1-10]`,
  `IC2x` = the mirror perpendicular to x; x, y, z along the axes of an
  orthogonal conventional cell, else `[uvw]` in the conventional cell), and t
  is given in the conventional cell.
- `kept`: the operations of the magnetic space group of the arrangement;
  `broken`: the other operations of G + theta G.
- Where q != 0 an operation can be kept both ways, `{R|t}` with a translation
  of the magnetic cell and `{R|t}'` with an anti-translation (type IV); a
  note line says so.

`--show-operations` needs `--qpoint`. In Python,
`crystod.spin_basis.parent_operations(analysis, component)` gives the lists
as `ParentOperation` (`symbol`, `kept`, `kept_primed`).

## 05-04. Magnetic isotropy subgroups (`--parent`)

*Testsuite section 05-04; no structure file and no example directory are needed.*

Which magnetic space groups can a magnetic order of a given k point give in a
space group, without any structure file? This is the magnetic counterpart of
[`crystod-group --parent SG --kpoint K`](crystod-group.md#02-10-isotropy-subgroups---parent):
every order-parameter direction of every irrep of the k point is listed with
its magnetic space group (BNS number and symbol), the cell size and the index.

```{seealso}
**Theory:** [Magnetic isotropy subgroups](theory-isotropy-subgroups.md#magnetic-isotropy-subgroups-crystod-mag---parent) —
the definition of the magnetic isotropy subgroup with time reversal acting as
−1 on the order parameter, why the table has directions that the structural
one lacks, how the groups are identified, and the validation against the
magnetic isotropy subgroups tabulated in ISOTROPY's `data_magnetic.txt`.
```

| Input | Command | Output |
|---|---|---|
| space group, k point | `crystod-mag --parent Pm-3m --qpoint GM` | terminal: every irrep of the k point, each order-parameter direction with its magnetic space group, size and index |
| space group, one irrep | `crystod-mag --parent Pm-3m --irrep R4+` | the same for that irrep |
| space group, several irreps | `crystod-mag --parent Pm-3m --irrep R4+ M3+` | each irrep alone, then the coupled order parameters ([below](#several-irreps-coupled-order-parameters)) |

```bash
crystod-mag --parent Pm-3m --qpoint GM
```

```
* Supergroup *
Pm-3m (No. 221)

* Kpoint *
GM
k = (0, 0, 0) in the primitive basis, star of 1 arm(s)

* Order parameter directions and isotropy subgroups *
irrep                subgroup           size  index
GM1+(a)              221.92 Pm-3m       1     2
GM2+(a)              221.95 Pm-3m'      1     2
...
GM4+(0,0,a)          123.345 P4/mm'm'   1     6
GM4+(a,a,a)          166.101 R-3m'      1     8
GM4+(0,a,a)          65.486 Cmm'm'      1     12
GM4+(0,a,b)          10.46 P2'/m'       1     24
GM4+(a,a,b)          12.62 C2'/m'       1     24
GM4+(a,b,c)          2.4 P-1            1     48
GM5+(0,0,a)          123.342 P4'/mm'm   1     6
GM5+(a,a,a)          166.97 R-3m        1     8
GM5+(0,a,a)          65.486 Cmm'm'      1     12
GM5+(0,a,b)          10.46 P2'/m'       1     24
GM5+(a,a,b)          12.58 C2/m         1     24
GM5+(a,b,c)          2.4 P-1            1     48
...
```

**How to read the output.**

- `irrep`: the irrep with an order-parameter direction (`GM4+(0,a,a)`). The
  irrep is ISOTROPY's *m*GM4+; it is printed without the `m`, as everywhere
  in `crystod-mag`. The order-parameter components refer to the same real
  irrep basis as `crystod-group --parent`, which can differ from ISOTROPY's by
  an orthogonal change.
- `subgroup`: the BNS number and symbol of the magnetic space group. GM4+ is
  the ferromagnet: moments along a cube axis give P4/mm'm', along [111]
  R-3m', along [110] Cmm'm'.
- The table has directions that the structural table does not have: moments
  in a (100) plane (P2'/m') or a (110) plane (C2'/m') are the general
  direction P-1 of `crystod-group --parent Pm-3m --irrep GM4+`.
- `size`: the cell of the translations without time reversal, in parent
  primitive cells.
- `index`: [G1' : H], the number of magnetic domains (6 for P4/mm'm': ±x,
  ±y, ±z).

:::{dropdown} A single irrep off Γ (`--irrep R4+`)

At a k point off Γ the subgroups are of type IV wherever a translation
reverses the order parameter:

```bash
crystod-mag --parent Pm-3m --irrep R4+        # mR4+ is accepted too
```

```
irrep                subgroup           size  index
R4+(0,0,a)           140.550 I_c4/mcm   2     6
R4+(a,a,a)           167.108 R_I-3c     2     8
R4+(0,a,a)           74.562 I_bmma      2     12
R4+(0,a,b)           12.64 C_a2/m       2     24
R4+(a,a,b)           15.90 C_c2/c       2     24
R4+(a,b,c)           2.7 P_S-1          2     48
```

:::

:::{dropdown} Options

**Options.**

- `--qpoint` takes a special-point name or three primitive coordinates.
- `--irrep` takes one irrep, a pair label of a complex irrep and its
  conjugate (`GM3+GM4+`), or ISOTROPY's spelling with `m` (`mR4+`).
- `--parent` takes no structure file and no `--element`, `--format`,
  `--amplitude`, `--conventional`, `--tolerance`, `--classify-only` or
  `--show-operations`.

:::

:::{dropdown} Python API

**Python API.**

```python
from crystod import mag

for row in mag.magnetic_isotropy_subgroups("Pm-3m", "GM4+"):
    print(row.label, row.bns_number, row.bns_symbol, row.uni_symbol, row.size, row.index)
# GM4+(0,0,a) 123.345 P4/mm'm' P4/mm'm' 1 6 ...
tables = mag.magnetic_isotropy_subgroups_at_kpoint("Pm-3m", "R")   # {irrep: [rows]}
```

A row (`MagneticIsotropySubgroup`) also carries the type, the OG number, the
magnetic point group, the unitary subgroup (`unitary_number`,
`unitary_symbol`), `n_free` and `n_operations`; bad input raises
`ValueError` with the text of the command's ERROR line.

:::

### Several irreps (coupled order parameters)

*Testsuite section 05-10; example directory `example/05-10_mag_coupled` (README
transcript only); after pip install: `crystod-example 05-10`.*

A magnetic order often condenses more than one irrep at once. With several
irreps after `--irrep`, every irrep is listed alone (as with one irrep), and
then the coupled order parameters: the magnetic isotropy subgroups of the
directions in which every irrep given has a nonzero amplitude. This is the
magnetic counterpart of
[`crystod-group --parent SG --irrep A B`](crystod-group.md#02-10-isotropy-subgroups---parent).

```{seealso}
**Theory:** [Coupled magnetic order parameters](theory-isotropy-subgroups.md#coupled-magnetic-order-parameters) —
the stabilizer in G1' of a vector of the direct sum, why the enumeration is
complete, the secondary order parameters, and how the table was validated.
```

| Input | Command | Output |
|---|---|---|
| space group, two or more irreps | `crystod-mag --parent Pm-3m --irrep R4+ M3+` | terminal: the table of every irrep alone, then the coupled directions with their magnetic space group, size and index |
| one coupled direction | `crystod-mag --parent Pm-3m --irrep R4+ M3+ --order-parameter "0 a a d 0 0"` | terminal: the magnetic isotropy subgroup of that direction (BNS, UNI symbol, unitary subgroup, size, index, sublattice basis) |

```bash
crystod-mag --parent Pm-3m --irrep R4+ M3+
```

```
* Supergroup *
Pm-3m (No. 221)

* Coupled irreps *
R4+: order parameter dimension 3
M3+: order parameter dimension 3 (star of 3 arm(s) x small dim 1)
coupled order parameter dimension 6 (3 + 3)

* Order parameter directions and isotropy subgroups (R4+ alone) *
irrep                subgroup           size  index
R4+(0,0,a)           140.550 I_c4/mcm   2     6
...
R4+(a,b,c)           2.7 P_S-1          2     48

* Order parameter directions and isotropy subgroups (M3+ alone) *
irrep                subgroup           size  index
M3+(0;0;d)           127.397 P_C4/mbm   2     6
M3+(d;d;d)           229.143 Im-3m'     4     8
...

* Order parameter directions and isotropy subgroups (coupled) *
irrep                  subgroup            size  index
R4+(0,0,a) M3+(0;0;d)  127.397 P_C4/mbm    4     12
R4+(0,a,a) M3+(d;0;0)  62.454 P_Bnma       4     24
R4+(0,0,a) M3+(0;d;0)  63.467 C_amcm       4     24
R4+(0,0,a) M3+(d;d;0)  137.516 P_c4_2/nmc  8     24
R4+(0,a,a) M3+(0;d;d)  63.466 C_cmcm       8     48
R4+(a,a,a) M3+(d;d;d)  166.101 R-3m'       8     64
...
R4+(0,0,a) M3+(d;d;e)  129.415 P4'/nmm'    8     48
...
R4+(a,b,c) M3+(d;e;f)  2.4 P-1             8     384

Every irrep of the coupled table condenses with a nonzero
amplitude; every irrep keeps its own independent free
parameters (R4+: a, b, c; M3+: d, e, f).
...
```

**How to read the output.**

- The blocks `(R4+ alone)` and `(M3+ alone)` are the one-irrep tables, with
  the letters of the second irrep shifted (`M3+(0;0;d)`), so that every irrep
  keeps its own free parameters.
- Every row of the coupled table condenses all irreps given; a direction in
  which one irrep is zero belongs to that irrep's own table. The 22 rows are
  every stratum of the coupled order parameter, one per class of conjugate
  subgroups in Pm-3m1'.
- `R4+(0,a,a) M3+(d;0;0)` is the a⁻a⁻c⁺ pattern of the Pnma perovskites; as
  two magnetic irreps it gives the type IV group P_Bnma, whose unitary part is
  Pnma, in a cell of 4 parent cells with 24 domains.
- `size` and `index` are those of the one-irrep table: the cell of the
  translations without time reversal, and [Pm-3m1' : H].

```bash
crystod-mag --parent Pm-3m --irrep R4+ M3+ --order-parameter "0 a a d 0 0"
```

```
* Supergroup *
Pm-3m (No. 221)

* Magnetic isotropy subgroup *
R4+(0,a,a) M3+(d;0;0) -> 62.454 P_Bnma (BNS), type IV
UNI symbol: Pnma.1'_B[Bbmm]; magnetic point group mmm1'
unitary subgroup: Pnma (No. 62)
cell size 4, index 24
sublattice basis (parent primitive units): (2,0,0), (1,1,0), (0,0,2)
```

`--order-parameter` takes the components irrep after irrep, in the order of
`--irrep`, with the spellings of `crystod-group --order-parameter` (`a`,
`-a`, `2a`, `a+b`, `0`; separate words or one string with `;` or `,`). A part
may be zero. Irrational factors printed as rounded decimals (`0.529b`) are
refused, because the rounded direction has another subgroup. With one irrep,
`--order-parameter` gives the subgroup of that direction alone.

:::{dropdown} Reading notes: secondary order parameters, sizes and indices

- **Every row condenses all irreps given.** The coupled table never repeats a
  one-irrep direction with the other irreps at zero.
- **Rows with the group of a one-irrep row.** Some coupled rows have the same
  magnetic space group, size and index as a row of one irrep alone. These are
  the directions where the subgroup of one order parameter already allows the
  other irrep: the second irrep then appears as a secondary order parameter
  induced by the first, and the row is that one-irrep subgroup with the
  induced amplitude written out. In Pm-3m `--irrep GM4+ GM5+`, 8 of the 12
  one-irrep directions do so: the ferromagnet along [011], Cmm'm', is the
  coupled row `GM4+(0,a,-a) GM5+(0,d,d)` 65.486 Cmm'm' with the index 12 of
  `GM4+(0,a,a)` alone, whereas the ferromagnet along z (P4/mm'm') induces no
  GM5+ and has no coupled row of its own. In R4+ M3+ no direction does.
- **Sizes.** The cell of the coupled subgroup contains the cells of both
  irreps: R4+ (size 2) and M3+ (size 2 or 4) give 4 or 8.
- **Indices.** The index is the number of domains of the coupled order. The
  coupled subgroup lies in the subgroup of each irrep alone, so its index is
  a multiple of theirs (P_C4/mbm: 12, twice the 6 of `R4+(0,0,a)` and of
  `M3+(0;0;d)` alone).
- **Labels.** The irreps are printed without the `m` of ISOTROPY (`mR4+`),
  as everywhere in `crystod-mag`; `mR4+` is accepted as input.

:::

:::{dropdown} Python API: coupled tables and time-even irreps

```python
from crystod import mag

result = mag.coupled_magnetic_isotropy_subgroups("Pm-3m", ["R4+", "M3+"])
for row in result.coupled:
    print(row.label, row.bns_number, row.bns_symbol, row.uni_symbol, row.size, row.index)
# R4+(0,0,a) M3+(0;0;d) 127.397 P_C4/mbm P4/mbm.1'_C[rP4/mmm] 4 12 ...
result.singles["R4+"]        # the table of R4+ alone (letters a, b, c)

record = mag.coupled_magnetic_order_parameter("Pm-3m", ["R4+", "M3+"], "0 a a d 0 0".split())
record.row.bns_symbol, record.basis      # P_Bnma, the sublattice basis
```

A distortion and a magnetic order can be combined from Python (the
command line does not take time-even irreps yet): `parities` gives every
irrep its time-reversal parity, `"odd"` (magnetic, the default) or `"even"`
(structural, time reversal acts as +D on it). The time-odd irreps are then
printed with ISOTROPY's `m`:

```python
result = mag.coupled_magnetic_isotropy_subgroups(
    "Pm-3m", ["R4+", "GM4+"], parities=["even", "odd"])
# R4+ alone: grey groups (140.542 I4/mcm1', ...)
# R4+(0,0,a) mGM4+(0,0,d) 140.547 I4/mc'm' 2 12 -- an a0a0c- tilt with a ferromagnet along z
```

The rows are `CoupledMagneticIsotropySubgroup` records (`irreps`,
`direction`, `components`, BNS, type, UNI symbol, magnetic point group,
unitary subgroup, `size`, `index`, `n_free`, `n_operations`); bad input raises
`ValueError`.

:::

## 05-06. Order-parameter directions of the spin bases

*Example directory: `example/05-06_mag_directions` (testsuite section 05-06); after pip install: `crystod-example 05-06`*

Which magnetic orders does one irrep allow at a q point off Γ, and which
magnetic space group does each give? At a q that is not time-reversal
invariant (K of a hexagonal crystal, whose star has the two arms K and -K) the
order parameter of a d-dimensional copy is complex: the spin field
Re[η w exp(2πi q·T)] depends on the phase of η as well as on its size, and the
phase is a physical degree of freedom. `crystod-mag --qpoint` therefore exports
2d components per basis, the rows w (`comp1` .. `comp<d>`, as before) and
their partners i w (`comp<d+1>` .. `comp<2d>`, the phase turned by 90 degrees;
the partner of a collinear row keeps its axis tag), and lists every
order-parameter direction of every basis in the magnetic cell, with
ISOTROPY's label where the q point has a table.

```{seealso}
**Theory:** [Order-parameter directions of the spin bases](theory-isotropy-subgroups.md#order-parameter-directions-of-the-spin-bases-crystod-mag---qpoint) —
the group that acts on the real order-parameter space of a basis in the
magnetic cell, how the strata are found and matched to the rows of
`crystod-mag --parent`, and how the copies of an irrep that occurs more than
once are chosen.
```

| Input | Command | Output |
|---|---|---|
| primitive POSCAR, magnetic element, q ≠ 0 | `crystod-mag -c POSCAR --element Mn --qpoint K` | terminal: `* Order-parameter directions *` after `* Magnetic cell *`, and in every component block the line `order-parameter direction:`; files: one VESTA file per component, the partners i w and the `dir<k>` directions included |
| the same, table only | add `--classify-only` | the direction block and the summary table, with the `dir<k>` rows; file: the report `samm_<formula>_<element>_<q>_classify` |

```bash
cd example/05-06_mag_directions
crystod-mag -c 194_PPOSCAR_YMnO3 --element Mn --qpoint K
```

```
* Symmetry-adapted spin bases *
  K2(1): dim 2 [AFM (q != 0)]
  K3(1): dim 2 [AFM (q != 0)]
  K5(2): dim 4 [AFM (q != 0)]
  K6(2): dim 4 [AFM (q != 0)]

* Magnetic cell *
  Magnetic (commensurate) supercell: 3x3x1
  q is not time-reversal invariant: the order parameter of a d-dimensional basis is complex, ...

* Order-parameter directions *
  irrep direction                       in comp basis       subgroup (BNS)       size  index  component
  K2(0.282a;a)                          (1,0)               193.258 P6_3'/m'c'm  3     6      comp1
  K2(a;0.974a)                          (0,1)               193.261 P6_3/m'c'm'  3     6      comp2
  K2(a;b)                               -                   188.217 P-6'c'2      3     12     free (2 parameters)
  K3(a;0.974a)                          (1,0)               193.255 P6_3/m'cm    3     6      comp1
  K3(0.282a;a)                          (0,1)               193.259 P6_3'/m'cm'  3     6      comp2
  K3(a;b)                               -                   188.218 P-6'c2'      3     12     free (2 parameters)
  K5(0,0;0.628a,a)                      (0,0,1,0)           189.221 P-62m        3     12     z_3
  K5(0,0;a,0.529a)                      (1,0,0,0)           189.225 P-62'm'      3     12     z
  K5(0.628a,a;0.628a,a)                 (0,0,0.707,-0.707)  63.457 Cmcm          3     18     dir1
  K5(a,0.529a;a,0.529a)                 (0.707,-0.707,0,0)  63.459 Cm'cm         3     18     dir2
  K5(0.529a,-a;-0.529a,a)               (0,0,0.707,0.707)   63.460 Cmc'm         3     18     dir3
  K5(a,-0.628a;-a,0.628a)               (0.707,0.707,0,0)   63.462 Cm'c'm        3     18     aa
  K5(0,0;a,b)                           -                   174.133 P-6          3     24     free (2 parameters)
...
  K5(a,b;c,d)                           -                   6.18 Pm              3     72     free (4 parameters)
...

  irrep direction: ISOTROPY's label, as crystod-mag --parent 194 --qpoint K lists it
  in comp basis: spin field = sum_k c_k (field of the k-th basis component, as listed), unit length
  size: cell of the translations without time reversal, in primitive cells; index: number of domains
  dir<k>: a one-parameter direction that no other component lies on, exported as a component of its own

...
* K3(1) [AFM (q != 0)] *
  component comp1:
    Mn1: S = [ 1.0000,  0.0000,  0.0000]
    Mn2: S = [-1.0000,  0.0000, -0.0000]
    net moment over the magnetic supercell: [0.0, 0.0, 0.0]
    order-parameter direction: K3(a;0.974a), magnetic isotropy subgroup 193.255 P6_3/m'cm
    magnetic space group: P6_3/m'cm (BNS 193.255, type III), 72 operations, 36 with time reversal
...
  component comp2:
    Mn1: S = [ 0.0000,  1.0000,  0.0000]
    Mn2: S = [-0.0000,  1.0000, -0.0000]
    net moment over the magnetic supercell: [-0.0, -0.0, 0.0]
    order-parameter direction: K3(0.282a;a), magnetic isotropy subgroup 193.259 P6_3'/m'cm'
    magnetic space group: P6_3'/m'cm' (BNS 193.259, type III), 72 operations, 36 with time reversal
...
```

**How to read the output.**

- `comp1` of K3 is the arrangement of before, the direction K3(a;0.974a) of
  `crystod-mag --parent 194 --qpoint K` with the group P6_3/m'cm; its partner
  `comp2`, the same pattern with the phase turned by 90 degrees, is
  K3(0.282a;a), P6_3'/m'cm', which the export lacked before. Any other phase
  is the generic direction K3(a;b), P-6'c2' (index 12).
- `irrep direction`: ISOTROPY's label of the stratum, as `--parent` prints it
  (matched by the BNS number of the spin field, the index, the free
  parameters and the size). At a q without a table (not a special point) the
  column holds the irrep and the coefficients, `SM4 (-0.601,-0.799)`.
- `in comp basis`: the coefficients c_k of a one-parameter direction in the
  basis components of its basis, in the order of the listing: the spin field
  is sum_k c_k times the field of component k as listed (largest moment 1),
  so a `MAGMOM` line of any direction is the same combination of the
  `MAGMOM` lines of the components.
- `subgroup (BNS)`: the magnetic isotropy subgroup, the magnetic space group
  of the spin field (of a generic field of the stratum for two or more free
  parameters). `size`: the cell of the translations without time reversal,
  in primitive cells; `index`: [G1' : H], the number of domains in the whole
  paramagnetic group.
- `component`: the exported component that lies on the direction (`comp1`,
  `z_3`, the combination `aa`, or `dir<k>`), `free (n parameters)` for a
  direction with two or more free parameters, and `not in this magnetic cell`
  for a row of the table whose arms are not all in the cell (the multi-arm
  directions of a star such as X of a cubic crystal in its 1x2x1 cell).
- `dir<k>`: a one-parameter direction that neither a component nor a
  combination lies on, exported as a component of its own (K5 and K6: the
  four Cmcm-type directions, one of them already the combination `aa`). Its
  VESTA file is `POSCAR_YMnO3_spin_K5_K_dir1.vesta`, and it has its own
  `MAGMOM` line, magnetic space group and class.
- Every component block names the direction it lies on in the line
  `order-parameter direction:` (a component in a stratum of two or more free
  parameters says so: `comp1` of SM4 at `--qpoint 1/3 0 0` lies in the
  two-parameter stratum Am'm'2).

The phase of the K3 order parameter is the angle between the two patterns of
the ferroelectric P6_3cm phase: mapped onto the six Mn of the P6_3cm cell
(`185_PPOSCAR_YMnO3`, a √3×√3 cell of the parent), `comp1` is
0.25 GM1 + 0.75 GM4 and `comp2` is 0.75 GM1 + 0.25 GM4 (squared overlaps with
the GM1 64pole and GM4 octupole bases of
`crystod-mag -c 185_PPOSCAR_YMnO3 --element Mn --qpoint GM`), 60 and 30
degrees from GM1.

:::{dropdown} Time-reversal-invariant q and merged pairs

At a time-reversal-invariant q (R, X, M of a cubic crystal) the bases are real
and have their d components as before; the block lists their directions as
well, matched to the components and combinations: for AlNi3 at R, R4+(0,0,a)
is `comp1` (I_c4/mcm), R4+(0,a,a) `aa0` (I_bmma) and R4+(a,a,a) `aaa`
(R_I-3c), so no `dir<k>` is needed. A merged complex pair (`A5A6(4)` of ZnO
at A) has only directions with two or more free parameters, all `free`. A
mirror-image representative is matched to its table row with a note
(`Z3: 96.148 P_c4_32_12 is the enantiomorphic partner of the table's 92.116`
for TiO2 at Z).

:::

:::{dropdown} Repeated irreps and other q points

At a q that is not time-reversal invariant, the copies of an irrep that
occurs more than once are chosen so that the operations taking q to -q keep
each copy (spgrep's copies are mixed by them): for Mn of YMnO3 at
q = (1/3,0,0) (`--qpoint 1/3 0 0`, the line SM, no table) each of SM2, SM3
and SM4 occurs twice, and each copy has its two one-parameter directions
(Cm'cm, Cm'c'm, ...), exported as `dir1`, `dir2` and named by their
coefficients. Where no such choice exists (an irrep paired with another one),
the directions of the joint space are listed under both labels
(`SM4(1) + SM4(1)`); a basis whose fields do not span a space the operations
keep gets a NOTE in the block instead.

:::

:::{dropdown} Python API

```python
from phonopy.interface.vasp import read_vasp
from crystod import mag

result = mag.analyze_spin_basis(read_vasp("194_PPOSCAR_YMnO3"), "Mn", "K")
for d in result.directions:
    print(d.label, d.direction_label, d.subgroup, d.size, d.index, d.n_free, d.component)
# K2(1) K2(0.282a;a) 193.258 P6_3'/m'c'm 3 6 1 comp1 ...
k3 = [c for c in result.components if c.label.startswith("K3")]
[(c.tag, c.direction_label, c.direction_subgroup) for c in k3]
# [('comp1', 'K3(a;0.974a)', "193.255 P6_3/m'cm"), ('comp2', 'K3(0.282a;a)', "193.259 P6_3'/m'cm'")]
print("\n".join(mag.format_direction_table(result)))
```

`OrderParameterDirection` carries `entry_index`, `label`, `direction_label`,
`bns_number`, `bns_symbol` (`subgroup` joins them), `size`, `index`,
`n_free`, `component`, `coefficients` (in the basis components, unit length)
and `realized` (False for a table row the magnetic cell does not realize);
`SpinBasisComponent.direction` is the direction a component lies in.

:::

## 05-07. Spin bases aligned with a subgroup structure (`--subgroup-poscar`)

*Example directory: `example/05-06_mag_directions` (testsuite section 05-07); after pip install: `crystod-example 05-06`*

Which of the magnetic orders of a q point off Γ does a distorted phase of the
same compound pick, and which magnetic space group does it then have? When the
structural distortion and the magnetic order share their irrep, the answer
depends on the angle between the two order parameters: YMnO3 (P6_3/mmc) turns
ferroelectric P6_3cm through the structural K3 distortion, and the K3 spin
order of Mn gives P6_3cm on that structure when it is parallel to the
structural domain (GM1 of P6_3cm), P6_3'cm' at 90 degrees to it (GM4), and
P3c1 at any other angle. `--subgroup-poscar CHILD` places the bases at q ≠ 0
on the distorted structure and, for every order-parameter direction, finds the
domain whose spin field is one irrep of CHILD at GM.

| Input | Command | Output |
|---|---|---|
| primitive POSCARs of the parent and of a distorted phase whose cell is a magnetic cell of q, magnetic element, q ≠ 0 | `crystod-mag -c 194_PPOSCAR_YMnO3 --element Mn --qpoint K --subgroup-poscar 185_PPOSCAR_YMnO3` | terminal: everything of `--qpoint K`, then `* Subgroup structure *` (the folding of every basis onto the GM irreps of CHILD), `* Transformation matrix (parent -> child) *`, `* Spin bases on the subgroup structure *` (every component and every aligned direction with its irreps of CHILD and its magnetic space group on CHILD) and one block per basis with the aligned fields on CHILD (spins, groups, `MAGMOM` for the atoms of CHILD); files: those of `--qpoint K`, one VESTA file per aligned field and `S<CHILD name>_<q>` in the cell of CHILD |
| the same, tables only | add `--classify-only` | the three blocks, no listing and no files |

```bash
cd example/05-06_mag_directions
crystod-mag -c 194_PPOSCAR_YMnO3 --element Mn --qpoint K --subgroup-poscar 185_PPOSCAR_YMnO3
```

```
* Subgroup structure *
  Subgroup structure: 185_PPOSCAR_YMnO3, P6_3cm (No. 185)
  Magnetic sites: Mn x 6 (3 primitive cells of P6_3/mmc)
  q = K (-1/3, 2/3, 0) folds onto GM of P6_3cm; the fields of each basis are made of:
    K2(1) -> GM2 [A2] + GM3 [B2]
    K3(1) -> GM1 [A1] + GM4 [B1]
    K5(2) -> GM5 [E2] + GM6 [E1]
    K6(2) -> GM5 [E2] + GM6 [E1]

* Transformation matrix (parent -> child) *
P6_3/mmc (No. 194) -> P6_3cm (No. 185), the cells of the input files
  [    -2     1     0 ] [     0 ]
  [    -1    -1     0 ] [     0 ]
  [     0     0     1 ] [ 0.2483 ]
...
(spins through the fractional components, S_parent = P S_child)

* Spin bases on the subgroup structure *
  irrep direction                       field      child irrep          MSG on the child (BNS)  angle  in comp basis
  K2(0.282a;a)                          comp1      0.75 GM2 + 0.25 GM3  158.59 P3c'1            -      (1,0)
  K2(0.282a;a)                          comp1_GM3  GM3                  185.199 P6_3'c'm        60     (0.5,0.866)
  K2(a;0.974a)                          comp2      0.25 GM2 + 0.75 GM3  158.59 P3c'1            -      (0,1)
  K2(a;0.974a)                          comp2_GM2  GM2                  185.201 P6_3c'm'        60     (-0.866,0.5)
  K2(a;b)                               generic    GM2 + GM3            158.59 P3c'1            -      -
  K3(a;0.974a)                          comp1      0.25 GM1 + 0.75 GM4  158.57 P3c1             -      (1,0)
  K3(a;0.974a)                          comp1_GM1  GM1                  185.197 P6_3cm          60     (0.5,0.866)
  K3(0.282a;a)                          comp2      0.75 GM1 + 0.25 GM4  158.57 P3c1             -      (0,1)
  K3(0.282a;a)                          comp2_GM4  GM4                  185.200 P6_3'cm'        60     (-0.866,0.5)
  K3(a;b)                               generic    GM1 + GM4            158.57 P3c1             -      -
  K5(0,0;0.628a,a)                      z_3        0.5 GM5 + 0.5 GM6    8.32 Cm                 -      (0,0,1,0)
  K5(0,0;0.628a,a)                      z_4        0.5 GM5 + 0.5 GM6    8.32 Cm                 -      (0,0,0,1)
  K5(0,0;0.628a,a)                      -          no single irrep      -                       -      -
...
  K5(0.628a,a;0.628a,a)                 dir1       0.25 GM5 + 0.75 GM6  9.37 Cc                 -      (0,0,0.707,-0.707)
  K5(0.628a,a;0.628a,a)                 dir1_GM5   GM5                  36.172 Cmc2_1           60     (-0.632,0.632,0.316,-0.316)
...
  K5(a,b;c,d)                           generic    GM5 + GM6            1.1 P1                  -      -
...

* K3(1) [AFM (q != 0)] on 185_PPOSCAR_YMnO3 *
  component comp1_GM1 (K3(a;0.974a), GM1 [A1] of P6_3cm; 60 degrees from comp1):
    Mn1: S = [-0.8660,  0.5000,  0.0000]
...
    magnetic space group: P6_3cm (BNS 185.197, type I), 12 operations, 0 with time reversal
...
    MAGMOM = 0 0 0   0 0 0   0 0 0   0 0 0   0 0 0   0 0 0   -0.8660 0.5000 0.0000   ...
  component comp2_GM4 (K3(0.282a;a), GM4 [B1] of P6_3cm; 60 degrees from comp2):
...
    magnetic space group: P6_3'cm' (BNS 185.200, type III), 12 operations, 6 with time reversal
...
```

**How to read the output.**

- `* Subgroup structure *`: CHILD, its space group, and the irreps of CHILD at
  GM that the fields of every basis are made of: the folding of q onto GM, the
  rows of `crystod-group --correlate --supergroup-poscar -c --subgroup-poscar
  CHILD` for q (2 x K3 -> GM1 + GM4).
- `* Transformation matrix (parent -> child) *`: the cell relation of
  `crystod-group --correlate`, x_parent = P x_child + p between the
  fractional coordinates of the two input files; each magnetic atom of CHILD
  takes the spin of the site and cell of the magnetic cell it lands on, carried
  through its fractional components (S_parent = P S_child, so a lattice that
  is strained against the parent keeps the symmetry relation).
- `* Spin bases on the subgroup structure *`, one row per field, grouped by the
  directions of `* Order-parameter directions *`:
  - a component as exported (`comp1`, `z_3`, `aa`, `dir1`): the irreps of
    CHILD it is made of, with the squared norms of their parts on CHILD
    (`0.25 GM1 + 0.75 GM4`), and its magnetic space group on CHILD (spglib on
    the cell of CHILD with these moments);
  - `<component>_<irrep>`: the domain of the direction (an image under the
    operations of the grey group G1', so the same magnetic isotropy subgroup
    type) whose field is that one irrep of CHILD, named after the nearest
    exported component on the direction; `angle` is the angle between the two
    in the real order-parameter space (the phase of the order parameter at a q
    that is not time-reversal invariant) and `in comp basis` its coefficients
    as in `* Order-parameter directions *`. Domains of one direction that give
    different groups on CHILD get one row each;
  - `-` with `no single irrep`: no domain of the direction is one irrep of
    CHILD (the P-62m-type directions of K5 and K6 always mix GM5 and GM6);
  - `generic`: a generic field of the direction inside one irrep of CHILD
    (GM5: P2_1), and of the whole basis when it folds onto more than one
    irrep (K3(a;b): P3c1).
- The identity irrep of CHILD (GM1) keeps every operation of the distorted
  structure: for an irrep of its distortion, the direction of the structural
  order parameter (0 degrees), and the other irreps of the basis are
  orthogonal to it (GM4: 90 degrees). For YMnO3, the K3(a;0.974a)-type
  direction aligned with the structural domain is GM1, P6_3cm (185.197, type
  I); the K3(0.282a;a)-type direction at 90 degrees to it is GM4, P6_3'cm'
  (185.200); the exported `comp1` and `comp2` lie 60 degrees from these
  domains, mix GM1 and GM4 and give P3c1 (158.57), as every phase but the two
  aligned ones does.
- `* K3(1) [AFM (q != 0)] on 185_PPOSCAR_YMnO3 *`: every aligned field with
  the spins of the magnetic sites of CHILD (`Mn1` .. `Mn6` in its atom
  order), its magnetic groups, the listing of all atoms and the `MAGMOM` line
  (or the Quantum ESPRESSO input with `--format qe`) for the cell of CHILD; the
  VESTA file `POSCAR_YMnO3_spin_K3_K_comp2_GM4.vesta` and the POSCAR
  `S185_PPOSCAR_YMnO3_K` (the cell of CHILD as given, in the atom order of
  the `MAGMOM` lines) go with it, next to the files of the parent cell.

:::{dropdown} How the alignment works

The cell relation comes from the structure mapping of `crystod-group
--correlate --supergroup-poscar` (`SymmetryModeAnalysis`), expressed between
the cells of the two input files. For every basis, the real order-parameter
space V and the action of G1' on it are those of `* Order-parameter
directions *`. The fields of V placed on CHILD are decomposed with the
projection operators of the irreps of CHILD at GM (its spin representation on
the magnetic sites, ISO-IR labels in the frame of CHILD, a complex pair
merged): U_Γ is the subspace of V whose fields are of irrep Γ alone. For every
one-parameter direction, its domains (the distinct images of its line under
G1') that lie in some U_Γ are the aligned fields; one row is kept per irrep
and magnetic space group on CHILD, the domain nearest to an exported
component of the direction. Two checks in section 05-07 are independent of this
construction: every aligned field lies in the span of the bases that
`crystod-mag -c CHILD --qpoint GM` finds for its irrep, and in the magnetic
cell of the parent its magnetic space group is the magnetic isotropy subgroup
of its direction (it is a domain of that direction).

At a time-reversal-invariant q the same holds without the phase: for AlNi3
(Pm-3m) at R with a two-cell child whose Al atoms carry an R-point
displacement (I4/mmm), R4+ folds onto GM1- + GM5-, the exported R4+ `comp2`
is already GM1- (`comp2_GM1-`, 0 degrees, I4/m'm'm'), and the (a,a,a)
direction has no domain in one irrep.

:::

:::{dropdown} Options and requirements

- q ≠ 0, and the cell of CHILD must be a magnetic cell of q: q . a', q . b',
  q . c' integers for its lattice vectors (q folds onto GM of CHILD). At GM,
  run `crystod-mag` on CHILD itself; a q that does not fold (M of YMnO3 on the
  √3×√3 cell) stops with an ERROR that gives q . a', q . b', q . c'.
- CHILD is a primitive cell (POSCAR or CIF) of the same compound, with
  `size` times the magnetic atoms of the parent, `size` the number of
  primitive cells of the parent in it; a conventional cell or a supercell is
  refused (the PPOSCAR of `phonopy --symmetry` is a primitive cell).
- The mapping and the groups on CHILD use the tolerance of `crystod-group
  --correlate` (0.01 Å), or `--tolerance` when that is larger; a magnetic atom
  of CHILD more than 1.8 Å from its site stops the run.
- `--classify-only` prints the three blocks and writes no files;
  `--format qe` gives the Quantum ESPRESSO lines of the aligned fields;
  `--conventional` changes only the files of the parent cell.
- When an operation of CHILD takes q to another arm of its star (a child of a
  multi-arm order), the fields of one basis are not all sums of fields of
  single irreps of CHILD; a NOTE says so and only the directions inside one
  irrep are aligned.

:::

:::{dropdown} Python API

```python
from phonopy.interface.vasp import read_vasp
from crystod import mag

result = mag.analyze_spin_basis(read_vasp("194_PPOSCAR_YMnO3"), "Mn", "K",
                                subgroup_poscar="185_PPOSCAR_YMnO3")
alignment = result.subgroup                      # mag.SubgroupAlignment
alignment.folding
# [('K2(1)', ['GM2', 'GM3']), ('K3(1)', ['GM1', 'GM4']), ...]
for row in alignment.rows:                       # mag.SubgroupSpinField
    if row.kind == "aligned" and row.label.startswith("K3"):
        print(row.tag, row.direction.direction_label, row.child_irrep_text,
              row.subgroup, round(row.angle, 1))
# comp1_GM1 K3(a;0.974a) GM1 185.197 P6_3cm 60.0
# comp2_GM4 K3(0.282a;a) GM4 185.200 P6_3'cm' 60.0
print("\n".join(mag.format_subgroup_alignment(result)))
```

`SubgroupAlignment` carries `child_file`, `child_symbol`, `child_number`,
`transformation` (P and p), `size`, the cell of CHILD (`lattice`, `symbols`,
`positions`), `site_atoms` and `site_sources` (the site and cell of the
parent each magnetic atom takes its spin from), `spin_matrix`, `folding`,
`identity_irrep`, `mulliken`, `rows` and `notes`; `child_spins(field)` places
any field of the magnetic cell on CHILD. A `SubgroupSpinField` has `kind`
(`"component"`, `"aligned"`, `"generic"`, `"none"`), `direction`, `tag`,
`child_irreps` (label and weight), `reference`, `group` (on CHILD), `angle`,
`coefficients`, `field` (in the magnetic cell of the parent), `spins` (on the
atoms of CHILD) and `vesta_name`; `mag.subgroup_table_rows` gives the rows of
the table.

:::

## 05-08. Phonon angular momentum near GM (`--phonon-angular-momentum`)

*Example directory: `example/05-08_phonon_angular_momentum` (testsuite section 05-08); after pip install: `crystod-example 05-08`*

Can the phonons of a magnetic arrangement carry angular momentum, and how
does it vary with the wavevector near Γ? The angular momentum l(q) of a
phonon branch is an axial vector, odd under time reversal, and the magnetic
point group fixes the lowest-order polynomial in q that each component can
follow: s-wave (a constant, as for a net magnetization), p-wave (linear in
q), d-wave, f-wave and so on up to j-wave (degree 7), together with the nodal
planes through Γ on which a component must vanish. `--phonon-angular-momentum`
adds this to every component of `crystod-mag --qpoint`, and with
`--classify-only` gives one table that starts with the paramagnetic crystal
itself, so the option is useful for non-magnetic crystals as well.

```{seealso}
**Theory:** [Phonon angular momentum near Gamma](theory-representations.md#phonon-angular-momentum-near-gamma-crystod-mag---phonon-angular-momentum) —
the constraint l(A q) = B l(q), the polynomial reading, why the lowest degree
and the number of enforced nodal planes differ, P T and parity, what symmetry
does not tell, and the relation to the altermagnet wave of the spin splitting.
```

| Input | Command | Output |
|---|---|---|
| primitive POSCAR, magnetic element, q point | `crystod-mag -c POSCAR --element Ti --qpoint GM --phonon-angular-momentum` | terminal: in every component block, after `collinear order:`, the line `phonon angular momentum:` with l_x, l_y and l_z; files: those of `--qpoint` |
| the same, table only | add `--classify-only` | the block `* Phonon angular momentum allowed by symmetry *` after the table of magnetic groups (first row: the paramagnetic crystal); file: the report `samm_<formula>_<element>_<q>_classify` |

```bash
cd example/05-08_phonon_angular_momentum
crystod-mag -c 136_PPOSCAR_TiO2 --element Ti --qpoint GM --classify-only --phonon-angular-momentum
```

```
* Phonon angular momentum allowed by symmetry *
basis                    component  MPG      l_x  l_x ~       planes  l_y  l_y ~       planes  l_z  l_z ~            planes
paramagnetic             -          4/mmm1'  -    none (P T)  -       -    none (P T)  -       -    none (P T)       -
GM3+(1) [FM, dipole]     z          4/mm'm'  d    q_x q_z     2       d    q_y q_z     2       s    const            0
GM5+(2) [FM, dipole]     1m10       mm'm'    s    const       0       s    const       0       d    q_z (q_x - q_y)  2
GM5+(2) [FM, dipole]     110        mm'm'    s    const       0       s    const       0       d    q_z (q_x + q_y)  2
GM5+(2) [FM, dipole]     x          mm'm'    s    const       0       d    q_x q_y     2       d    q_x q_z          2
GM5+(2) [AFM, octupole]  1m10       mm'm'    s    const       0       s    const       0       d    q_z (q_x - q_y)  2
GM5+(2) [AFM, octupole]  110        mm'm'    s    const       0       s    const       0       d    q_z (q_x + q_y)  2
GM5+(2) [AFM, octupole]  x          mm'm'    d    q_x q_y     2       s    const       0       d    q_y q_z          2
GM2+(1) [AFM, octupole]  z          4'/mmm'  d    q_y q_z     2       d    q_x q_z     2       d    q_x q_y          2

l_i: component i of the phonon angular momentum l(q) of a branch near GM (an axial vector, odd under time reversal), from l(A q) = B l(q) with A = s R, B = s det(R) R (s = -1 with time reversal);
its column: the wave of the lowest degree n of a q-polynomial allowed for it (s, p, d, f, g, h, i, j for n = 0..7, the number beyond); l_i ~: the polynomials of that degree (a second one on the next line);
planes: only the nodal planes through GM pinned by a single operation (a mirror without time reversal containing e_i, a 2' along the normal when e_i is along it); fewer than n: the other nodes are not fixed in position by symmetry;
none (P T): P T makes l vanish at every q; s: a constant, the net magnetization.
Symmetry fixes the forms, not the magnitudes. paramagnetic: the grey group of the crystal, what ordinary (time-reversal-even) force constants give (odd degrees only, l(-q) = -l(q));
the even-degree textures of a magnet, and every form beyond the paramagnetic row, need a time-reversal-odd term in the lattice dynamics (e.g. spin-phonon coupling).
MPG as in the table above; q and l in the Cartesian axes of the input cell, the components read one at a time.
...
Reference (phonon angular momentum): L. Zhang and Q. Niu, Phys. Rev. Lett. 112, 085503 (2014).
```

**How to read the output.**

- `paramagnetic`: the grey group of the crystal without spins (`4/mmm1'`),
  the symmetry of phonons computed from ordinary force constants. Rutile is
  centrosymmetric, so P T is in it and no component survives: the phonon
  angular momentum of rutile needs the magnetic order and a
  time-reversal-odd term in the lattice dynamics.
- `l_x`, `l_y`, `l_z`: the wave letter of the lowest allowed degree; `l_i ~`:
  the polynomials of that degree (Cartesian axes of the input cell; the
  letters s, p, d, f, g, h, i, j for the degrees 0 to 7 are the convention
  used here); `planes`: only the nodal planes through Γ pinned
  by a single operation, which can be fewer than the degree (the other nodes
  are then not fixed in position by symmetry). The
  altermagnetic GM2+ arrangement (moments along z, `4'/mmm'`) allows the
  d-wave `l_z ~ q_x q_y` with two planes, the same pattern as its spin
  splitting `k_x k_y`.
- `s` / `const`: a constant component, allowed exactly where the group allows
  a net magnetization along that axis (GM3+, the ferromagnet along z, has
  `l_z` s-wave; the GM5+ octupole along x allows a magnetization along y and
  has `l_y` s-wave).
- The number of planes can be smaller than the degree: the group `4'` gives
  `l_z ~ q_z` with no plane, `4'/m` the d-wave pair `q_x^2 - q_y^2`,
  `q_x q_y` with no plane.

Without `--classify-only` the same result is one line per component block:

```bash
crystod-mag -c 136_PPOSCAR_TiO2 --element Ti --qpoint GM --phonon-angular-momentum
```

```
* GM2+(1) [AFM, octupole] *
  component z:
    Ti1: S = [ 0.0000,  0.0000,  1.0000]
    Ti2: S = [ 0.0000,  0.0000, -1.0000]
    net moment: [0.0, 0.0, 0.0]
    magnetic space group: P4_2'/mnm' (BNS 136.499, type III), 16 operations, 8 with time reversal
    magnetic point group: 4'/mmm'
    UNI symbol: P4_2'/mnm'; point group 4'/mmm'
    allowed by symmetry: net magnetization none; electric polarization none; linear magnetoelectric effect none; piezomagnetism 2 components
    collinear order: altermagnet (d-wave; spin splitting allowed by symmetry ~ k_x k_y; spin-degenerate planes perpendicular to [100], [010])
    phonon angular momentum: l_x ~ q_y q_z (d-wave; zero on the planes perpendicular to [010], [001]); l_y ~ q_x q_z (d-wave; zero on the planes perpendicular to [100], [001]); l_z ~ q_x q_y (d-wave; zero on the planes perpendicular to [100], [010])
...
```

The three components are separated by `; `; a component whose polynomials of
the lowest degree span two dimensions lists both (`l_z ~ q_x^2 - q_y^2,
q_x q_y (d-wave)`), and a vanishing one reads `l_x = 0 (P T)`.

:::{dropdown} A noncentrosymmetric crystal: YMnO3 (P6_3cm)

The paramagnetic row is not empty when the crystal lacks inversion: the grey
group `6mm1'` of ferroelectric YMnO3 allows p-wave in-plane components and
the j-wave (degree 7) `l_z` with seven planes, already with ordinary force
constants. The magnetic ground state GM4 (`P6_3'cm'`, `6'mm'`) lowers `l_z`
to g-wave; a two-dimensional polynomial space continues on the next line.

```bash
crystod-mag -c 185_PPOSCAR_YMnO3 --element Mn --qpoint GM --classify-only --phonon-angular-momentum
```

```
* Phonon angular momentum allowed by symmetry *
basis                       component  MPG    l_x  l_x ~  planes  l_y  l_y ~  planes  l_z  l_z ~                                             planes
paramagnetic                -          6mm1'  p    q_y    1       p    q_x    1       j    q_x q_y q_z (3 q_x^4 - 10 q_x^2 q_y^2 + 3 q_y^4)  7
GM1(1) [AFM, 64pole]        comp1      6mm    p    q_y    1       p    q_x    1       i    q_x q_y (3 q_x^4 - 10 q_x^2 q_y^2 + 3 q_y^4)      6
GM2(1) [FM, dipole]         z          6m'm'  p    q_y    0       p    q_x    0       s    const                                             0
GM2(1) [AFM, quadrupole]    comp1      6m'm'  p    q_y    0       p    q_x    0       s    const                                             0
GM4(1) [AFM, octupole]      comp1      6'mm'  p    q_y    0       p    q_x    1       g    q_x q_z (q_x^2 - 3 q_y^2)                         4
GM4(1) [AFM, hexadecapole]  z          6'mm'  p    q_y    0       p    q_x    1       g    q_x q_z (q_x^2 - 3 q_y^2)                         4
GM3(1) [AFM, octupole]      comp1      6'm'm  p    q_y    1       p    q_x    0       g    q_y q_z (3 q_x^2 - q_y^2)                         4
GM5(2) [AFM, quadrupole]    comp1      m'm'2  p    q_x    0       p    q_x    0       s    const                                             0
                                                   q_y                 q_y
GM5(2) [AFM, quadrupole]    comp2      mm2    p    q_x    0       p    q_x    0       d    3 q_x^2 - 2sqrt3 q_x q_y - 3 q_y^2                2
                                                   q_y                 q_y
...
```

The in-plane components of a hexagonal group are read one at a time in the
Cartesian axes (the operations mix them), so `l_x` and `l_y` of one row can
have different numbers of planes. The `mm2` of GM5 comp2 has its mirrors at
30 degrees from the Cartesian axes, hence the `sqrt3` in its d-wave form.

:::

:::{dropdown} Details: what is computed, layers, limits

* For each degree n = 0, 1, ..., 9 the homogeneous polynomial vector fields
  F(q) with F(A q) = B F(q) for every operation (A = s R, B = s det(R) R,
  s = -1 with time reversal) are found as a null space; the wave of l_i is
  the lowest n at which a field has a nonzero i-th component. A degree
  beyond j-wave is printed as its number (`8`), and a component with no form
  up to degree 9 as `none up to degree 9` (it does not happen in the groups
  tested).
* The enforced nodal planes of l_i come from single operations: a mirror
  without time reversal whose plane contains e_i, or a 2' along the plane
  normal when e_i is along it.
* The magnetic point group is that of the exported component (spglib on the
  magnetic cell, the operations in the Cartesian axes of the input cell); a
  group spglib does not name is still used through its operations (MPG `-`).
* Layers (two-dimensional systems): `crystod.mag.phonon_angular_momentum(...,
  plane_normal=[0, 0, 1])` restricts q to the plane; the nodes are then lines,
  and the group must map the normal to plus or minus itself. There is no
  command-line option for layers yet.
* Not printed with `--subgroup-poscar` for the aligned fields on the child,
  and not in the survey (it needs `--qpoint`); `--parent` rejects the option.

:::

:::{dropdown} Python API

```python
import numpy as np
from phonopy.interface.vasp import read_vasp
from crystod import mag

atoms = read_vasp("136_PPOSCAR_TiO2")
magmoms = np.zeros((len(atoms.numbers), 3))
magmoms[atoms.numbers == 22] = [[0, 0, 1], [0, 0, -1]]
info = mag.magnetic_space_group(atoms.cell, atoms.scaled_positions, atoms.numbers, magmoms)
result = mag.phonon_angular_momentum(info)       # mag.PhononAngularMomentum
lz = result.component("z")                       # mag.AngularMomentumComponent
lz.degree, lz.letter, lz.forms, lz.nodal
# (2, 'd', ('q_x q_y',), ('[100]', '[010]'))

c4 = np.array([[0, -1, 0], [1, 0, 0], [0, 0, 1]], dtype=float)
group_4p = [np.eye(3), c4, c4 @ c4, c4.T]        # the group 4'
flags = [False, True, False, True]
mag.phonon_angular_momentum(group_4p, flags).component("z").text()
# 'l_z ~ q_z (p-wave)'
mag.phonon_angular_momentum(group_4p, flags, plane_normal=[0, 0, 1]).component("z").text()
# 'l_z ~ q_x^2 - q_y^2, q_x q_y (d-wave)'
mag.phonon_angular_momentum_degrees(group_4p, flags, component="z")
# (1, 2, 3, 4, 5, 6, 7, 8, 9)

analysis = mag.analyze_spin_basis(atoms, "Ti", "GM")
print("\n".join(mag.format_phonon_angular_momentum(analysis)))
```

`AngularMomentumComponent` carries `axis`, `degree`, `forms`, `nodal` (plane
normals, or line directions for a layer), `zero_reason` (`"P T"`, or for a
layer the mirror of the layer or a 2' along its normal), `two_dimensional`
and `max_degree`, with `letter`, `short_name`, `n_nodal`, `nodal_text()` and
`text()`; `PhononAngularMomentum` has `components`, `pt_symmetric`,
`plane_normal`, `in_plane` and `text()`. `phonon_angular_momentum_degrees`
lists every allowed degree (the N-th order angular-momentum current response
to a temperature gradient needs degree N + 1).
`mag.phonon_angular_momentum_rows` and `mag.paramagnetic_point_group` give the
rows of the block.

:::

## 05-09. Several magnetic elements (`--element A B`, `--superpose`)

*Example directory: `example/05-09_multi_element` (testsuite section 05-09); after pip install: `crystod-example 05-09`*

Which magnetic arrangements does each irrep give when the spins sit on two
different elements (two Wyckoff orbits)? The spin space is then the direct sum
of the spin spaces of the elements, and an irrep can occur on both. `--element
Al Ni` analyses every element as its single-element run does, prints the
decomposition per element and in total, checks that the copies of one irrep on
different elements transform with the same irrep matrices, and lists the
arrangements with one copy per element along every high-symmetry direction of
the listing ((a,0,0), (a,a,0), (a,a,a), ... at Γ, the strata of section 05-06 at
q ≠ 0) with the relative signs (+,+) and (+,-). `--superpose` adds any listed
bases, of any irreps and elements, with given coefficients, the way
`crystod-phonon --modulation --mode ... --amplitude ...` adds modes.

```{seealso}
**Theory:** [Spin bases on several elements](theory-representations.md#spin-bases-on-several-elements-crystod-mag---element-a-b) —
the direct sum over the orbits, the copies of one irrep, why a superposition
along one direction keeps the group of each copy (the table of the
single-element runs is complete), and what symmetry leaves free.
```

| Input | Command | Output |
|---|---|---|
| primitive POSCAR, two or more elements, q point | `crystod-mag -c POSCAR --element Al Ni --qpoint GM` | terminal: the decomposition per element and in total, `* Copies of one irrep on several elements *`, the component blocks of every element (numbered `[N]`), one block per combined arrangement, and the table with the columns `no.` and `element`; files: one VESTA file per basis (the element in the name) and per combined arrangement (at most 48), `S<POSCAR name>_<q>`, the report `samm_<formula>_<A>-<B>_<q>` |
| the same, table only | add `--classify-only` | the blocks and the table, no listing and no files but the report `samm_<formula>_<A>-<B>_<q>_classify` |
| listed bases and coefficients | add `--superpose 1 16 --coefficients 1 0.5` | `* Superposition *`: the bases used, the irrep content, the moments, the magnetic space group, responses and class, the `MAGMOM` line and `POSCAR_<formula>_spin_superposition_1_16_<q>.vesta` (with one element too: the numbers are the rows of the table) |
| two or more elements, no q point | `crystod-mag -c POSCAR --element Al Ni` | the survey: the decomposition of every element and of the total at every special point; the report `samm_<formula>_<A>-<B>_survey` |

```bash
cd example/05-09_multi_element
crystod-mag -c 221_PPOSCAR_AlNi3 --element Al Ni --qpoint GM --classify-only
```

```
* Spin (axial-vector) representation *
  Spin (axial-vector) representation on Al, Ni sites: 12 dimensions
  Decomposition (Al, 3 dimensions): GM4+(3)
  Decomposition (Ni, 9 dimensions): 2 x GM4+(3) + GM5+(3)
  Decomposition (total): 3 x GM4+(3) + GM5+(3)

* Symmetry-adapted spin bases *
  Al GM4+(3): dim 3 [FM, dipole]
  Ni GM4+(3): dim 3 [FM, dipole]
  Ni GM4+(3): dim 3 [AFM, octupole]
  Ni GM5+(3): dim 3 [AFM, octupole]

* Copies of one irrep on several elements *
  GM4+(3): reference Al GM4+(3) [FM, dipole]
    Ni GM4+(3) [FM, dipole]: same matrices on the rows
    Ni GM4+(3) [AFM, octupole]: rows mapped by (-x, y, z)
  Every copy of one irrep transforms with the same irrep matrices (on its rows, or through the map given), so a real superposition of copies along the same order-parameter direction, with any nonzero amplitudes, has the magnetic space group of each copy alone: the table irrep x direction -> magnetic space group is complete; the relative amplitudes of the copies are free parameters that symmetry does not fix.
  20 combined arrangements below: one copy per element along every direction of the first element's copy, each copy with largest moment 1, with the relative signs (+,+), (+,-), ... of the printed moments (the sign of a basis vector is a convention).

* Magnetic groups and collinear classes *
no.  element  basis                                       component  MSG (BNS)           type  MPG      net magnetization  class                                MSG (UNI)
1    Al       GM4+(3) [FM, dipole]                        z          P4/mm'm' (123.345)  III   4/mm'm'  along z            ferromagnet                          P4/mm'm'
...
16   Ni       GM5+(3) [AFM, octupole]                     z          P4'/mm'm (123.342)  III   4'/mm'm  none               altermagnet (d-wave)                 P4'/mm'm
...
-    Al+Ni    GM4+(3) [Al FM, dipole + Ni FM, dipole]     z (+,+)    P4/mm'm' (123.345)  III   4/mm'm'  along z            ferromagnet                          P4/mm'm'
-    Al+Ni    GM4+(3) [Al FM, dipole + Ni FM, dipole]     z (+,-)    P4/mm'm' (123.345)  III   4/mm'm'  along z            ferrimagnet                          P4/mm'm'
...
-    Al+Ni    GM4+(3) [Al FM, dipole + Ni AFM, octupole]  111 (+,-)  R-3m' (166.101)     III   -3m'     along [111]        noncollinear                         R-3m'
```

**How to read the output.**

- `Decomposition`: per element and in total (the direct sum). The bases of
  every element are exactly those of its single-element run; their rows in
  the table are numbered (`no.`), the numbers `--superpose` takes.
- `* Copies of one irrep on several elements *`: for every irrep found on two
  or more elements, how the basis rows of each copy relate to those of the
  first copy. `same matrices on the rows`: the operations of the crystal act
  on both with the same matrices. `rows mapped by (-x, y, z)`: the same irrep,
  but one row with the opposite sign convention (the Ni octupole copy of
  GM4+, whose exported `111` is therefore the domain [11-1]); the combined
  arrangements follow the direction through that map.
- The combined rows (`no.` `-`, element `Al+Ni`) take one copy per element
  along one direction of the first element's copy (`z`, `110`, `111`, ...;
  `dir<k>` and the ISOTROPY label at q ≠ 0), each copy with largest moment 1
  and signed as its listed component; `(+,+)` and `(+,-)` are the relative
  signs of the moments as printed. Their magnetic space group is the one of
  each copy alone; only the class (ferromagnet, ferrimagnet, compensated)
  and the moments differ. AlNi3 gives 20 (GM4+ along 5 directions, Al with
  either Ni copy, two signs); GM5+ occurs on Ni only.

Two different elements are never exchanged by an operation of the crystal, so
a pattern that looks like one antiferromagnet on two sites is a different
magnetic group when the two sites carry different elements. In a Lieb lattice
with Al and B on the edge sites (Pmmm), Al up and B down is Pm'm'm (47.252), the
group of Al up and B up, compensated with l_z s-wave; with Al on both sites
(P4/mmm) the same up-down pattern is the d-wave altermagnet P4'/mm'm (123.342)
with l_z ~ q_x^2 - q_y^2:

```bash
crystod-mag -c POSCAR_Lieb_CuAlB --element Al B --qpoint GM --classify-only --phonon-angular-momentum
crystod-mag -c POSCAR_Lieb_CuAl2 --element Al --qpoint GM --classify-only --phonon-angular-momentum
```

```
-    Al+B     GM2+(1) [Al FM, dipole + B FM, dipole]  z (+,+)    Pm'm'm (47.252)  III   m'm'm  along z            ferromagnet                          Pm'm'm
-    Al+B     GM2+(1) [Al FM, dipole + B FM, dipole]  z (+,-)    Pm'm'm (47.252)  III   m'm'm  along z            compensated (unrelated sublattices)  Pm'm'm
...
GM4+(1) [AFM, octupole]  z          P4'/mm'm (123.342)  III   4'/mm'm  none               altermagnet (d-wave)  P4'/mm'm
```

:::{dropdown} Superposition of listed bases (`--superpose`)

Any listed bases, of any irreps and elements, can be added with real
coefficients; this is how a coupled ("hybrid") arrangement of two irreps is
built on a concrete structure. Every basis enters as listed (largest moment 1);
the sum is scaled to largest moment 1.

```bash
crystod-mag -c 221_PPOSCAR_AlNi3 --element Al Ni --qpoint GM --classify-only --superpose 1 16 --coefficients 1 0.5 --no-files
```

```
* Superposition *
  [1] Al GM4+(3) [FM, dipole] z: coefficient 1
  [16] Ni GM5+(3) [AFM, octupole] z: coefficient 0.5
  irrep content (squared weights): Al GM4+(3) [FM, dipole] 0.667 + Ni GM5+(3) [AFM, octupole] 0.333
    Al1: S = [ 0.0000,  0.0000,  1.0000]
    Ni1: S = [ 0.0000,  0.0000,  0.0000]
    Ni2: S = [ 0.0000,  0.0000,  0.5000]
    Ni3: S = [ 0.0000,  0.0000, -0.5000]
    net moment over the magnetic cell: [0.0, 0.0, 1.0]
    magnetic space group: Pm'm'm (BNS 47.252, type III), 8 operations, 4 with time reversal
    magnetic point group: m'm'm
    UNI symbol: Pm'm'm; point group m'm'm
    allowed by symmetry: net magnetization along z; electric polarization none; linear magnetoelectric effect none; piezomagnetism 5 components
    collinear order: ferrimagnet
```

`irrep content`: the squared projection of the sum on the space of every
basis (weights sum to 1). Without `--classify-only` the block is followed by
the `MAGMOM` line and the VESTA file is written. With one element the same
option works on the single-element listing; the numbers are then the rows of
its table of magnetic groups, counted from 1.

:::

:::{dropdown} Details: what is combined, limits

* The copies of one irrep are compared through the matrices of the operations
  of the crystal (with the translations of the magnetic cell) on their basis
  rows: the map T with D_copy(g) T = T D_first(g) closest to the identity is
  found as a null space; the identity means the same matrices. At a q that is
  not time-reversal invariant the maps between copies form a two-dimensional
  family (a relative phase), and the one closest to the identity is used;
  every member gives the same groups.
* The combinations use the first copy of the first element as reference;
  with three elements there are 2^2 sign patterns, and the copies of every
  element are combined in all ways (AlNi3: Al with either Ni copy).
* At most 48 combined arrangements get a VESTA file (all are in the table); a
  NOTE then points to `--superpose` for the others.
* `--subgroup-poscar` takes one element. MCP access to several elements is not
  yet available.

:::

:::{dropdown} Python API

```python
from phonopy.interface.vasp import read_vasp
from crystod import mag

multi = mag.analyze_multi_element(read_vasp("221_PPOSCAR_AlNi3"), ["Al", "Ni"], "GM")
multi.decomposition                     # {'GM4+(3)': 3, 'GM5+(3)': 1}
[r.text() for r in multi.relations]     # ['same matrices on the rows', 'rows mapped by (-x, y, z)']
a = multi.combined[1]                   # mag.CombinedArrangement
a.header, a.component_text, a.group.bns_number, a.collinear.short_name
# ("GM4+(3) [Al FM, dipole + Ni FM, dipole]", 'z (+,-)', '123.345', 'ferrimagnet')
s = mag.superpose_bases(multi, [1, 16], [1.0, 0.5])   # mag.Superposition
s.irrep_text()
print("\n".join(mag.format_multi_summary(multi)))
```

`MultiElementAnalysis` has `elements`, `analyses` (one `SpinBasisAnalysis` per
element), `site_indices`, `decomposition`, `relations` (`CopyRelation`:
`label`, `reference`, `copy`, `map`, `identity`, `residual`), `combined`,
`numbered` and `notes`; `CombinedArrangement` has `label`, `copies`, `tag`,
`signs`, `magmoms` (every atom of the magnetic cell), `field`, `net_moment`,
`group`, `responses`, `collinear`, `direction_label` and `vesta_name`.
`superpose_bases` also takes a single-element `SpinBasisAnalysis`, and with
`vibrations=` the `SymmetryOnlyVibrations` of the crystal it classifies the
sum.

:::
