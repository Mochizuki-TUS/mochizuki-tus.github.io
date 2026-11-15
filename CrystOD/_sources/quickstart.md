# Quick start

## No input file needed

A few small inputs ship inside the package, so the first analysis runs right
after `pip install CrystOD`, in any empty directory:

```bash
crystod --example ScF3_d
```

```
Wrote 221_PPOSCAR_ScF3 (bundled example input)
Running: crystod -c 221_PPOSCAR_ScF3 --element Sc --orbital d

 ### Inputed cell was converted into primitive cell. ###

* Space group *
 Pm-3m (221)

* Element (number of atoms) *
 Sc (1)

* Wyckoff letters and site symmetry letters *
 ['a']
 ['m-3m']

* Atomic Orbital *
 d

* Crystal Orbitals *
 k point (primitive):  GM [0.0, 0.0, 0.0]
 little group of k  :  Pm-3m (221)
 irreps             :  1.0 [GM3+(2)] + 1.0 [GM5+(3)]

 k point (primitive):  R [0.5, 0.5, 0.5]
 little group of k  :  Pm-3m (221)
 irreps             :  1.0 [R3+(2)] + 1.0 [R5+(3)]

 k point (primitive):  X [0.0, 0.5, 0.0]
 little group of k  :  P4/mmm (123)
 irreps             :  1.0 [X1+(1)] + 1.0 [X2+(1)] + 1.0 [X4+(1)] + 1.0 [X5+(2)]

 k point (primitive):  M [0.5, 0.5, 0.0]
 little group of k  :  P4/mmm (123)
 irreps             :  1.0 [M1+(1)] + 1.0 [M2+(1)] + 1.0 [M4+(1)] + 1.0 [M5+(2)]
```

`--example NAME` copies the input files of that example into the working
directory (an existing file with different content is never overwritten),
prints the equivalent ordinary command line after `Running:` and runs it;
any further option on the line is passed on (`crystod --example ScF3_d
--kpoint 0 0 0`). The copied `221_PPOSCAR_ScF3` is then there to edit and
re-run with the printed command. `--example` alone lists the examples bundled
with a command:

```bash
crystod --example            # ScF3_d, SrTiO3_d, ScF3_diagram
crystod-phonon --example     # SrTiO3 (--irreps), SrTiO3_subgroup (--subgroup --qpoint R)
crystod-mol --example        # CH4, NH3 (--diagram)
crystod-bz --example         # ScF3
crystod-xrd --example        # ScF3 (CuKa), SrTiO3 (CuKa1, gaussian)
crystod-slab --example       # SrTiO3 (--max-index 1), ScF3 (--index 1 0 0 --symmetrize)
crystod-search --example     # SrTiO3, Sr-Ti-O (--experimental), mp-5229 (--get); need an API key
```

The worked examples of every feature ship as well, one directory per
feature with a README of commands and their output, and the inputs those
commands read. `crystod-example` lists them, and `crystod-example CC-NN` copies
one into `./example` (see {doc}`crystod-example`):

```bash
crystod-example              # 01-01_wigner_d ... 10-01_mp_search, with their sizes
crystod-example 02-10           # -> ./example/02-10_isotropy_subgroup/README (+ the shared inputs)
```

Show global help (the epilog lists all sectioned commands):

```bash
crystod --help
```

## With your own structure

The same analysis on your own file — the crystal-orbital irreps of the Ti *d*
manifold of SrTiO3 at every special k point. All you need is a POSCAR; here it
is the SrTiO3 cell among the shared structures that `crystod-example` copies
into `./example/test_POSCARs/` with any example (in a clone of the repository
the same path is already there):

```bash
crystod-example 01-02
crystod -c example/test_POSCARs/221_PPOSCAR_SrTiO3 --element Ti --orbital d
```

```
* Crystal Orbitals *
 k point (primitive):  GM [0.0, 0.0, 0.0]
 little group of k  :  Pm-3m (221)
 irreps             :  1.0 [GM3+(2)] + 1.0 [GM5+(3)]

 k point (primitive):  R [0.5, 0.5, 0.5]
 little group of k  :  Pm-3m (221)
 irreps             :  1.0 [R3-(2)] + 1.0 [R4-(3)]
 ...
```

