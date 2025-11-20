#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." >/dev/null 2>&1 && pwd)"
VENV_DIR="${VENV_DIR:-$REPO_ROOT/.venv-plot-tools}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [ -d "$VENV_DIR" ] && [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "Virtual environment in $VENV_DIR is incomplete; recreating it"
  rm -rf -- "$VENV_DIR"
fi

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtual environment in $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

PIP_BIN="$VENV_DIR/bin/pip"
PYTHON="$VENV_DIR/bin/python"

echo "Ensuring Python dependencies (matplotlib, numpy) are installed"
"$PIP_BIN" install --upgrade pip >/dev/null
"$PIP_BIN" install --upgrade matplotlib numpy >/dev/null

echo "Running plot_prediction_vs_backup.py"
"$PYTHON" "$SCRIPT_DIR/plot_prediction_vs_backup.py" "$@"

echo "Running plot_prediction_solve_times.py"
"$PYTHON" "$SCRIPT_DIR/plot_prediction_solve_times.py" "$@"
