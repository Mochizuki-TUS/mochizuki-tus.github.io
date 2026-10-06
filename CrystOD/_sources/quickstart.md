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
crystod-search --example     # SrTiO3, Sr-Ti-O (--experimental), mp-5229 (--get); need an API key
```

Show global help (the epilog lists all sectioned commands):

```bash
crystod --help
```

## With your own structure

The same analysis on your own file — the crystal-orbital irreps of the Ti *d*
manifold of SrTiO3 at every special k point. All you need is a POSCAR:

```bash
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

Three commands worth trying next (the first two are also bundled examples:
`crystod --example ScF3_diagram`, `crystod-phonon --example SrTiO3_subgroup`):

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

Every feature of CrystOD carries one section number, used consistently in three places:

- the numbered sections of this documentation,
- `python testsuite.py <N>` (the regression tests of that feature),
- `example/<N>_*` (a worked example directory with real captured output).

The numbers are grouped by command:

| Sections | Command | Features |
|---|---|---|
| 1 | (library core) | Wigner D matrices — see [1. Theoretical background](theory-representations.md) |
| 2–7 | `crystod` | 2 SALC (incl. `--spinor`), 3 hybridization & crystal-orbital diagrams (`--diagram` in all three engines: extended Hückel, `--pyscf`, `--vasp`, plus `--band`/`--dos` from the same checkpoint), 4 dipole selection rules of the diagrams, 5 star of k, 6 SALC viewer & eigen-level viewer, 7 CLI regression |
| 8–24 | `crystod-group` | 8 product, 9 symmetrized squares & Jahn-Teller modes, 10 decompose, 11 ligand field, 12 basis, 13 property tensors (`--tensor`), 14 generate-basis, 15 coset, 16 correlation & compatibility (`--correlate`), 17 isotropy subgroups (`--parent`), 18 invariant polynomials (`--invariants`), 19 reverse lookup (`--child`), 20 group-subgroup graph (`--graph`), 21 multi-electron terms (`--multiplet`), 22 POSCAR <-> Bilbao-style CIF (`--poscar2cif` / `--cif2poscar`), 23 symmetry-mode analysis (`--supergroup-cif`), 24 CLI regression |
| 25–27 | `crystod-bz` | 25 Brillouin zone, 26 supercell BZ, 27 CLI regression |
| 28–35 | `crystod-phonon` | 28 irreps, 29 IR / Raman activity of the Γ phonons, 30 fatband, 31 LT bands, 32 eigenvectors, 33 modulation, 34 vibration, 35 subgroups from imaginary modes (`--subgroup`) + CLI regression |
| 36–37 | `crystod-mag` | 36 spin bases, 37 CLI regression |
| 38–39 | `crystod-md` | 38 ADPs (`--adp`) and `--summary`, 39 CLI regression |
| 40–42 | `crystod-mol` | 40 molecular point groups & SALCs, 41 MO diagrams (`--diagram`, incl. `--pyscf`), 42 CLI regression |
| 43 | (library API) | The Python API of every command — see [Python API](python-api.md) |
| 44 | `crystod-xrd` | 44 powder X-ray diffraction patterns (`--xraytype`, `--peak-profile`) |
| 45 | `crystod-search` | 45 Materials Project search and POSCAR download (`--get`, `--cell`) |

