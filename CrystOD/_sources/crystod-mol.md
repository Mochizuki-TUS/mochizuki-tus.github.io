# crystod-mol

Molecular point-group detection, molecular SALCs (symmetry-adapted linear
combinations of atomic orbitals), and molecular-orbital diagrams — the
molecular counterpart of the crystalline analyses, working on molecules (XYZ
coordinate files) instead of periodic structures.

| I want to ... | command |
|---|---|
| know the point group of a molecule | `crystod-mol --symmetry --xyz FILE.xyz` |
| build the ligand SALCs | `crystod-mol --xyz FILE.xyz --element H --orbital s` |
| see the SALCs in 3D | `... --visualize --bond N H 1.2` |
| draw the MO diagram | `crystod-mol --diagram --xyz FILE.xyz` |
| draw it from a real SCF | `crystod-mol --diagram --xyz FILE.xyz --pyscf` |

## 07-01. Molecular point groups and SALCs

*Example directory: `example/07-01_molecular_salc` (testsuite section 07-01; it
holds its own copies of the molecule files); after pip install: `crystod-example 07-01`*

The point group of a molecule given as an XYZ file, and the symmetry-adapted
combinations (SALCs) of the orbitals of one element, printed and drawn in 3D.

### Point-group detection (`--symmetry`)

Detect the point group of a molecule — the molecular analogue of
`phonopy --symmetry` for crystals — using pymatgen's `PointGroupAnalyzer`.

| Input | Command | Output |
|---|---|---|
| XYZ file | `crystod-mol --symmetry --xyz XYZ_NH3.xyz` | terminal: the point group (Schoenflies and Hermann-Mauguin) and its symmetry operations by class; the same report saved as `mol_sym_<formula>` (`mol_sym_H3N`, the full molecular formula in Hill order) |
| the same, print only | add `--no-files` | the terminal report, no file (`CRYSTOD_NO_REPORT=1` too) |
| XYZ file of a linear molecule | `crystod-mol --symmetry --xyz XYZ_O2.xyz` | the non-crystallographic group, named as such |

```bash
crystod-mol --symmetry --xyz XYZ_NH3.xyz
```

```
* Molecule *
XYZ_NH3.xyz (H3N, 4 atoms)

* Point group *
C3v (Hermann-Mauguin: 3m)

* Symmetry operations (6) *
E, 2C3, 3sgv
```

```bash
crystod-mol --symmetry --xyz XYZ_O2.xyz
```

```
* Point group *
D*h (linear molecule; continuous non-crystallographic group)
```

How to read the output:

- `* Point group *`: for the 32 crystallographic point groups both names —
  the Schoenflies `C3v` and the international (Hermann-Mauguin) `3m`; a
  non-crystallographic group is named as such.
- `* Symmetry operations (N) *`: the symmetry operations sorted into classes.

`--tolerance` (in Angstrom, default 0.3 as in pymatgen) sets how much
distortion the detection will tolerate, like `phonopy --tolerance`.

### Molecular SALCs (`--element`/`--orbital`)

Build the molecular SALCs — the combinations of the atomic orbitals on
equivalent sites that transform cleanly under the symmetry of the molecule —
for the sites of one element, together with the irreps they belong to.

```{seealso}
**Theory:** [Molecular SALCs and their point-group labels](theory-representations.md#molecular-salcs-and-their-point-group-labels-crystod-mol) —
how the reducible representation is built and reduced, why p/d/f orbitals
bring in the Wigner-D matrices, and how the labels are matched to the
`crystod-group` character tables.
```

| Input | Command | Output |
|---|---|---|
| XYZ file, element, orbital shell | `crystod-mol --xyz XYZ_NH3.xyz --element H --orbital s` | terminal: target sites, reducible representation, decomposition into irreps, the SALCs; the same report saved as `mol_salc_<formula>_<EL>_<ORB>` (`mol_salc_H3N_H_s`; benzene: `mol_salc_C6H6_C_p`), `--no-files`: none |
| the same, in textbook axes | `crystod-mol --xyz XYZ_CH4.xyz --element C --orbital d --align` | the molecule is first rotated into the standard point-group orientation; SALCs in those axes |
| the same | add `--show-matrix` | also the site-permutation matrix of every symmetry operation |

