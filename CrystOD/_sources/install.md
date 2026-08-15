# Installation

## Requirements

- Python 3.9 or later
- Main Python dependencies (installed automatically):
  `phonopy`, `spglib`, `spgrep`, `ase`, `seekpath`, `pymatgen`, `pyscf`,
  `numpy`, `scipy`, `sympy`, `pandas`, `matplotlib`

## From PyPI

```bash
pip install CrystOD
```

This installs the seven commands and their dependencies. Clone the repository
as below if you also want the worked examples and the test suite.

## Recommended setup for following this manual (conda + git clone)

```bash
conda create -n crystod python=3.11
conda activate crystod

git clone https://github.com/ahntaeyoung1212/CrystOD.git
cd CrystOD
pip install -e .
```

The editable install (`-e`) keeps the commands pointing at the cloned source
tree, so `git pull` is enough to update, and the `example/` directories and
`testsuite.py` used throughout this documentation are right there.

## Operation check

Run the full test suite in the repository root (inside the `crystod` environment):

```bash
python3 testsuite.py           # run everything (35 sections)
python3 testsuite.py 13 16     # run selected sections only
```

Every section number corresponds to one documented feature and one
`example/<N>_*` directory; see {doc}`quickstart`.
