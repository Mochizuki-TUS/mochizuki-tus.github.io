# crystod-example

Copy the worked examples that ship with the package into a working directory.

Every feature of CrystOD has an example directory in the source tree,
`example/CC-NN_name/`: a README with the commands to run and their captured
output, and the input files those commands read. 52 of the 54 example
directories ship inside the package, without their large or unpublished data
(`01-07_check_symmetry` reads a DFPT run that is not distributed, and
`01-09_band_unfold` is not distributed at all), so
`pip install CrystOD` is enough to have them, and
`crystod-example` copies them out of the installed package into a directory
of your own, where their commands can run and write their outputs.

| I want to ... | command |
|---|---|
| see which example directories ship | `crystod-example` (or `crystod-example --list`) |
| copy one into `./example` | `crystod-example 02-10` |
| copy several | `crystod-example 02-10 04-02` (numbers or names: `02-10_isotropy_subgroup`) |
| copy into another directory | `crystod-example 02-10 -o work` |
| copy every packaged example | `crystod-example --all -o DIR` |

```{note}
`crystod-example` copies whole example directories, each with its README.
The `--example NAME` option of `crystod`, `crystod-phonon`, `crystod-mol`,
`crystod-bz`, `crystod-xrd`, `crystod-slab` and `crystod-search` is something else: it
copies the input files of a single command, if any, into the current
directory and runs that command (see {doc}`quickstart`).
```

## 11-01. Packaged example directories

*Testsuite section 11-01 (no example directory of its own: it checks the
packaged copies against the `example/` directories of the source tree)*

### Listing the examples

Without arguments, `crystod-example` lists what the installed package holds:

```bash
crystod-example
```

