---
myst:
  html_meta:
    "description lang=en": "CrystOD (Crystal Orbital Diagram) is a command-line and Python toolkit for the symmetry analysis of crystals and molecules: LCAO crystal-orbital diagrams, SALC and space-group irreducible representations, isotropy subgroups, phonon irreps and symmetry-adapted modulations."
    "keywords": "CrystOD, crystal orbital diagram, SALC, symmetry-adapted linear combination, space group, irreducible representation, isotropy subgroup, phonon irreps, phonon modulation, crystallography software"
    "og:title": "CrystOD - Crystal Orbital Diagram"
    "og:description": "LCAO orbital diagrams for crystals, with full space-group symmetry labels: SALC and crystal-orbital irreps, isotropy subgroups, phonon irreps and symmetry-adapted modulations."
    "og:url": "https://mochizuki-tus.github.io/CrystOD/"
    "og:type": "website"
---

# CrystOD

**CrystOD** draws **crystal-orbital diagrams**: it takes a crystal
structure and shows how the atomic orbitals combine — with full space-group
symmetry labels — into the crystal orbitals at each k point, exactly the way a
molecular-orbital diagram explains a molecule. Around this core it provides a
complete symmetry toolbox: Symmetry-Adapted Linear Combinations (SALCs), 
basis functions, phonon irreducible representations, 
symmetry-adapted vibrations/modulations, magnetic (spin)
multipole bases, direct products, isotropy subgroups, and group 
representation theory.

```{list-table}
:widths: 50 50
:align: center

* - [![Crystal-orbital diagram of ScF3 at the R point, with irrep labels and the orbital sketch of the selected level](images/hero_crystal_orbital.png)](crystod.md#01-03-crystal-orbital-diagrams)
  - [![Phonon dispersion of cubic SrTiO3 with the ISO-IR irrep label of every level at the special k points](images/hero_phonon_irrep.png)](crystod-phonon.md#04-02-phonon-irreps---irreps)
* - [![Interactive 3D Brillouin zone of ScF3 with the special k points and the seekpath k path](images/hero_brillouin_zone.png)](crystod-bz.md#03-01-brillouin-zone-plot)
  - [![MO diagram of CH4 from symmetry and overlap, with the 1t2 HOMO selected](images/hero_mo_diagram.png)](crystod-mol.md#07-02-molecular-orbital-diagrams---diagram)
```

Four outputs, each linked to its section. Top row: the crystal-orbital diagram
of ScF<sub>3</sub> (`crystod --diagram -c 221_PPOSCAR_ScF3 --co-left Sc --co-right F3`)
and the phonon irreps of SrTiO<sub>3</sub> drawn on the phonopy dispersion
(`crystod-phonon --irreps -c 221_PPOSCAR_SrTiO3 --dim "4 4 4"`); bottom row: the
Brillouin zone of ScF<sub>3</sub> (`crystod-bz -c 221_PPOSCAR_ScF3`) and the MO
diagram of CH<sub>4</sub> (`crystod-mol --diagram --xyz XYZ_CH4.xyz`). Every one
of these inputs is bundled with the package, so each runs right after
`pip install CrystOD` — see the "Try it" column below.

## New in v0.4.9

One line per feature: the command, what it gives, and the section that shows
its output.