The five Ti *d* orbitals split into the eg pair (`GM3+`) and the t2g triple
(`GM5+`) at the zone centre — the octahedral crystal field, read off the
structure by symmetry alone. Every other command follows the same shape:
a structure file (or nothing at all, for the pure group theory of
`crystod-group`), one mode flag, and a printed result.

No POSCAR at hand? `crystod-search` finds the compound in the Materials
Project and downloads its structure (a free API key is needed; see
{doc}`install`):

```bash
crystod-search SrTiO3            # the SrTiO3 entries, experimentally observed ones starred
crystod-search --get mp-5229     # writes POSCAR_SrTiO3_Pm-3m_mp-5229
crystod -c POSCAR_SrTiO3_Pm-3m_mp-5229 --element Ti --orbital d
```

Four commands worth trying next (the first two are also bundled examples:
`crystod --example ScF3_diagram`, `crystod-phonon --example SrTiO3_subgroup`).
The phonon command reads the `FORCE_SETS` in the working directory; the one
that `crystod-phonon --example SrTiO3_subgroup` copies there is a 4x4x4
supercell of 320 atoms, hence `--dim "4 4 4"`:

```bash
# an interactive crystal-orbital diagram, one page per k point
crystod --diagram -c 221_PPOSCAR_ScF3 --co-left Sc --co-right F3

# which space groups an unstable phonon can lower the structure to
crystod-phonon --subgroup -c 221_PPOSCAR_SrTiO3 --dim "4 4 4"

# the octahedral-tilt classification of perovskites, no input file needed
crystod-group --parent Pm-3m --irrep R4+

# the subgroups of every irrep at a k point, in one table
crystod-group --parent Pm-3m --kpoint GM
```

The next pages walk through a complete first analysis
({doc}`first-analysis`) and the phonon workflow for phonopy users
({doc}`for-phonopy-users`).

## Shared section numbering

Every feature of CrystOD carries one section number CC-NN, used consistently in three places:

- the numbered sections of this documentation (`## CC-NN. Title`),
- `python testsuite.py CC-NN` (the regression tests of that feature;
  `python testsuite.py CC` runs the whole command group),
- `example/CC-NN_*` (a worked example directory with real captured output),
  which ships with the package: `crystod-example CC-NN` copies it into
  `./example` ({doc}`crystod-example`). The exceptions are
  `01-07_check_symmetry`, whose input (a DFPT run) is not distributed, and
  `01-09_band_unfold`, which is not distributed at all.

CC is the command group (01 `crystod`, 02 `crystod-group`, 03 `crystod-bz`,
04 `crystod-phonon`, 05 `crystod-mag`, 06 `crystod-md`, 07 `crystod-mol`,
08 `crystod-xrd`, 09 `crystod-slab`, 10 `crystod-search`, 11
`crystod-example`) and NN the index inside it; a feature added later takes the
next free NN of its group:

| Sections | Command | Features |
|---|---|---|
| 01-01 to 01-11 | `crystod` | 01-01 Wigner D matrices, the library core — see [Theoretical background](theory-representations.md), 01-02 SALC (incl. `--spinor`), 01-03 hybridization & crystal-orbital diagrams (`--diagram` in all three engines: extended Hückel, `--pyscf`, `--vasp`, plus `--band`/`--dos` from the same checkpoint), 01-04 dipole selection rules of the diagrams, 01-05 star of k, 01-06 SALC viewer & eigen-level viewer, 01-07 symmetry of the response tensors of a VASP run (`--check-symmetry`), 01-08 band irreps of a VASP run from its WAVECAR (`--extract-irrep`; inputs in `example/01-03_hybridization/vasp_wavecar`, copied by `crystod-example 01-03`), 01-09 electronic band unfolding of a low-symmetry VASP run onto the Brillouin zone of its high-symmetry parent run, from the two WAVECARs (`--unfold`, `--unfold-kpoints`; inputs in `example/01-09_band_unfold`, not in the pip package), 01-10 CLI regression, 01-11 the Python API of every command — see [Python API](python-api.md) |
| 02-01 to 02-18 | `crystod-group` | 02-01 product, 02-02 symmetrized squares & Jahn-Teller modes, 02-03 decompose, 02-04 ligand field, 02-05 basis, 02-06 property tensors (`--tensor`), 02-07 generate-basis, 02-08 coset, 02-09 correlation & compatibility (`--correlate`, `--correlate-kpath`), 02-10 isotropy subgroups (`--parent`), 02-11 invariant polynomials (`--invariants`), 02-12 reverse lookup (`--child`), 02-13 group-subgroup graph (`--graph`), 02-14 multi-electron terms (`--multiplet`), 02-15 POSCAR <-> Bilbao-style CIF and axis settings (`--poscar2cif` / `--cif2poscar` / `--cif-axis`), 02-16 symmetry-mode analysis (`--supergroup-cif`), 02-17 spin-orbit compatibility: the double-valued small irreps of Γ x D(1/2) for every single-valued small irrep at a k point (`--correlate-double-group`), 02-18 CLI regression |
| 03-01 to 03-03 | `crystod-bz` | 03-01 Brillouin zone, 03-02 supercell BZ, 03-03 CLI regression |
| 04-01 to 04-12 | `crystod-phonon` | 04-01 displacement patterns of given irreps on a crystal, and the displacement irreps at every special k point, without force data (`-c POSCAR --element EL --irrep IR`, `--qpoint K`), 04-02 irreps, 04-03 IR / Raman activity of the Γ phonons, 04-04 fatband, 04-05 LT bands, 04-06 eigenvectors, 04-07 modulation, 04-08 vibration, 04-09 phonon band unfolding of a distorted phase onto the parent Brillouin zone, with the parent irreps of the unfolded levels (`--unfold`), 04-10 phonon mode viewer: every mode at the special points of the k path, by irrep, as arrows and animation next to the dispersion (`--visualize`), 04-11 subgroups from imaginary modes (`--subgroup`) + CLI regression, 04-12 mode-resolved force constants: the force constant k = mu w and effective mass of every phonon mode, and the force-constant matrix restricted to every irrep subspace (`--mode-resolved-fc`) |
| 05-01 to 05-11 | `crystod-mag` | 05-01 magnetic arrangements of given irreps on a crystal (`-c POSCAR --element EL --irrep IR`), 05-02 spin bases, 05-03 magnetic space groups and collinear classes (`--classify-only`), 05-04 magnetic isotropy subgroups (`--parent`), 05-05 CLI regression, 05-06 order-parameter directions at q != 0, 05-07 spin bases aligned with a subgroup structure (`--subgroup-poscar`), 05-08 phonon angular momentum near Γ (`--phonon-angular-momentum`), 05-09 several magnetic elements (`--element A B`, `--superpose`), 05-10 magnetic isotropy subgroups of coupled irreps (`--parent SG --irrep A B`), 05-11 magnetic space groups on cells whose lattice is not invariant under the point group |
| 06-01 to 06-03 | `crystod-md` | 06-01 ADPs (`--adp`), 06-02 trajectory summary (`--summary`) + CLI regression, 06-03 mode projection of an MD trajectory (`--project`) |
| 07-01 to 07-03 | `crystod-mol` | 07-01 molecular point groups & SALCs, 07-02 MO diagrams (`--diagram`, incl. `--pyscf`), 07-03 CLI regression |
| 08-01, 08-02 | `crystod-xrd` | 08-01 powder X-ray diffraction patterns (`--xraytype`, `--peak-profile`), 08-02 superlattice reflections and neutron patterns (`--parent`, `--radiation neutron`) |
| 09-01 | `crystod-slab` | 09-01 surface slabs: every termination of given or of all distinct Miller indices, with the polar and symmetric tests (`--index`, `--index-list`, `--max-index`, `--symmetrize`; interactive without an index) |
| 10-01 | `crystod-search` | 10-01 Materials Project search and POSCAR download (`--get`, `--cell`) |
| 11-01 | `crystod-example` | 11-01 the packaged example directories (listing, copying, the examples a README uses; testsuite: the packaged copies against `example/`) |