```text

* Packaged example directories *
  01-01_wigner_d                    2 kB  Wigner D matrices on real spherical harmonics (library API)
  01-02_salc                        2 kB  crystod (SALC: crystal-orbital irreps, hybridization)
  01-03_hybridization            1.54 MB  crystod (--atomic-orbital hybridization; --diagram crystal-orbital diagrams)
  01-04_selection_rules             6 kB  crystod --diagram (dipole selection rules of the crystal-orbital diagrams)
  01-05_star_of_k                  973 B  crystod --star-of-k
  01-06_visualized_basis            4 kB  crystod --visualize (SALC viewer HTML)
  01-11_python_api                  5 kB  the library API (crystod.phonon etc.) on the SrTiO3 data
  02-01_direct_product              8 kB  crystod-group --product / --table (point- and space-group irreps)
  02-02_symmetric_square            5 kB  crystod-group --product --symmetric / --antisymmetric, --jahn-teller
  02-03_decompose_irrep             1 kB  crystod-group --decompose
  02-04_ligand_field_split          1 kB  crystod-group --ligand-field
  02-05_basis_function              2 kB  crystod-group --basis
  02-06_tensor_form                10 kB  crystod-group --tensor (property-tensor forms)
  02-07_generate_basis_function     3 kB  crystod-group --generate-basis
  02-08_show_coset                  2 kB  crystod-group --coset
  02-09_correlate                  41 kB  crystod-group --correlate (correlation and compatibility of irreps)
  02-10_isotropy_subgroup          14 kB  crystod-group --parent (isotropy subgroups)
  02-11_invariants                 12 kB  crystod-group --parent --irrep --invariants (invariant polynomials)
  02-12_child_lookup               20 kB  crystod-group --parent G --child H (reverse lookup)
  02-13_subgroup_graph             10 kB  crystod-group --parent --irrep --graph (group-subgroup graph)
  02-14_multiplet                  11 kB  crystod-group --multiplet (spin multiplicities of irrep-shell configurations)
  02-15_poscar2cif                 15 kB  crystod-group --poscar2cif / --cif2poscar (POSCAR <-> Bilbao-style CIF)
  02-16_symmetry_mode              69 kB  crystod-group --supergroup-cif (AMPLIMODES-style symmetry-mode analysis)
  02-17_correlate_double_group      5 kB  crystod-group --correlate-double-group (single- to double-valued irreps, spin-orbit coupling)
  03-01_brillouin_zone             392 B  crystod-bz
  03-02_bz_supercell               426 B  crystod-bz --trans-mat
  04-01_phonon_irrep               46 kB  crystod-phonon -c POSCAR --element EL --irrep IR [IR2] (displacement pattern of every isotropy subgroup on the atoms of EL, group re-identified from the displaced structure; README transcripts of La3Ni2O7, ScF3 and SrTiO3)
  04-02_phonon_bandirrep          285 kB  crystod-phonon --irreps
  04-03_phonon_activity            17 kB  crystod-phonon --irreps / --vibration (IR / Raman / silent / acoustic activity at Gamma)
  04-04_phonon_fatband            145 kB  crystod-phonon --fatband
  04-05_phonon_lt                  63 kB  crystod-phonon --lt
  04-06_phonon_vector             587 kB  crystod-phonon --vector
  04-07_modulation                811 kB  crystod-phonon --modulation
  04-08_vibration                   2 kB  crystod-phonon --vibration
  04-09_phonon_unfold             242 kB  crystod-phonon --unfold (phonon band unfolding onto the parent Brillouin zone)
  04-10_phonon_visualize          161 kB  crystod-phonon --visualize (interactive 3D viewer of the phonon modes by irrep)
  04-12_phonon_mode_fc            368 kB  crystod-phonon --mode-resolved-fc (force constant of every phonon mode and irrep-resolved Hessians)
  05-01_mag_irrep                  94 kB  crystod-mag -c POSCAR --element EL --irrep IR [IR2] (magnetic arrangement of every magnetic isotropy subgroup on the sites of EL, group re-identified from the structure)
  05-02_spin_basis                251 kB  crystod-mag
  05-03_magnetic_group             34 kB  crystod-mag --classify-only (magnetic space groups, altermagnet classes)
  05-06_mag_directions              9 kB  crystod-mag --qpoint K (order-parameter directions at q != 0: both phases of a complex order parameter, ISOTROPY labels, dir<k>)
  05-08_phonon_angular_momentum    23 kB  crystod-mag --phonon-angular-momentum (phonon angular momentum near GM allowed by the magnetic point group)
  05-09_multi_element              29 kB  crystod-mag --element A B, --superpose (spin bases on several elements, combined arrangements, superpositions)
  05-10_mag_coupled                 4 kB  crystod-mag --parent SG --irrep A B (magnetic isotropy subgroups of several coupled irreps; README transcript only)
  06-01_xdatcar2adp              3.14 MB  crystod-md --adp (and --summary on the same XDATCAR)
  06-03_md_projection             229 kB  crystod-md --project (mode projection of an MD trajectory)
  07-01_molecular_salc              5 kB  crystod-mol (--symmetry and molecular SALCs)
  07-02_molod                      24 kB  crystod-mol --diagram (MO diagrams: symmetry + overlap, or --pyscf)
  08-01_xrd_pattern                 2 kB  crystod-xrd (powder X-ray diffraction patterns)
  08-02_xrd_superlattice           37 kB  crystod-xrd --parent / --radiation neutron (superlattice reflections, k points, irreps)
  09-01_slab                       34 kB  crystod-slab (surface slabs, their terminations and polarity)
  10-01_mp_search                  10 kB  crystod-search (Materials Project search and POSCAR download; needs an API key)

* Copied along (the README uses files of these directories) *
  01-11_python_api               -> 04-02_phonon_bandirrep
  04-03_phonon_activity          -> 04-02_phonon_bandirrep, 04-04_phonon_fatband
  06-03_md_projection            -> 04-07_modulation, 06-01_xdatcar2adp
  08-02_xrd_superlattice         -> 02-16_symmetry_mode

* Shared inputs (copied with every example) *
  test_POSCARs  18 files  14 kB
  test_XYZs      5 files   1 kB

52 directories, 8.46 MB with the shared inputs.
Copy one:  crystod-example 01-01   (into ./example/01-01_wigner_d)
Copy all:  crystod-example --all -o DIR
```