```bash
crystod-mol --xyz XYZ_NH3.xyz --element H --orbital s
```

```
* Target sites (H, 3 sites; center-of-mass frame) *
H1: ( 0.807734,  0.466331, -0.298390)
H2: (-0.807709,  0.466374, -0.298391)
H3: (-0.000025, -0.932662, -0.298459)

* Reducible representation (H sites x s orbital) *
class:               E   2C3  3sgv
chi(perm):           3     0     1
chi(s):              1     1     1
chi(total):          3     0     1

* Decomposition *
Gamma = 1(A1) + 1(E)

* SALCs (orbital axes = input Cartesian axes) *
A1: [s(H1) + s(H2) + s(H3)]
E: [s(H1) - s(H3), s(H1) - 2 s(H2) + s(H3)]
```

How to read the output:

- `* Target sites *`: the sites of the element, in the center-of-mass frame.
- `chi(perm)`: the site-permutation representation — how each operation
  shuffles the sites.
- `chi(s)` (`chi(p)`, ...): the characters of the orbital. For p/d/f
  orbitals an operation also *rotates* the orbital, so the permutation
  representation is multiplied by the real-orbital Wigner-D representation
  (`wigner_D_real`).
- `chi(total)`: the product of the two, the representation that is reduced.
- `* Decomposition *`: its irreps, with the labels of the point-group
  character tables of `crystod-group` (`--decompose`/`--ligand-field`).
- `* SALCs *`: the explicit combinations that the projection operator
  produces for each irrep; the heading says which axes the orbital
  components refer to. `--element N --orbital p` of NH3 gives
  `A1: [pz(N1)]`, `E: [px(N1), py(N1)]`.

:::{dropdown} Textbook axes (`--align`)

`--align` rotates the molecule into the standard point-group orientation
(principal axis along z) first, so the coefficients follow the textbook axis
convention:

```bash
crystod-mol --xyz XYZ_CH4.xyz --element C --orbital d --align
```

```
* Point group *
Td (Hermann-Mauguin: -43m)

* Decomposition *
Gamma = 1(E) + 1(T2)

* SALCs (orbital axes = standard point-group axes) *
E: [dz2(C1), dx2-y2(C1)]
T2: [dxy(C1), dyz(C1), dxz(C1)]
```

— the clean crystal-field splitting of a d shell in Td, out of an arbitrarily
rotated input geometry. `--show-matrix` prints the site-permutation matrix of
every symmetry operation; `--tolerance` as in `--symmetry`.

:::

### 3D visualization (`--visualize`)

`--visualize` additionally writes the SALCs as an interactive 3D
HTML page — the same viewer as the crystalline `crystod --visualize`
(section 01-06 of {doc}`crystod`).

| Input | Command | Output |
|---|---|---|
| XYZ file, element, orbital shell | `crystod-mol --xyz XYZ_NH3.xyz --element H --orbital s --visualize --bond N H 1.2` | the SALC report as above (saved as `mol_salc_H3N_H_s`, its line in the `* Output files *` block); file `SALC_XYZ_NH3_H_s.html` |

```bash
crystod-mol --xyz XYZ_NH3.xyz --element H --orbital s --visualize --bond N H 1.2
# -> SALC_XYZ_NH3_H_s.html
```

The viewer below is the live output of exactly that command — the `A1` and `E`
combinations printed above, drawn on the three hydrogens. Click a row of the
SALC table in the sidebar to switch basis vector and drag to rotate:

```{raw} html
<iframe src="_static/embed/SALC_XYZ_NH3_H_s.html" width="100%" height="620" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/SALC_XYZ_NH3_H_s.html" target="_blank">Open the NH3 H-1s SALC viewer full-screen</a></p>
```

How to read the page:

- the orbital lobes are drawn at each site (+ yellow / − cyan, VESTA style);
- the sidebar lists every SALC basis vector by irrep, for one-click
  switching;
