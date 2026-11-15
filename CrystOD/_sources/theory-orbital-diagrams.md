# How the orbital diagrams are computed

The orbital diagrams of CrystOD — the molecular ones of `crystod-mol --diagram`
(section 07-02) and the crystal ones of `crystod --diagram` (section 01-03) — are built
by the same recipe: symmetry-adapt the fragment orbitals, evaluate every overlap
between them, and solve the resulting eigenvalue problem. This page describes
that engine, in its qualitative (extended-Hückel) and quantitative (PySCF) forms,
and the two engines that build the crystal diagram from a finished VASP run
(`--diagram --vasp`, the PROCAR projections, and `--vasp-engine overlap`, the
WAVECAR overlaps).
Reading the diagrams themselves needs none of this; the command pages are
self-contained.

## How the molecular-orbital diagram is built (extended-Hückel engine)

The construction follows the textbook route, made quantitative step by step:

1. the molecular point group is detected and the ligand atomic orbitals are
   symmetry-adapted per irrep (the molecular SALCs of `crystod-mol --element
   --orbital`, section 07-01) — for NH3,
   `A1: [1s(H1) + 1s(H2) + 1s(H3)]` and
   `E: [1s(H1) - 1s(H3), 1s(H1) - 2 1s(H2) + 1s(H3)]`;
2. every valence orbital — the outer, chemically active orbital of each atom —
   is represented by a Slater-type orbital (STO) with the standard
   extended-Hückel exponents: one exponential function per orbital
   (single-zeta) for the s and p shells, and for most valence d and f shells
   a double-zeta contraction of two exponentials with fixed coefficients,
   which the AO-parameter block of the report prints. Each orbital also
   carries a diagonal energy H_ii, taken from its
   valence-state ionization energy, which measures how tightly that orbital
   binds an electron in the free atom;
3. all two-center overlap integrals between the STOs — the numbers S that
   measure how much two orbitals on different atoms occupy the same region of
   space — are evaluated **exactly**, by Gauss-Laguerre x Gauss-Legendre
   quadrature in prolate-spheroidal coordinates, to machine precision and
   validated against the analytic H 1s-1s formula. Ligand-ligand overlap is
   therefore *not* neglected. The overlaps between each ligand SALC and each
   central-atom atomic orbital (AO) are printed per irrep
   (NH3: `< a1 | N 2s > S = 0.72`, `< e | N 2p > S = 0.57`);
4. orbitals belonging to different irreps cannot mix, so the problem falls
   apart into one small block per irrep. Within each block the generalized
   eigenvalue problem — the secular equation whose solutions are the
   molecular-orbital energies and their coefficients — is solved with the
   Wolfsberg-Helmholz off-diagonal elements
   H_ij = K S_ij (H_ii + H_jj)/2 (K = 1.75). A large overlap integral
   therefore directly produces a large splitting between the bonding and the
   antibonding level (this is symmetry-adapted extended Hückel).

## Why ghost atoms? The basis-set superposition error (BSSE)

A quantum-chemistry calculation builds the wave function — the mathematical
object from which every property of the electrons follows — out of a
**finite** set of atom-centred basis functions, so its quality depends on how
many functions sit near the electrons. Compute the O atom of H2O in the basis
of O alone, then the whole molecule in the basis of O **and** the two H atoms,
and the molecule has extra freedom to describe its electrons — more functions
to build them from — that the isolated fragment never had. Its energy drops
for a reason that has nothing to do with chemical bonding.
The spurious part of the stabilization is the **basis-set superposition error
(BSSE)** — an artefact of the finite basis rather than a physical effect. It
makes computed interaction energies look too attractive, and it does not
vanish simply by enlarging the basis on one side only.

The standard cure is the **counterpoise correction** of Boys and Bernardi:
compute each fragment in the *full* molecular basis, keeping the basis
functions of the removed atoms but not their nuclei or electrons. Such
nucleus-free, electron-free basis centres are called **ghost atoms**. Both
fragments then carry exactly the same basis-set quality as the molecule, so
the difference E(mol) − E(left) − E(right) contains bonding only.

CrystOD needs this twice over. First, the interaction energy printed under the
diagram is BSSE-free. Second, because all three calculations live in *one and
the same* AO space, every molecular MO can be **projected exactly** onto the
fragment MOs — written as an exact combination of them, with no fitting and no
approximation. That is what makes the correlation lines and the percentage
compositions quantitative rather than merely indicative. The price is that a few
fragment solutions end up living mostly on the ghost centres; those are
filtered out by the real-atom Mulliken-population test described on the
`crystod-mol --diagram --pyscf` command page (section 07-02).

## Two conventions that keep the molecular fragment columns honest

