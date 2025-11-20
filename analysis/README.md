# Time Spent Comparison

This utility compares the `timeSpent` values stored in `development-tools/backup.0.json` and `development-tools/backup.1.json` for matching, completed games and produces a scatter plot with a quadratic best-fit curve.

## Prerequisites

- Python 3.11+
- [virtualenv](https://docs.python.org/3/library/venv.html) support

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r analysis/requirements.txt
python time_spent_comparison.py
```

The script outputs a plot at `time_spent_comparison.png`.

## Optional

Matplotlib may warn about caching if it cannot access your default config directory. Point `MPLCONFIGDIR` at a writable location before running the script to suppress the warning:

```bash
export MPLCONFIGDIR="$PWD/.mpl-cache"
```