- the x/y/z compass is camera-synced and shows the Cartesian axes; since the
  viewer works on a molecule rather than a crystal, no cell edges are drawn.

:::{dropdown} Options and limits

Options and limits:

- `--output`: the HTML file name (default:
  `SALC_{molecule}_{element}_{orbital}.html`).
- `--bond EL1 EL2 MAX`: draws bonds up to `MAX` Angstroms (repeatable).
- The SALC analysis supports the 32 crystallographic point groups; for linear
  molecules (D\*h/C\*v) analyze a finite subgroup with
  `crystod-group --decompose` instead.
- The page loads plotly.js from `cdn.plot.ly` when it is opened, so a browser
  needs a network connection to display it; the command that writes it runs
  offline, and the MO diagram pages of `--diagram` (section 07-02) are
  self-contained.

:::

## 07-02. Molecular-orbital diagrams (`--diagram`)

*Example directory: `example/07-02_molod` (testsuite section 07-02); after pip install: `crystod-example 07-02`*

`crystod-mol --diagram` draws the molecular-orbital diagram of a single-center
molecule (one central atom plus its ligands — NH3, CH4, SF6) from **symmetry
and overlap alone**: the level ordering follows from the symmetry of the
orbitals and from how strongly they overlap in space, with no self-consistent
calculation.

```{seealso}
**Theory:** [How the orbital diagrams are computed](theory-orbital-diagrams.md) — the step-by-step extended-Hückel construction, the exact overlap quadrature and the original references; and [MO numbering with core shells](theory-orbital-diagrams.md#mo-numbering-with-core-shells-in-molecular-diagrams-crystod-mol---diagram) — how the core shells enter the labels.
```

| Input | Command | Output |
|---|---|---|
| XYZ file of a single-center molecule | `crystod-mol --diagram --xyz XYZ_NH3.xyz` | terminal: fragments, AO parameters, ligand SALCs, SALC-AO overlaps, MOs with their composition, electron filling with HOMO/LUMO; file `MolOD_XYZ_NH3.html` (the interactive diagram) |
| the same, another central atom | add `--center EL` | the diagram around that atom |
| an XYZ file of a molecule without a single center, two formulas | `crystod-mol --diagram --xyz XYZ_C6H6.xyz --ao-left H6 --ao-right C6` | a two-fragment diagram (below) |
| the same, from a real SCF | add `--pyscf` | a quantitative diagram from three PySCF calculations (below) |

```bash
crystod-mol --diagram --xyz XYZ_NH3.xyz
# -> MolOD_XYZ_NH3.html
```

```
* Fragments *
central atom: N; ligands: 3 H

* Valence Atomic Orbital (AO) parameters (single-zeta STO, extended Hueckel) *
N 2s:  zeta = 1.950 / bohr,  H_ii = -26.0 eV
N 2p:  zeta = 1.950 / bohr,  H_ii = -13.4 eV
H 1s:  zeta = 1.300 / bohr,  H_ii = -13.6 eV

* Ligand SALCs (standard point-group axes) *
-- 3H 1s --
A1: [1s(H1) + 1s(H2) + 1s(H3)]
E: [1s(H1) - 1s(H3), 1s(H1) - 2 1s(H2) + 1s(H3)]

* Ligand SALC | central AO overlap integrals *
  A1:  < a1 (E =  -16.44 eV) | N 2s >  S = 0.7205
  A1:  < a1 (E =  -16.44 eV) | N 2p >  S = 0.2387
   E:  < e (E =  -11.16 eV) | N 2p >  S = 0.5687

* Molecular orbitals (Wolfsberg-Helmholz, K = 1.75) *
    MO    E (eV)  occ  composition
   4a1     21.14    0  70% SALC a1, 25% N 2s, 5% N 2p
 2e x2      2.78    0  59% SALC e, 41% N 2p
   3a1    -13.75    2  95% N 2p, 4% SALC a1, 1% N 2s
 1e x2    -16.49    4  59% N 2p, 41% SALC e
   2a1    -28.00    2  73% N 2s, 27% SALC a1

* Electron filling (8 valence electrons) *
(2a1)^2 (1e)^4 (3a1)^2
(MO numbering counts the core shells, not shown: N 1s -> a1)
HOMO = 3a1 (-13.75 eV), LUMO = 2e (2.78 eV), gap = 16.53 eV
```