**Spin and spherical averaging.** The electrons of a partly filled frontier
shell are spread evenly over it, so every degenerate orbital of the shell takes
the same fractional occupation. Without this, a partially filled shell (C 2p²,
the t2² of an H4 cage) would break the point-group symmetry of the fragment,
whereas the pre-bonding reference is supposed to preserve it.

**The ghost-population filter.** A fragment level may end up living mostly on
the ghost centres — a variational tail of the fragment density toward the atoms
that were removed, not a genuine state of that fragment. Each fragment level is
therefore judged by its real-atom Mulliken population, the share of the density
that Mulliken's partitioning assigns to the real atoms rather than to the ghost
centres. Below 35% the level is a BSSE artefact and is dropped from the diagram
and from the compositions; the surviving projections are weighted by the
real-atom population. In benzene this is what makes the pure-π 1e1g HOMO come
out as 100% C6 1e1g, with no spurious "H6" character borrowed from
ghost-carbon levels. Fragment orbital sketches likewise draw the real atoms
only, and degenerate partners are canonicalized so that they match the SALCs
drawn by `--visualize` exactly.

In the crystalline `--pyscf` diagram the same tail appears in the irreps where
the fragment has a partner (for ScF3: GM4⁻ = Sc p, R1⁺ = Sc s, and not in
GM5⁻). There the test is put on the ghost share itself: a fragment level
(a degenerate set) with more than 35% of its Mulliken population on the ghost
basis of the removed sublattice is dropped from the diagram and from the
compositions (`GHOST_FRACTION_THRESHOLD = 0.35` in
`crystod/crystal_orbital_pyscf.py`). The levels that survive keep their
projections unweighted and report their ghost weight instead — in the terminal
report from 5% and in the Level details of the HTML page from 0.5% — and their
sketches draw the fragment's own sublattice only. `--no-ghost` removes the
ghost basis from the fragment variational space entirely — at the cost of the
counterpoise consistency (~2 mHa BSSE per ScF3 fragment).

## Two-fragment molecular-orbital diagrams (`crystod-mol --ao-left --ao-right`)