- `crystod-phonon -c POSCAR --element EL --irrep IR [IR2 ...]` (no force
  data): every isotropy subgroup of the irrep(s) placed on the atoms of the
  element(s) as a symmetry-adapted displacement pattern, with the space group
  of the displaced structure identified again, VESTA arrows and the displaced
  structure; `--qpoint K` for every irrep at K
  ([04-01](crystod-phonon.md#04-01-displacement-patterns-of-given-irreps---irrep-with--c)).
- `crystod-mag -c POSCAR --element EL --irrep IR [IR2 ...]`: every magnetic
  isotropy subgroup of the irrep(s) placed on the sites of the element(s),
  with its magnetic space group identified again, the MAGMOM line, a VESTA
  file and the magnetic cell
  ([05-01](crystod-mag.md#05-01-magnetic-arrangements-of-given-irreps---irrep-with--c));
  `crystod-mag --parent SG --irrep A B ...` gives the magnetic isotropy
  subgroups of coupled irreps
  ([05-04](crystod-mag.md#several-irreps-coupled-order-parameters)).
- `crystod-phonon --mode-resolved-fc`: the force constant and the effective
  mass of every phonon mode at the special q points, and the force-constant
  matrix of every irrep subspace
  ([04-12](crystod-phonon.md#04-12-mode-resolved-force-constants---mode-resolved-fc)).
- `crystod-mag --qpoint` at q != 0: both phases of a complex order
  parameter and every order-parameter direction with ISOTROPY's label and its
  magnetic isotropy subgroup
  ([05-06](crystod-mag.md#05-06-order-parameter-directions-of-the-spin-bases));
  `--subgroup-poscar CHILD` aligns the directions with the domains of a
  distorted structure
  ([05-07](crystod-mag.md#05-07-spin-bases-aligned-with-a-subgroup-structure---subgroup-poscar)).
- `crystod-mag --qpoint ... --phonon-angular-momentum`: the texture of the
  phonon angular momentum near Γ that the magnetic point group allows
  ([05-08](crystod-mag.md#05-08-phonon-angular-momentum-near-gm---phonon-angular-momentum));
  `--element A B` analyses several magnetic elements in one run
  ([05-09](crystod-mag.md#05-09-several-magnetic-elements---element-a-b---superpose)).
- Commands whose result is a terminal report also save it, word for word, in
  a file named after the command (`samm_*`, `saad_*`, `CORREL_*`, `salc_*`,
  ...); `--no-files` or `CRYSTOD_NO_REPORT=1` turn this off.

In v0.4.9 the section numbers became two-level numbers CC-NN, CC the command
group and NN the index inside it (for example 01-09 is `crystod --unfold`,
02-17 `crystod-group --correlate-double-group`, 04-09 and 04-10
`crystod-phonon --unfold` and `--visualize`, 05-04 `crystod-mag --parent`),
so the example directories carry new names ({doc}`quickstart` has the table,
the [changelog](changelog.md) the old and new numbers). The full list of
changes and fixes, and the features of v0.4.8 (`crystod --check-symmetry`,
`crystod-group --correlate --supergroup-poscar P --subgroup-poscar C` and the
magnetic-cell POSCAR of `crystod-mag --qpoint`), is in the
[changelog](changelog.md).

## CrystOD at a glance

Not sure what an "orbital diagram for a crystal" means? Play with the toy model
first, then look at the real outputs below — everything shown is generated by
CrystOD itself.

**1. The idea — from a molecule to a crystal** (interactive toy model):

<iframe src="_static/embed/molecule_to_crystal_simulator.html" width="100%" height="875" data-narrow-height="840" data-narrow-width="720" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/molecule_to_crystal_simulator.html" target="_blank">Open the simulator full-screen</a></p>

**2. A real molecule** — the NH<sub>3</sub> molecular-orbital diagram
(`crystod-mol --diagram --xyz XYZ_NH3.xyz`); the only thing you need is XYZ file! Hover the levels for the orbital sketches:

<iframe src="_static/embed/MolOD_XYZ_NH3.html" width="100%" height="580" data-narrow-height="935" data-narrow-width="720" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/MolOD_XYZ_NH3.html" target="_blank">Open the NH3 MO diagram full-screen</a></p>

**3. A real crystal** — the same construction for ScF<sub>3</sub>
(`crystod --diagram -c 221_PPOSCAR_ScF3 --co-left Sc --co-right F3`, or
`crystod --example ScF3_diagram`): Sc and F<sub>3</sub>
sublattice orbitals on the sides, the crystal orbitals with their
irreducible-representation labels in the middle, one page per special k point:

<iframe src="_static/embed/CrystalOD_221_PPOSCAR_ScF3.html" width="100%" height="700" data-narrow-height="1060" data-narrow-width="720" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/CrystalOD_221_PPOSCAR_ScF3.html" target="_blank">Open the ScF3 crystal-orbital diagram full-screen</a></p>

## Commands

The package is organized phonopy-style: one main command plus one sectioned command
per research domain.

| Command | Domain |
|---|---|
| `crystod` | crystal-orbital SALC analysis (main command), `--diagram` (with dipole selection rules), `--band`/`--dos`, `--visualize`, `--star-of-k`, `--extract-irrep` (band irreps of a VASP run from its WAVECAR), `--unfold` (electronic band unfolding of two VASP runs onto the parent zone) |
| `crystod-group` | point/space-group representation-theory calculator (products, correlation tables, property tensors, isotropy subgroups, Landau invariants) |
| `crystod-bz` | Brillouin-zone plots (unit cell and supercell folding), special-k-point tables |
| `crystod-phonon` | phonon analyses (irreps, IR / Raman activity, fatband, LT bands, eigenvectors, modulation, vibration, subgroups of imaginary modes, band unfolding onto the parent zone, interactive 3D viewer of the modes by irrep) |
| `crystod-mag` | symmetry-adapted spin bases (cluster multipoles / SAMM); magnetic space groups, allowed responses and altermagnet classification |
| `crystod-md` | MD-trajectory analyses (ADPs, lattice summary, projection onto symmetry-adapted modes) |
| `crystod-mol` | molecular point groups, molecular SALCs, and MO diagrams (XYZ files) |
| `crystod-xrd` | powder X-ray and neutron diffraction patterns (Bragg peak list and broadened pattern); superlattice reflections of a distorted phase indexed on the parent, with k points and irreps |
| `crystod-slab` | surface slabs: every termination of given or of all distinct Miller indices, polar and symmetric tests, POSCAR files |
| `crystod-search` | Materials Project search (formula, chemical system, elements, ID) and POSCAR download |
| `crystod-example` | the packaged worked examples: lists the example directories and copies them into a working directory |

Every feature carries a shared section number used consistently across this
documentation, `testsuite.py`, and the `example/` directories of the repository:
feature *CC-NN* (CC the command group, NN the index inside it) is tested by
`python testsuite.py CC-NN` (in a clone of the repository) and demonstrated in
`example/CC-NN_*`, which ships with the package: `crystod-example CC-NN` copies
it into `./example` ({doc}`crystod-example`)
(all but `01-07_check_symmetry` and `01-09_band_unfold`, whose VASP runs are not distributed).

## What you can ask CrystOD

Every command prints its answer to the terminal; the ones that draw something
also write an HTML page, a PDF, or a VESTA file. A POSCAR (or an XYZ,
or nothing at all) is the only input, and `crystod-search` fetches the POSCAR of
any compound of the Materials Project. Every calculation runs offline, and
`crystod-search` is the only command that goes online. The 3D viewers of
`crystod --visualize`, `crystod-phonon --visualize`, `crystod-bz` and
`crystod-mol --visualize` load plotly.js from `cdn.plot.ly` when they are opened, so the browser needs a
network connection to display them; the crystal-orbital and MO diagram pages
are self-contained. The "Try it" column holds the bundled
example closest to each question: `--example NAME` copies the input files into
the working directory, prints the equivalent ordinary command line and runs it
(`--example` alone lists the names); `crystod-example CC-NN` copies a whole example
directory, whose README holds the commands to run
([11-01](crystod-example.md#11-01-packaged-example-directories)).

| Question | Command | Try it | Section |
|---|---|---|---|
| Which irreps does this shell span at each k point? | `crystod -c POSCAR --element Ti --orbital d` | `crystod --example SrTiO3_d` | [01-02](crystod.md#01-02-irreps-of-salc) |
| Which orbitals are allowed to hybridize here? | `crystod -c POSCAR --atomic-orbital Sc-d F-p --kpoint R` | | [01-03](crystod.md#01-03-crystal-orbital-diagrams) |
| What does the orbital diagram of this crystal look like? | `crystod --diagram -c POSCAR --co-left Sc --co-right F3` | `crystod --example ScF3_diagram` | [01-03](crystod.md#01-03-crystal-orbital-diagrams) |
| ... and its band structure and DOS? | `crystod --band --pyscf -c POSCAR --chk FILE`, then the same with `--dos` | | [01-03](crystod.md#band-structure-fatbands-and-dos---band---dos) |
| Is the band-edge transition dipole-allowed, and for which polarization? | `crystod --diagram -c POSCAR --co-left SrTi --co-right O3` | | [01-04](crystod.md#01-04-dipole-selection-rules---diagram) |
| What do these SALCs look like in 3D? | `crystod --visualize -c POSCAR --element Sc --orbital d` | | [01-06](crystod.md#01-06-salc-basis-visualization---visualize) |
| What is `T2g x T2g x T1u` in m-3m? | `crystod-group --product T2g T2g T1u --pg m-3m` | | [02-01](crystod-group.md#02-01-direct-products---product) |
| Which components of a piezoelectric (elastic, Raman, ...) tensor are allowed? | `crystod-group --tensor piezoelectric --pg 4mm` | | [02-06](crystod-group.md#02-06-property-tensors---tensor) |
| Which irreps of the low-symmetry phase does every irrep of the parent become (DCORREL)? | `crystod-group --correlate --supergroup-poscar POSCAR_SrTiO3_Pm-3m --subgroup-poscar POSCAR_SrTiO3_I4mcm` | `crystod-example 02-09` | [02-09](crystod-group.md#02-09-correlation-and-compatibility---correlate---correlate-kpath) |
| What does each band irrep become with spin-orbit coupling? | `crystod-group --correlate-double-group --sg Pm-3m --kpoint R` | `crystod-example 02-17` | [02-17](crystod-group.md#02-17-spin-orbit-compatibility---correlate-double-group) |
| Which space group does this distortion give? | `crystod-group --parent Pm-3m --irrep R4+` | | [02-10](crystod-group.md#02-10-isotropy-subgroups---parent) |
| Which subgroups can the distortions at this k point give? | `crystod-group --parent Pm-3m --kpoint GM` | | [02-10](crystod-group.md#every-irrep-of-a-k-point---kpoint) |
| Which Landau free-energy terms, coupling terms and secondary order parameters does this irrep allow? | `crystod-group --parent Pm-3m --irrep R4+ --invariants` (`--order-parameter a 0 0 --secondary`) | | [02-11](crystod-group.md#02-11-invariant-polynomials---invariants) |
| Which distortions give the subgroup I observe? | `crystod-group --parent Pm-3m --child I4/mcm` | | [02-12](crystod-group.md#02-12-reverse-lookup---child) |
| What are the multi-electron terms of (t2g)³? | `crystod-group --multiplet T2g3 --pg m-3m --orbital d` | | [02-14](crystod-group.md#02-14-multi-electron-terms---multiplet) |
| Which axis setting is my CIF in, and how do I rewrite it in another? | `crystod-group --cif-axis -c FILE.cif`, then `crystod-group --cif2poscar -c FILE.cif --spacegroup-set Amam` | | [02-15](crystod-group.md#axis-settings---cif-axis---spacegroup-set) |
| How does the observed structure differ from its parent, and what is the parent-to-child transformation? | `crystod-group --supergroup-cif HIGH.cif --subgroup-cif LOW.cif` | | [02-16](crystod-group.md#02-16-symmetry-mode-analysis---supergroup-cif) |
| What does this Brillouin zone look like? | `crystod-bz -c POSCAR` | `crystod-bz --example ScF3` | [03-01](crystod-bz.md#03-01-brillouin-zone-plot) |
| Which irrep is each phonon mode? | `crystod-phonon --irreps --dim 4 4 4 -c POSCAR` | `crystod-phonon --example SrTiO3` | [04-02](crystod-phonon.md#04-02-phonon-irreps---irreps) |
| Which Gamma phonons are IR or Raman active? | `crystod-phonon --irreps --dim 4 4 4 -c POSCAR` | `crystod-phonon --example SrTiO3` | [04-03](crystod-phonon.md#04-03-phonon-activity-ir-raman-mode-charges) |
| Which phases can this unstable phonon reach? | `crystod-phonon --subgroup --dim 4 4 4 -c POSCAR` | `crystod-phonon --example SrTiO3_subgroup` | [04-11](crystod-phonon.md#04-11-subgroups-from-imaginary-modes---subgroup) |
| How do the phonons of a distorted phase look in the zone of its parent? | `crystod-phonon --unfold --child-poscar POSCAR_child --child-dim 2 2 2 --parent-poscar POSCAR_parent --parent-dim 2 2 2` | `crystod-example 04-09` | [04-09](crystod-phonon.md#04-09-phonon-band-unfolding---unfold) |
| How do the electronic bands of a distorted phase look in the zone of its parent? | `crystod --unfold --child-wavecar CHILD/BAND --parent-wavecar PARENT/BAND` | | [01-09](crystod.md#electronic-band-unfolding-of-two-vasp-runs---unfold) |
| How do the modes move? | `crystod-phonon --visualize --dim 4 4 4 -c POSCAR` | `crystod-example 04-10` | [04-10](crystod-phonon.md#04-10-phonon-mode-viewer---visualize) |
| How stiff is each phonon mode, and is the whole subspace of an irrep stable? | `crystod-phonon --mode-resolved-fc --dim 4 4 4 -c POSCAR` | `crystod-example 04-12` | [04-12](crystod-phonon.md#04-12-mode-resolved-force-constants---mode-resolved-fc) |
| Which irreps do the spin configurations of a site span at each k point? | `crystod -c POSCAR --element Ti --axial` | | [01-02](crystod.md#spin-configurations---axial) |
| Which magnetic orders are symmetry-allowed? | `crystod-mag -c POSCAR --element Ni` | | [05-02](crystod-mag.md#05-02-symmetry-adapted-spin-bases) |
| Which magnetic space groups can the magnetic orders of a k point give (no structure file)? | `crystod-mag --parent Pm-3m --qpoint GM` | | [05-04](crystod-mag.md#05-04-magnetic-isotropy-subgroups---parent) |
| Which magnetic space group does each order have, which responses does it allow, and is it an altermagnet? | `crystod-mag -c POSCAR --element Ti --qpoint GM --classify-only` | | [05-03](crystod-mag.md#05-03-magnetic-space-groups-and-collinear-classes---classify-only) |
| What are the ADPs of my MD run? | `crystod-md --adp --dim 4 4 4 --xdatcar XDATCAR` | | [06-01](crystod-md.md#06-01-adps-from-an-md-trajectory---adp) |
| How large are the R4+ / M3+ fluctuations in my MD run, and are they single- or double-peaked? | `crystod-md --project -c POSCAR --dim 4 4 4 --qpoint R M` | | [06-03](crystod-md.md#06-03-mode-projection-of-an-md-trajectory---project) |
| How far does each phonon of my MD run deviate from the harmonic model (effective frequencies)? | `crystod-md --project --yaml phonopy_params.yaml --dim 4 4 4 --qpoint R M GM --temperature 300` | | [06-03](crystod-md.md#phonon-eigenvector-basis---yaml) |
| What is the MO diagram of this molecule? | `crystod-mol --diagram --xyz FILE.xyz` | `crystod-mol --example CH4` | [07-02](crystod-mol.md#07-02-molecular-orbital-diagrams---diagram) |
| What powder XRD pattern does this structure give? | `crystod-xrd -c POSCAR` | `crystod-xrd --example ScF3` | [08-01](crystod-xrd.md#08-01-powder-x-ray-diffraction-patterns) |
| Which superlattice reflections of my distorted phase come from which k point and irrep (X-ray or neutron)? | `crystod-xrd --parent PARENT.cif -c CHILD.cif` | | [08-02](crystod-xrd.md#08-02-superlattice-reflections-and-neutron-patterns---parent---radiation-neutron) |
| Which surface slabs can I cut from this structure, and which are polar? | `crystod-slab -c POSCAR --max-index 1` | `crystod-slab --example SrTiO3` | [09-01](crystod-slab.md#09-01-surface-slabs) |
| Where do I get a POSCAR of this compound? | `crystod-search SrTiO3`, then `crystod-search --get mp-5229` | `crystod-search --example SrTiO3` | [10-01](crystod-search.md#10-01-searching-the-materials-project) |
| Where is the worked example of a feature, with its inputs and captured output? | `crystod-example CC-NN` (copies `example/CC-NN_*` into `./example`) | `crystod-example` (the list) | [11-01](crystod-example.md#11-01-packaged-example-directories) |
| Can I call all of this from Python? | `from crystod.phonon import imaginary_mode_subgroups` | | [01-11](python-api.md), [API reference](api/index.md) |
| Can an LLM assistant run these analyses for me? | `crystod-mcp` (Model Context Protocol server) | | [MCP server](crystod-mcp.md) |

```{toctree}
:maxdepth: 1
:titlesonly: true
:caption: Getting started

install
quickstart
first-analysis
for-phonopy-users
```

```{toctree}
:maxdepth: 1
:titlesonly: true
:caption: Tutorials

tutorials
```

```{toctree}
:maxdepth: 2
:caption: Commands

crystod
crystod-group
crystod-bz
crystod-phonon
crystod-mag
crystod-md
crystod-mol
crystod-xrd
crystod-slab
crystod-search
crystod-example
```

```{toctree}
:maxdepth: 2
:caption: Theory

theory-representations
theory-orbital-diagrams
theory-isotropy-subgroups
```

```{toctree}
:maxdepth: 2
:caption: Python API

python-api
api/index
```

```{toctree}
:maxdepth: 1
:titlesonly: true
:caption: Integrations

crystod-mcp
```

```{toctree}
:maxdepth: 1
:titlesonly: true
:caption: Reference

citation
changelog
contributing
```

## Citation

If you use CrystOD in your research, please cite:

> H. Koiso, S. Yoshida, T. Nagai, T. Isobe, A. Nakajima, and Y. Mochizuki,
> "Thermal expansion and phase stability of BF3 (B = Sc, Y, La, Al, Ga, In) from first principles",
> [Physical Review B **110**, 064104 (2024)](https://doi.org/10.1103/PhysRevB.110.064104).

`crystod-slab`: please also cite R. Kiribayashi *et al.*, [*ACS Appl. Mater. Interfaces* **17**, 61872–61887 (2025)](https://doi.org/10.1021/acsami.5c17978).

## Contributors

- **Yasuhide Mochizuki** — Tokyo University of Science
- **Hiroki Koiso** — Institute of Science Tokyo
- **Ryuju Kiribayashi** — Institute of Science Tokyo

## License

MIT License
