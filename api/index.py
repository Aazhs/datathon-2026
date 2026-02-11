import sys
from pathlib import Path

# Ensure the project root is on sys.path so `main` can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app  # noqa: E402
