# Theoretical background

This page collects the group theory that CrystOD evaluates internally: the
representation matrices of the symmetry operations, the characters that reduce
them to irreducible representations, and the projection operator that turns an
irrep into an actual symmetry-adapted function. None of it has a command-line
flag — it is the shared basis of `crystod`, `crystod-group` and `crystod-mag`,
and it is what the output labels of those commands mean.

*Example directory: `example/01_wigner_d` (testsuite section 1)*

```{note}
This section is theoretical background, **not a command-line mode**: there is
no CLI flag for it. Everything described here is what CrystOD evaluates
internally every time one of the commands is executed; the machinery is exposed
through the Python API only (`crystod.operations.wigner_D_real`). No prior
familiarity with group theory is assumed.
```

## What is a representation matrix?

Take a symmetry operation of a crystal — say a 90-degree rotation about the z
axis, `C4z` (x -> y, y -> -x, z -> z). Apply it to the three p orbitals, which
have the same shapes as the functions x, y, z:

- p_x -> p_y, p_y -> -p_x, p_z -> p_z.

Each orbital turns into a *linear combination* of the orbitals of the same
shell. Collecting the coefficients into a matrix gives the **representation
matrix** `D(R)` of the operation on that shell. For p orbitals it is simply the
3x3 rotation matrix itself:

```
D^(1)(C4z) =  [ 0 -1  0 ]      (basis order: x, y, z)
              [ 1  0  0 ]
              [ 0  0  1 ]
```

For d orbitals the same idea gives a 5x5 matrix. Under `C4z`:
xy -> -xy, yz -> -xz, z^2 -> z^2, xz -> yz, x^2-y^2 -> -(x^2-y^2), so

```
D^(2)(C4z) =  [-1  0  0  0  0 ]      (basis order: xy, yz, z^2, xz, x^2-y^2)
              [ 0  0  0 -1  0 ]
              [ 0  0  1  0  0 ]
              [ 0  1  0  0  0 ]
              [ 0  0  0  0 -1 ]
```

These matrices for the orbital shells (any `l`) are the **Wigner D matrices**
on real spherical harmonics. `crystod.operations.wigner_D_real(l, R)` returns
them for an arbitrary O(3) operation `R` (rotation, rotoinversion, or mirror):

```python
import numpy as np
from crystod.operations import wigner_D_real

c4z = np.array([[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]])

wigner_D_real(1, c4z)           # l = 1 (p): equals the 3x3 rotation matrix itself
wigner_D_real(2, c4z)           # l = 2 (d): the 5x5 matrix above
np.trace(wigner_D_real(2, c4z)) # character of C4z on the d shell: -1
wigner_D_real(3, -np.eye(3))    # inversion: (-1)^l x identity (parity), here -1 x 1(7)
```

Key properties (verified in testsuite section 1):

- for proper rotations at `l` = 1 the matrix equals `R` itself;
- inversion is represented by `(-1)^l` times the identity — even shells
  (s, d, ...) are unchanged, odd shells (p, f, ...) flip sign (the *parity* of
  the orbital);
- the map is a group homomorphism, `D(AB) = D(A) D(B)` — performing two
  operations in sequence is the same as multiplying their matrices;
- all matrices are orthogonal, `D D^T = 1`.

## How CrystOD computes D for any l

Rotation matrices act directly on (x, y, z), so `l` = 1 is trivial — but how do
we get the 5x5, 7x7, ... matrices for d, f, ... shells without working out every
monomial by hand? CrystOD follows the classic quantum-mechanics route
(prototyped in `matsym/wigner_d.ipynb` by Hiroki Koiso):

1. **Split off the inversion.** Any O(3) operation is a proper rotation times
   (possibly) the inversion: `R = det(R) x R_proper`. Work with the proper
   rotation `R_proper = det(R) R` first.
2. **Convert the rotation to Euler angles** (alpha, beta, gamma) in the ZYZ
   convention.