The written `MolOD_XYZ_NH3.html` is the diagram below — this is the live
output, not a screenshot:

```{raw} html
<iframe src="_static/embed/MolOD_XYZ_NH3.html" width="100%" height="580" data-narrow-height="935" data-narrow-width="720" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/MolOD_XYZ_NH3.html" target="_blank">Open the NH3 MO diagram full-screen</a></p>
```

How to read the output:

- `* Valence Atomic Orbital (AO) parameters *`: every valence orbital is a
  Slater-type orbital with a tabulated extended-Hückel exponent `zeta` and
  diagonal energy `H_ii`. The s and p shells are single-zeta; most valence d
  and f shells are double-zeta contractions, printed with their coefficients
  (the title then adds `double-zeta d/f contractions`).
- `* Ligand SALCs *`: the ligand orbitals symmetry-adapted into the SALCs of
  section 07-01.
- `* Ligand SALC | central AO overlap integrals *`: the overlap `S` of each
  ligand SALC with each central-atom orbital of the same irrep; orbitals of
  different irreps cannot mix, and a large overlap means a large
  bonding/antibonding splitting.
- `* Molecular orbitals *`: energy, occupation and composition of every MO
  (`x2` marks a doubly degenerate level).
- `* Electron filling *`: the configuration, HOMO, LUMO and gap. The MO
  numbering counts the core shells, as in photoelectron spectroscopy: CH4
  therefore gives the textbook `(2a1)^2 (1t2)^6` (1a1 = C 1s core), NH3 gives
  `(2a1)^2 (1e)^4 (3a1)^2` with the 3a1 lone pair as HOMO.
- The HTML page: four columns (isolated ligand AOs | ligand-group SALCs |
  molecular orbitals | central-atom AOs) joined by dashed correlation lines
  drawn the more heavily the larger the contribution; electron arrows mark the
  occupied levels and the HOMO/LUMO are flagged. Hover or click any level to
  see its composition and a drag-rotatable orbital sketch built from that
  level's actual eigenvector (buttons flip through the degenerate partners);
  Ctrl/Cmd + scroll zooms the energy window.
- The energies are semi-quantitative as extended Hückel theory always is —
  read them for orderings and trends, not as absolute values.

:::{dropdown} Tetrahedral TiCl4 (a d valence shell)

For tetrahedral TiCl4 (`XYZ_TiCl4.xyz`, not among the shipped examples: Ti at the
origin and Cl at (±1.25285, ±1.25285, ±1.25285) Å with an even number of minus
signs, Ti-Cl 2.17 Å):

```bash
crystod-mol --diagram --xyz XYZ_TiCl4.xyz
```

```
* Valence Atomic Orbital (AO) parameters (single-zeta STO, double-zeta d/f contractions, extended Hueckel) *
Ti 4s:  zeta = 1.075 / bohr,  H_ii = -9.0 eV
Ti 4p:  zeta = 0.675 / bohr,  H_ii = -5.4 eV
Ti 3d:  zeta = 4.550 (c = 0.4206) + 1.400 (c = 0.7839) / bohr,  H_ii = -10.8 eV
Cl 3s:  zeta = 2.183 / bohr,  H_ii = -26.3 eV
Cl 3p:  zeta = 1.733 / bohr,  H_ii = -14.2 eV
...
* Electron filling (32 valence electrons) *
(7a1)^2 (7t2)^6 (2e)^4 (8a1)^2 (8t2)^6 (9t2)^6 (2t1)^6
...
HOMO = 2t1 (-13.71 eV), LUMO = 3e (-7.17 eV), gap = 6.54 eV
```