Sections 01-10, 02-18, 03-03, 05-05, 06-02 and 07-03 are command-line-interface regression tests
(every argument form plus removed-flag errors); apart from 06-02, which also holds the
checks of the trajectory summary documented in
[crystod-md](crystod-md.md#06-02-trajectory-summary---summary), they have no documentation
section of their own, and neither has 05-11, the regression check of the magnetic
space groups on cells whose lattice is not invariant. Section 05-10 is documented
in section 05-04 of {doc}`crystod-mag`. Section 04-11 combines the `crystod-phonon` regression tests
with the `--subgroup` mode documented in
[crystod-phonon](crystod-phonon.md#04-11-subgroups-from-imaginary-modes---subgroup).
Sections 01-08 and 01-09 are documented in section 01-03 of {doc}`crystod`
([band irreps](crystod.md#band-irreps-of-a-vasp-run---extract-irrep),
[band unfolding](crystod.md#electronic-band-unfolding-of-two-vasp-runs---unfold)).

## Command summary

- `crystod --example [NAME]`   (bundled examples: `ScF3_d`, `SrTiO3_d`, `ScF3_diagram`; without a name the list is printed)
- `crystod -c POSCAR --element ELEMENT --orbital ORBITAL [--kpoint kx ky kz] [--spinor] [--show-irrep-table]` (k omitted: all special k points; `--spinor`: double-valued irreps, named such as `-GM8+` with Bradley & Cracknell's Table 6.5 numbering, see [Double-valued irreps](crystod.md#double-valued-irreps---spinor))
- `crystod -c POSCAR --element ELEMENT --axial [--kpoint kx ky kz] [--show-irrep-table]` (the irreps of the spin configurations of the element's sites: one axial vector Rx, Ry, Rz per site, see [Spin configurations](crystod.md#spin-configurations---axial))
- `crystod -c POSCAR --atomic-orbital Ni_d O_p --kpoint kx ky kz [--spinor]`
- `crystod --diagram -c POSCAR --co-left FORMULA --co-right FORMULA [--oxidation EL=Q ...] [--electrons N]`   (crystal-orbital diagram: full-electron basis + point-charge ligand field; every engine ends each k point with the dipole selection rule of the band edge)
- `crystod --diagram --pyscf -c POSCAR --co-left FORMULA --co-right FORMULA [--xc XC] [--kmesh N N N] [--ke-cutoff E] [--max-l L] [--sigma EV] [--onsite] [--chk FILE | --no-chk]`   (`--sigma`: SCF Fermi smearing in eV, default 0)
- `crystod --diagram --vasp [ROOT | DIR DIR DIR] [-c POSCAR] --co-left FORMULA --co-right FORMULA [--vasp-crystal/-left/-right DIR] [--vasp-align site|rigid] [--vasp-zero vbm|efermi|raw] [--vasp-window EMIN EMAX] [--vasp-anchor EL nl] [--no-align]`   (from finished VASP runs: `ROOT/BAND` and `ROOT/BAND_sublattice*`, or the three run directories in any order; without `-c` the structure is the crystal run's POSCAR)
- `crystod --diagram --vasp [ROOT | DIR DIR DIR] --vasp-engine overlap --co-left FORMULA --co-right FORMULA [--vasp-shells EL-nl ...] [--vasp-frozen-window EV] [--vasp-cache FILE] [--vasp-scalar-reference JSON] [--vasp-irrep-json PATTERN]`   (no energy alignment: all-electron overlaps from the three WAVECARs, spin-orbit runs included; with an existing `--vasp-cache` and no run directory, from the cache alone)
- `crystod --diagram --vasp-setup [ROOT] -c POSCAR --co-left FORMULA --co-right FORMULA [--potcar-dir DIR] [--potcar-map EL=NAME] [--vasp-mesh N N N] [--vasp-bin PATH] [--vasp-engine overlap]`   (writes those runs' inputs and prints the VASP commands; with the overlap engine `LWAVE = .TRUE.`)
- `crystod --band [--fatband] --pyscf -c POSCAR ... --chk FILE [--window LO HI] [--align vbm|absolute] [--band-points N]`
- `crystod --dos --pyscf -c POSCAR ... --chk FILE [--dos-kmesh N N N] [--projection lowdin|mulliken] [--sigma EV] [--xrange XMIN XMAX] [--align vbm|absolute]`   (`--sigma`: Gaussian broadening of the curves, default 0.15 eV; `--xrange`: plotted energy range)
- `crystod --chk-info FILE`   (what a checkpoint stores, plus the option string that reproduces it)
- `crystod --visualize -c POSCAR --element EL --orbital ORB [--kpoint kx ky kz] [--real-coefficient] [--bond EL1 EL2 MAX] [--conventional] [--mode-index N] [--output FILE.html]`
- `crystod --visualize -c POSCAR [--pyscf [--sigma EV]] [--sublattice FORMULA] [--window LO HI] [--diagonalize] [--valence-only]`   (eigen-levels instead of the SALC basis)
- `crystod --star-of-k -c POSCAR --kpoint QLABEL_OR_KX KY KZ`
- `crystod --extract-irrep [PATH] [-c POSCAR] [--kpoint K ... | --all-kpoints] [--zero vbm|efermi|raw] [--window EMIN EMAX] [--spin up|down|both] [--degeneracy-tol EV] [-o FILE.yaml]`   (band irreps of one finished VASP run from its WAVECAR: PATH = the WAVECAR or the run directory, default `.`)
- `crystod --unfold --child-wavecar PATH [--parent-wavecar PATH] [--child-poscar FILE] [--parent-poscar FILE] [--trans-mat T] [--zero vbm|efermi|raw|EV] [--separate-zero] [--spin up|down|both] [--window EMIN EMAX] [--degeneracy-tol EV] [--weight-min W] [--all-kpoints] [--tolerance TOL] [-o PREFIX]`   (the bands of a low-symmetry VASP run unfolded onto the zone of its high-symmetry parent run, from the two WAVECARs: PATH = the WAVECAR or the run directory; writes PREFIX.pdf, .dat, .yaml)
- `crystod --unfold-kpoints --child-wavecar PATH --parent-wavecar PATH [--child-poscar FILE] [--parent-poscar FILE] [--trans-mat T] [--npoints N] [-o FILE]`   (a child KPOINTS, default `KPOINTS_unfold`, whose band run covers the whole parent path: the child's SCF mesh plus K = M k_p of the parent path)
- `crystod-group --product IRREP1 IRREP2 ... --point-group PG`
- `crystod-group --product IRREP1 IRREP2 ... --space-group SG`   (full space-group irreps, e.g. R4- R5+ for Pm-3m)
- `crystod-group --product IR IR --point-group PG | --space-group SG [--symmetric] [--antisymmetric]`   (symmetric and antisymmetric squares)
- `crystod-group --jahn-teller IRREP [IRREP2] --point-group PG`   (Jahn-Teller active modes; two irreps: pseudo-Jahn-Teller coupling modes)
- `crystod-group --table --point-group PG`
- `crystod-group --decompose --point-group PG [--characters X1 X2 ...]`
- `crystod-group --ligand-field ORBITAL --point-group PG`
- `crystod-group --basis BASIS1 BASIS2 ... --point-group PG`
- `crystod-group --basis BASIS1 BASIS2 ... --space-group SG [--kpoint kx ky kz]`
- `crystod-group --generate-basis --point-group PG [--order 1 2 3]`
- `crystod-group --tensor KIND --point-group PG | --space-group SG | -c POSCAR`   (KIND: dielectric, pyroelectric, piezoelectric, piezoelectric-e, elastic, compliance, gyration, raman, or a Jahn symbol)
- `crystod-group --coset --point-group PG --subgroup H`
- `crystod-group --coset --space-group SG --kpoint kx ky kz`
- `crystod-group --parent SG --irrep IR [IR2 ...] [--order-parameter 0 0 a]`   (`--supergroup SG` is kept as an alias; the value is the parent group)
- `crystod-group --parent SG --kpoint NAME | kx ky kz`   (every irrep of one special k point in a single table)
- `crystod-group --parent SG --irrep IR [IR2 ...] --invariants [--degree N] [--order-parameter ...]`   (Landau invariants, Landau and Lifshitz conditions, coupling terms, the free energy along a direction)
- `crystod-group --parent SG --irrep IR [IR2 ...] --order-parameter ... --secondary`   (secondary order parameters)
- `crystod-group --parent G --child H [--size N] [--index N] [--kpoint K ...] [--coupled [--secondary]] [--no-cache]`   (irreps or pairs of irreps whose isotropy subgroup has type H)
- `crystod-group --parent SG --irrep IR [IR2 ...] --graph [--output FILE.html] [--graph-dot]`   (group-subgroup graph of the isotropy subgroups)
- `crystod-group --correlate --pg G --subgroup H` | `--correlate --supergroup-poscar P --subgroup-poscar C [--tolerance 0.01]` | `--correlate-kpath --sg SG --kpoint K0 [K1] [--line L]`   (correlation table, correlation of a group-subgroup pair of structures at every special k point (DCORREL), compatibility relations)
- `crystod-group --correlate-double-group --sg SG [--kpoint NAME | kx ky kz]`   (single-valued -> double-valued small irreps with spin-orbit coupling; every special point without `--kpoint`)
- `crystod-group --multiplet IRREP^N|IRREPN [IRREP^N|IRREPN ...] --point-group PG [--orbital s|p|d|f] [--visualize [--output FILE.html]]`
- `crystod-group --poscar2cif -c POSCAR [--tolerance 0.01] [--output FILE.cif]`
- `crystod-group --cif2poscar -c FILE.cif [--conventional] [--spacegroup-set SETTING] [--tolerance 0.01] [--output POSCAR]`
- `crystod-group --cif-axis -c FILE.cif|POSCAR [--tolerance 0.01]`
- `crystod-group --supergroup-cif HIGH.cif --subgroup-cif LOW.cif [--tolerance 0.01] [--output-dir DIR] [--no-files]`
- `crystod-bz --example [NAME]`   (bundled example: `ScF3`)
- `crystod-bz -c POSCAR [--band ... --band-labels ...] [--output FILE.html]`
- `crystod-bz -c POSCAR --trans-mat "t11 t12 t13  t21 t22 t23  t31 t32 t33"`
- `crystod-bz --show-kpoint --space-group SG`
- `crystod-phonon --example [NAME]`   (bundled examples: `SrTiO3` = `--irreps`, `SrTiO3_subgroup` = `--subgroup --qpoint R`, both with a 4x4x4 `FORCE_SETS`)
- `crystod-phonon --irreps --dim "nx ny nz" -c POSCAR [--readfc] [--all-irreps] [--raman-tensor] [--nac]` (`--all-irreps`: symmetry lines too; Γ IR / Raman activity always; `--nac` with `BORN`: mode effective charges and the static dielectric tensor)
- `crystod-phonon --fatband --dim nx ny nz -c POSCAR [--element EL] [--nac] [--npoints N] [--projection-direction "0 0 1"]`
- `crystod-phonon --lt --dim nx ny nz -c POSCAR [--nac]`
- `crystod-phonon --vector --dim "nx ny nz" -c POSCAR --qpoint Q [--mode N1 N2 ...] [--amplitude A] [--conventional] [--keep-q-coords]`
- `crystod-phonon --modulation -c POSCAR --qpoint Q [--mode ...] [--amplitude ...] [--dim "nx ny nz"] [--readfc] [--keep-q-coords]`   (Q: three coordinates or a special-point label such as `R`; or `--yaml phonopy_params.yaml` in place of `-c`; without `--dim` the supercell is read from `phonopy_disp.yaml` or inferred from the force file)
- `crystod-phonon --vibration -c POSCAR --qpoint Q [--mode-index N] [--component-index N] [--list-qpoints] [--export-npz FILE] [--raman-tensor]`   (at GM: activity, Wyckoff-orbit breakdown and, with `--raman-tensor`, the Raman tensors)
- `crystod-phonon --subgroup --dim "nx ny nz" -c POSCAR [--qpoint Q] [--threshold -0.1] [--modulate [--amplitude A]]` (without `--qpoint`: every commensurate q point is scanned; `--modulate`: also write the distorted structure of every direction)
- `crystod-phonon --unfold --child-poscar POSCAR_child --child-dim nx ny nz --parent-poscar POSCAR_parent [--parent-dim nx ny nz] [--trans-mat T] [--band ... --band-labels ...] [--npoints N] [--no-irreps] [--weight-min W] [-o PREFIX] [--export-npz FILE]`   (the child phonons unfolded onto the parent zone, labeled with the parent irreps; the transformation comes from `crystod-group --supergroup-cif`)
- `crystod-phonon --visualize --dim nx ny nz -c POSCAR [--readfc] [--nac] [--qpoint Q | --all-irreps] [--band ... --band-labels ...] [--npoints N] [--threshold -0.1] [--conventional] [--bond EL1 EL2 MAX] [-o FILE.html]`   (the phonon mode viewer `phonon_visualize.html` and `band_vector.yaml`, phonopy's band.yaml with eigenvectors; `--all-irreps`: the segment midpoints too, page `phonon_visualize_all.html`)
- `crystod-phonon --mode-resolved-fc --dim nx ny nz -c POSCAR [--readfc] [--nac] [--qpoint Q] [--tolerance T] [-o FILE.yaml]`   (the force constant k = u^+ Phi u^ = mu w and effective mass of every degenerate set, and the irrep-resolved Hessian blocks, at the special q points; `mode-resolved-fc.yaml`)
- `crystod-mag -c POSCAR --element EL [--qpoint Q] [--format vasp|qe] [--conventional] [--amplitude A]`
- `crystod-mag --parent SG (--qpoint K | --irrep IR)`   (magnetic isotropy subgroups of the grey group SG1': every order-parameter direction of the magnetic irreps with its BNS group, size and index; no structure file)
- `crystod-mag -c POSCAR --element EL --qpoint Q --classify-only`   (the structure, the decomposition and the table of magnetic space groups, magnetic point groups, allowed responses and collinear classes only; no VESTA files)
- `crystod-md --adp --dim nx ny nz [--start-step N] [--xdatcar XDATCAR] [--output ADP.cif] [--grouping-tolerance TOL]`
- `crystod-md --summary [--start-step N] [--end-step M] [--xdatcar XDATCAR]`
- `crystod-md --project -c PARENT --dim nx ny nz [--xdatcar XDATCAR] [--start-step N] [--end-step M] [--qpoint Q ... | all] [--irrep IR ...] [--star] [--mean-lattice] [--npz] [--no-histogram] [-o PREFIX]`   (order parameters Q(t) of an MD trajectory on the symmetry-adapted displacement patterns of the parent cell, per irrep and q point)
- `crystod-md --project --yaml phonopy_params.yaml --dim nx ny nz [--xdatcar XDATCAR] [--start-step N] [--qpoint Q ... | all] [--temperature T] [--star]`   (normal coordinates on the phonon eigenvectors at each q; `--temperature`: effective frequencies)
- `crystod-mol --example [NAME]`   (bundled examples: `CH4`, `NH3`, both `--diagram`)
- `crystod-mol --symmetry --xyz FILE.xyz [--tolerance TOL]`
- `crystod-mol --xyz FILE.xyz --element EL --orbital s|p|d|f [--align] [--show-matrix] [--visualize]`
- `crystod-mol --diagram --xyz FILE.xyz [--center EL] [--tolerance TOL] [-o FILE.html]`
- `crystod-mol --diagram --xyz FILE.xyz --pyscf [--basis BAS] [--theory scf|dft] [--xc XC] [--charge N] [--spin 2S] [--ao-left FORMULA --ao-right FORMULA]`
- `crystod-xrd --example [NAME]`   (bundled examples: `ScF3` = defaults, `SrTiO3` = `--xraytype CuKa1 --peak-profile gaussian`)
- `crystod-xrd -c POSCAR [--xraytype CuKa|CuKa1|MoKa|...] [--peak-profile lorentzian|gaussian] [--two-theta MIN MAX] [--width W] [--min-intensity PERCENT] [-o PREFIX] [--show]`
- `crystod-xrd -c POSCAR --radiation neutron --wavelength W [--two-theta MIN MAX] [-o PREFIX]`   (powder neutron pattern, nuclear scattering only)
- `crystod-xrd --parent PARENT -c CHILD [--radiation xray|neutron] [--xraytype TYPE | --wavelength W] [--min-intensity PERCENT]`   (superlattice reflections of a distorted structure indexed on the parent lattice, by parent k point and irrep)
- `crystod-slab --example [NAME]`   (bundled examples: `SrTiO3` = `--max-index 1`, `ScF3` = `--index 1 0 0 --symmetrize`)
- `crystod-slab -c POSCAR (--index h k l [--index ...] | --index-list FILE | --max-index N) [--slab-size T] [--vacuum-size V] [--in-unit-planes] [--max-atoms N] [--no-polar] [--symmetrize] [--oxidation EL=Q ...] [--conventional] [--no-center] [--no-primitive] [--lll-reduce] [--orthogonal-c] [--max-normal-search N] [--tolerance T] [--output-dir DIR] [--force] [--no-files]`   (`--index` also takes `h k i l` of hexagonal axes; writes `POSCAR_slab_{formula}_{hkl}_t{n}`, `_s{n}` with `--symmetrize`)
- `crystod-slab -c POSCAR`   (no index source: an interactive dialogue asks for the indices and the main settings, then prints the equivalent command line)
- `crystod-search --example [NAME]`   (bundled searches: `SrTiO3`, `Sr-Ti-O` = `--experimental`, `mp-5229` = `--get`; a Materials Project API key is needed)
- `crystod-search QUERY [--experimental] [--stable] [--ehull MAX] [--band-gap MIN MAX] [--sites MIN MAX] [--spg SG] [--exclude EL ...] [--subsystems] [--sort ehull|gap|sites|id|formula|spg] [--max N]`   (QUERY: `SrTiO3`, `Sr-Ti-O`, `Sr,Ti,O`, `ABO3`, `mp-5229`)
- `crystod-search --get MPID [MPID ...] [--cell conventional|primitive] [--tolerance 0.1] [-o FILE | --directory] [--force]`   (or a bare `--get` after a query: every listed material; `--cell` defaults to the standardized conventional cell)
- `crystod-example [--list]`   (the example directories packaged with CrystOD, their sizes and the directories each one uses)
- `crystod-example NAME [NAME ...] [-o DIR]` | `crystod-example --all -o DIR`   (copy example directories, by number or name, into `DIR`, default `./example`, with the shared `test_POSCARs/` and `test_XYZs/` and the other directories their READMEs use; identical files are kept, a differing one stops the copy)

## Notes

- `--show-irrep-table` in SALC mode prints the little-group irrep table at the
  selected k point; in `--product` mode it prints the point-group character table.
  In SALC mode (with `--kpoint`, and with `--atomic-orbital`) it also writes the
  table to `irrep_table.xlsx` in the working directory, overwriting the file;
  that export needs `openpyxl` (or `XlsxWriter`), which CrystOD does not install.
- The `--pyscf` forms need the optional PySCF dependency:
  `pip install "CrystOD[quantum]"` (see {doc}`install`).
- Some workflows depend on the versions of `phonopy`, `spglib`, and `spgrep`.
  CrystOD includes compatibility helpers for newer environments, but keeping
  these packages reasonably up to date is recommended. All irreducible-representation
  tables are bundled with CrystOD (ISO-IR data of the ISOTROPY Software Suite),
  so no external table package is needed.
- A command whose result is a report printed on the terminal also saves that
  report itself, word for word, in a file in the current directory (or in
  `--output-dir DIR`), so no `> file` is needed; the closing
  `* Output files *` block names it with the line
  `Report written to: FILE (this output)`. `--no-files` prints the report
  only. Setting the environment variable `CRYSTOD_NO_REPORT` to any value but
  empty or `0` turns the saving off for every command (the run then prints
  exactly the report, without the closing block); the test suite sets it.
  The first report saved this way is `CORREL_<formula>_<G>_<H>` of
  `crystod-group --correlate --supergroup-poscar P --subgroup-poscar C`.
