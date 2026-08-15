# Quick start

Show global help (the epilog lists all sectioned commands):

```bash
crystod --help
```

A first analysis — the crystal-orbital irreps of the Ti *d* manifold of SrTiO3
at every special k point. All you need is a POSCAR:

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

Three commands worth trying next:

```bash
# an interactive crystal-orbital diagram, one page per k point
crystod --diagram -c 221_PPOSCAR_ScF3 --co-left Sc --co-right F3

# which space groups an unstable phonon can lower the structure to
crystod-phonon --subgroup -c 221_PPOSCAR_SrTiO3 --dim "4 4 4"

# the octahedral-tilt classification of perovskites, no input file needed
crystod-group --supergroup Pm-3m --irrep R4+
```

## Shared section numbering

Every feature of CrystOD carries one section number, used consistently in three places:

- the numbered sections of this documentation,
- `python testsuite.py <N>` (the regression tests of that feature),
- `example/<N>_*` (a worked example directory with real captured output).

The numbers are grouped by command:

| Sections | Command | Features |
|---|---|---|
| 1 | (library core) | Wigner D matrices — see [1. Theoretical background](theory-representations.md) |
| 2–6 | `crystod` | 2 SALC (incl. `--spinor`), 3 hybridization & crystal-orbital diagrams (`--diagram`, plus `--band`/`--dos` from the same checkpoint), 4 star of k, 5 SALC viewer & eigen-level viewer, 6 CLI regression |
| 7–17 | `crystod-group` | 7 product, 8 decompose, 9 ligand field, 10 basis, 11 generate-basis, 12 coset, 13 isotropy subgroups (`--supergroup`), 14 multi-electron terms (`--multiplet`), 15 POSCAR <-> Bilbao-style CIF (`--poscar2cif` / `--cif2poscar`), 16 symmetry-mode analysis (`--supergroup-cif`), 17 CLI regression |
| 18–20 | `crystod-bz` | 18 Brillouin zone, 19 supercell BZ, 20 CLI regression |
| 21–27 | `crystod-phonon` | 21 irreps, 22 fatband, 23 LT bands, 24 eigenvectors, 25 modulation, 26 vibration, 27 subgroups from imaginary modes (`--subgroup`) + CLI regression |
| 28–29 | `crystod-mag` | 28 spin bases, 29 CLI regression |
| 30–31 | `crystod-md` | 30 ADPs (`--adp`) and `--summary`, 31 CLI regression |
| 32–34 | `crystod-mol` | 32 molecular point groups & SALCs, 33 MO diagrams (`--diagram`, incl. `--pyscf`), 34 CLI regression |
| 35 | (library API) | The Python API of every command — see [Python API](python-api.md) |