These are the labels, energies and occupations of the two-fragment form
`--ao-left Cl4 --ao-right Ti` (below) at every level that form lists; a
central atom with an f valence shell (Ce 4f of tetrahedral CeF4) runs the
same way. Ligand shells with d or f orbitals get their SALCs printed with the
d/f component names (`3dxy(Cu1)`, `3dz2(Cu1)`, ... for the Cu 3d shells of a
tetrahedral OCu4 core), and the orbital sketch of the HTML page draws s, p
and d lobes; f components enter the composition but are not drawn as lobes.

:::

:::{dropdown} Options and limits

Options and limits:

- `--center EL`: selects the central atom explicitly (default: the atom
  closest to the molecular center); `--output`/`--tolerance` as usual.
- The extended-Hückel parameters cover 52 elements up to Bi (H, Li-F, Na-Cl,
  K-Br, Rb, Sr, Zr, Nb, Mo, Cd, Sn-I, Cs, Ba, La, Ce, Sm, Gd, Yb, Lu, Pb, Bi);
  any other element stops the run with an ERROR that lists them.

:::

### Two-fragment diagrams (`--ao-left`/`--ao-right`)

`--ao-left`/`--ao-right` (without `--pyscf`) replace the central-atom
architecture by **any submolecule split by chemical formula**, for molecules
without a single center: the diagram shows the MOs of the two fragments on
either side of those of the molecule.

```{seealso}
**Theory:** [Two-fragment molecular-orbital diagrams](theory-orbital-diagrams.md#two-fragment-molecular-orbital-diagrams-crystod-mol---ao-left---ao-right) —
why a fragment block of the one molecular AO space is the isolated fragment,
and how the molecular MOs are projected onto the fragment MOs.
```

| Input | Command | Output |
|---|---|---|
| XYZ file, two formulas that split the molecule | `crystod-mol --diagram --xyz XYZ_C6H6.xyz --ao-left H6 --ao-right C6` | file `MolOD_XYZ_C6H6.html`: H6 MOs, C6H6 MOs, C6 MOs |
| a homonuclear diatomic | `crystod-mol --diagram --xyz XYZ_O2.xyz --ao-left O --ao-right O` | the O, O2, O diagram |

```bash
crystod-mol --diagram --xyz XYZ_C6H6.xyz --ao-left H6 --ao-right C6
# -> MolOD_XYZ_C6H6.html   (H6 MOs | C6H6 MOs | C6 MOs)

crystod-mol --diagram --xyz XYZ_CH3OH.xyz --ao-left H4 --ao-right CO
crystod-mol --diagram --xyz XYZ_O2.xyz --ao-left O --ao-right O
```

```{raw} html
<iframe src="_static/embed/MolOD_XYZ_C6H6.html" width="100%" height="590" data-narrow-height="960" data-narrow-width="720" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/MolOD_XYZ_C6H6.html" target="_blank">Open the benzene two-fragment MO diagram full-screen</a></p>
```

The page above is `MolOD_XYZ_C6H6.html`, the live output of the first command.

How to read the output:

- The fragment columns are the pre-bonding fragment MOs, all three columns
  solved in the one molecular AO space: benzene's H6 column shows the
  1a1g < 1e1u < 1e2g < 1b2u ladder of the six H 1s SALCs.
- Benzene fills `(2a1g)^2 (2e1u)^4 (2e2g)^4 (2b2u)^2 (3a1g)^2 (3e1u)^4
  (1a2u)^2 (1b1u)^2 (3e2g)^4 (1e1g)^4`, i.e. the Hückel π ladder
  1a2u < 1e1g (HOMO) < 1e2u (LUMO) < 1b1g.
- Irrep labels are omitted when a fragment admits no consistent assignment
  (and for linear molecules, which have no crystallographic character table).

### Quantitative diagrams with PySCF (`--pyscf`)

`--diagram --pyscf` replaces the extended-Hückel estimate by **three
self-consistent-field calculations sharing one AO space**: the full molecule
and its two fragments, the latter carrying **ghost basis functions** on the
removed atoms (the Boys-Bernardi counterpoise construction). The fragment
levels are therefore true pre-bonding states described in the full molecular
basis, the molecular MOs are projected exactly onto them, and the printed
interaction energy E(mol) − E(left) − E(right) is BSSE-free.