Sections 7, 24, 27, 37, 39, and 42 are command-line-interface regression tests
(every argument form plus removed-flag errors); they have no documentation
section of their own. Section 35 combines the `crystod-phonon` regression tests
with the `--subgroup` mode documented in
[crystod-phonon](crystod-phonon.md#35-subgroups-from-imaginary-modes---subgroup).

## Command summary

- `crystod --example [NAME]`   (bundled examples: `ScF3_d`, `SrTiO3_d`, `ScF3_diagram`; without a name the list is printed)
- `crystod -c POSCAR --element ELEMENT --orbital ORBITAL [--kpoint kx ky kz] [--spinor] [--show-irrep-table]` (k omitted: all special k points; `--spinor`: double-group irreps)
- `crystod -c POSCAR --atomic-orbital Ni_d O_p --kpoint kx ky kz`
- `crystod --diagram -c POSCAR --co-left FORMULA --co-right FORMULA [--oxidation EL=Q ...] [--electrons N]`   (crystal-orbital diagram: full-electron basis + point-charge ligand field; every engine ends each k point with the dipole selection rule of the band edge)
- `crystod --diagram --pyscf -c POSCAR --co-left FORMULA --co-right FORMULA [--xc XC] [--kmesh N N N] [--ke-cutoff E] [--max-l L] [--onsite] [--chk FILE]`
- `crystod --diagram --vasp [ROOT | DIR DIR DIR] [-c POSCAR] --co-left FORMULA --co-right FORMULA [--vasp-crystal/-left/-right DIR] [--vasp-align site|rigid] [--vasp-zero vbm|efermi|raw] [--vasp-window EMIN EMAX] [--vasp-anchor EL nl] [--no-align]`   (from finished VASP runs: `ROOT/BAND` and `ROOT/BAND_sublattice*`, or the three run directories in any order; without `-c` the structure is the crystal run's POSCAR)
- `crystod --diagram --vasp [ROOT | DIR DIR DIR] --vasp-engine overlap --co-left FORMULA --co-right FORMULA [--vasp-shells EL-nl ...] [--vasp-frozen-window EV] [--vasp-cache FILE] [--vasp-scalar-reference JSON] [--vasp-irrep-json PATTERN]`   (no energy alignment: all-electron overlaps from the three WAVECARs, spin-orbit runs included; with an existing `--vasp-cache` and no run directory, from the cache alone)
- `crystod --diagram --vasp-setup [ROOT] -c POSCAR --co-left FORMULA --co-right FORMULA [--potcar-dir DIR] [--potcar-map EL=NAME] [--vasp-mesh N N N] [--vasp-bin PATH] [--vasp-engine overlap]`   (writes those runs' inputs and prints the VASP commands; with the overlap engine `LWAVE = .TRUE.`)
- `crystod --band [--fatband] --pyscf -c POSCAR ... --chk FILE [--window LO HI] [--align vbm|absolute] [--band-points N]`
- `crystod --dos --pyscf -c POSCAR ... --chk FILE [--dos-kmesh N N N] [--projection lowdin|mulliken]`
- `crystod --chk-info FILE`   (what a checkpoint stores, plus the option string that reproduces it)
- `crystod --visualize -c POSCAR --element EL --orbital ORB [--kpoint kx ky kz] [--real-coefficient] [--bond EL1 EL2 MAX] [--conventional] [--mode-index N] [--output FILE.html]`
- `crystod --visualize -c POSCAR [--pyscf] [--sublattice FORMULA] [--window LO HI] [--diagonalize] [--valence-only]`   (eigen-levels instead of the SALC basis)
- `crystod --star-of-k -c POSCAR --kpoint QLABEL_OR_KX KY KZ`
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
- `crystod-group --tensor KIND --point-group PG | --space-group SG | -c POSCAR`   (KIND: dielectric, pyroelectric, piezoelectric, elastic, compliance, gyration, raman, or a Jahn symbol)
- `crystod-group --coset --point-group PG --subgroup H`
- `crystod-group --coset --space-group SG --kpoint kx ky kz`
- `crystod-group --parent SG --irrep IR [IR2 ...] [--order-parameter 0 0 a]`   (`--supergroup SG` is kept as an alias; the value is the parent group)
- `crystod-group --parent SG --kpoint NAME | kx ky kz`   (every irrep of one special k point in a single table)
- `crystod-group --parent SG --irrep IR [IR2 ...] --invariants [--degree N] [--order-parameter ...]`   (Landau invariants, Landau and Lifshitz conditions, coupling terms, the free energy along a direction)
- `crystod-group --parent SG --irrep IR [IR2 ...] --order-parameter ... --secondary`   (secondary order parameters)
- `crystod-group --parent G --child H [--size N] [--index N] [--kpoint K ...] [--coupled [--secondary]] [--no-cache]`   (irreps or pairs of irreps whose isotropy subgroup has type H)
- `crystod-group --parent SG --irrep IR [IR2 ...] --graph [--output FILE.html] [--graph-dot]`   (group-subgroup graph of the isotropy subgroups)
- `crystod-group --correlate --pg G --subgroup H` | `--correlate --sg SG --kpoint K0 [K1] [--line L]` | `--correlate --parent SG --irrep IR [IR2] --order-parameter ... [--irrep-list IR ...]`   (correlation table, compatibility relations, subduction to the Gamma point of the isotropy subgroup)
- `crystod-group --multiplet IRREP^N|IRREPN [IRREP^N|IRREPN ...] --point-group PG [--orbital s|p|d|f] [--visualize [--output FILE.html]]`
- `crystod-group --poscar2cif -c POSCAR [--tolerance 0.01] [--output FILE.cif]`
- `crystod-group --cif2poscar -c FILE.cif [--conventional] [--tolerance 0.01] [--output POSCAR]`
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
- `crystod-phonon --modulation -c POSCAR --qpoint qx qy qz [--mode ...] [--amplitude ...] [--dim "nx ny nz"] [--readfc] [--keep-q-coords]`   (or `--yaml phonopy_params.yaml` in place of `-c`; without `--dim` the supercell is read from `phonopy_disp.yaml` or inferred from the force file)
- `crystod-phonon --vibration -c POSCAR --qpoint Q [--mode-index N] [--component-index N] [--list-qpoints] [--export-npz FILE] [--raman-tensor]`   (at GM: activity, Wyckoff-orbit breakdown and, with `--raman-tensor`, the Raman tensors)
- `crystod-phonon --subgroup --dim "nx ny nz" -c POSCAR [--qpoint Q] [--threshold -0.1] [--modulate [--amplitude A]]` (without `--qpoint`: every commensurate q point is scanned; `--modulate`: also write the distorted structure of every direction)
- `crystod-mag -c POSCAR --element EL [--qpoint Q] [--format vasp|qe] [--conventional] [--amplitude A]`
- `crystod-md --adp --dim nx ny nz [--start-step N] [--xdatcar XDATCAR] [--output ADP.cif] [--grouping-tolerance TOL]`
- `crystod-md --summary [--start-step N] [--end-step M] [--xdatcar XDATCAR]`
- `crystod-mol --example [NAME]`   (bundled examples: `CH4`, `NH3`, both `--diagram`)
- `crystod-mol --symmetry --xyz FILE.xyz [--tolerance TOL]`
- `crystod-mol --xyz FILE.xyz --element EL --orbital s|p|d|f [--align] [--show-matrix] [--visualize]`
- `crystod-mol --diagram --xyz FILE.xyz [--center EL] [--tolerance TOL] [-o FILE.html]`
- `crystod-mol --diagram --xyz FILE.xyz --pyscf [--basis BAS] [--theory scf|dft] [--xc XC] [--charge N] [--spin 2S] [--ao-left FORMULA --ao-right FORMULA]`
- `crystod-xrd --example [NAME]`   (bundled examples: `ScF3` = defaults, `SrTiO3` = `--xraytype CuKa1 --peak-profile gaussian`)
- `crystod-xrd -c POSCAR [--xraytype CuKa|CuKa1|MoKa|...] [--peak-profile lorentzian|gaussian] [--two-theta MIN MAX] [--width W] [--min-intensity PERCENT] [-o PREFIX] [--show]`
- `crystod-search --example [NAME]`   (bundled searches: `SrTiO3`, `Sr-Ti-O` = `--experimental`, `mp-5229` = `--get`; a Materials Project API key is needed)
- `crystod-search QUERY [--experimental] [--stable] [--ehull MAX] [--band-gap MIN MAX] [--sites MIN MAX] [--spg SG] [--exclude EL ...] [--subsystems] [--sort ehull|gap|sites|id|formula|spg] [--max N]`   (QUERY: `SrTiO3`, `Sr-Ti-O`, `Sr,Ti,O`, `ABO3`, `mp-5229`)
- `crystod-search --get MPID [MPID ...] [--cell primitive|conventional|mp] [--tolerance 0.1] [-o FILE | --directory] [--force]`   (or a bare `--get` after a query: every listed material)

## Notes

- `--show-irrep-table` in SALC mode prints the little-group irrep table at the
  selected k point; in `--product` mode it prints the point-group character table.
- The `--pyscf` forms need the optional PySCF dependency:
  `pip install "CrystOD[quantum]"` (see {doc}`install`).
- Some workflows depend on the versions of `phonopy`, `spglib`, and `spgrep`.
  CrystOD includes compatibility helpers for newer environments, but keeping
  these packages reasonably up to date is recommended. All irreducible-representation
  tables are bundled with CrystOD (ISO-IR data of the ISOTROPY Software Suite),
  so no external table package is needed.
