# Python API

Every CrystOD analysis is also available as a Python function, so that a part
of CrystOD can be used inside another program without going through the
command line. The API mirrors the command structure: one module per command,
with the same vocabulary (irreps, q points, order parameters) as the printed
output.

```python
import crystod

crystod.salc      # crystal-orbital SALC analysis   (crystod)
crystod.group     # irreps, isotropy subgroups      (crystod-group)
crystod.phonon    # phonon irreps, modes, subgroups (crystod-phonon)
crystod.bz        # Brillouin zones, k paths        (crystod-bz)
crystod.mag       # symmetry-adapted spin bases     (crystod-mag)
crystod.md        # MD-trajectory analyses          (crystod-md)
crystod.mol       # molecular SALCs, MO diagrams    (crystod-mol)
crystod.xrd       # powder XRD patterns             (crystod-xrd)
crystod.slab      # surface slabs                   (crystod-slab)
crystod.search    # Materials Project search        (crystod-search)
```

*Testsuite section 01-11 checks everything documented on this page, apart from
the keywords and checks of [Library use: keywords and input checks](#library-use-keywords-and-input-checks),
which the sections of their commands test (named there), and the
[packaged examples](#the-packaged-examples), whose command section 11-01 tests.*

```{note}
Importing CrystOD is cheap: `import crystod` and the ten domain modules pull
in nothing heavier than NumPy. phonopy, spgrep, spglib, PySCF and matplotlib
are imported only when a function that needs them is actually called, so a
program that uses one corner of CrystOD does not pay for the rest.
```

## Isotropy subgroups of an irrep

`crystod.group.isotropy_subgroups` is the API form of
[`crystod-group --parent`](crystod-group.md): given a space group and one
of its irreps, it enumerates the order-parameter directions and the subgroup
each of them condenses into.

```python
from crystod.group import isotropy_subgroups

for sub in isotropy_subgroups("Pm-3m", "R4+"):
    print(sub.label, "->", sub.number, sub.symbol, "size", sub.size, "index", sub.index)
```

```
R4+(0,0,a) -> 140 I4/mcm size 2 index 6
R4+(a,a,a) -> 167 R-3c size 2 index 8
R4+(0,a,a) -> 74 Imma size 2 index 12
R4+(0,a,b) -> 12 C2/m size 2 index 24
R4+(a,a,b) -> 15 C2/c size 2 index 24
R4+(a,b,c) -> 2 P-1 size 2 index 48
```

The space group is given as a symbol or a number (`221` works as well), and a
list of labels enumerates the subgroups of coupled order parameters, exactly as
`--irrep X3- X2+` does on the command line.

`crystod.group.isotropy_subgroups_at_kpoint` does the same for **every irrep of
one special k point** — the API form of `crystod-group --parent SG --kpoint K`.
It returns a `dict` from irrep label to the list `isotropy_subgroups` gives for
that irrep, in the order of the ISO-IR tables:

```python
from crystod.group import isotropy_subgroups_at_kpoint

table = isotropy_subgroups_at_kpoint("Pm-3m", "GM")
list(table)       # ['GM1+', 'GM2+', 'GM3+', 'GM4+', 'GM5+', 'GM1-', 'GM2-', 'GM3-', 'GM4-', 'GM5-']
for sub in table["GM3+"]:
    print(sub.label, "->", sub.number, sub.symbol, "size", sub.size, "index", sub.index)
```

```
GM3+(a,0) -> 123 P4/mmm size 1 index 3
GM3+(a,b) -> 47 Pmmm size 1 index 6
```

The k point is its ISO-IR name or three coordinates in the primitive reciprocal
basis; any arm of the star and any equivalent `q + G` are recognized
(`isotropy_subgroups_at_kpoint(221, [0, 0.5, 0.5]).kpoint` is `'M'`). The
returned `KpointIsotropySubgroups` is a plain `dict` with a few attributes:
`kpoint`, `coordinates` (the tabulated arm), `n_arms`, `space_group`,
`space_group_number`, and `errors`. An irrep whose enumeration fails does not
stop the others: it is left out of the mapping and named in `errors`
(`{label: reason}`, empty on success). The two members of a complex-conjugate
pair share one physically irreducible order parameter and appear once, under
their pair label (`GM2+GM3+` of Pm-3); the records are those of the first
member (`isotropy_subgroups("Pm-3", "GM2+")`), and their `direction`
components refer to the basis built from it. An unknown k-point name, or coordinates
that are not a tabulated special point, raise `ValueError` with the k points
of the space group in the message.

Bad input raises `ValueError` — an unknown space group, an invalid order
parameter, or an irrep that is not tabulated for that space group. The last
case is worth catching: the labels of symmetry lines and planes (`DT5`, `LD3`,
`SM1`, ...) are legitimate mode labels, but only the maximal k points have
isotropy subgroups in the tables.

```{note}
Every **function** of every API domain reports bad input as `ValueError`. The
implementation modules double as command-line entry points and raise
`SystemExit` instead, which a caller's `except Exception` would not catch —
the API namespaces translate that at their boundary. The **classes** they
expose (`IsotropyAnalyzer`, `SpaceGroupIrrepAlgebra`, `MODiagram`, ...) are
the implementation classes themselves, so that `isinstance` and dataclass
equality keep working; their constructors still raise `SystemExit` on bad
input. Prefer the functions, and construct the classes from values you have
already validated. `crystod.search` raises one more exception,
`search.MaterialsProjectError` (a `RuntimeError`), when the Materials Project
cannot answer: no or a rejected API key, no network, or an error reported by
the server.
```

```python
try:
    subs = isotropy_subgroups(221, mode.labels[0])
except ValueError as exc:
    print("no subgroups for this level:", exc)
```

`order_parameter` takes plain numbers and parameter names (`["0", "0", "a"]`).
Hexagonal and trigonal irreps also have strata whose enumerated direction
carries a coefficient — `K3(0.282a;a)` of P6_3/mmc, for instance. Those
entries can be read from the enumeration but not resolved from components,
so passing them back raises `ValueError` instead of quietly returning the
subgroup of a different, more generic direction.

Each entry is an `IsotropySubgroup` with the fields `irrep`, `direction`,
`label`, `number`, `symbol`, `size`, `index`, `n_free`, and — for a single
direction — the conventional `basis` and `origin` of the subgroup cell in the
parent convention:

```python
sub = isotropy_subgroups(221, "R4+", order_parameter=["0", "0", "a"])[0]

sub.symbol      # 'I4/mcm'
sub.basis       # array([[-1., 0., 1.], [1., 0., 1.], [0., 2., 0.]])
sub.origin      # array([0., 0., 0.])
```

## Phonon modes and their irreps

`crystod.phonon.label_phonon_modes` labels the modes of a live phonopy object
with ISO-IR irreps — the machinery behind
[`crystod-phonon --irreps`](crystod-phonon.md), without the YAML file:

```python
import phonopy
from crystod.phonon import label_phonon_modes

ph = phonopy.load(supercell_matrix=[4, 4, 4], primitive_matrix="auto",
                  unitcell_filename="221_PPOSCAR_SrTiO3",
                  force_sets_filename="FORCE_SETS")

for mode in label_phonon_modes(ph, [0.5, 0.5, 0.5]):
    print(mode)
```

```
modes 1,2,3: -1.0867 THz  R5-
modes 4,5,6: 3.9891 THz  R4-
modes 7,8,9: 11.6887 THz  R5+
modes 10,11,12: 12.6621 THz  R4-
modes 13,14: 14.8133 THz  R3-
modes 15: 23.2302 THz  R2-
```

Each `PhononMode` carries `band_indices` (1-based, as in every CrystOD output),
`frequency` in THz, the irrep `labels`, the `qpoint`, the name of its star
(`qpoint_label`), `degeneracy`, and `is_imaginary`. A q point given as a
non-representative arm of a star is mapped onto the tabulated arm
automatically, so `[-0.5, 0.5, 0.5]` is labeled `R` just like `[0.5, 0.5, 0.5]`.

```{note}
Build the phonopy object with `primitive_matrix="auto"`. With an identity
primitive matrix, a zone-boundary instability of a supercell calculation is
folded onto the supercell Gamma point, where it cannot be labeled with an
irrep of the parent space group.
```

### Band unfolding onto the parent zone

The steps of [`crystod-phonon --unfold`](crystod-phonon.md#04-09-phonon-band-unfolding---unfold)
are functions of `crystod.phonon` as well. In the directory
`example/04-09_phonon_unfold/CaTiO3_Pnma`, the labels of the strongly unfolded
levels at R:

```python
import numpy as np
from crystod import phonon

inputs = phonon.load_unfold_inputs("child/62_PPOSCAR_CaTiO3", (2, 2, 2),
                                   "parent/221_PPOSCAR_CaTiO3", (2, 2, 2))
mapping = phonon.find_parent_mapping(inputs.child_poscar, inputs.parent_poscar,
                                     child_cell=inputs.child_cell,
                                     parent_cell=inputs.parent_cell)
path = phonon.make_parent_path(mapping)
bands = phonon.unfold(inputs.child_phonon, mapping, path.kpoints)
irreps = phonon.irrep_resolve(bands, mapping, path=path,
                              parent_phonon=inputs.parent_phonon)

print(mapping.M.tolist(), mapping.origin_shift)   # the setting of crystod-group
print(f"{bands.sum_rule_max_deviation:.1e}")       # sum_J P_J(k) = 3 n_parent = 15

ik = np.flatnonzero(np.all(np.isclose(path.kpoints, 0.5), axis=1))[0]   # R
_, first = np.unique(bands.degenerate_group[ik], return_index=True)
for J in first:                                    # one row per degenerate group
    if bands.group_weight[ik, J] >= 0.5:
        print(f"{bands.frequencies[ik, J]:8.4f} THz  P_g = {bands.group_weight[ik, J]:.3f}"
              f"  {irreps.group_label[ik, J]}")
```

```
[[1, 0, 1], [0, 2, 0], [-1, 0, 1]] [0.5 0.  0.5]
3.4e-14
  5.1343 THz  P_g = 0.796  R4+
  5.5078 THz  P_g = 0.926  R4+
  5.7633 THz  P_g = 0.932  R5+
  6.4519 THz  P_g = 0.852  R5+
  7.1725 THz  P_g = 0.869  R5+
 11.7271 THz  P_g = 0.883  R4-
 11.7635 THz  P_g = 0.904  R4-
 11.9118 THz  P_g = 0.813  R4-
 12.9270 THz  P_g = 0.896  R5+
 13.0534 THz  P_g = 0.965  R5+
 13.1828 THz  P_g = 0.958  R5+
 14.4142 THz  P_g = 0.997  R3+
 14.5944 THz  P_g = 0.999  R3+
 22.7281 THz  P_g = 1.000  R1+
```

`load_unfold_inputs` reads both structures and their force data (each force
file next to its POSCAR, `FORCE_SETS_<POSCAR name>` before `FORCE_SETS`, the
child's else in the working directory; phonopy runs in an empty directory)
and returns live `Phonopy` objects on the cells of the unfolding
(`UnfoldInputs`); `find_parent_mapping` gives the setting crystod-group finds,
converted to these cells, with the atom map, the pseudo-parent strain and the
equivalent settings (`ParentMapping`; `trans_mat=[1, 1, 0, 0, 0, 2, 1, -1, 0]`
picks another one, and `parent_mapping_from_setting` takes M and the origin
shift directly); `unfold` returns the frequencies, the weights of every mode
and of its degenerate group, the unfolded vectors and the largest deviation
from the sum rule (`UnfoldedBands`). `domain_average(inputs.child_phonon,
mapping, path.kpoints)` and `gamma_origin(inputs.child_phonon, mapping,
irreps=irreps, parent_phonon=inputs.parent_phonon, path=path)` give the
domain average and the origin of the child Γ modes; `irreps.weights` holds
the weight of every irrep in every mode. Arrays are indexed `[k, mode]`,
0-based, with the modes in ascending frequency at each k; bad input raises
`ValueError`.


### Phonon mode viewer

The page of [`crystod-phonon --visualize`](crystod-phonon.md#04-10-phonon-mode-viewer---visualize)
is built from a live `Phonopy` object as well. In the directory
`example/04-10_phonon_visualize/SrTiO3_Pm-3m`:

```python
import phonopy
from crystod import phonon

ph = phonopy.load(unitcell_filename="221_PPOSCAR_SrTiO3", force_sets_filename="FORCE_SETS",
                  supercell_matrix=[4, 4, 4], primitive_matrix="auto")
data = phonon.phonon_viewer_data(ph, bonds=[("Ti", "O", 2.1)])
phonon.write_phonon_viewer_html(data, "SrTiO3_viewer.html")
print(phonon.write_band_vector_yaml(ph, filename="band_vector.yaml"))   # q points

for point in data.points:                          # GM, X, M, R
    lowest = point.modes[0]
    print(f"{point.name:2s} {point.cell_description:28s} {lowest.irrep:8s} "
          f"{lowest.frequency:8.4f} THz")
mode = data.points[3].modes[0]                     # R, band 1: R5-, component 1
print(mode.band, mode.irrep, mode.component, mode.dimension)
print(mode.u.real.round(3))                        # atomic-gauge vectors, largest 1
```

```
306
GM primitive, 1 x 1 x 1 cells   GM4-(3)    0.0000 THz
X  primitive, 1 x 2 x 1 cells   X5-(2)     3.1516 THz
M  primitive, 2 x 2 x 1 cells   M2+        1.7234 THz
R  primitive, 2 x 2 x 2 cells   R5-(3)    -1.0867 THz
1 R5-(3) 1 3
[[ 0.  0.  0.]
 [ 0.  0.  0.]
 [ 0.  0.  1.]
 [ 0. -1.  0.]
 [ 0.  0.  0.]]
```

`phonon_viewer_data` runs the steps of the command: the dispersion and the
labeled points of the `--irreps` figure, and at every point (or at the one
`qpoint=["R"]` names) the symmetry-adapted modes with their set labels, the
display cell and the drawn atoms (`PhononViewer`, with one `ViewerPoint` per q
point and one `ViewerMode` per band). `ViewerMode.u` holds the atomic-gauge
displacement vector of every primitive atom (Sr, Ti and the three O here;
the first R5- partner turns the octahedra about x), and the page draws the
atom at lattice translation T displaced by Re[u exp(2 pi i q.T)] times the
amplitude. `conventional=True`, `band=...`, `npoints=...` and
`threshold=...` are the options of the command; `all_irreps=True` (its
`--all-irreps`) adds the segment midpoints after the special points, each
`ViewerPoint` with its `segment` (`"GM-X"`; None at a special point), and
`write_phonon_viewer_html` then names the page `phonon_visualize_all.html`
unless given a name; `write_band_vector_yaml` returns the number of q points
it wrote. Bad input raises `ValueError`.

### Mode-resolved force constants

The force constant of every mode and the irrep-resolved Hessians of
[`crystod-phonon --mode-resolved-fc`](crystod-phonon.md#04-12-mode-resolved-force-constants---mode-resolved-fc)
come from a live `Phonopy` object too. In the directory
`example/04-12_phonon_mode_fc/SrTiO3_Pm-3m`:

```python
import phonopy
from crystod import phonon

ph = phonopy.load(unitcell_filename="221_PPOSCAR_SrTiO3", force_sets_filename="FORCE_SETS",
                  supercell_matrix=[4, 4, 4], primitive_matrix="auto")
survey = phonon.survey_mode_resolved_fc(ph)                 # GM, R, X, M
for point in survey:
    soft = point.band_sets[0] if not point.band_sets[0].acoustic else point.band_sets[1]
    print(f"{point.q_label:2s} {soft.irrep_labels[0]:8s} {soft.frequency:8.4f} THz  "
          f"mu {soft.effective_mass:7.3f} amu  k {soft.force_constant:9.6f} eV/A^2")
gm4 = survey[0].irrep_blocks[0]
print(gm4.irrep, gm4.dim, round(gm4.translations_removed.eigenvalues[0], 6))
```

```
GM GM4-(3)    2.6629 THz  mu  20.015 amu  k  0.580737 eV/A^2
R  R5-(3)    -1.0867 THz  mu  15.999 amu  k -0.077309 eV/A^2
X  X5-(2)     3.1516 THz  mu  87.543 amu  k  3.557895 eV/A^2
M  M2+(1)     1.7234 THz  mu  15.999 amu  k  0.194446 eV/A^2
GM4- 12 0.82538
```

`survey_mode_resolved_fc` returns one `ModeForceConstants` per special point
(Γ first), `mode_resolved_force_constants(ph, q)` the one of any q; each holds
a `ModeForceConstantSet` per degenerate set (0-based `band_indices`,
`irrep_labels`, `frequency`, `effective_mass`, `force_constant`,
`force_constant_per_fu`, at Γ `force_constant_translations_removed` and
`acoustic`, `components` for a set split by the character projector; the
values are `None` for a set of several labels that cannot be split) and an
`IrrepHessianBlock` per irrep (`irrep`, `dim`, `eigenvalues`, `trace`,
`translations_removed`), with the NOTE lines in `notes`. `write_mode_resolved_fc_yaml`,
`read_mode_resolved_fc` and `format_mode_resolved_fc` write and read
`mode-resolved-fc.yaml` and give the terminal tables.

### Displacement patterns of isotropy subgroups

The patterns of
[`crystod-phonon -c POSCAR --element EL --irrep IR`](crystod-phonon.md#04-01-displacement-patterns-of-given-irreps---irrep-with--c)
need only the structure. In the directory `example/04-01_phonon_irrep/La3Ni2O7`:

```python
from phonopy.interface.vasp import read_vasp
from crystod import phonon

result = phonon.displacement_irrep_arrangements(read_vasp("PPOSCAR_La3Ni2O7_I4mmm"), ["O"],
                                                ["X3-", "X2+"], copies=[1, 1])
for a in result.arrangements:
    print(a.row.label, a.row.subgroup, a.check, a.point_group)
```

```
X3-(0;a) X2+(0;c) 36 Cmc2_1 same mm2
X3-(0;a) X2+(c;0) 62 Pnma same mmm
X3-(a;a) X2+(c;c) 38 Amm2 same mm2
X3-(0;a) X2+(c;d) 26 Pmc2_1 same mm2
X3-(a;b) X2+(0;c) 31 Pmn2_1 same mm2
X3-(a;b) X2+(c;d) 6 Pm same m
```

`DisplacementIrrepAnalysis` holds the table rows, the copies, the supercell
and one `DisplacementArrangement` per row and choice of copies
(`displacements` in Angstrom for every atom of the written cell,
`displaced_positions`, the space group spglib finds on the displaced
structure, `reproduce`); `order_parameter=`, `coefficients=`, `copies=`,
`conventional=` and `amplitude=` are the options of the command. These are
symmetry-adapted patterns, not eigenvectors of a dynamical matrix. Bad input
raises `ValueError`; the function writes no files.

## From imaginary phonons to subgroups

Combining the two — labeling an imaginary mode and enumerating the isotropy
subgroups of its irrep — is the symmetry-lowering step of a structure search.
`crystod.phonon.imaginary_mode_subgroups` does it in one call:

```python
from crystod.phonon import imaginary_mode_subgroups

for result in imaginary_mode_subgroups(ph, [0.5, 0.5, 0.5]):
    mode = result.mode
    print(f"{mode.frequency:.4f} THz  {'+'.join(mode.labels)}  "
          f"(degeneracy {mode.degeneracy})")
    for sub in result.subgroups:
        print("   ", sub.label, "->", sub.symbol)
```

```
-1.0867 THz  R5-  (degeneracy 3)
    R5-(0,0,a) -> I4/mcm
    R5-(a,a,a) -> R-3c
    R5-(0,a,a) -> Imma
    R5-(0,a,b) -> C2/m
    R5-(a,a,b) -> C2/c
    R5-(a,b,c) -> P-1
```

Every order-parameter direction of the degenerate level is covered, including
the ones a single frozen-in modulation would miss: freezing in one eigenvector
of the R-point triplet of SrTiO3 gives `I4/mcm`, but the same triplet also
reaches `R-3c` and `Imma`, which are the tilt systems a structure search has to
try before it can claim a ground state.

`scan_imaginary_modes` runs the same analysis over every q point the supercell
resolves, so no q point has to be guessed:

```python
from crystod.phonon import scan_imaginary_modes, commensurate_qpoints

len(commensurate_qpoints(ph))          # 64 for a 4x4x4 supercell
results = scan_imaginary_modes(ph)     # most unstable level first
```

Arms of the same star are analyzed once, q points that cannot be labeled are
skipped with a warning instead of aborting the scan, and `threshold` (default
`-0.1` THz) sets what counts as imaginary. A level whose irrep has no tabulated
subgroups (a symmetry line or plane) comes back with an empty `subgroups` and
the reason in `errors`, so a scan never dies part-way through:

```python
for result in scan_imaginary_modes(ph):
    if result.errors:
        print(result.mode, "->", result.errors)
```

```{seealso}
The same analysis is available from the command line as
[`crystod-phonon --subgroup`](crystod-phonon.md), and the theory behind the
enumeration is described in
[Isotropy subgroups](theory-isotropy-subgroups.md).
```

## Group theory and spectroscopy entry points

The functions behind the `crystod-group` and `crystod-phonon` modes added
since v0.4.3 return dataclasses and are documented with their commands:

```python
from crystod import group, phonon, salc

group.invariant_polynomials("Pm-3m", ["R4+"], degree=4)      # InvariantBasis, section 02-11
group.landau_lifshitz("Pm-3m", "R4+")                         # LandauLifshitz, section 02-11
group.secondary_order_parameters("Pm-3m", ["R4+"], "a 0 0")   # list[SecondaryOrderParameter], section 02-11
group.find_isotropy_irreps("Pm-3m", "I4/mcm")                 # list[IsotropyMatch], section 02-12
group.subgroup_graph("Pm-3m", ["R4+", "M3+"])                 # SubgroupGraph, section 02-13
group.correlation_table("m-3m", "4/mmm")                      # CorrelationTable, section 02-09
group.compatibility_relations("Pm-3m", "GM", "X")             # list[Compatibility], section 02-09
group.subgroup_correlation("P", "C", spinor=True)             # SubgroupCorrelation, section 02-09
group.spin_orbit_relations("Pm-3m", "R")                      # list[SpinOrbitRelation], section 02-17
group.tensor_form("4mm", "piezoelectric")                     # TensorForm, section 02-06
group.symmetric_square, group.jahn_teller_modes               # section 02-02
phonon.gamma_mode_activities, phonon.gamma_raman_tensors      # section 04-03
salc.dipole_selection_rules                                   # section 01-04
```

See [crystod-group](crystod-group.md) sections 02-02, 02-06, 02-09, 02-11 to 02-13 and 02-17,
[crystod-phonon](crystod-phonon.md) section 04-03 and [crystod](crystod.md)
section 01-04 for the arguments, the printed forms and the MCP tools.

## Magnetic groups, MD projection and superlattice reflections

The functions behind `crystod-mag --qpoint` / `--classify-only`,
`crystod-md --project`, `crystod-xrd --parent` and the axis settings and
transformation block of `crystod-group` added in v0.4.4. The block runs as
written from the top of the CrystOD source tree, with the shipped example
files as inputs, or after `pip install` in a directory where
`crystod-example 06-03 04-02` has copied the examples into `./example` (06-03 brings
`04-07_modulation` along) and `crystod-phonon --irreps --dim 4 4 4 -c
221_PPOSCAR_SrTiO3` has been run in `example/04-02_phonon_bandirrep/SrTiO3_Pm-3m`:
`phonon_irreps.yaml` is an output of that command, not a packaged file.
`crystod.mag` takes the crystal as a phonopy
`PhonopyAtoms` (`atoms`), the space-group functions of `crystod.group`
as the spglib tuple `(lattice, positions, numbers)` (`spg_cell`):

```python
import numpy as np
import phonopy
from phonopy.interface.vasp import read_vasp
from pymatgen.core import Structure
from crystod import group, mag, md, phonon, xrd

# inputs: shipped example files, paths from the top of the source tree (or of
# the directory holding the ./example that crystod-example writes)
atoms = read_vasp("example/test_POSCARs/136_PPOSCAR_TiO2")    # PhonopyAtoms (crystod-mag)
spg_cell = (atoms.cell, atoms.scaled_positions, atoms.numbers)  # spglib tuple (crystod-group)
magmoms = np.zeros((len(atoms.numbers), 3))
magmoms[atoms.numbers == 22] = [[0, 0, 1], [0, 0, -1]]          # antiparallel Ti
symbols, lattices, frames = md.read_xdatcar("example/06-03_md_projection/XDATCAR_I4mcm_1")
phonon_obj = phonopy.load("example/04-07_modulation/ScF3_Pm-3m/phonopy_params.yaml", is_nac=False)
parent_cif = "example/test_POSCARs/221_PPOSCAR_SrTiO3.cif"
child_cif = "example/test_POSCARs/140_PPOSCAR_SrTiO3.cif"
structure = Structure.from_file(child_cif)

mag.analyze_spin_basis(atoms, "Ti", "GM")               # SpinBasisAnalysis, section 05-03
mag.magnetic_summary_rows, mag.magnetic_summary_notes   # the summary table, section 05-03
info = mag.magnetic_space_group(*spg_cell, magmoms)     # MagneticGroupInfo, section 05-03
mag.macroscopic_responses(info)                         # MagneticResponses, section 05-03
mag.classify_collinear, mag.magnetic_point_group_symbol # CollinearClass, MPG symbol, section 05-03
mag.unified_symbol("128.410")                           # "P4/mnc.1'_I[I4/mmm]" (UNI symbol), section 05-03
mag.phonon_angular_momentum(info).text()                # phonon angular momentum near GM, section 05-08
mag.analyze_multi_element(atoms, ["Ti", "O"], "GM")      # MultiElementAnalysis, section 05-09
mag.superpose_bases                                     # Superposition of listed bases, section 05-09
mag.coupled_magnetic_isotropy_subgroups("Pm-3m", ["R4+", "M3+"])  # coupled irreps (--parent --irrep A B), section 05-10
mag.coupled_magnetic_isotropy_subgroups("Pm-3m", ["R4+", "GM4+"],
                                        parities=["even", "odd"])  # a distortion + a magnetic order, section 05-10
mag.coupled_magnetic_order_parameter("Pm-3m", ["R4+", "M3+"],
                                     "0 a a d 0 0".split())  # one direction (--order-parameter), section 05-10
mag.magnetic_irrep_arrangements(atoms, ["Mn"], ["R4-", "M3-"])  # MagneticIrrepAnalysis (-c --element --irrep), section 05-01
md.project_trajectory("example/test_POSCARs/221_PPOSCAR_ScF3", (2, 2, 2),
                      symbols, lattices, frames, qpoints=["R", "M"])  # TrajectoryProjection, section 06-03
md.project_trajectory(None, (2, 2, 2), symbols, lattices, frames,
                      phonon=phonon_obj, temperature=300)  # phonon-eigenvector basis, section 06-03
md.format_projection, md.commensurate_qpoints           # section 06-03
xrd.superlattice_reflections(parent_cif, child_cif)     # SuperlatticePattern, section 08-02
xrd.format_superlattice_pattern, xrd.write_superlattice_table  # section 08-02
xrd.plot_superlattice_pattern, xrd.radiation_lines      # section 08-02
xrd.compute_xrd_pattern(structure, radiation="neutron", wavelength=1.5)  # XRDPattern, section 08-02
group.list_space_group_settings(spg_cell)               # SettingTable, section 02-15
group.resolve_setting, group.transform_to_setting       # SpaceGroupSetting, its cell, section 02-15
group.SymmetryModeAnalysis(
    parent_cif, child_cif, 0.01).setting_transformation()  # SettingTransformation (P, p), section 02-16
phonon.read_phonon_irreps(   # the output of crystod-phonon --irreps in that directory
    "example/04-02_phonon_bandirrep/SrTiO3_Pm-3m/phonon_irreps.yaml")  # dict, section 04-02
```

The records these return are `mag.SpinBasisAnalysis`,
`mag.SpinBasisComponent`, `mag.OrderParameterDirection` (the order-parameter
directions at q != 0 in `SpinBasisAnalysis.directions`, section 05-06),
`mag.SubgroupAlignment` and `mag.SubgroupSpinField` (the bases placed on a
subgroup structure, `SpinBasisAnalysis.subgroup`, section 05-07),
`mag.MagneticGroupInfo`, `mag.MagneticResponses`
and `mag.CollinearClass` (with `mag.format_magnetic_responses` for their
printed form), `mag.PhononAngularMomentum` and `mag.AngularMomentumComponent`
(the phonon angular momentum near GM, section 05-08), `mag.MultiElementAnalysis`, `mag.CombinedArrangement`, `mag.CopyRelation` and `mag.Superposition` (several magnetic elements and superpositions, section 05-09), `mag.CoupledMagneticIsotropySubgroups`, `mag.CoupledMagneticIsotropySubgroup` and `mag.CoupledMagneticOrderParameter` (magnetic isotropy subgroups of several coupled irreps; `parities` makes an irrep time-even, Python only; section 05-10), `md.TrajectoryProjection`, `xrd.SuperlatticePattern`,
`xrd.SuperlatticeReflection` and `xrd.KPointSummary`, and
`group.SettingTable` and `group.SpaceGroupSetting`; `xrd.RADIATIONS` lists the
radiations. See [crystod-mag](crystod-mag.md) section 05-03,
[crystod-md](crystod-md.md) section 06-03, [crystod-xrd](crystod-xrd.md)
section 08-02, [crystod-group](crystod-group.md) sections 02-15 and 02-16 and
[crystod-phonon](crystod-phonon.md) section 04-02 for the arguments and the
printed forms.

## Band irreps of a VASP run

`crystod.salc.extract_band_irreps` is `crystod --extract-irrep` (section 01-08):
the irreps of the electronic bands of one finished VASP run, read straight
from its WAVECAR. The block runs as written from the top of the CrystOD source
tree, on the small SrTiO3 and InP runs shipped as test inputs. After `pip
install`, `crystod-example 01-03` copies the `SrTiO3` and `InP_SOC` runs into
`./example/01-03_hybridization/vasp_wavecar`, and the block runs there too,
except the `SrTiO3_ISPIN2` lines: that run is not in the pip package.

```python
from crystod.salc import extract_band_irreps, format_band_irreps, write_band_irreps_yaml

result = extract_band_irreps("example/01-03_hybridization/vasp_wavecar/SrTiO3")
[k.label for k in result.kpoints]   # ['GM', 'R', 'X', 'M']: the special points in the file
gm = result.kpoint("GM")            # a KPointIrreps: label, kpoint, index, little_group, levels
[(lv.bands, lv.irrep, lv.mulliken) for lv in gm.levels[4:9]]
# [([8, 9, 10], 'GM4-', 'T1u'), ([11, 12, 13], 'GM5-', 'T2u'), ([14, 15, 16], 'GM4-', 'T1u'),
#  ([17, 18, 19], 'GM5+', 'T2g'), ([20, 21], 'GM3+', 'Eg')]
round(result.gap, 4)                # 1.8051 (eV): CBM - VBM over every k point of the file
result.kpoint("M").levels[-1].note  # 'incomplete: the band list ends inside this multiplet ...'

x = extract_band_irreps("example/01-03_hybridization/vasp_wavecar/SrTiO3",
                        kpoints=["X", "1/4 1/4 1/4"], zero="efermi", window=(-3, 2))
[(k.label, k.little_group, [lv.irrep for lv in k.levels]) for k in x.kpoints]
# [('X', 'P4/mmm (123)', ['X3-', 'X5+', 'X4-', 'X5-', 'X4+']), ('LD', 'R3m (160)', ['LD3', 'LD2'])]

# not in the pip package: the ISPIN = 2 run stays in the CrystOD development tree
spin = extract_band_irreps("example/01-03_hybridization/vasp_wavecar/SrTiO3_ISPIN2",
                           kpoints=["X"], spin="up")
[(k.label, k.spin) for k in spin.kpoints], spin.metallic   # ([('X', 'up')], True)

inp = extract_band_irreps("example/01-03_hybridization/vasp_wavecar/InP_SOC", kpoints=["L"])
pair = inp.kpoint("L").levels[3]     # zincblende InP with spin-orbit coupling
pair.bands, pair.irrep, pair.note    # ([7, 8], '-L4/-L5', 'time-reversal pair (-L4 + -L5)')
pair.parts                           # [([7], '-L4'), ([8], '-L5')]: the irrep of each band

lines = format_band_irreps(result)                # the terminal report, line by line
write_band_irreps_yaml(result, "band_irreps.yaml")  # the -o file; result.to_dict() is its content
```

The arguments are those of the command: `path` (the WAVECAR or the run
directory), `kpoints` (`None` for every special point the file holds, `"all"`
for every k point, or a list of labels and coordinates — `"X"`,
`[0, 0.5, 0]`, `"0 1/2 0"`), `zero` (`"vbm"`, `"efermi"`, `"raw"`), `window`
(`(emin, emax)` in eV relative to the zero), `spin` (`"up"`, `"down"`,
`"both"`), `symprec`, `degeneracy_tol` (eV, default 0.001) and the keyword
`cell` (the `-c` file). The result is a `BandIrreps` dataclass: the run facts
(`nbands`, `nkpts`, `ispin`, `spinor`, `encut`, `efermi` and
`efermi_source`, `vbm`, `cbm`, `metallic`, `gap`), the space group, the
analysed `kpoints` (`KPointIrreps`, one per k point and spin channel) with
their `levels` (`BandLevel`: `level`, 1-based `bands`, `energy` relative to
the zero, `energy_raw`, `degeneracy`, `irrep`, `mulliken`, `note`,
`occupation`, `irreps`, `multiplicities`, and `parts`: the irrep of each band
when the bands of an `A/B` level are pure states) and the `edges` (`BandEdges`
per k point). Bad input — no WAVECAR, no POSCAR, a k point the file lacks, an
unreadable WAVECAR — raises `ValueError` with the message the command prints.
The sublattice runs of `crystod --diagram --vasp-setup` (Va point charges in
the POSCAR) are read like any other run.

## Electronic band unfolding of two VASP runs

`crystod.salc.unfold_bands` is `crystod --unfold` (section 01-09,
[Electronic band unfolding of two VASP runs](crystod.md#electronic-band-unfolding-of-two-vasp-runs---unfold)):
the bands of a low-symmetry VASP run unfolded onto the Brillouin zone of its
high-symmetry parent run, from the two WAVECARs. The block runs as written
from the top of the CrystOD source tree, on the small SrTiO3 pair of
`example/01-09_band_unfold` (I4/mcm onto Pm-3m); that directory is not
distributed (neither in the pip package nor in the repository), so point `root`
at your own two runs.

```python
from crystod.salc import format_band_unfolding, unfold_bands, unfold_kpoints

root = "example/01-09_band_unfold/SrTiO3"   # not distributed: your own two runs
result = unfold_bands(f"{root}/child", f"{root}/parent")   # zero="vbm" of the child, for both
result.M.tolist(), result.N, result.image_names
# ([[0, 1, 1], [0, -1, 1], [1, 0, -1]], 2, ['GM', 'R'])
[(leg, covered, total) for leg, covered, total, _ in result.coverage]
# [('GM-X', 3, 3), ('X-M', 2, 3), ('M-GM', 2, 3), ('GM-R', 3, 3), ('R-X', 2, 3), ('R-M', 3, 3)]

gm = result.path_entries(0)[0]         # the first point of the child path: GM, k#5
shares = gm.group_weights / gm.level_sizes[:, None]   # W_i / deg of every level
for bands, energy, share in zip(gm.groups, gm.level_energies - result.zero_energy, shares):
    if 1 < energy < 4:
        print(bands + 1, f"{energy:.3f}", share.round(3))
# [33] 1.451 [0.92 0.08]
# [34 35] 1.466 [0.891 0.109]
# [36] 3.360 [0.432 0.568]
# [37] 3.656 [1. 0.]
# [38 39] 3.855 [0.045 0.955]

f"{result.checks['sum_rule_max_deviation']:.1e}", f"{result.checks['copies_max_deviation']:.1e}"
# ('2.0e-15', '8.1e-06')
result.figure_window, result.table_window   # ((-7.0, 5.5), (-6.5, 5.5)): eV relative to the zero

lines = format_band_unfolding(result)       # the terminal report, line by line
result.write_dat("band_unfold.dat")         # the three files of the command
result.write_yaml("band_unfold.yaml")       # result.to_dict() is its content (json.dumps works)
result.plot("band_unfold.pdf")              # 2: the number of pages

kp = unfold_kpoints(f"{root}/child", f"{root}/parent", output="KPOINTS_unfold")
kp.mesh_points, kp.path_points, kp.legs
# (4, 14, ['GM-X', 'X-M', 'M-GM', 'GM-R', 'R-X', 'X|R', 'R-M'])
```

The arguments are those of the command: `child` and `parent` (a WAVECAR or a
run directory; `parent=None` with `parent_cell=FILE` gives the setting and the
weights without parent levels), `child_cell` and `parent_cell` (the
`--child-poscar` and `--parent-poscar` files), `trans_mat` (nine integers),
`zero` (`"vbm"`, `"efermi"` or `"fermi"`, `"raw"` or `"none"`, or a number in
eV), `separate_zero`, `spin` (`"up"`, `"down"`, `"both"`), `degeneracy_tol`
(eV, default 0.001), `all_kpoints`, `weight_min` (default 0.02), `window`
(`(emin, emax)` in eV relative to the zero), `symprec` and `tolerance` (the
setting search, 0.01 Å). The result is a `BandUnfolding` dataclass: the two
runs (`child`, `parent`: `VaspBandRun` with the formula, space group, NBANDS,
ISPIN, ENCUT, VBM, CBM, E_fermi, the k points, the raw `eigenvalues[spin, k,
band]` and the band `path`), the setting (`mapping`, `M`, `N`, `offsets` g_i,
`image_names`), the zero (`zero`, `zero_energy`, `parent_zero_energy`), the
unfolded k points (`unfolded[(spin, k)]`, 0-based, a `KUnfolded` with `K`,
the `images`, the raw `energies`, the band `weights[band, image]`, the pseudo
`norms`, the degenerate `groups` and the level weights
`group_weights[level, image]`, W_i = Re Tr(S^-1 P_i); `level_energies` and
`level_sizes` per level), `path_entries(spin)` (the child path points in path
order), the parent matches and the parent-path view, the `coverage` of every
parent leg (`(leg, covered, total, positions)`), the `alignment` statistics,
the `checks`, `top_complete` (the completeness limit) and `figure_window`,
`table_window` and `default_window()`. `unfold_kpoints(child, parent, *,
child_cell=None, parent_cell=None, trans_mat=None, npoints=51,
output="KPOINTS_unfold", write=True)` writes the child KPOINTS of
`--unfold-kpoints` and returns a `KpointsUnfold` (the file's `lines`,
`mesh_points`, `path_points`, `legs`). Bad input (no WAVECAR, no POSCAR, a
POSCAR that is not the run's cell, structures that cannot be related, a
`trans_mat` that is not nine integers or not an equivalent setting, a
non-finite `zero`) raises `ValueError` with the message the command prints.
The KPOINTS reader behind both, `crystod.vasp_io.read_kpoints(path,
lattice=None, scale=1.0)`, reads explicit lists (reciprocal or Cartesian),
line mode and the `! K.n LABEL SEP` labels.

## The packaged examples

`crystod.examples` holds the inputs of the `--example` options and the
example directories that `crystod-example` copies (section 11-01); the
functions behind that command are these:

```python
from crystod.examples import (ExampleConflictError, copy_example_dirs, example_dir_path,
                              get_example_dir, list_example_dirs, resolve_example_dirs)

len(list_example_dirs())           # 44 packaged directories (ExampleDirectory records)
ex = get_example_dir("04-03")      # by number or name ("04-03_phonon_activity")
ex.requires                        # ('04-02_phonon_bandirrep', '04-04_phonon_fatband'): its README uses them
example_dir_path("04-03")          # the directory inside the installed package
[d.name for d in resolve_example_dirs(["04-03"])]
# ['04-03_phonon_activity', '04-02_phonon_bandirrep', '04-04_phonon_fatband']

try:
    paths = copy_example_dirs(["04-03"], "work")  # = crystod-example 04-03 -o work
except ExampleConflictError as exc:            # a file in work/ differs; nothing written
    print(exc.paths)
```

`copy_example_dirs` copies the directories and the ones their READMEs use,
plus the shared `test_POSCARs/` and `test_XYZs/`, keeps files that are
already there and identical, and refuses with `ExampleConflictError` (a
`FileExistsError`) before writing anything if one differs. Run the README
commands in the copy, not inside the package: they write their outputs next
to their inputs. See [crystod-example](crystod-example.md#from-python) for
the details.

## The other domains

The remaining modules expose the computational core of their command. A few
representative entry points:

```python
from crystod.salc import CrystalOrbital, CrystalOrbitalDiagram
from crystod.group import SpaceGroupIrrepAlgebra, decompose, shell_terms
from crystod.bz import get_brillouin_zone_3d, get_seekpath_kpath
from crystod.mag import get_spin_representation
from crystod.md import read_xdatcar, build_symmetry_projector
from crystod.mol import load_molecule, project_salcs, MODiagram
from crystod.xrd import load_structure, compute_xrd_pattern, smear_pattern
from crystod.search import search_materials, fetch_materials, write_poscar
from crystod.slab import generate_slabs, distinct_miller_indices, write_slab_poscar
```

`dir()` on any domain module lists everything it exports:

```python
import crystod.phonon
dir(crystod.phonon)
```

The implementation modules (`crystod.phonon_irreps`, `crystod.isotropy_subgroup`,
`crystod.operations`, ...) remain importable under their own names, so code
written against CrystOD before the API modules existed keeps working unchanged;
the domain modules are a curated, stable view over them.

## Library use: keywords and input checks

A few keywords and checks matter when CrystOD runs inside another program.
The block runs as written from the top of the CrystOD source tree, or next to
the `./example` that any `crystod-example CC-NN` writes (it reads one of the
shared structures):

```python
import numpy as np
from phonopy.interface.vasp import read_vasp
from crystod import bz, group, phonon, salc
from crystod.decompose_irrep import representation_problem

cell = read_vasp("example/test_POSCARs/221_PPOSCAR_ScF3")
phonon.SymmetryOnlyVibrations(cell, quiet=True)     # no primitive-cell note on stdout

sg_type, names, primitive, conventional = bz.get_special_kpoints("Pbnm")
sg_type.international_short     # 'Pnma': the setting the coordinates refer to
conventional                    # None: a primitive lattice

rec_lat = np.linalg.inv(cell.cell).T
vertices, ridges, facets = bz.get_brillouin_zone_3d(rec_lat, tolerance=1e-5)
bz.get_folded_gamma_points(np.diag([2, 1, 1]), rec_lat)   # 2 q points; np.diag([1.5, 1, 1]) raises ValueError

table = group.get_character_table("3m")
group.decompose([2, 0, 1], table)           # {'A1': 1, 'A2': 0, 'E': 1}: rounded, not checked
representation_problem([2, 0, 1], table)    # 'the reduction formula gives non-integer multiplicities ...'
representation_problem([0, 0, 2], table)    # 'negative multiplicities A2 -1 (a difference of representations)'
representation_problem([3, 0, 1], table)    # None: the character of A1 + E

co = salc.CrystalOrbital(cell, spinor=True)  # crystod -c ... --spinor
_, _, counts, labels = co.irreducible_decomposition([0, 0, 0], "Sc", "d")
{labels[key]: int(n) for key, n in counts.items() if n > 0}   # {'-GM7+(2)': 1, '-GM8+(4)': 2}
```

- `phonon.SymmetryOnlyVibrations(cell, quiet=True)` does not print the note
  `### Inputed cell was converted into primitive cell. ###` when it reduces
  `cell` to the primitive cell (default `quiet=False`, which the commands
  keep). `phonon.gamma_mode_activities` passes it, so neither a library call
  nor the `crystod_phonon_activity` MCP tool prints the note (section 04-08).
- `bz.get_special_kpoints` returns as its first element the spglib record of
  the ISO-IR standard setting of the group, the setting the coordinates refer
  to. A non-standard setting symbol selects the group only: `Pbnm` gives the
  table of `Pnma`, `Amam` and `Bbmm` that of `Cmcm` with its C-centred
  coordinates. The conventional coordinates are `None` for a primitive
  lattice (section 03-03).
- `bz.get_brillouin_zone_3d(rec_lat, tolerance=1e-5)` merges zone corners
  closer than `tolerance` times the length of the shortest reciprocal lattice
  vector and drops faces left with fewer than three corners, so a cell that is
  cubic up to noise gives the cube; `tolerance=0` keeps every corner. The zone
  is built on the Selling-reduced basis, so any basis of the lattice gives the
  same polyhedron (section 03-01).
- `bz.get_folded_gamma_points` and `bz.parse_transformation_matrix` raise
  `ValueError` for a transformation matrix with a non-integer entry, which
  describes no supercell (`parse_transformation_matrix` accepts a fraction
  equal to an integer, such as `4/2`). The folded points are the nearest
  images also for oblique unit-cell bases (section 03-02).
- `group.decompose` rounds the reduction formula and does not check its
  input; since v0.4.4 `crystod-group --decompose` refuses a vector that is not the
  character of a representation. The check is
  `crystod.decompose_irrep.representation_problem(characters, table)`, which
  `crystod.group` does not export: it returns `None` for the character of a
  representation, and otherwise a sentence naming what is wrong. It names the
  non-integer multiplicities of the reduction formula, the negative ones
  (`[0, 0, 2]` in 3m is A1 - A2: `negative multiplicities A2 -1 (a difference
  of representations)`), and, when the rounded combination does not give the
  vector back, that combination and its characters (`[2, 0, 1]`: `the nearest
  integer combination 1(A1) + 1(E) has the characters 3 0 1, not 2 0 1`)
  (section 02-03).
- `salc.CrystalOrbital(cell, spinor=True)` decomposes into the double-valued
  irreps of `crystod --spinor`, under the names of
  [Double-valued irreps](crystod.md#double-valued-irreps---spinor) (Bradley &
  Cracknell's Table 6.5 numbering with two exceptions): Sc 3d of ScF3 at Γ is
  `-GM7+` + 2 `-GM8+`. The namer is
  `crystod.wavecar_irreps.double_valued_names`, which `--extract-irrep` and
  the overlap engine use as well; it names the irreps at the k point it is
  given, and `crystod.wavecar_irreps.transport_double_valued_names` carries
  the names of the representative arm
  (`crystod.isoir.IsoIRLabeler.representative_k`) to the other arms of the
  star by conjugation, as `crystod.wavecar_irreps.little_group_data`
  (`names_transported`) and `crystod --spinor` do. The keyword `spior=`, a
  misspelling of `spinor=`, is still accepted, with a `DeprecationWarning`
  (section 01-02).

```{seealso}
The group theory the API evaluates is explained in
[Theoretical background](theory-representations.md), whose
`crystod.operations.wigner_D_real` example is the smallest CrystOD API call
there is.
```