3. **Evaluate Wigner's formula** for the complex D matrix `D^(l)(alpha, beta,
   gamma)` — the standard result for how the complex spherical harmonics
   `Y_l^m` (m = -l..l) transform under rotations. This works for *any* l.
4. **Change basis from complex to real orbitals.** The real orbitals are fixed
   linear combinations of `Y_l^m` (e.g. `p_x = (Y_1^-1 - Y_1^1)/sqrt(2)`), so a
   unitary matrix `C` converts the complex D matrix to the real-orbital one:
   `D_real = C D_complex C^-1`.
5. **Restore the parity.** If the original operation was improper
   (`det(R) = -1`), multiply by the inversion eigenvalue `(-1)^l`.

The production implementation in `crystod/operations.py` performs these steps
in pure NumPy (no symbolic algebra), with the orbital ordering
p: (x, y, z) / d: (xy, yz, z^2, xz, x^2-y^2) / f: (7 components).

## From matrices to irreps: characters and the reduction formula

The trace of a representation matrix, `chi(R) = tr D(R)`, is called the
**character** of the operation. Characters are the workhorse of applied group
theory because they do not depend on the basis choice, and because tabulated
**character tables** list the characters `chi_Gamma(R)` of each *irreducible
representation* (irrep) Gamma — the elementary building blocks into which any
representation decomposes. The number of times an irrep appears is given by the
reduction formula

```
n_Gamma = (1/|G|) * sum_g  chi_Gamma(g)* chi(g),
```

an average over all `|G|` operations of the group. This is exactly how the
ligand-field splitting of `crystod-group --ligand-field` (section 9) works:
the characters of the d shell in the
m-3m field, `chi(g) = tr D^(2)(g)`, reduce to `Eg + T2g` — the familiar
two-below-three splitting of d orbitals in an octahedral crystal field.

In a crystal, a space-group operation `g = {R | t}` does two things to an
atomic orbital: it moves the atom to a symmetry-equivalent site, and it mixes
the orbital components on that site with `D^(l)(R)`. The character of the
crystal-orbital representation at a k point is therefore the trace of
`D^(l)(R)` summed over the atoms that `g` maps onto themselves (modulo a
lattice translation), weighted by the Bloch phase `exp(-ik.t)` of that
translation. Reducing these characters against the little-group irrep table
gives the irrep content printed by the SALC analysis and the crystal-orbital
diagrams of `crystod` (sections 2-3).

## From irreps to basis functions: the projection operator

Knowing *how many times* an irrep appears is half the story; the other half is
*what the symmetry-adapted functions look like*. They are extracted with the
**projection operator**

```
P^(Gamma) = (d_Gamma/|G|) * sum_g  chi_Gamma(g)* O(g),
```

where `O(g)` is the representation matrix of `g` on some convenient trial basis
and `d_Gamma` is the irrep dimension. Applied to a trial function, `P^(Gamma)`
kills every component except the part transforming as Gamma.

The workflow — prototyped in `matsym/get_basis_functions.ipynb` by Hiroki
Koiso — is the engine of `crystod-group --basis` / `--generate-basis`
(sections 10-11 of `crystod-group`):

1. get the symmetry operations from **spglib** and the irreps from **spgrep**;
2. build the representation matrices `O(g)` of the trial basis — for the linear
   monomials (x, y, z) these are the rotation matrices themselves; for the
   quadratic monomials (x^2, y^2, z^2, xy, yz, zx) a 6x6 matrix follows from
   substituting the rotated coordinates into each monomial, and so on;
3. project with `P^(Gamma)` (spgrep's `project_to_irrep`) and read off the
   symmetry-adapted polynomials — e.g. in m-3m the quadratic monomials separate
   into `x^2+y^2+z^2` (A1g), `(2z^2-x^2-y^2, x^2-y^2)` (Eg), and
   `(xy, yz, zx)` (T2g).

It is worth *looking* at the matrices of step 2 before projecting. The two
galleries below (regenerated from the notebook by
`doc/make_rep_matrix_figures.py`) show `O(g)` for **all 48 operations** of the
Pm-3m point group of ScF3 at the Gamma point — one small panel per operation,
with red = +1, blue = -1, white = 0.

```{figure} images/rep_matrices_linear.png
:name: fig-rep-linear
:width: 85%

The 48 representation matrices on the linear basis (x, y, z) — i.e. the 3x3
rotation matrices themselves. Red = +1, blue = -1, white = 0.
```

Two things are immediately visible. First, every panel has exactly one colored
cell per row and per column: for a high-symmetry (cubic) group the operations
do nothing more exotic than **permute the basis functions and flip signs** —
these are *signed permutation matrices* (the first panel, the identity, is the
plain red diagonal). Second, no single monomial stays put in every panel, which
is the visual way of saying that x, y, z individually are *not*
symmetry-adapted: they mix, and only the projection operator can disentangle
the combinations that transform cleanly.

```{figure} images/rep_matrices_quadratic.png
:name: fig-rep-quadratic
:width: 85%