The number in front of a directory name is the section number CC-NN of the
feature (CC the command group, NN the index inside it), the same in this
manual, in `example/` of the source tree and in `testsuite.py`
(`02-10_isotropy_subgroup` is section 02-10 of
[crystod-group](crystod-group.md)). Sizes are those of the packaged files.
The missing numbers are the command-line regression sections (01-10, 02-18,
03-03, 05-05, 06-02, 07-03), which have no example directory (06-02 also holds the
`crystod-md --summary` checks, whose input is in `06-01_xdatcar2adp`); section 04-11, the `--subgroup`
section of
[crystod-phonon](crystod-phonon.md#04-11-subgroups-from-imaginary-modes---subgroup),
whose examples are in `04-07_modulation` (the section also holds the
`crystod-phonon` regression tests); section 01-07 (`crystod --check-symmetry`),
whose directory `01-07_check_symmetry` reads a DFPT run that is not
distributed; section 01-08 (`crystod --extract-irrep`), whose inputs are part of
`01-03_hybridization`; section 01-09 (`crystod --unfold`), whose directory
`01-09_band_unfold` is not in the pip package (see below); section 05-04
(`crystod-mag --parent`), which needs no input files; section 11-01, this
command; section 05-07 (`crystod-mag --subgroup-poscar`), whose inputs are in
`05-06_mag_directions`; and section 05-11 (magnetic space groups on cells whose
lattice is not invariant under the point group), which has no example
directory.
The same list, as plain text, is the file `README` in the `crystod/examples/`
directory of the installed package.

### Copying an example

Give one or more numbers or names; the directories are copied into
`./example` (created if needed):

```bash
crystod-example 04-03
```

```text

* Example directories *
  04-03_phonon_activity   crystod-phonon --irreps / --vibration (IR / Raman / silent / acoustic activity at Gamma)

* Copied along (the READMEs above use their files) *
  04-02_phonon_bandirrep  used by 04-03_phonon_activity
  04-04_phonon_fatband    used by 04-03_phonon_activity

* Shared inputs *
  test_POSCARs            18 files
  test_XYZs               5 files


* Output files *
  Wrote 43 files (462 kB) under example/

Next: cd example/04-03_phonon_activity and follow its README.
```

Then change into the directory and run the commands of its README there:

```bash
cd example/04-03_phonon_activity
```

The README commands write their outputs next to their inputs, which is why
the examples are copied out first and never run inside the installed
package.

What lands where:

- **`NAME`** is a number (`02-10`), a directory name
  (`02-10_isotropy_subgroup`, also with the trailing `/` that shell completion
  adds) or a directory name without its number (`isotropy_subgroup`). Several
  can be given at once. A number or a name from before the CC-NN renumbering
  (`20`, `20_isotropy_subgroup`) still works: the copy is made and a NOTE line
  names the new number (`NOTE: 20 is now 02-10 (the example directories are
  numbered CC-NN): 02-10_isotropy_subgroup`).
- **`-o DIR`** (`--output DIR`) copies into `DIR` instead of `./example`
  (created if needed): the examples go to `DIR/CC-NN_name/`, the shared inputs
  to `DIR/test_POSCARs/` and `DIR/test_XYZs/`. The relative layout is that of
  `example/` in the source tree, so every relative path in a README works in
  the copy as it does there.
- **Shared inputs.** The READMEs read common structures as
  `../test_POSCARs/221_PPOSCAR_SrTiO3` and molecules as
  `../test_XYZs/XYZ_CH4.xyz`, so `test_POSCARs/` (18 structures) and
  `test_XYZs/` (5 molecules) are copied with every example. They hold the
  files the packaged READMEs use, not all the structures of the source
  tree's `test_POSCARs/`.
- **Copied along.** Four examples use files of other example directories
  (`../04-02_phonon_bandirrep/...`), and those directories are copied with them:

  | example | copied along | what its README uses there |
  |---|---|---|
  | `04-03_phonon_activity` | `04-02_phonon_bandirrep`, `04-04_phonon_fatband` | the force sets of SrTiO3, Si, BaTiO3 and ScF3, and the ScF3 `BORN` file |
  | `06-03_md_projection` | `04-07_modulation`, `06-01_xdatcar2adp` | the ScF3 `phonopy_params.yaml` and `POSCAR_I4mcm_3`, and the NpT trajectory `XDATCAR_every10` |
  | `01-11_python_api` | `04-02_phonon_bandirrep` | the SrTiO3 cell and force sets |
  | `08-02_xrd_superlattice` | `02-16_symmetry_mode` | the parent and child CIFs of the symmetry-mode examples |

- **`--all`** copies every packaged directory, 291 files and 8.46 MB in
  total; `-o DIR` names the destination as above.

### Copying again, and conflicts

A file that is already in place with the same content is kept, so a second
example copied into the same directory reuses the shared inputs that are
there, and copying the same example twice changes nothing:

```bash
crystod-example 04-03
```

```text

* Example directories *
  04-03_phonon_activity   crystod-phonon --irreps / --vibration (IR / Raman / silent / acoustic activity at Gamma)

* Copied along (the READMEs above use their files) *
  04-02_phonon_bandirrep  used by 04-03_phonon_activity
  04-04_phonon_fatband    used by 04-03_phonon_activity

* Shared inputs *
  test_POSCARs            18 files
  test_XYZs               5 files


* Output files *
  Kept 43 identical files already under example/

Next: cd example/04-03_phonon_activity and follow its README.
```

The outputs that a README run has written next to the inputs are not
touched, since they are not packaged files. A packaged file that has been
edited in the copy is never overwritten: every target is checked before
anything is written, and if one differs the command stops with one `ERROR`
line naming it (up to ten files, then "and N more") and writes nothing, not
even a new directory. Here `test_POSCARs/221_PPOSCAR_ScF3` was edited after
the first copy, and `crystod-example 04-07` would need it:

```bash
crystod-example 04-07
```

```text
ERROR: example/test_POSCARs/221_PPOSCAR_ScF3 already exists and differs from the packaged example; nothing was copied (move it away or copy into another directory)
```

Move the edited file away, or copy into a fresh directory with `-o`. An
unknown name also stops with one `ERROR` line, which lists the names that
exist. Both exit with status 1; a wrong combination of options (`--all` with
names, `-o` without names or `--all`) is a usage error with status 2.

### What ships and what is left out

52 example directories ship (sizes of the packaged files; the shared
inputs add 14 kB and 1 kB); `01-07_check_symmetry` and `01-09_band_unfold` do
not (see below):

| directory | files | size | feature | documented in |
|---|---|---|---|---|
| `01-01_wigner_d` | 2 | 2 kB | Wigner D matrices on real spherical harmonics (library API) | [Theory](theory-representations.md) |
| `01-02_salc` | 1 | 2 kB | crystal-orbital (SALC) irreps | [crystod](crystod.md) |
| `01-03_hybridization` | 43 | 1.54 MB | hybridization (`--atomic-orbital`), crystal-orbital diagrams (`--diagram`, also from VASP runs), band irreps of a VASP run (`--extract-irrep`) | [crystod](crystod.md) |
| `01-04_selection_rules` | 3 | 6 kB | dipole selection rules of the crystal-orbital diagrams | [crystod](crystod.md) |
| `01-05_star_of_k` | 1 | 973 B | `--star-of-k` | [crystod](crystod.md) |
| `01-06_visualized_basis` | 6 | 4 kB | `--visualize` (SALC viewer) | [crystod](crystod.md) |
| `02-01_direct_product` | 1 | 8 kB | `--product`, `--table` | [crystod-group](crystod-group.md) |
| `02-02_symmetric_square` | 1 | 5 kB | `--symmetric`, `--antisymmetric`, `--jahn-teller` | [crystod-group](crystod-group.md) |
| `02-03_decompose_irrep` | 1 | 1 kB | `--decompose` | [crystod-group](crystod-group.md) |
| `02-04_ligand_field_split` | 1 | 1 kB | `--ligand-field` | [crystod-group](crystod-group.md) |
| `02-05_basis_function` | 1 | 2 kB | `--basis` | [crystod-group](crystod-group.md) |
| `02-06_tensor_form` | 1 | 10 kB | `--tensor` (property-tensor forms) | [crystod-group](crystod-group.md) |
| `02-07_generate_basis_function` | 1 | 3 kB | `--generate-basis` | [crystod-group](crystod-group.md) |
| `02-08_show_coset` | 1 | 2 kB | `--coset` | [crystod-group](crystod-group.md) |
| `02-09_correlate` | 9 | 41 kB | `--correlate` (correlation and compatibility of irreps) | [crystod-group](crystod-group.md) |
| `02-10_isotropy_subgroup` | 1 | 14 kB | `--parent` (isotropy subgroups) | [crystod-group](crystod-group.md) |
| `02-11_invariants` | 1 | 12 kB | `--invariants` (invariant polynomials) | [crystod-group](crystod-group.md) |
| `02-12_child_lookup` | 1 | 20 kB | `--parent G --child H` (reverse lookup) | [crystod-group](crystod-group.md) |
| `02-13_subgroup_graph` | 1 | 10 kB | `--graph` (group-subgroup graph) | [crystod-group](crystod-group.md) |
| `02-14_multiplet` | 1 | 11 kB | `--multiplet` (multi-electron terms) | [crystod-group](crystod-group.md) |
| `02-15_poscar2cif` | 7 | 15 kB | `--poscar2cif`, `--cif2poscar`, `--cif-axis` | [crystod-group](crystod-group.md) |
| `02-16_symmetry_mode` | 26 | 69 kB | `--supergroup-cif` (symmetry-mode analysis) | [crystod-group](crystod-group.md) |
| `02-17_correlate_double_group` | 1 | 5 kB | `--correlate-double-group` (single- to double-valued irreps, spin-orbit coupling) | [crystod-group](crystod-group.md) |
| `03-01_brillouin_zone` | 1 | 392 B | Brillouin zones | [crystod-bz](crystod-bz.md) |
| `03-02_bz_supercell` | 1 | 426 B | `--trans-mat` (supercell Brillouin zones) | [crystod-bz](crystod-bz.md) |
| `04-01_phonon_irrep` | 6 | 46 kB | `-c POSCAR --element EL --irrep IR` (displacement pattern of every isotropy subgroup on a crystal) | [crystod-phonon](crystod-phonon.md) |
| `04-02_phonon_bandirrep` | 12 | 285 kB | `--irreps` | [crystod-phonon](crystod-phonon.md) |
| `04-03_phonon_activity` | 1 | 17 kB | IR / Raman / silent / acoustic activity at Gamma | [crystod-phonon](crystod-phonon.md) |
| `04-04_phonon_fatband` | 7 | 145 kB | `--fatband` | [crystod-phonon](crystod-phonon.md) |
| `04-05_phonon_lt` | 7 | 63 kB | `--lt` | [crystod-phonon](crystod-phonon.md) |
| `04-06_phonon_vector` | 9 | 587 kB | `--vector` | [crystod-phonon](crystod-phonon.md) |
| `04-07_modulation` | 11 | 811 kB | `--modulation`, `--subgroup --modulate` | [crystod-phonon](crystod-phonon.md) |
| `04-08_vibration` | 2 | 2 kB | `--vibration` | [crystod-phonon](crystod-phonon.md) |
| `04-09_phonon_unfold` | 11 | 242 kB | `--unfold` (phonon band unfolding onto the parent Brillouin zone) | [crystod-phonon](crystod-phonon.md) |
| `04-10_phonon_visualize` | 7 | 161 kB | `--visualize` (interactive 3D viewer of the phonon modes by irrep) | [crystod-phonon](crystod-phonon.md) |
| `05-01_mag_irrep` | 4 | 94 kB | `-c POSCAR --element EL --irrep IR` (magnetic arrangement of every magnetic isotropy subgroup on a crystal) | [crystod-mag](crystod-mag.md) |
| `05-02_spin_basis` | 13 | 251 kB | spin bases | [crystod-mag](crystod-mag.md) |
| `05-03_magnetic_group` | 2 | 34 kB | `--classify-only` (magnetic space groups, altermagnet classes) | [crystod-mag](crystod-mag.md) |
| `06-01_xdatcar2adp` | 2 | 3.14 MB | `--adp`, `--summary` | [crystod-md](crystod-md.md) |
| `06-03_md_projection` | 4 | 229 kB | `--project` (mode projection of an MD trajectory) | [crystod-md](crystod-md.md) |
| `07-01_molecular_salc` | 4 | 5 kB | `--symmetry` and molecular SALCs | [crystod-mol](crystod-mol.md) |
| `07-02_molod` | 8 | 24 kB | `--diagram` (MO diagrams) | [crystod-mol](crystod-mol.md) |
| `01-11_python_api` | 2 | 5 kB | the library API on the SrTiO3 data | [Python API](python-api.md) |
| `08-01_xrd_pattern` | 4 | 2 kB | powder X-ray diffraction patterns | [crystod-xrd](crystod-xrd.md) |
| `08-02_xrd_superlattice` | 1 | 37 kB | `--parent`, `--radiation neutron` (superlattice reflections) | [crystod-xrd](crystod-xrd.md) |
| `09-01_slab` | 7 | 34 kB | surface slabs, their terminations and polarity | [crystod-slab](crystod-slab.md) |
| `10-01_mp_search` | 1 | 10 kB | Materials Project search and POSCAR download (needs an API key) | [crystod-search](crystod-search.md) |
| `04-12_phonon_mode_fc` | 13 | 368 kB | `--mode-resolved-fc` (force constant of every phonon mode, irrep-resolved Hessians) | [crystod-phonon](crystod-phonon.md) |
| `05-06_mag_directions` | 3 | 9 kB | `--qpoint K`: order-parameter directions at q ≠ 0, both phases of a complex order parameter | [crystod-mag](crystod-mag.md) |
| `05-08_phonon_angular_momentum` | 5 | 23 kB | `--phonon-angular-momentum` (phonon angular momentum near Gamma allowed by the magnetic point group) | [crystod-mag](crystod-mag.md) |
| `05-09_multi_element` | 7 | 29 kB | `--element A B`, `--superpose` (spin bases on several elements, superpositions) | [crystod-mag](crystod-mag.md) |
| `05-10_mag_coupled` | 1 | 4 kB | `--parent SG --irrep A B` (magnetic isotropy subgroups of coupled irreps) | [crystod-mag](crystod-mag.md) |

Some data of the `example/` directories is left out of the package; it stays
in the CrystOD development tree. The READMEs mark the commands that need it
("not in the pip package", or "unpublished, not distributed"); everything
else in a packaged README runs in the copy. The left-out data falls into two
groups.

**Not in the pip package**: data that is large or used only by the test
suite, and third-party and generated output:

- **Large files.** The full NpT trajectory of ScF3 (`XDATCAR`, 41.7 MB): the
  examples 46 and 47 use `XDATCAR_every10`, every tenth frame of the
  equilibrated part of the same run (3.1 MB), whose ADPs agree with those of
  the full trajectory to 0.2 %. Every `FORCE_CONSTANTS` file (28 MB
  together): the READMEs of 32 write one with phonopy before they use
  `--readfc`. The `phonopy_params.yaml` of
  `04-07_modulation/Sr3Ti2O7_I4mmm`: its README begins with the two phonopy
  commands that write it.
- **Reference data of the test suite.** The `expected.json` files and the two
  extra WAVECAR runs `SrTiO3_ISPIN2` and `SrTiO3_SOC` of
  `01-03_hybridization/vasp_wavecar` (only `SrTiO3` and `InP_SOC` ship), the
  debug fixtures of 26 (the AMPLIMODES regression cases
  `02-16_symmetry_mode/debugN_*/`), and the recorded server answers behind the
  offline test of `10-01_mp_search` (which ships its README only).
- **`test_pyscf/`**, the PySCF band-structure scripts, which the test suite
  does not run.
- **`01-07_check_symmetry/`**, the example of `crystod --check-symmetry`
  (section 01-07 of [crystod](crystod.md)): its input, the DFPT run of SrTiO3
  I4/mcm in `04-09_phonon_unfold/SrTiO3_I4mcm/child/DFPT` (vasprun.xml 2.5 MB,
  OUTCAR 1.4 MB), is not distributed, so the directory is not packaged.
- **`01-09_band_unfold/`**, the example of `crystod --unfold` (section 01-09 of
  [crystod](crystod.md#electronic-band-unfolding-of-two-vasp-runs---unfold)):
  its two WAVECARs (4.1 MB) do not fit the size budget of the packaged
  examples, and the directory is not distributed at all (neither in the
  package nor in the repository).
- **Third-party output**: ISODISTORT, AMPLIMODES and Bilbao output files.
- **Generated output**: HTML pages, PDF plots, VESTA files, CSV tables and
  PySCF checkpoints. Running the README commands writes them again.

**Unpublished, not distributed**: the data of work not yet published, that
is, the WAVECAR-overlap and meta-GGA (LAK) runs of `01-03_hybridization`
(`vasp_overlap/`, `vasp_SrTiO3_LAK/`) and the CdF2 supercell of
`01-06_visualized_basis` (`CdF2_Fm-3m/`).

In the source tree, the file `example/PACKAGED` selects the packaged files and
names the directories each example uses. `script/sync_packaged_examples.py`
copies the selection, byte for byte, into `crystod/examples/` and writes the
index files `index.json` and `README` there. Testsuite section 11-01 checks that
the packaged files are exactly that selection and identical to their
originals in `example/`, that every file a README names is there when that
example is copied alone, and the `crystod-example` command itself. See
{doc}`contributing` for adding an example.

### From Python

The same operations are functions of `crystod.examples`:

```python
from crystod.examples import (ExampleConflictError, copy_example_dirs, example_dir_path,
                              get_example_dir, list_example_dirs, resolve_example_dirs)

len(list_example_dirs())           # 52: ExampleDirectory records, by number
ex = get_example_dir("04-03")      # also "04-03_phonon_activity" or "phonon_activity"
ex.name, ex.requires, ex.bytes     # ('04-03_phonon_activity', ('04-02_phonon_bandirrep', '04-04_phonon_fatband'), 16534)
ex.files                           # ('04-03_phonon_activity/README',)
example_dir_path("02-10")          # its directory inside the installed package
[d.name for d in resolve_example_dirs(["04-03", "01-11"])]
# ['04-03_phonon_activity', '01-11_python_api', '04-02_phonon_bandirrep', '04-04_phonon_fatband']

paths = copy_example_dirs(["04-03"], "work")  # = crystod-example 04-03 -o work
len(paths), paths[0]               # (43, PosixPath('work/04-03_phonon_activity/README'))

try:
    copy_example_dirs(["02-10"], "work")
except ExampleConflictError as exc:  # a FileExistsError; nothing was written
    print(exc.paths)               # the files in the way
```

- `list_example_dirs()` returns the packaged directories as
  `ExampleDirectory` records (`name`, `number`, `description`, `requires`,
  `files`, `bytes`; `files` are paths relative to the package directory,
  `04-03_phonon_activity/README`), sorted by number. It is empty when the
  package has no `index.json`, as in a source tree that has not been
  synchronized.
- `get_example_dir(key)` finds one directory by number (`"04-03"`), name
  (`"04-03_phonon_activity"`) or name without the number (`"phonon_activity"`)
  and raises `KeyError`, with the names that exist, for any other key. A number
  or a name from before the CC-NN renumbering (`33`, `"33"`,
  `"33_phonon_activity"`) still finds the directory, and `renamed_note(key)`
  gives the line saying what it is called now (`crystod-example` prints it as a
  NOTE).
  `example_dir_path(key)` is its absolute path inside the package: read the
  files there, but run the README commands in a copy.
- `resolve_example_dirs(keys)` lists the requested directories and, after
  them, the directories their READMEs use, each once (`requires=False`
  leaves the latter out).
- `copy_example_dirs(keys, destination)` is `crystod-example`: it copies the
  resolved directories and the shared inputs (`shared=False` leaves those
  out), keeps identical files, and returns the paths of all the files of the
  copy. If any file in `destination` differs from the packaged one, it
  raises `ExampleConflictError` (with the paths in `exc.paths`) before
  writing anything.

The single input files of the `--example` options (`example_path`,
`copy_example_files`, `get_example`) are part of the same module; see the
docstring of `crystod.examples`.
