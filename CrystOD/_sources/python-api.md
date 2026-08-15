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
```

*Testsuite section 35 checks everything documented on this page.*

```{note}
Importing CrystOD is cheap: `import crystod` and the seven domain modules pull
in nothing heavier than NumPy. phonopy, spgrep, spglib, PySCF and matplotlib
are imported only when a function that needs them is actually called, so a
program that uses one corner of CrystOD does not pay for the rest.
```

## Isotropy subgroups of an irrep

`crystod.group.isotropy_subgroups` is the API form of
[`crystod-group --supergroup`](crystod-group.md): given a space group and one
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
already validated.
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

```{seealso}
The group theory the API evaluates is explained in
[Theoretical background](theory-representations.md), whose
`crystod.operations.wigner_D_real` example is the smallest CrystOD API call
there is.
```