*Command:* `crystod-mol --diagram --xyz FILE.xyz --ao-left F1 --ao-right F2` — [07-02. Molecular-orbital diagrams](crystod-mol.md#07-02-molecular-orbital-diagrams---diagram)

How the extended-Hückel engine draws a diagram of two fragments split by
chemical formula (benzene as H6 | C6), for molecules without a single
center.

All three columns are solved in the **one molecular AO space**. Because the
Wolfsberg-Helmholz off-diagonal depends only on the two orbitals involved, a
fragment's (H, S) sub-block *is* the isolated fragment: its eigenstates are the
pre-bonding fragment MOs — benzene's H6 column shows the
1a1g < 1e1u < 1e2g < 1b2u ladder of the six H 1s SALCs — and the molecular MOs
are projected onto them through the shared overlap matrix. Benzene fills
`(2a1g)^2 (2e1u)^4 (2e2g)^4 (2b2u)^2 (3a1g)^2 (3e1u)^4 (1a2u)^2 (1b1u)^2
(3e2g)^4 (1e1g)^4`, i.e. the Hückel π ladder 1a2u < 1e1g (HOMO) < 1e2u (LUMO) <
1b1g. Irrep labels are omitted when a fragment admits no consistent assignment
(and for linear molecules, which have no crystallographic character table).

## MO numbering with core shells in molecular diagrams (`crystod-mol --diagram`)

*Command:* `crystod-mol --diagram --xyz FILE.xyz` — [07-02. Molecular-orbital diagrams](crystod-mol.md#07-02-molecular-orbital-diagrams---diagram)

Which numbers the MO labels of `crystod-mol --diagram` carry, and how the core
shells, which the diagram does not show, enter them.

The MO numbering counts the core shells, as in photoelectron spectroscopy. CH4
therefore gives the textbook `(2a1)^2 (1t2)^6` (1a1 = C 1s core), NH3 gives
`(2a1)^2 (1e)^4 (3a1)^2` with the 3a1 lone pair as HOMO, and SF6 fills 48
valence electrons up to the nonbonding F 2p block (1t1g/3eg) just below the
6a1g LUMO. Each core shell is counted with its own angular momentum, so the d
cores from Zn on and the 4f core of Pb and Bi are counted as d and f shells:
H2Se fills `(8a1)^2 (4b2)^2 (9a1)^2 (4b1)^2`, the Se 3d core taking
`a1 + a1 + a2 + b1 + b2`, as in the two-fragment form.

## How the crystal-orbital diagram is built (extended-Hückel engine)

This is what `crystod --diagram --co-left ... --co-right ...` (section 01-03 of
`crystod`) evaluates at every special k point of the space group:

1. the Bloch orbitals of each fragment (e.g. Sr 1s...5p + Ti 1s...3d | O
   1s 2s 2p) are symmetry-adapted per irrep of the little group of k (the
   site-symmetry induced representations of the `--atomic-orbital`
   hybridization analysis);
2. all intra- and inter-fragment overlaps are evaluated **exactly** as
   Bloch lattice sums of STO overlap integrals (single-zeta s/p, the same
   single- or double-zeta d and f shells as the molecular engine,
   sigma/pi/delta/phi Slater-Koster assembly rotated with the exact real
   Wigner-D matrices), with a per-shell-pair lattice-sum cutoff
   probed from the actual STO tails (diffuse cation shells reach 30+ bohr);
3. the point-charge ligand field enters as **exact same-site matrix
   elements** <phi_i|q/|r-R||phi_j> — Laplace expansion into real
   spherical harmonics (the `wigner_D_real` real-orbital convention of the
   representation-matrix background above) with
   closed-form radial integrals, Loewdin-consistent with the identity
   on-site metric; near charge shells explicitly, the long-range tail by
   Ewald summation — validated against the NaCl Madelung constant and the
   exact 6Dq/-4Dq octahedral splitting ratio, so the fragment d states
   show the true electrostatic t2g/eg splitting. The background-dependent
   monopole of the (charged) sublattice array is omitted: it largely
   cancels against the intra-atomic charging energy absent from the
   extended-Hueckel VSIPs, and the omitted jellium-referenced values are
   printed for comparison with charged-cell DFT references;
4. the generalized eigenvalue problem with the Wolfsberg-Helmholz
   Hamiltonian H_ij = K S_ij (H_ii + H_jj)/2 (the diagonal carries the
   same-orbital neighbour-cell Bloch sums; the ligand-field blocks are
   added identically to the fragment and crystal Hamiltonians, so the
   three columns share one energy reference, and the symmetry invariance
   of H is self-checked per k point) is solved: fragment orbitals sharing
   an irrep split into bonding and antibonding crystal orbitals, orbitals
   without a partner remain rigorously nonbonding — the COD mixing rule.

The interactive HTML page that these steps produce is described with the
command in section 01-03 of `crystod`.

One numerical caveat belongs to step 4. In dense cation sublattices the diffuse
valence shells (Sr 5s/5p, Ti 4s/4p, ...) make a few Bloch combinations nearly
linearly dependent on the rest of the basis, and for those the extended-Hückel
energies diverge — the well-known **overlap catastrophe**. Combinations with an
overlap eigenvalue below 0.2 are therefore removed by canonical
orthogonalization, and the terminal report counts them per k point. A second,
purely conventional caveat: the irrep labels at zone-boundary points refer to
the origin of the input structure when the input is already in the ISO-IR
setting (Sr or Ti at the origin of SrTiO3), as in every SALC analysis, so
compare against a reference in the same setting. A diagonal supercell of
such an input (of any size) is labelled like the cell; any other
description of the same crystal is labelled in a canonical frame, which keeps
the input's own origin when that is the origin of a standard description, so
shifted copies get the same labels whatever their orientation or basis, while
an unshifted re-based cell or a non-diagonal supercell can get names that
differ from theirs, or from the cell's, by a normalizer element (see
[Irrep labels and the frame of a structure](theory-representations.md#irrep-labels-and-the-frame-of-a-structure)).

## Basis and point-charge field of the extended-Hueckel crystal-orbital diagram (`crystod --diagram`)

*Command:* `crystod --diagram` — [Crystal-orbital diagrams](crystod.md#01-03-crystal-orbital-diagrams)

What the two fragments of the extended-Hückel crystal-orbital diagram are made
of: the full-electron basis, where its level energies come from, and the
point-charge lattice each fragment feels. The construction itself (symmetry
adaptation, exact STO lattice sums, Ewald ligand field, Wolfsberg-Helmholz
eigenvalue problem) is the one of "How the crystal-orbital diagram is built
(extended-Hückel engine)" on this page.

`--co-left`/`--co-right` split the crystal into two fragment sublattices by
chemical formula. Each fragment carries its **full-electron basis** — every
core *and* valence shell of every atom: core shells with Slater-rule
Slater-type orbital (STO) exponents, valence shells with the extended-Hückel
parameters, and the level energies from the **archived neutral-atom PySCF
calculations** (one Hartree-Fock/def2-svp run per element; the runs are
archived in `reference/atomic_level_{El}` of the repository, and the package
carries their levels in `crystod/atomic_levels.py`).

Each fragment then **feels the removed sublattice as a point-charge lattice**
with the formal oxidation states (guessed with pymatgen; override with
`--oxidation Sr=+2 Ti=+4 O=-2`): the Sc fragment of ScF3 sits in the field
of the F lattice with Q = -1, the F3 fragment in the field of the Sc
lattice with Q = +3 — the Madelung ligand field of the pre-bonding states.
The valence 4f shells of Ce, Sm, Gd, Yb and Lu enter the inter-site overlaps
like every other shell, so the diagram shows their covalency.

## Ghost atoms, cell neutrality and the deep-level alignment (crystal `--pyscf`)

In the quantitative crystal-orbital diagram (`crystod --diagram --pyscf`,
section 01-03 of `crystod`) the three periodic SCF calculations — left fragment,
right fragment, crystal — are tied together like this.

The removed sublattice stays in the basis as **ghost atoms** (basis functions
without a nucleus), so all three calculations span the same AO space and the
crystal orbitals can be projected exactly onto the fragment Bloch orbitals
(counterpoise-consistent, as in the molecular version); in addition it acts on
the fragment as its **formal-charge point lattice**, evaluated as a
jellium-referenced FFT potential — validated against
`crystod.point_charge_field.ewald_site_potential` to 2e-6 eV for a neutral
charge array. Each fragment is therefore one sublattice in the Madelung field
of the other: the electronic state before chemical bond formation.

Both the remaining ions and the replacing point charges carry the formal
oxidation states (`--oxidation Sc=+3 F=-1` to override), which makes **every
cell neutral**: the monopole divergence disappears, every electron count is
even, and the fragment counts add up to the crystal's (ScF3: 8 + 24 = 32).
Neutrality alone does **not** put the three calculations on one absolute
scale, though — each pins its own G = 0 (cell-averaged) potential to zero,
and the value of that average depends on the second moment of the cell's
charge density, which changes when an ion is replaced by a bare point charge.
The raw columns are therefore offset by one rigid, k-independent constant
each (ScF3: Sc column ~2 eV, F3 column ~5 eV below the crystal), the same
reference problem as in band-offset calculations. The diagram removes it by
**deep-level (XPS-style) alignment**: the deepest chemically inert fragment
level — one that reappears in the crystal at ≥ 80% purity, e.g. the Sc 3s
semicore — must keep its energy across bond formation, and the energy zero
is put at its *pre-bonding* (fragment) value. Only the near-purest anchor
pairs across the k points set the constant (printed with anchor, purity and
k-spread); `--no-align` keeps the raw references instead.

## Open shells, smearing and exact degeneracies of the periodic PySCF diagram (`crystod --diagram --pyscf`)

*Command:* `crystod --diagram --pyscf` — [Crystal-orbital diagrams](crystod.md#01-03-crystal-orbital-diagrams)

How the periodic PySCF engine of the crystal-orbital diagram treats
neutral-atom sublattices and open-shell atoms, how its bond colours are
obtained, and why its degeneracies are exact. The ghost atoms, the cell
neutrality and the deep-level alignment of its three calculations are
described in "Ghost atoms, cell neutrality and the deep-level alignment
(crystal `--pyscf`)" on this page.

`--oxidation Al=0 N=0` switches the model to **neutral-atom sublattices**
(the extended-Hückel engine's convention): the point-charge lattice then
vanishes, and a sublattice with an odd electron count per cell (neutral
Al: 3) is solved spin-restricted with **Fermi smearing** — the run says so,
and `--sigma` sets the width (default 0.2 eV for such cells; integer aufbau
would silently drop the unpaired electron). The isolated-atom columns pick
their ground spin state by scanning the parity-consistent spins and keeping
the lowest energy — a neutral N atom takes the Hund spin-3 ⁴S state, not a
spin-1 doublet. Open-shell atomic columns display the **alpha channel**
(said in the tooltip); for main-group atoms the alpha inter-shell spacings
match the spin-averaged ones to ~0.1 eV, but for high-spin d/f atoms the
exchange splitting can shift them by ~1 eV against the spin-restricted
sublattice reference.

Crystal-orbital lines are colored by **bonding character** (blue = bonding,
black = nonbonding, red = antibonding) from the COOP-style left-right overlap
population of each eigenstate. Degeneracies are exact by construction: all
displayed levels are re-diagonalized from the group-averaged Fock, whose
invariance under the AO representation is verified against PySCF's own
overlap matrix (`D+ S D = S`, residual printed per k point).

## Why `--onsite` takes the fragment columns from the crystal Fock

The default `crystod --diagram --pyscf` mode (section 01-03 of `crystod`) solves
each fragment as its own SCF (formal-charge ions + point charges + ghost
basis), so the three columns live on three different electrostatic
references; deep-level alignment removes one rigid constant per column,
but the *site-dependent* part of the point-charge-model error remains — a
weakly bonding level can appear ~1.5 eV *above* its parent (SrTiO3: the
chemically inert Sr 4s column proves the shift is pure environment).
`--onsite` removes that error structurally, by reading the fragment columns
off the converged crystal Fock operator instead.

Whole-sublattice blocks are *not* used for those columns: with a diffuse
basis the raw AO block lets cation functions fall
variationally into the removed side's potential wells (disguised anion
states), and orthogonalized blocks load strongly-overlapped shells with
large orthogonalization penalties — the per-shell Rayleigh quotient has
no variational freedom to abuse.

## What the composition percentages mean (Löwdin vs Mulliken)

The composition list quoted in three places — the Level-details bars, the hover
tooltip and the terminal — is one and the same list: the per-(element, shell)
**AO population of the eigenvector**, the same partial-charge measure as
`crystod --dos --pyscf`. The default is Löwdin, |c|² in the symmetrically
orthogonalized basis: the orthonormal set closest to the atomic orbitals, i.e.
the intuitive "squared LCAO weight" made rigorous for a non-orthogonal basis
(non-negative, summing to exactly 100%). Mulliken's overlap cross terms instead
go negative or overshoot on diffuse empty levels, which is why
`--projection mulliken` is offered but not the default; the two measures agree
in kind on occupied levels and disagree strongly on empty ones, where atomic
attribution is convention-dependent in the first place.

Symmetry does the orbital selection: a crystal state of irrep Γ only picks up
the Γ-adapted combination of each shell (symmetry-forbidden shells project to
~0 and are culled at 0.1%), so every entry carries the crystal irrep —
`Sc 3d R5+ 76.0%`. Projections onto the *fragment eigenstates* are deliberately
**not** shown as percentages, although they still position the correlation lines
and the alignment anchors: a fragment level such as "Sc 3d R5+" itself mixes 3d
and 4d AO character, so its weights disagree with the AO populations, and the
two lists side by side would read as a contradiction.

The wave-function sketches follow the same measure. Lobe *signs and
orientations* come from the r0 = 2 bohr radial amplitudes, so orthogonalization
tails keep their inverted phases, while lobe *sizes* follow the per-(atom, l)
Löwdin population — a diffuse gth-dzvp Sc 4p has 5.4x the amplitude of an F 2p
at r0, which would otherwise draw an ~8%-population Sc admixture at 83% of the
largest F lobe. The calibration factor of each (atom, l) channel comes from the
multiplet-summed populations, so symmetry-equivalent atoms draw exactly equal
lobes and the sigma/pi contrast between degenerate partners survives.

## Why a valence level can look antibonding (`--valence-only`)

A valence level can *faithfully* look "antibonding" around an atom that carries
a semicore shell. In ScF3 the F 2p σ R1+ level carries Sc 3s (semicore)
c = +0.26 against Sc 4s c = +0.05, so the true wave function — verified against
a real-space `pbc_eval_gto` evaluation — has a radial node 0.7 Å from Sc and is
negative near the atom. That is the orthogonality tail against the −50 eV Sc 3s
band, not a drawing error.

The scale separation is the ⟨r⟩ one: in this basis ⟨r⟩(Sc 3s) = 0.77 Å against
⟨r⟩(Sc 4s) = 1.86 Å and a 2.03 Å bond — the compact semicore shell cannot bond,
and its admixture is on-site orthogonality. `--valence-only` applies exactly
this reasoning to the drawing: shells whose occupied fragment bands lie more
than 12 eV below the crystal VBM on the aligned scale (Sc 3s, Sc 3p, F 2s here;
detected automatically and printed) are dropped from the drawn wave functions,
so the σ level shows its bonding Sc 4s component — Sc s flips from −0.48 to
+0.47 against the same F p lobes — while levels a semicore shell dominates (the
semicore bands themselves) keep it.

The same asymmetry appears in the COOP colors: semicore orthogonality tails
(shells whose own bands lie ≥ 10 eV below their fragment column's HOMO) are
excluded from the overlap population unless the level *is* that semicore band.
With the Sc 3s tail included, the bonding σ R1+ of ScF3 would read P = −0.015
instead of +0.112. Antibonding |P| is systematically larger than bonding |P|,
the usual non-orthogonal COOP asymmetry.

## VASP projection engine of the crystal-orbital diagram (`crystod --diagram --vasp`)

*Command:* `crystod --diagram --vasp` — [Quantitative crystal-orbital diagrams from VASP](crystod.md#quantitative-crystal-orbital-diagrams-from-vasp---diagram---vasp)

How the default VASP engine (`--vasp-engine anchor`) turns three finished VASP
runs — the crystal and two sublattice runs whose removed sublattice is a
lattice of `Va` point charges — into a diagram: the calibrated point-charge
wall, the irreps read from the PROCAR projections, the site-resolved alignment
of the fragment columns, the bond character, and what the PAW-sphere
projections cannot resolve.

### The Va point-charge wall and its calibration

A sublattice run names its switched-off atoms `Va<q><sign>` (`Va2-`, `Va4+`) —
a species of a **modified VASP** that represents them as a smeared Coulomb
charge plus a short repulsive wall, the wall standing for the Pauli repulsion
of the removed ion's core, as in total-ion-potential embedding. The formal
charges come from CrystOD's own oxidation-state resolution (`--oxidation`), so
the cell stays neutral and each fragment is one sublattice in the Madelung
field of the other.

The wall is what a point charge needs to stop being a bare `−q/r` well, and it
is calibrated: `--vasp-setup` writes `VACSIGMA 0.5`, `VACRWALL 0.45` and
`VACWALL = 2.5 q e²√(2/π)/σ` (`--vasp-sigma`, `--vasp-rwall`,
`--vasp-wall-factor` change them; one height is written per `Va` species, so
the charge scaling stays automatic). A 72-point scan on SrTiO₃ and ScF₃ shows
the whole family organized by one coordinate, the radius `r₁₀ = b√(2 ln(A/10
eV))` at which the wall still repels by 10 eV: below 0.7 Å the anion
sublattice collapses into the bare well (bands below the projection floor,
metallic points), above 1.4 Å the wall expels the anion valence shell (an O 2p
manifold three times too wide). The setting above sits at `r₁₀ = 0.99 Å` for
`q = +2` and 1.13 Å for `q = +4` — the middle of the 0.85–1.25 Å plateau, one
setting for every charge — and is the joint minimum of the anchor-residual rms
on both test systems while matching the crystal's anion p-manifold width to
0.1 eV. Fluorite CaF₂, a third space group with a tetrahedral anion cage,
transfers without retuning. What the wall chooses is the anion column's
*position*: over the whole scan the shift ranges over 45 eV while the
residual rms on the plateau moves by 0.1 eV.

### Irreps from the PROCAR projections

A `LORBIT = 12` `PROCAR` lists the complex projections ⟨Y_lm at atom | ψ_nk⟩.
CrystOD treats that vector as a vector in an AO-like (atom, l, m) basis and
classifies it with the **same representation matrices and character
projectors** it builds for a genuine AO basis — the Bloch-phased site
permutation times the real Wigner matrices, with **no further gauge
conjugation**, because the PROCAR coefficients are already in that Bloch gauge
— after reordering VASP's `m = −l..l` rows into its own component order.
Degenerate bands are grouped adaptively until the irrep multiplicities come out
integral. The result is checked against the site-symmetry induced
representation (the SALC decomposition the report prints for every element and
shell), and a level whose best irrep weight falls below 0.9 is listed in a
purity warning. PAW sphere projections do not sum to one, so levels whose
projected weight per degenerate partner falls below `--vasp-projection-floor`
(0.30) are free-electron-like and are dropped; the report prints the weights
bracketing the cut.

The irrep labels at R, X and M depend on the choice of origin, which is why
the mapping of a run onto the setting of a `-c` file is stated in the terminal
report, in the level table, in the JSON and on the page whenever it is not the
identity; the energies, the projected weights, the site shifts and the
connector weights are the same numbers in either setting.

### Site-resolved alignment of the VASP fragment columns

Each of the three runs pins its own G = 0 average potential to zero, so the raw
columns are offset by one constant each. The **crystal column is the
reference** (shift 0) and every fragment level is raised onto it by a
**site-resolved shift**: one constant per (column, *element*), because the
shells of one atom move together but different *sites* do not — a cation that
receives covalent back-donation in the crystal has all its levels raised by the
intra-atomic Coulomb repulsion the bare-point-charge fragment lacks (on SrTiO₃
the Ti site moves 11.7 eV more than the ionic Sr site). Each element's shift is
fitted to the **symmetry-forbidden probes** alone wherever it has any —
fragment levels whose irrep has no partner in the other sublattice at that k,
which therefore *must* coincide with their crystal counterpart, an exact
constraint. The **pure XPS-style counterparts** (absolute composition ≥ 0.80)
are then reported as what they are, the measured bonding shift of each pair,
instead of being averaged into the scale; an element with no forbidden probe
(CaF₂ Ca) is fitted to them and flagged, because their residuals average to
zero by construction. The anchor pool is cut at the *default* window, never at
`--vasp-window`, so the drawn range cannot move the energy scale. The report
lists every anchor, the per-shell means, the spread per element and the
site-potential difference between the elements of one column, plus an
independent occupied-band **trace diagnostic** that uses no projection at all.
`--vasp-zero vbm|efermi|raw` sets the energy zero of the page and the tables
(default `E − E_VBM`, the VBM being the highest occupied crystal eigenvalue
over all k of the crystal run). `--vasp-align rigid` falls back to one shift
per column (whose numbers are printed as a diagnostic in either mode),
`--vasp-anchor EL nl` pins a column on a shell of your choice — and selects
`rigid`, since that is what it means — and `--no-align` keeps the raw VASP
energies.

In the fluorite example (`example/01-03_hybridization/vasp_CaF2/`) CaF₂ is the
ionic control of the site-resolved alignment: Ca +4.54 and F +4.42 eV move
together to 0.1 eV, against 11.7 eV between Ti and Sr in SrTiO₃; its F sites
sit on quarter coordinates of the primitive basis, where the PROCAR's Bloch
gauge can be tested.

### Bond character from the aligned VASP energies

A plane-wave calculation has no overlap matrix, so there is no COOP population
to quote. The character is read from the aligned energies instead: a crystal
level carrying 95 % or more of its projected weight on one sublattice is
nonbonding; otherwise it is bonding when it lies below, and antibonding when it
lies above, the composition-weighted energy of the fragment levels its
connectors point at (0.3 eV deadband, quoted beside the alignment residual the
run itself measures — the centre-of-gravity sum rule over every complete
(k, irrep) manifold, 0.59 eV mean on SrTiO₃ and 0.19 eV on CaF₂ — so a colour
inside the noise says so). A level with a parent on an *element* whose own
anchors disagree by more than 1 eV keeps the neutral grey stroke, and so does
one whose drawn parents hold less than half of it or whose character would
change if the levels the window hides were drawn: one shift does not describe
that site, so the sign of E − E(parents) carries no chemistry there. With bare
point charges that happens on the site whose shells disagree most — on SrTiO₃
the Sr site, whose empty, diffuse 4d shell sits 1.5 eV away from what its own
semicore says.

### Radial blindness of the PAW-sphere projections

Every share and connector weight of the anchor engine is a **PAW-sphere
projection**, which is blind to the radial channel — a semicore and a valence
shell of the same (atom, l) are not orthogonal in it, so the shares and the
connectors are resolved by the PAW valence *n* of each channel (a `Sr 5s` share
can never be handed to the `Sr 4s` semicore level) and a channel with no
fragment level on the page is dropped rather than re-routed. The same
blindness lets a semicore fragment level overlap an empty crystal level of its
own (atom, l) exactly as much as its own band — the Sr 4s R2- level of SrTiO₃
overlaps the empty Sr 5s-like R2- #2, more than 40 eV above that band, at 1.000
as well — so the crystal counterparts of the alignment anchors are paired
one-to-one in energy order: the n-th fragment level of such a ladder with the
n-th crystal level, never whichever overlap happens to be larger in the last
digit. The unpublished `example/01-03_hybridization/vasp_SrTiO3_LAK/` (SrTiO₃ with
`METAGGA = LAK` and 64 bands) is a run whose two Sr s-like anchor candidates
tie to the last digit, and they are paired one-to-one in energy order.

## WAVECAR-overlap engine of the crystal-orbital diagram (`crystod --vasp-engine overlap`)

*Command:* `crystod --diagram --vasp --vasp-engine overlap` — [WAVECAR-overlap engine](crystod.md#wavecar-overlap-engine---diagram---vasp---vasp-engine-overlap)

Why the overlap engine needs no energy alignment, what its two stages compute,
and how its three orthonormalization pictures, the COHP verdict, the ledger of
a parent level and the covalency count are defined.

The anchor engine puts the three columns on one scale with one shift per site,
fitted to the levels that symmetry forbids to mix. Where a site has no such
level — the B-site s and p shells of SrGeO₃ (Ge 4s/4p) and CsPbI₃ (Pb 6s/6p)
at Γ, X, M and R — the fit absorbs the very bonding shift the diagram is meant
to show. `--vasp-engine overlap` needs **no energy alignment at all**: it uses
only the *wavefunctions* of the two sublattice runs and the *eigenvalues* of
the crystal, and writes the crystal Kohn–Sham Hamiltonian in the basis of the
sublattice orbitals, so every column is on the crystal's own scale
(E − E_VBM).

### What the overlap engine computes

Stage 1 reads the three WAVECARs at the special k points and computes the
all-electron PAW overlaps A_fn = ⟨φ_f|ψ_n⟩ between the Bloch states of the
sublattice runs and those of the crystal (the plane-wave basis is the same in
the three runs; the one-centre corrections come from the crystal POTCAR,
including the term at the sites where a sublattice run has a point charge).
That takes seconds, and `--vasp-cache FILE` keeps the result (a few MB of
derived numbers, no PAW data). Stage 2 builds the model space: the crystal
levels up to VBM + 14 eV (the **frozen window**) are kept exactly, and the
empty active sublattice orbitals that lie higher are drawn from the bands above
by a projection-only disentanglement — the **effective outer levels**, drawn
dotted. Three pictures of that one model space differ only in how the
sublattice orbitals are orthonormalized:

| picture            | orthonormalization                                   | on the page                       |
|--------------------|------------------------------------------------------|-----------------------------------|
| frozen-ion         | occupied orbitals of both sublattices among themselves, the empty ones projected off them | the **parent levels** of the fragment columns, the **ledger** |
| symmetric Löwdin   | all at once (LOBSTER's convention)                   | the **colours**, populations and **connectors** |
| bare (Ritz)        | none (projected, non-orthogonal)                     | report and JSON only              |

A crystal level is bonding, nonbonding or antibonding by the sign of its
**inter-sublattice COHP** in the Löwdin picture, COHP_n(f,g) = 2 Re[c*_nf H_fg
c_ng] summed over the pairs of sublattice orbitals on different sublattices
(negative = bonding; below 0.05 eV in magnitude nonbonding), split by shell
pair in the tooltip. The connectors are the Löwdin populations distributed
over the frozen-ion parents of the same sublattice and irrep. Every parent
carries its **ledger**: bare d_f = ⟨φ|H|φ⟩ → Pauli shift (orthogonalization to
the occupied orbitals of the other sublattice) → closed-shell (filled–filled)
or empty–empty mixing → covalent shift (occupied–empty mixing) → crystal
level. The **covalency count** — electrons in formally empty shells per cell —
is a chip and a note per k point. The irrep labels are computed from the plane
waves of each run (`crystod.wavecar_irreps`): CrystOD's ISO-IR labels, the two
sublattice runs taken in the crystal's frame. The page has no hover sketch:
the overlaps carry no atomic-orbital coefficients.

### Reading the SrTiO3 ledgers of the overlap engine

On the SrTiO₃ (METAGGA = LAK) cache of the command page (the Key-results
excerpt at Γ and R), the conduction-band minimum Γ5+ (Ti 3d t₂g) and the
valence-band maximum R4+ (O 2p) are exactly nonbonding — COHP 0, and the parent
*is* the crystal level. The e_g–t₂g splitting at Γ, 2.22 eV, reads off the two
ledgers: Pauli 1.91 (the e_g orbitals, pointing at the oxygens, are pushed up
by +1.58 eV on orthogonalization to the O 2s/2p orbitals; t₂g by −0.33) plus
covalent 0.28 (the e_g σ* mixing; none for t₂g), with 0.04 from the bare d_f.
Of the splitting, then, only an eighth is covalent bonding.

### Minimal valence set of the overlap engine

The active space is a **minimal valence set**, as a COHP code uses a minimal
basis: diffuse higher shells (Pb 6d and 7s, Cs 6p, Ge 4d, Sr 5p) in a
symmetric Löwdin basis produce spurious populations and COHPs, so the default
rule leaves them out — change it with `--vasp-shells`, and test the
sensitivity with `auto-full`. The PAW data of every site come from the crystal
POTCAR. The effective outer levels depend on the bands above the frozen
window, i.e. on NBANDS. A multiplet cut by the top of the band list stays
unlabelled.

## What the crystal-orbital regression test asserts

Testsuite section 01-03 exercises the crystal `--diagram --pyscf` engine with a
deliberately small run, skipped when pyscf is not installed:
`--diagram --pyscf --onsite` on NaCl at X with `--kmesh 1 1 1
--ke-cutoff 80`, which needs a single crystal SCF and about a minute of
wall clock. It asserts the report (one SCF and no fragment SCF, the
`D+ S D = S` verification, the induced representations of every shell,
the Cl-3p valence band bonding with Na 3p, the written coupling table)
and two invariants of the embedded wave-function sketches, which would
otherwise need manual inspection: the drawn σ lobe phases along the Na–Cl
bonds must reproduce the bonding/antibonding letter that the engine
derives independently from the COOP overlap population, and the Na/Cl
ratio of the p-channel lobe sizes must equal the square root of the
ratio of the level's Löwdin populations — the per-(atom, l) lobe-size
calibration documented with the command in section 01-03 of `crystod`, whose
collapse the earlier extended-Hückel tests could not see. A `--conventional` rerun against the written `--chk` then
covers the conventional-cell display path with no second SCF.

## References for the extended-Hückel construction

M. Wolfsberg and L. Helmholz, J. Chem. Phys. 20, 837 (1952);
R. Hoffmann, J. Chem. Phys. 39, 1397 (1963).
