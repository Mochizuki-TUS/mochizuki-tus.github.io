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

* - [![Crystal-orbital diagram of ScF3 at the R point, with irrep labels and the orbital sketch of the selected level](images/hero_crystal_orbital.png)](crystod.md#3-crystal-orbital-diagrams)
  - [![Phonon dispersion of cubic SrTiO3 with the ISO-IR irrep label of every level at the special k points](images/hero_phonon_irrep.png)](crystod-phonon.md#28-phonon-irreps---irreps)
* - [![Interactive 3D Brillouin zone of ScF3 with the special k points and the seekpath k path](images/hero_brillouin_zone.png)](crystod-bz.md#25-brillouin-zone-plot)
  - [![MO diagram of CH4 from symmetry and overlap, with the 1t2 HOMO selected](images/hero_mo_diagram.png)](crystod-mol.md#41-molecular-orbital-diagrams---diagram)
```

Four outputs, each linked to its section. Top row: the crystal-orbital diagram
of ScF<sub>3</sub> (`crystod --diagram -c 221_PPOSCAR_ScF3 --co-left Sc --co-right F3`)
and the phonon irreps of SrTiO<sub>3</sub> drawn on a phonopy dispersion
(`crystod-phonon --irreps -c 221_PPOSCAR_SrTiO3 --dim "4 4 4"`); bottom row: the
Brillouin zone of ScF<sub>3</sub> (`crystod-bz -c 221_PPOSCAR_ScF3`) and the MO
diagram of CH<sub>4</sub> (`crystod-mol --diagram --xyz XYZ_CH4.xyz`). Every one
of these inputs is bundled with the package, so each runs right after
`pip install CrystOD` — see the "Try it" column below.

## New in v0.4.3

One line per feature: the command, what it gives, and the section that shows
its output.

- `crystod --diagram`: the dipole selection rule of the band-edge transition
  at every k point, per polarization, and on the HTML page for any two
  levels clicked in turn ([4](crystod.md#4-dipole-selection-rules---diagram)).
- `crystod --diagram --vasp --vasp-engine overlap`: crystal-orbital diagrams
  from the VASP wavefunctions, with no energy alignment
  ([3](crystod.md#wavecar-overlap-engine---diagram---vasp---vasp-engine-overlap)).
- `crystod-group --product IR IR --symmetric --antisymmetric` and
  `--jahn-teller IR [IR2] --pg PG`: symmetric and antisymmetric squares,
  Jahn-Teller and pseudo-Jahn-Teller modes
  ([9](crystod-group.md#9-symmetrized-squares-and-jahn-teller-modes---symmetric---antisymmetric---jahn-teller)).
- `crystod-group --tensor KIND`: the symmetry-allowed form of a property
  tensor in Nye's notation, and the Raman tensors of a point group or a
  structure ([13](crystod-group.md#13-property-tensors---tensor)).
- `crystod-group --correlate`: point-group correlation tables, the Gamma
  modes a parent irrep becomes in an isotropy subgroup, and compatibility
  relations along a line ([16](crystod-group.md#16-correlation-and-compatibility---correlate)).
- `crystod-group --parent SG --kpoint K`: the isotropy subgroups of every
  irrep of a k point in one table
  ([17](crystod-group.md#every-irrep-of-a-k-point---kpoint)).
- `crystod-group --parent SG --irrep IR --invariants` and `--secondary`: the
  Landau free-energy invariants, the Landau and Lifshitz conditions, coupling
  terms and secondary order parameters
  ([18](crystod-group.md#18-invariant-polynomials---invariants)).
- `crystod-group --parent G --child H [--coupled]`: the irreps, or pairs of
  irreps, whose isotropy subgroup is a given type
  ([19](crystod-group.md#19-reverse-lookup---child)).
- `crystod-group --parent SG --irrep IR ... --graph`: the group-subgroup graph
  of the isotropy subgroups as an HTML page
  ([20](crystod-group.md#20-group-subgroup-graph---graph)).
- `crystod-phonon --irreps` and `--vibration --qpoint GM`: IR / Raman /
  silent activity with Mulliken symbols, Raman tensors (`--raman-tensor`),
  mode effective charges and the static dielectric tensor (`--nac`), and the
  Wyckoff-orbit breakdown (`--vibration --qpoint GM`)
  ([29](crystod-phonon.md#29-phonon-activity-ir-raman-mode-charges)).
- `crystod-group --supergroup-cif HIGH.cif --subgroup-cif LOW.cif --output-dir DIR`
  / `--no-files`: where the decomposition table and the VESTA files of the
  symmetry-mode analysis go
  ([23](crystod-group.md#23-symmetry-mode-analysis---supergroup-cif)).
- `crystod-mcp`: the tools `crystod_invariants`, `crystod_find_isotropy_irreps`,
  `crystod_subgroup_graph`, `crystod_correlate`, `crystod_tensor_form` and
  `crystod_phonon_activity` ([MCP server](crystod-mcp.md)).

Every command prints its terminal output in `* ... *` blocks, and
`crystod-phonon` applies the non-analytical term correction only with
`--nac` ([28](crystod-phonon.md#nac-and-the-born-file---nac)). The full list
of changes and fixes is in the [changelog](changelog.md).

## CrystOD at a glance

Not sure what an "orbital diagram for a crystal" means? Play with the toy model
first, then look at the real outputs below — everything shown is generated by
CrystOD itself.

**1. The idea — from a molecule to a crystal** (interactive toy model):

<iframe src="_static/embed/molecule_to_crystal_simulator.html" width="100%" height="640" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/molecule_to_crystal_simulator.html" target="_blank">Open the simulator full-screen</a></p>

**2. A real molecule** — the NH<sub>3</sub> molecular-orbital diagram
(`crystod-mol --diagram --xyz XYZ_NH3.xyz`); the only thing you need is XYZ file! Hover the levels for the orbital sketches:

<iframe src="_static/embed/MolOD_XYZ_NH3.html" width="100%" height="660" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/MolOD_XYZ_NH3.html" target="_blank">Open the NH3 MO diagram full-screen</a></p>

**3. A real crystal** — the same construction for ScF<sub>3</sub>
(`crystod --diagram -c 221_PPOSCAR_ScF3 --co-left Sc --co-right F3`, or
`crystod --example ScF3_diagram`): Sc and F<sub>3</sub>
sublattice orbitals on the sides, the crystal orbitals with their
irreducible-representation labels in the middle, one page per special k point:

<iframe src="_static/embed/CrystalOD_221_PPOSCAR_ScF3.html" width="100%" height="660" loading="lazy" style="border:1px solid #8884; border-radius:8px; background:#fff;"></iframe>
<p style="margin-top:0.3em"><a href="_static/embed/CrystalOD_221_PPOSCAR_ScF3.html" target="_blank">Open the ScF3 crystal-orbital diagram full-screen</a></p>

## Commands

The package is organized phonopy-style: one main command plus one sectioned command
per research domain.

| Command | Domain |
|---|---|
| `crystod` | crystal-orbital SALC analysis (main command), `--diagram` (with dipole selection rules), `--band`/`--dos`, `--visualize`, `--star-of-k` |
| `crystod-group` | point/space-group representation-theory calculator (products, correlation tables, property tensors, isotropy subgroups, Landau invariants) |
| `crystod-bz` | Brillouin-zone plots (unit cell and supercell folding), special-k-point tables |
| `crystod-phonon` | phonon analyses (irreps, IR / Raman activity, fatband, LT bands, eigenvectors, modulation, vibration, subgroups of imaginary modes) |
| `crystod-mag` | symmetry-adapted spin bases (cluster multipoles / SAMM) |
| `crystod-md` | MD-trajectory analyses (ADPs, lattice summary) |
| `crystod-mol` | molecular point groups, molecular SALCs, and MO diagrams (XYZ files) |
| `crystod-xrd` | powder X-ray diffraction patterns (Bragg peak list and broadened pattern) |
| `crystod-search` | Materials Project search (formula, chemical system, elements, ID) and POSCAR download |

Every feature carries a shared section number used consistently across this
documentation, `testsuite.py`, and the `example/` directories of the repository:
feature *N* is tested by `python testsuite.py N` and demonstrated in `example/<N>_*`.

## What you can ask CrystOD

Every command prints its answer to the terminal; the ones that draw something
also write a standalone HTML page, a PDF, or a VESTA file. A POSCAR (or an XYZ,
or nothing at all) is the only input, and `crystod-search` fetches the POSCAR of
any compound of the Materials Project. The "Try it" column holds the bundled
example closest to each question: `--example NAME` copies the input files into
the working directory, prints the equivalent ordinary command line and runs it
(`--example` alone lists the names).

| Question | Command | Try it | Section |
|---|---|---|---|
| Which irreps does this shell span at each k point? | `crystod -c POSCAR --element Ti --orbital d` | `crystod --example SrTiO3_d` | [2](crystod.md#2-irreps-of-salc) |
| Which orbitals are allowed to hybridize here? | `crystod -c POSCAR --atomic-orbital Sc-d F-p --kpoint R` | | [3](crystod.md#3-crystal-orbital-diagrams) |
| What does the orbital diagram of this crystal look like? | `crystod --diagram -c POSCAR --co-left Sc --co-right F3` | `crystod --example ScF3_diagram` | [3](crystod.md#3-crystal-orbital-diagrams) |
| ... and its band structure and DOS? | `crystod --band --pyscf -c POSCAR --chk FILE`, then the same with `--dos` | | [3](crystod.md#band-structure-fatbands-and-dos---band---dos) |
| Is the band-edge transition dipole-allowed, and for which polarization? | `crystod --diagram -c POSCAR --co-left SrTi --co-right O3` | | [4](crystod.md#4-dipole-selection-rules---diagram) |
| What do these SALCs look like in 3D? | `crystod --visualize -c POSCAR --element Sc --orbital d` | | [6](crystod.md#6-salc-basis-visualization---visualize) |
| What is `T2g x T2g x T1u` in m-3m? | `crystod-group --product T2g T2g T1u --pg m-3m` | | [8](crystod-group.md#8-direct-products---product) |
| Which components of a piezoelectric (elastic, Raman, ...) tensor are allowed? | `crystod-group --tensor piezoelectric --pg 4mm` | | [13](crystod-group.md#13-property-tensors---tensor) |
| Which Gamma modes does a soft mode become below the transition? | `crystod-group --correlate --parent Pm-3m --irrep R4+ --order-parameter 0 0 a` | | [16](crystod-group.md#16-correlation-and-compatibility---correlate) |
| Which space group does this distortion give? | `crystod-group --parent Pm-3m --irrep R4+` | | [17](crystod-group.md#17-isotropy-subgroups---parent) |
| Which subgroups can the distortions at this k point give? | `crystod-group --parent Pm-3m --kpoint GM` | | [17](crystod-group.md#every-irrep-of-a-k-point---kpoint) |
| Which Landau free-energy terms, coupling terms and secondary order parameters does this irrep allow? | `crystod-group --parent Pm-3m --irrep R4+ --invariants` (`--order-parameter a 0 0 --secondary`) | | [18](crystod-group.md#18-invariant-polynomials---invariants) |
| Which distortions give the subgroup I observe? | `crystod-group --parent Pm-3m --child I4/mcm` | | [19](crystod-group.md#19-reverse-lookup---child) |
| What are the multi-electron terms of (t2g)³? | `crystod-group --multiplet T2g3 --pg m-3m --orbital d` | | [21](crystod-group.md#21-multi-electron-terms---multiplet) |
| How does the observed structure differ from its parent? | `crystod-group --supergroup-cif HIGH.cif --subgroup-cif LOW.cif` | | [23](crystod-group.md#23-symmetry-mode-analysis---supergroup-cif) |
| What does this Brillouin zone look like? | `crystod-bz -c POSCAR` | `crystod-bz --example ScF3` | [25](crystod-bz.md#25-brillouin-zone-plot) |
| Which irrep is each phonon mode? | `crystod-phonon --irreps --dim 4 4 4 -c POSCAR` | `crystod-phonon --example SrTiO3` | [28](crystod-phonon.md#28-phonon-irreps---irreps) |
| Which Gamma phonons are IR or Raman active? | `crystod-phonon --irreps --dim 4 4 4 -c POSCAR` | `crystod-phonon --example SrTiO3` | [29](crystod-phonon.md#29-phonon-activity-ir-raman-mode-charges) |
| Which phases can this unstable phonon reach? | `crystod-phonon --subgroup --dim 4 4 4 -c POSCAR` | `crystod-phonon --example SrTiO3_subgroup` | [35](crystod-phonon.md#35-subgroups-from-imaginary-modes---subgroup) |
| Which magnetic orders are symmetry-allowed? | `crystod-mag -c POSCAR --element Ni` | | [36](crystod-mag.md#36-symmetry-adapted-spin-bases) |
| What are the ADPs of my MD run? | `crystod-md --adp --dim 4 4 4 --xdatcar XDATCAR` | | [38](crystod-md.md#38-adps-from-an-md-trajectory---adp) |
| What is the MO diagram of this molecule? | `crystod-mol --diagram --xyz FILE.xyz` | `crystod-mol --example CH4` | [41](crystod-mol.md#41-molecular-orbital-diagrams---diagram) |
| What powder XRD pattern does this structure give? | `crystod-xrd -c POSCAR` | `crystod-xrd --example ScF3` | [44](crystod-xrd.md#44-powder-x-ray-diffraction-patterns) |
| Where do I get a POSCAR of this compound? | `crystod-search SrTiO3`, then `crystod-search --get mp-5229` | `crystod-search --example SrTiO3` | [45](crystod-search.md#45-searching-the-materials-project) |
| Can I call all of this from Python? | `from crystod.phonon import imaginary_mode_subgroups` | | [43](python-api.md), [API reference](api/index.md) |
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
crystod-search
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

## Contributors

- **Yasuhide Mochizuki** — Tokyo University of Science
- **Hiroki Koiso** — Institute of Science Tokyo

## License

MIT License