Sections 6, 17, 20, 29, 31, and 34 are command-line-interface regression tests
(every argument form plus removed-flag errors); they have no documentation
section of their own. Section 27 combines the `crystod-phonon` regression tests
with the `--subgroup` mode documented in
[crystod-phonon](crystod-phonon.md#27-subgroups-from-imaginary-modes---subgroup).

## Command summary

- `crystod -c POSCAR --element ELEMENT --orbital ORBITAL [--kpoint kx ky kz] [--spinor] [--show-irrep-table]` (k omitted: all special k points; `--spinor`: double-group irreps)
- `crystod -c POSCAR --atomic-orbital Ni_d O_p --kpoint kx ky kz`
- `crystod --diagram -c POSCAR --co-left FORMULA --co-right FORMULA [--oxidation EL=Q ...] [--electrons N]`   (crystal-orbital diagram: full-electron basis + point-charge ligand field)
- `crystod --diagram --pyscf -c POSCAR --co-left FORMULA --co-right FORMULA [--xc XC] [--kmesh N N N] [--ke-cutoff E] [--max-l L] [--onsite] [--chk FILE]`
- `crystod --band [--fatband] --pyscf -c POSCAR ... --chk FILE [--window LO HI] [--align vbm|absolute] [--band-points N]`
- `crystod --dos --pyscf -c POSCAR ... --chk FILE [--dos-kmesh N N N] [--projection lowdin|mulliken]`
- `crystod --chk-info FILE`   (what a checkpoint stores, plus the option string that reproduces it)
- `crystod --visualize -c POSCAR --element EL --orbital ORB [--kpoint kx ky kz] [--real-coefficient] [--bond EL1 EL2 MAX] [--conventional] [--mode-index N] [--output FILE.html]`
- `crystod --visualize -c POSCAR [--pyscf] [--sublattice FORMULA] [--window LO HI] [--diagonalize] [--valence-only]`   (eigen-levels instead of the SALC basis)
- `crystod --star-of-k -c POSCAR --kpoint QLABEL_OR_KX KY KZ`
- `crystod-group --product IRREP1 IRREP2 ... --point-group PG`
- `crystod-group --product IRREP1 IRREP2 ... --space-group SG`   (full space-group irreps, e.g. R4- R5+ for Pm-3m)
- `crystod-group --table --point-group PG`
- `crystod-group --decompose --point-group PG [--characters X1 X2 ...]`
- `crystod-group --ligand-field ORBITAL --point-group PG`
- `crystod-group --basis BASIS1 BASIS2 ... --point-group PG`
- `crystod-group --basis BASIS1 BASIS2 ... --space-group SG [--kpoint kx ky kz]`
- `crystod-group --generate-basis --point-group PG [--order 1 2 3]`
- `crystod-group --coset --point-group PG --subgroup H`
- `crystod-group --coset --space-group SG --kpoint kx ky kz`
- `crystod-group --supergroup SG --irrep IR [IR2 ...] [--order-parameter 0 0 a]`   (`--parent SG` is the same option, named after the value it takes)
- `crystod-group --multiplet IRREP^N|IRREPN [IRREP^N|IRREPN ...] --point-group PG [--orbital s|p|d|f] [--visualize [--output FILE.html]]`
- `crystod-group --poscar2cif -c POSCAR [--tolerance 0.01] [--output FILE.cif]`
- `crystod-group --cif2poscar -c FILE.cif [--conventional] [--tolerance 0.01] [--output POSCAR]`
- `crystod-group --supergroup-cif HIGH.cif --subgroup-cif LOW.cif [--tolerance 0.01]`
- `crystod-bz -c POSCAR [--band ... --band-labels ...] [--output FILE.html]`
- `crystod-bz -c POSCAR --trans-mat "t11 t12 t13  t21 t22 t23  t31 t32 t33"`
- `crystod-bz --show-kpoint --space-group SG`
- `crystod-phonon --irreps --dim "nx ny nz" -c POSCAR [--readfc] [--all-irreps]` (`--all-irreps`: symmetry lines too)
- `crystod-phonon --fatband --dim nx ny nz -c POSCAR [--element EL] [--nac] [--npoints N] [--projection-direction "0 0 1"]`
- `crystod-phonon --lt --dim nx ny nz -c POSCAR [--nac]`
- `crystod-phonon --vector --dim "nx ny nz" -c POSCAR --qpoint Q [--mode N1 N2 ...] [--amplitude A] [--conventional] [--keep-q-coords]`
- `crystod-phonon --modulation -c POSCAR --qpoint qx qy qz [--mode ...] [--amplitude ...] [--dim "nx ny nz"] [--readfc] [--keep-q-coords]`   (or `--yaml phonopy_params.yaml` in place of `-c`; without `--dim` the supercell is read from `phonopy_disp.yaml` or inferred from the force file)
- `crystod-phonon --vibration -c POSCAR --qpoint Q [--mode-index N] [--component-index N] [--list-qpoints] [--export-npz FILE]`
- `crystod-phonon --subgroup --dim "nx ny nz" -c POSCAR [--qpoint Q] [--threshold -0.1] [--modulate [--amplitude A]]` (without `--qpoint`: every commensurate q point is scanned; `--modulate`: also write the distorted structure of every direction)
- `crystod-mag -c POSCAR --element EL [--qpoint Q] [--format vasp|qe] [--conventional] [--amplitude A]`
- `crystod-md --adp --dim nx ny nz [--start-step N] [--xdatcar XDATCAR] [--output ADP.cif] [--grouping-tolerance TOL]`
- `crystod-md --summary [--start-step N] [--end-step M] [--xdatcar XDATCAR]`
- `crystod-mol --symmetry --xyz FILE.xyz [--tolerance TOL]`
- `crystod-mol --xyz FILE.xyz --element EL --orbital s|p|d|f [--align] [--show-matrix] [--visualize]`
- `crystod-mol --diagram --xyz FILE.xyz [--center EL] [--tolerance TOL] [-o FILE.html]`
- `crystod-mol --diagram --xyz FILE.xyz --pyscf [--basis BAS] [--theory scf|dft] [--xc XC] [--charge N] [--spin 2S] [--ao-left FORMULA --ao-right FORMULA]`

## Notes

- The pre-v0.3.0 flat modes (`crystod --<mode>`) were removed in v0.3.0; invoking
  one prints the equivalent sectioned command.
- `--show-irrep-table` in SALC mode prints the little-group irrep table at the
  selected k point; in `--product` mode it prints the point-group character table.
- Some workflows depend on the versions of `phonopy`, `spglib`, and `spgrep`.
  CrystOD includes compatibility helpers for newer environments, but keeping
  these packages reasonably up to date is recommended. All irreducible-representation
  tables are bundled with CrystOD (ISO-IR data of the ISOTROPY Software Suite),
  so no external table package is needed.