```{seealso}
**Theory:** [How the orbital diagrams are computed](theory-orbital-diagrams.md)
— why a finite basis creates the basis-set superposition error, what the
counterpoise correction fixes, why the fragments are spin/spherically averaged,
and how ghost-dominated fragment levels are filtered out.
```

| Input | Command | Output |
|---|---|---|
| XYZ file | `crystod-mol --diagram --xyz XYZ_H2O.xyz --pyscf` | the H2 / H2O / O diagram from three SCF calculations, with the BSSE-free interaction energy |
| an open-shell molecule, fragments by formula | `crystod-mol --diagram --xyz XYZ_O2.xyz --pyscf --spin 2 --ao-left O --ao-right O` | the diagram of triplet O2 |
| a molecule without a single center | `crystod-mol --diagram --xyz XYZ_C6H6.xyz --pyscf --ao-left H6 --ao-right C6` | the H6 / C6H6 / C6 diagram (below) |

`--pyscf` needs the optional PySCF dependency, `pip install "CrystOD[quantum]"`
(see [Installation](install.md)); without it the run stops with a one-line
`ERROR:` naming this command:

```bash
crystod-mol --diagram --xyz XYZ_H2O.xyz --pyscf                # H2 | H2O | O
crystod-mol --diagram --xyz XYZ_O2.xyz --pyscf --spin 2 --ao-left O --ao-right O
crystod-mol --diagram --xyz XYZ_CH3OH.xyz --pyscf --ao-left H4 --ao-right CO
crystod-mol --diagram --xyz XYZ_C6H6.xyz --pyscf --ao-left H6 --ao-right C6
```

The benzene run produces the diagram below (live output of the last command):
the H6 cage on the left, the C6 ring on the right, and the pure-π `1e1g` HOMO /
`1e2u` LUMO of benzene in the middle — click the π levels to see the familiar
nodal patterns in the orbital sketch:

```{raw} html
<iframe src="_static/embed/MolOD_XYZ_C6H6_pyscf.html" width="100%" height="610" data-narrow-height="1000" data-narrow-width="720" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/MolOD_XYZ_C6H6_pyscf.html" target="_blank">Open the benzene PySCF MO diagram full-screen</a></p>
```

How to read the output:

- The default fragments are the ligand cage | central atom, as in the
  symmetry-only mode. `--ao-left`/`--ao-right` select **any partition by
  chemical formula**, which is required for molecules with no single central
  atom (benzene as `H6`/`C6`) and for homonuclear diatomics (`O` / `O`,
  displayed as O(L)/O(R)).
- Irrep labels come from crystod's own point-group machinery — the characters
  of every MO evaluated on the PySCF AO basis — so they agree with the
  symmetry-only diagram and with `crystod-group`: CH4 `1t2` HOMO, H2O `1b2`,
  benzene `1e1g` HOMO / `1e2u` LUMO. Linear molecules use PySCF's Dooh/Coov
  labels rendered as σ/π/δ (triplet O2: `(1πu)^4 (1πg)^2`, with two single
  arrows on the half-filled 1πg).
- Core levels are computed and included. When levels lie below −40 eV the
  default window is clamped to [−40, 15] eV so the valence region stays
  legible; the **Show all energy levels** button expands it.

:::{dropdown} Options

Options:

- `--basis` (default def2-svp), `--theory scf|dft`, `--xc` (default b3lyp),
  `--charge` and `--spin` follow the conventions of `script/calc_pyscf.py`.
- `--spin` is given as 2S, the number of unpaired electrons, and defaults to
  the smallest value compatible with the electron count. Open-shell systems are
  treated with ROHF/ROKS, so the diagram keeps one set of orbital energies.

:::

The SCF engine is PySCF — a software dependency, not the source of the
fragment/irrep construction above. If you use PySCF in your research,
please cite: Q. Sun et al., J. Chem. Phys. 153, 024109 (2020);
Q. Sun et al., WIREs Comput. Mol. Sci. 8, e1340 (2018);
Q. Sun, J. Comput. Chem. 36, 1664 (2015).