The same 48 operations on the quadratic basis (x^2, y^2, z^2, xy, yz, zx) —
now 6x6 signed permutation matrices.
```

The quadratic gallery shows one more feature: a **block structure**. The
upper-left 3x3 block (x^2, y^2, z^2) and the lower-right 3x3 block
(xy, yz, zx) never mix — a rotation can turn x^2 into y^2, or xy into -yz, but
never a square into a product. Note also that the squares block is *always
red*: a square can never acquire a minus sign, which is why the totally
symmetric average `x^2+y^2+z^2` (A1g) survives. The projection operator is
nothing but a weighted average of these 48 panels — multiply each panel by the
irrep character `chi_Gamma(g)*` and sum — and the block structure you see here
is exactly what reappears in the result: the squares block yields
`A1g + Eg`, the products block yields `T2g`, reproducing step 3 above (and the
`crystod-group --generate-basis --order 2` output of section 11 of
`crystod-group`).

The SALCs of the main `crystod` command and of its SALC viewer (section 5 of
`crystod`) come from the *same* projection with
the trial basis replaced by the atomic orbitals on all symmetry-equivalent
sites — `O(g)` then combines the site permutation, the Bloch phases, and
`D^(l)(R)` from section 1.2 above. And replacing `D^(1)(R) = R` by the
axial-vector
representation `det(R) R` (magnetic moments do not flip under inversion) turns
the same machinery into the spin-multipole bases of `crystod-mag` (section 28).

*Further reading:* B. Souvignier, "Representations of crystallographic groups"
([MaThCryst summer school notes, Nancy 2010](https://www.crystallography.fr/mathcryst/pdf/nancy2010/Souvignier_irrep_slides.pdf));
the spgrep documentation, e.g. the
[symmetry-adapted tensor example](https://spglib.github.io/spgrep/examples/symmetry_adapted_tensor.html).
Run `python demo_wigner_d.py` in `example/01_wigner_d` for a printed walk-through.

## Multi-electron terms: symmetrized products and the Pauli principle

### Coulomb multiplet energies: Gaunt coefficients, Racah parameters and configuration interaction

The two-electron integrals behind the multiplet energies of
`crystod-group --multiplet --orbital` (section 14 of the `crystod-group`
page) are built from exact Gaunt coefficients (F^0 = A + 7C/5,
F^2 = 49B + 7C, F^4 = 63C/5), the Coulomb Hamiltonian over the Slater
determinants of the configuration, and each term is isolated by S^2 and
point-group projectors; doubly-occurring terms mix (configuration
interaction) and their two energies are printed in closed form
(e.g. 3A - 3B + 3C +- 3sqrt(2)B in (t2g)^2(eg)^1). Every run is closed by
the trace identity sum (2S+1) dim E = tr(H_ee); the free-ion limit is
reproduced exactly ((T1u)^2 with --orbital p gives ^3P = F0 - 5F2,
^1D = F0 + F2, ^1S = F0 + 10F2).

### The Pauli principle in multi-electron terms: antisymmetrized squares and CI matrices

Of the plain direct product T2g x T2g = A1g + Eg + T1g + T2g (as printed by
`crystod-group --product`, section 7 of the `crystod-group` page), the Pauli
principle pairs only the antisymmetric square (T1g) with the spin
triplet — `crystod-group --multiplet` performs this antisymmetrization
exactly, for any filling of any shell (hole equivalence and closed shells come out
automatically: (t2g)^4 gives the (t2g)^2 terms, (t2g)^6 gives ^1A1g).
Validated against the standard crystal-field term tables (t2g^n, eg^n,
t2g^2 eg^1 in Oh; e^2 in Td and C3v).

For two-shell configurations, the doubly-occurring terms (the CI pairs) are additionally printed as their **CI matrix in the coupled-parent basis** |shell1(S1 Gamma1) shell2(S2 Gamma2)> — the representation used by the Tanabe-Sugano/Griffith strong-field tables — e.g. for (t2g)^2(eg)^1: the ^2Eg block is <t2g^2(^1A1g)eg|H|...> = 3A + 8B + 6C, <t2g^2(^1Eg)eg|H|...> = 3A - B + 3C, off-diagonal ±10B, whose eigenvalues are exactly the printed 3A + (7/2)B + (9/2)C ± (1/2)√(481B² + 54BC + 9C²) (the off-diagonal sign is a basis convention; books may differ).
