# crystod-bz

Interactive 3D Brillouin-zone plots, and the special-k-point tables behind
them.

| I want to ... | command |
|---|---|
| plot the BZ with its recommended k path | `crystod-bz -c POSCAR` |
| plot it with my own k path | `crystod-bz -c POSCAR --band "..." --band-labels "..."` |
| see how a supercell folds the BZ | `crystod-bz -c POSCAR --trans-mat "0 1 2  -1 0 2  1 -1 2"` |
| list the special k points of a space group | `crystod-bz --show-kpoint --sg Pnma` |

## 03-01. Brillouin zone plot

*Example directory: `example/03-01_brillouin_zone` (testsuite section 03-01); after pip install: `crystod-example 03-01`*

Plots the first Brillouin zone of a structure as an interactive 3D HTML file,
with its high-symmetry k points and the recommended k path (or a path you
give), so that you can see where the k points of a band calculation lie.

```{seealso}
**Theory:** [Brillouin-zone polyhedron of an arbitrary cell](theory-representations.md#brillouin-zone-polyhedron-of-an-arbitrary-cell-crystod-bz) —
why the drawn zone does not depend on the basis in which the cell is given,
and how corners that coincide within the noise are merged.
```

| Input | Command | Output |
|---|---|---|
| POSCAR | `crystod-bz -c POSCAR` | terminal: space group, k points and the seekpath k path; file `BZ_POSCAR.html` (3D zone with the path) |
| the same, a file name | add `--output BZ_ScF3_Pm-3m.html` | the plot under that name |
| the same, your own path | add `--band "..." --band-labels "..."` | the zone with that path, in the reciprocal basis of the input |

```bash
crystod-bz -c 221_PPOSCAR_ScF3
crystod-bz -c 221_PPOSCAR_ScF3 --output BZ_ScF3_Pm-3m.html
```

```
* Structure *
Space group: Pm-3m (#221)

* Recommended k-path (seekpath) *
  GAMMA    ( 0.0000,  0.0000,  0.0000)
  X        ( 0.0000,  0.5000,  0.0000)
  M        ( 0.5000,  0.5000,  0.0000)
  R        ( 0.5000,  0.5000,  0.5000)
  Path: GAMMA-X-M-GAMMA-R-X   R-M

* Output files *
  Wrote Brillouin-zone visualization: BZ_221_PPOSCAR_ScF3.html
```

The written HTML is a live 3D plot — the one below is the actual output of the
command above (drag to rotate, scroll to zoom, hover the k points for their
coordinates):

```{raw} html
<iframe src="_static/embed/BZ_221_PPOSCAR_ScF3.html" width="100%" height="560" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/BZ_221_PPOSCAR_ScF3.html" target="_blank">Open this Brillouin zone full-screen</a></p>
```

How to read the output:

- `* Structure *`: the detected space group of the structure.
- `* Recommended k-path (seekpath) *`: the high-symmetry k points with their
  fractional coordinates and the k path that
  [seekpath](https://github.com/giovannipizzi/seekpath) generates for that
  space group (e.g. GM-X-M-GM-R-X, M-R for Pm-3m). Disconnected path
  segments (`GAMMA-X-M-GAMMA-R-X   R-M`) are drawn separately, so that every
  plotted line is a continuous band path.
- The HTML: the zone, the path and the reciprocal basis vectors
  b<sub>1</sub>, b<sub>2</sub>, b<sub>3</sub>. Only the construction of the
  zone uses a reduced basis: the k path, the drawn arrows and the hover
  coordinates stay in the basis of the input structure.

:::{dropdown} A custom k path (`--band`)

A custom path can be supplied instead of the automatic one with
`--band` / `--band-labels`; coordinates may be given as decimals or fractions,
comma-separated into continuous segments:

```bash
crystod-bz -c 221_PPOSCAR_ScF3 \
    --band "0 0 0  0 1/2 0  1/2 1/2 0  0 0 0  1/2 1/2 1/2  0 1/2 0, 1/2 1/2 0  1/2 1/2 1/2" \
    --band-labels "GM X M GM R X M R"
```

:::

:::{dropdown} Options and requirements

Options and requirements:

- `-c`/`--cell`: the structure file (default: `POSCAR`); the former
  `--poscar` spelling is kept as an alias.
- `--output`: the HTML file; if omitted, the plot is saved in the current
  directory as `BZ_{structure name}.html` (e.g. `BZ_221_PPOSCAR_ScF3.html`).
- Without `--band`: if the input cell differs from the seekpath standardized
  primitive cell, the Brillouin zone and k-path are drawn for the
  standardized primitive cell (a NOTE is printed in that case).
- With `--band`: the coordinates always refer to the reciprocal basis of the
  input structure, and the zone is then drawn for the input cell as it is.
  An oblique cell (a raw monoclinic cell, for example) still gives the true
  Wigner-Seitz cell.
- `--tolerance`: the symmetry tolerance of seekpath/spglib. It does not
  change the merge of near-coincident zone corners, for which the command
  always uses the default of the construction.

:::

:::{dropdown} From Python

**Python API.** `crystod.bz.get_brillouin_zone_3d(rec_lat, tolerance=1e-5)`
returns the `(vertices, ridges, facets)` of the zone, with the reciprocal basis
vectors as the rows of `rec_lat`. `tolerance` is the corner-merge threshold in
units of the shortest reciprocal lattice vector; `tolerance=0` keeps every
corner of the Voronoi construction. A sheared basis of the simple cubic
lattice gives the cube:

```python
import numpy as np
from crystod import bz

a = 4.07 * np.eye(3)
T = np.array([[1, 2, 0], [0, 1, 0], [0, 0, 1]])   # another basis of the same lattice
rec_lat = np.linalg.inv(T @ a).T
vertices, ridges, facets = bz.get_brillouin_zone_3d(rec_lat)
print(len(vertices), len(facets))                   # 8 6
```

:::

### Special k points of a space group (`--show-kpoint`)

Prints the special (high-symmetry) k points of a space group, with the ISO-IR
labels that every irrep label of CrystOD refers to. No structure file is
needed and no plot is produced.

```{seealso}
**Theory:** [Special k points and the ISO-IR standard settings](theory-representations.md#special-k-points-and-the-iso-ir-standard-settings-crystod-bz---show-kpoint) —
where the table comes from, which setting and centring it refers to, and why
no B-centred table appears.
```

| Input | Command | Output |
|---|---|---|
| a space-group symbol or number | `crystod-bz --show-kpoint --space-group Pnma` | terminal: the special k points with their ISO-IR labels, in the primitive reciprocal basis |
| a centred lattice | `crystod-bz --show-kpoint --space-group Fm-3m` | the same, plus the coordinates in the conventional reciprocal basis |
| the symbol of a non-standard setting | `crystod-bz --show-kpoint --space-group Pbnm` | the table of the ISO-IR standard setting (here Pnma) and a NOTE naming the requested setting |

```bash
crystod-bz --show-kpoint --space-group Pnma
```

```
* Space group *
Pnma (No. 62)

* K points (primitive) *
GM: (0, 0, 0)
X: (1/2, 0, 0)
Y: (0, 1/2, 0)
Z: (0, 0, 1/2)
S: (1/2, 1/2, 0)
T: (0, 1/2, 1/2)
U: (1/2, 0, 1/2)
R: (1/2, 1/2, 1/2)
```

How to read the output:

- `* Space group *`: the ISO-IR standard setting that the table refers to.
- `* K points (primitive) *`: each special k point with its ISO-IR (ISOTROPY,
  Miller-Love) label, in the primitive reciprocal basis — the same names as
  in the SALC/irrep analyses (`crystod`, `crystod-mag`, `crystod-group`,
  `crystod-phonon --irreps`).

:::{dropdown} A centred lattice (Fm-3m)

```bash
crystod-bz --show-kpoint --space-group Fm-3m
```

```
* Space group *
Fm-3m (No. 225)

* K points (primitive) *
GM: (0, 0, 0)
X: (1/2, 0, 1/2)
L: (1/2, 1/2, 1/2)
W: (1/2, 1/4, 3/4)

* K points (conventional) *
GM: (0, 0, 0)
X: (0, 1, 0)
L: (1/2, 1/2, 1/2)
W: (1/2, 1, 0)
```

- `* K points (conventional) *`: printed only for centred lattices, whose
  conventional and primitive cells differ: the same points in the
  conventional reciprocal basis.

:::

:::{dropdown} A non-standard setting (Pbnm)

```bash
crystod-bz --show-kpoint --space-group Pbnm
```

```
* Space group *
Pnma (No. 62)
NOTE: "Pbnm" names the non-standard setting P 2_1/b 2_1/n 2_1/m of space group No. 62.
      The labels and coordinates below refer to the ISO-IR standard setting
      P 2_1/n 2_1/m 2_1/a (axes and centring of Pnma), not to the requested axes.

* K points (primitive) *
GM: (0, 0, 0)
X: (1/2, 0, 0)
Y: (0, 1/2, 0)
Z: (0, 0, 1/2)
S: (1/2, 1/2, 0)
T: (0, 1/2, 1/2)
U: (1/2, 0, 1/2)
R: (1/2, 1/2, 1/2)
```

- `NOTE:` (a non-standard symbol such as `Pbnm`, `Amam`, `Bbmm`, `Bmm2`, ...):
  the symbol only selects the space group. The table is still that of the
  ISO-IR standard setting, the heading names that setting, and the
  coordinates are not transformed to the requested axes. In the same way
  `Amam` and `Bbmm` print the C-centred table of Cmcm (No. 63), primitive and
  conventional, with the NOTE. A standard symbol or a space-group number
  (`--space-group 62`) prints no NOTE.

:::

:::{dropdown} From Python

**Python API.** `crystod.bz.get_special_kpoints(symbol)` returns
`(sg_type, names, primitive, conventional)`. `sg_type` is the spglib record of
the ISO-IR standard setting that the coordinates refer to, so its
`international_short`, `international_full` and `hall_number` can differ from
the symbol given (the space-group `number` is that of the group):
`bz.get_special_kpoints("Pbnm")[0].international_short` is `'Pnma'`, and
`"Amam"` and `"Bbmm"` give `'Cmcm'`. `conventional` is `None` for a primitive
lattice.

:::

## 03-02. Supercell Brillouin zone (`--trans-mat`)

*Example directory: `example/03-02_bz_supercell` (testsuite section 03-02); after pip install: `crystod-example 03-02`*

```{note}
The `example/...` paths on this page are those of a clone of the repository,
used from its root. After `pip install CrystOD`, run `crystod-example CC-NN` (the
number of the example directory) in your working directory first: it copies
that directory and the shared `test_POSCARs/` into `./example/`, and the
commands then run from there unchanged (see [crystod-example](crystod-example.md)).
```

Plots the Brillouin zone of a unit cell together with that of a supercell (or
any integer transformation of the cell), and lists the unit-cell q points that
fold onto the Gamma point of the supercell — what happens to the zone when the
symmetry is lowered from a supergroup to a subgroup cell (e.g. a Pm-3m
perovskite into a 6x larger cell).

```{seealso}
**Theory:** [Supercell Brillouin-zone folding](theory-representations.md#supercell-brillouin-zone-folding-crystod-bz---trans-mat) —
why exactly `|det T|` unit-cell q points fold onto the supercell Gamma point,
and how the zones of sheared matrices and oblique cells are built.
```

| Input | Command | Output |
|---|---|---|
| POSCAR of the unit cell, an integer matrix `T` | `crystod-bz -c POSCAR --trans-mat "0 1 2  -1 0 2  1 -1 2"` | terminal: `T` and its volume ratio, the supercell lattice, the unit-cell q points that fold onto the supercell Gamma point; file `BZ_supercell_POSCAR.html` |
| the same, a file name | add `--output BZ_supercell.html` | the plot under that name |

```bash
crystod-bz -c example/test_POSCARs/221_PPOSCAR_ScF3 \
    --trans-mat "0 1 2   -1 0 2   1 -1 2" --output BZ_supercell.html
```

```
* Transformation matrix (unit cell -> supercell) *
  [  0.0000   1.0000   2.0000]
  [ -1.0000   0.0000   2.0000]
  [  1.0000  -1.0000   2.0000]
  Volume ratio |det T| = 6

* Supercell lattice (rows) *
  [  0.000000   4.069590   8.139180]
  [ -4.069590   0.000000   8.139180]
  [  4.069590  -4.069590   8.139180]

* Unit-cell q-points folding onto the supercell Gamma point (6) *
  (0, 0, 0)
  (1/3, -1/3, 1/6)
  (-1/3, 1/3, 1/3)
  (0, 0, 1/2)
  (1/3, -1/3, -1/3)
  (-1/3, 1/3, -1/6)

* Output files *
  Wrote supercell Brillouin-zone visualization: BZ_supercell.html
```

```{raw} html
<iframe src="_static/embed/BZ_supercell_221_PPOSCAR_ScF3.html" width="100%" height="560" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/BZ_supercell_221_PPOSCAR_ScF3.html" target="_blank">Open the folded-BZ plot full-screen</a> — the small red polyhedra are the supercell BZ tiled at the six folded q points; the black dotted cell is the unit-cell BZ.</p>
```

How to read the output:

- `* Transformation matrix *`: `T` as read, and the volume ratio `|det T|` of
  the supercell to the unit cell.
- `* Supercell lattice (rows) *`: the supercell vectors `L_super = T L_unit`.
- `* Unit-cell q-points folding onto the supercell Gamma point *`: the
  `|det T|` q points of the unit-cell zone that fold onto the Gamma point of
  the supercell, as fractions of the reciprocal basis of the unit cell; they
  are also shown on hover in the plot.
- The HTML: the unit-cell zone (black, dotted) and the supercell zone (red),
  tiled at every folded q point; both reciprocal bases are drawn (unit cell:
  black dotted, supercell: red/green/blue).

:::{dropdown} Options and requirements

Options and requirements:

- `--trans-mat`: the row-wise unit-cell-to-supercell transformation matrix
  (`L_super = T L_unit`). Its nine entries must be integers, since the
  supercell vectors are integer combinations of the unit-cell vectors; a
  fraction equal to an integer (`4/2`) is read as that integer. Any other
  entry stops the command with an ERROR and no plot:

  ```bash
  crystod-bz -c example/test_POSCARs/221_PPOSCAR_ScF3 --trans-mat "3/2 0 0  0 1 0  0 0 1"
  ```

  ```
  ERROR: --trans-mat must have integer entries (the supercell vectors are integer combinations of the unit-cell vectors); got 3/2.
  ```

- `--trans-mat` defaults to the identity matrix, which plots the unit-cell BZ
  only (section 03-01); any non-identity matrix switches to this combined
  unit-cell + supercell plot. A sheared matrix gives the correct supercell
  zone.
- `--output`: if omitted, the plot is saved as `BZ_supercell_{POSCAR name}.html`.

:::

:::{dropdown} From Python

**Python API.** `crystod.bz.parse_transformation_matrix(text)` reads a
`--trans-mat` string and `crystod.bz.get_folded_gamma_points(trans_mat, rec_lat)`
returns the `|det T|` folded points in Cartesian coordinates. Both raise
`ValueError` for a matrix with a non-integer entry:

```python
import numpy as np
from crystod import bz

rec_lat = np.linalg.inv(4.07 * np.eye(3)).T
bz.get_folded_gamma_points(np.diag([1.5, 1.0, 1.0]), rec_lat)
# ValueError: the transformation matrix must have integer entries (a supercell of the unit cell).
```

:::

Based on `script/supercell_BZ.py` by Hiroki Koiso.
