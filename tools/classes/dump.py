"""Discord's class dump (itmesarah/DiscordClasses: every hashed class of every CSS module), cached
in .cache/, and the class stems src/*.css targets. Shared by check.py and build.py --exact."""
import json, os, pathlib, re, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC, CACHE = ROOT / "src", ROOT / ".cache"
SOURCES = {
    "stable": "https://raw.githubusercontent.com/itmesarah/DiscordClasses/main/stableclasses.json",
    "canary": "https://raw.githubusercontent.com/itmesarah/DiscordClasses/main/canaryclasses.json",
}
TTL = 6 * 3600

# [class*="stem"] in any quoting; a flag (i, s) changes the matching, so those are left alone
ATTR = re.compile(r"""\[\s*class\s*\*=\s*(?:"([^"\\]*)"|'([^'\\]*)'|([\w-]+))\s*\]""")
# a hashed class used as is: readable name, underscore(s), 5-6 hex chars
EXACT = re.compile(r"\.(-?[A-Za-z_][\w-]*?_[0-9a-f]{5,6})(?![\w-])")
COMMENT = re.compile(r"/\*.*?\*/", re.S)


def load(channel: str = "stable", refresh: bool = False) -> tuple[set[str], str]:
    """All classes of the dump and its build label. Falls back to a stale cache when offline."""
    path = CACHE / f"{channel}classes.json"
    fresh = path.exists() and time.time() - path.stat().st_mtime < TTL
    if refresh or not fresh:
        try:
            with urllib.request.urlopen(SOURCES[channel], timeout=30) as r:
                raw = r.read()
            json.loads(raw)
            CACHE.mkdir(exist_ok=True)
            # other agents build concurrently, so the cache is replaced atomically
            tmp = path.with_suffix(f".{os.getpid()}.tmp")
            tmp.write_bytes(raw)
            tmp.replace(path)
        except OSError as e:
            if not path.exists():
                raise SystemExit(f"cannot download the {channel} class dump: {e}")
            print(f"warning: using the stale cached {channel} dump ({e})", file=sys.stderr)
    data = json.loads(path.read_text())
    classes = set()
    for module in data.values():
        if isinstance(module, dict):
            # composed values like "dot_abc dotNormal_abc" hold several real classes
            for value in module.values():
                if isinstance(value, str):
                    classes.update(value.split())
    label = " ".join(f"{k} {v}" for k, v in (data.get("channel") or {}).items())
    return classes, label


def stem_of(m: re.Match) -> str:
    return next(g for g in m.groups() if g is not None)


def is_module_stem(stem: str) -> bool:
    """Whether a stem names hashed module classes, which the dump covers. Kebab-case and plain
    lowercase stems (custom-theme, vc-card, hljs, layer) can also hit unhashed classes outside it."""
    return "-" not in stem and "/" not in stem and ("_" in stem or stem != stem.lower())


def matching(stem: str, classes: set[str]) -> list[str]:
    """Exactly what [class*=stem] can match, since no class contains whitespace."""
    return sorted(c for c in classes if stem in c)


def usages() -> list[tuple[str, str, str, int]]:
    """(kind, stem, file, line) for every [class*=] stem and exact hashed class in src/*.css."""
    out = []
    for f in sorted(SRC.glob("*.css")):
        # comments are blanked but keep their newlines, so line numbers stay right
        text = COMMENT.sub(lambda c: re.sub(r"[^\n]", " ", c.group()), f.read_text())
        for n, line in enumerate(text.split("\n"), 1):
            out += [("attr", stem_of(m), f.name, n) for m in ATTR.finditer(line)]
            out += [("exact", m.group(1), f.name, n) for m in EXACT.finditer(line)]
    return out
