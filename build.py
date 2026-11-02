"""Bundles src/ into build/tahoe.css (what the theme imports from GitHub Pages) and writes
build/Tahoe.local.theme.css, the theme file with the bundle inlined instead of imported, which
tools/reload.sh links into Vesktop while developing."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC, BUILD, THEME = ROOT / "src", ROOT / "build", ROOT / "theme" / "Tahoe.theme.css"
IMPORT = re.compile(r'^@import\s+"([^"]+)";\s*$', re.M)


def bundle() -> str:
    main = (SRC / "main.css").read_text()
    parts = [(SRC / name).read_text().rstrip() + "\n" for name in IMPORT.findall(main)]
    return "/* tahoe: built from src/ by build.py, do not edit */\n" + "\n".join(parts)


def main() -> None:
    BUILD.mkdir(exist_ok=True)
    css = bundle()
    (BUILD / "tahoe.css").write_text(css)
    theme = THEME.read_text()
    local = re.sub(r"^@import url\([^)]*tahoe\.css[^)]*\);\s*$", lambda _: css, theme, count=1, flags=re.M)
    if local == theme:
        raise SystemExit("theme/Tahoe.theme.css has no @import of tahoe.css to inline")
    (BUILD / "Tahoe.local.theme.css").write_text(local)
    print(f"build/tahoe.css {len(css) // 1024} KB")


if __name__ == "__main__":
    main()
