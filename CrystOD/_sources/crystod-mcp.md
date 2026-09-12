# MCP server (crystod-mcp)

The CrystOD analyses as tools for an AI assistant. `crystod-mcp` is a
[Model Context Protocol](https://modelcontextprotocol.io/) server, shipped as
a separate package in the `crystod-mcp/` directory of the repository, that
lets Claude Desktop, Claude Code, or any MCP client call CrystOD directly:
ask "which space groups can the R-point instability of SrTiO3 condense into?"
and the assistant runs `crystod_isotropy_subgroups` (or the full phonon
workflow) and answers with the table.

| I want to ... | tool |
|---|---|
| list the isotropy subgroups of an irrep | `crystod_isotropy_subgroups` |
| decompose a product of irreps | `crystod_irrep_product` |
| reduce a representation from its characters | `crystod_decompose_representation` |
| see how an orbital shell splits in a ligand field | `crystod_ligand_field` |
| read a character table (point group, or little group of k) | `crystod_character_table` |
| label the phonon modes with irreps | `crystod_phonon_irreps` |
| find the subgroups the imaginary modes lead to | `crystod_imaginary_mode_subgroups` |
| get the irreps of the crystal orbitals of an element | `crystod_crystal_orbital_irreps` |
| list the special k points of a space group | `crystod_special_kpoints` |
| get the point group and SALCs of a molecule | `crystod_molecular_symmetry` |

Every tool takes text and returns Markdown, so nothing needs to be on the
assistant's disk: space groups as symbols or numbers, irreps in ISO-IR
notation (`R4+`, `GM5-`), crystal structures as the full text of a POSCAR,
molecules as the full text of an XYZ file, phonon forces as the full text of
a phonopy `FORCE_SETS`. The text of a structure is written to a temporary
directory for the duration of one call and removed afterwards.

## Installation

crystod-mcp is a separate package so that CrystOD itself carries no MCP
dependency. From a checkout of the repository:

```bash
pip install ./crystod-mcp
```

This installs CrystOD (>= 0.4.0) and the MCP Python SDK (2.x) as
dependencies; Python 3.10 or later. Publication on PyPI as `crystod-mcp` is
planned, after which `pip install crystod-mcp` and the `uvx` form below work
without a checkout. `crystod-mcp --version` checks the installation; the
server itself is started by the MCP client over standard input/output, not
by hand.

## Client configuration

Claude Desktop reads `claude_desktop_config.json` (macOS:
`~/Library/Application Support/Claude/claude_desktop_config.json`; Windows:
`%APPDATA%\Claude\claude_desktop_config.json`). `python` must be the
interpreter in which crystod-mcp is installed -- give its full path when it
lives in a conda environment or a venv:

```json
{
  "mcpServers": {
    "crystod": {
      "command": "python",
      "args": ["-m", "crystod_mcp"],
      "env": {
        "CRYSTOD_MCP_TIMEOUT": "60"
      }
    }
  }
}
```

Claude Code registers the server from the command line:

```bash
claude mcp add crystod -- crystod-mcp
```

(or `claude mcp add crystod -- /path/to/env/bin/python -m crystod_mcp` to
name the interpreter). With `uv` installed, once the package is on PyPI:

```json
{
  "mcpServers": {
    "crystod": {
      "command": "uvx",
      "args": ["crystod-mcp"]
    }
  }
}
```

`crystod-mcp/mcp_config.json` holds both forms.

## The tools

| Tool | Command it wraps | Inputs |
|---|---|---|
| `crystod_isotropy_subgroups` | [`crystod-group --supergroup`](crystod-group.md) | `parent` (`Pm-3m` or `221`), `irrep` (`R4+`; two labels for a coupled order parameter), `order_parameter` (optional, `"0 0 a"`) |
| `crystod_irrep_product` | [`crystod-group --product`](crystod-group.md) | `space_group` (a point-group symbol such as `m-3m` selects the point-group product), `irreps` (list) |
| `crystod_decompose_representation` | [`crystod-group --decompose`](crystod-group.md) | `point_group`, `characters` (one per class, E first) |
| `crystod_ligand_field` | [`crystod-group --ligand-field`](crystod-group.md) | `point_group`, `orbital` (`s`/`p`/`d`/`f`) |
| `crystod_character_table` | [`crystod-group --table`](crystod-group.md) | `group` (point group, or space group), `kpoint` (optional label or coordinates; Gamma by default for a space group) |
| `crystod_phonon_irreps` | [`crystod-phonon --irreps`](crystod-phonon.md) | `poscar`, `dim` (`[4, 4, 4]`), `force_sets`, `qpoint` (optional; every special point otherwise) |
| `crystod_imaginary_mode_subgroups` | [`crystod-phonon --subgroup`](crystod-phonon.md) | `poscar`, `dim`, `force_sets`, `threshold` (THz, default -0.1) |
| `crystod_crystal_orbital_irreps` | [`crystod`](crystod.md) | `poscar`, `element`, `orbital`, `kpoint` (optional) |
| `crystod_special_kpoints` | [`crystod-bz --show-kpoint`](crystod-bz.md) | `space_group` or `poscar` |
| `crystod_molecular_symmetry` | [`crystod-mol`](crystod-mol.md) | `xyz`, `element` and `orbital` (optional, together) |

The tools are built on the [Python API](python-api.md)
(`crystod.group.isotropy_subgroups`, `crystod.phonon.label_phonon_modes`,
`crystod.phonon.scan_imaginary_modes`, `crystod.bz.get_special_kpoints`, ...);
the three whose printed report is the natural answer (`crystod`, the
little-group character table and `crystod-mol`) return the report of the
command itself. `crystod_isotropy_subgroups` always returns the whole table:
the API has no maximum-index cut-off (there is no `max_index` argument).

A tool call with a bad input returns one sentence naming the problem and the
remedy -- the tabulated irreps of the space group, the class order of the
character table, the special k points of the space group -- instead of a
traceback, so the assistant can correct itself and call again. For example
`crystod_isotropy_subgroups("Pm-3m", "R9+")` answers

```
irrep "R9+" is not tabulated for space group Pm-3m (No. 221). Available irreps:
GM1+, GM2+, GM3+, GM4+, GM5+, GM1-, ..., M5-
```

### Example

`crystod_isotropy_subgroups("Pm-3m", "R4+")` returns

```
## Isotropy subgroups of R4+ in Pm-3m (No. 221)

| Direction | Subgroup | No. | Size | Index | Free parameters |
|---|---|---|---|---|---|
| (0,0,a) | I4/mcm | 140 | 2 | 6 | 1 |
| (a,a,a) | R-3c | 167 | 2 | 8 | 1 |
| (0,a,a) | Imma | 74 | 2 | 12 | 1 |
| (0,a,b) | C2/m | 12 | 2 | 24 | 2 |
| (a,a,b) | C2/c | 15 | 2 | 24 | 2 |
| (a,b,c) | P-1 | 2 | 2 | 48 | 3 |

6 isotropy subgroup(s). Size: primitive-cell multiplication relative to the
parent; index: index of the subgroup in the parent; free parameters:
independent order-parameter components (1 = a single amplitude fixes the
structure).

Irrep labels follow ISO-IR (H. T. Stokes, B. J. Campbell and R. Cordes,
Acta Cryst. A69, 388 (2013), https://iso.byu.edu). CrystOD: H. Koiso and
Y. Mochizuki et al., Phys. Rev. B 110, 064104 (2024).
```

-- the same six subgroups as [`crystod-group --supergroup Pm-3m --irrep R4+`](crystod-group.md)
and the [Python API](python-api.md), with the citation footer every result
carries.

## Citation

The irrep labels come from the ISO-IR tables of the ISOTROPY Software Suite
that CrystOD bundles, and the analyses are CrystOD's, so every tool result
ends with the two citations (ISO-IR: H. T. Stokes, B. J. Campbell and
R. Cordes, Acta Cryst. A69, 388 (2013); CrystOD: H. Koiso and Y. Mochizuki
et al., Phys. Rev. B 110, 064104 (2024)). Please keep both when results
obtained through the server are published; see [Citation](citation.md).
The server returns computed results (labels, decompositions, subgroups),
never the tables themselves.

## Time limits and resources

Every call runs under a time limit of 60 s by default; the
`CRYSTOD_MCP_TIMEOUT` environment variable of the server process (seconds,
set in the client configuration as above) raises or lowers it, and a call
that exceeds it returns an error naming the limit and the variable instead of
hanging the client. The limit bounds the wait, not the computation: the tools that return a CrystOD report run it in a subprocess that is killed at the limit, while the group-theory, k-point, molecular and phonon tools run in a worker thread that finishes in the background after the error has been returned (retrying a long scan with a larger limit while the first one is still running costs a second scan). The group-theory, k-point and molecular tools answer in
well under a second. The phonon tools rebuild the force constants from
`FORCE_SETS` with phonopy -- a few seconds for the 4x4x4 SrTiO3 example, more
for large supercells -- and `crystod_imaginary_mode_subgroups` scans every q
point the supercell resolves. The server runs one calculation per call in a
worker thread (a subprocess for the tools that return a CrystOD report),
needs no network access and keeps no state between calls.

## Tests

```bash
pip install -e "./crystod-mcp[test]"
python -m pytest -q crystod-mcp/tests
```

The tests call every tool on the inputs bundled with CrystOD
(`crystod.examples`: ScF3, SrTiO3 with its 4x4x4 `FORCE_SETS`, CH4, NH3),
check the results the CrystOD testsuite expects (Pm-3m R4+ -> I4/mcm, R-3c,
Imma, C2/m, C2/c, P-1; the imaginary R5- mode of SrTiO3 at -1.09 THz; Sc 3d
of ScF3 -> GM3+ + GM5+ at Gamma; CH4 -> Td with A1 + T2 for the H 1s SALCs),
confirm the citation footer on every result and the one-sentence errors, and
connect to the server in-process and over stdio to list the ten tools and
make a call.

## License

MIT, as CrystOD. The MCP Python SDK the server is built on is MIT licensed
(Copyright (c) 2024 Anthropic, PBC); its notice is reproduced in
`crystod-mcp/LICENSE`.
