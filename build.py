"""Bundles src/ into build/tahoe.css (what the theme imports from GitHub Pages) and writes
build/Tahoe.local.theme.css, the theme file with the bundle inlined instead of imported, which
tools/reload.sh links into Vesktop while developing."""
import contextlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC, BUILD, THEME = ROOT / "src", ROOT / "build", ROOT / "theme" / "Tahoe.theme.css"
IMPORT = re.compile(r'^@import\s+"([^"]+)";\s*$', re.M)


def bundle() -> str:
    main = (SRC / "main.css").read_text()
    parts = [(SRC / name).read_text().rstrip() + "\n" for name in IMPORT.findall(main)]
    return "/* tahoe: built from src/ by build.py, do not edit */\n" + "\n".join(parts)


def main() -> None:
    # --exact: [class*=] selectors become the exact Discord classes (tools/classes/exact.py)
    # --stdout: print the bundle and write nothing, for tools/classes/benchmark.mjs
    args = sys.argv[1:]
    css = bundle()
    if "--exact" in args:
        sys.path.insert(0, str(ROOT / "tools" / "classes"))
        import exact
        with contextlib.redirect_stdout(sys.stderr if "--stdout" in args else sys.stdout):
            css = exact.rewrite(css, max_matches=int(args[args.index("--max") + 1]) if "--max" in args else exact.MAX)
    if "--stdout" in args:
        sys.stdout.write(css)
        return
    BUILD.mkdir(exist_ok=True)
    (BUILD / "tahoe.css").write_text(css)
    theme = THEME.read_text()
    local = re.sub(r"^@import url\([^)]*tahoe\.css[^)]*\);\s*$", lambda _: css, theme, count=1, flags=re.M)
    if local == theme:
        raise SystemExit("theme/Tahoe.theme.css has no @import of tahoe.css to inline")
    (BUILD / "Tahoe.local.theme.css").write_text(local)
    print(f"build/tahoe.css {len(css) // 1024} KB")


if __name__ == "__main__":
    main()
