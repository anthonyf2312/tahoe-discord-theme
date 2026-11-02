"""Checks the Discord classes src/*.css targets against Discord's current class dump: stems that
match no class any more (dead after a Discord update) and stems that match so many classes the
selector is broader than it looks. Exits 1 on dead stems.

    python3 tools/classes/check.py             # against Stable, dump cached for 6 h in .cache/
    python3 tools/classes/check.py --canary    # against Canary, to see what is coming
    python3 tools/classes/check.py --refresh   # download the dump again
    python3 tools/classes/check.py --json      # machine-readable
    python3 tools/classes/check.py --broad 40  # how many matches count as broad (default 50)"""
import collections, json, sys

import dump


def main() -> None:
    args = sys.argv[1:]
    broad = int(args[args.index("--broad") + 1]) if "--broad" in args else 50
    classes, label = dump.load("canary" if "--canary" in args else "stable", "--refresh" in args)

    where = collections.defaultdict(list)
    for kind, stem, file, line in dump.usages():
        where[(kind, stem)].append(f"{file}:{line}")
    dead, unhashed, wide = [], [], []
    for (kind, stem), places in sorted(where.items(), key=lambda kv: kv[0][1].lower()):
        hits = [stem] if stem in classes else [] if kind == "exact" else dump.matching(stem, classes)
        entry = {"stem": stem, "kind": kind, "matches": len(hits), "uses": len(places), "where": places}
        if not hits:
            (dead if kind == "exact" or dump.is_module_stem(stem) else unhashed).append(entry)
        elif len(hits) > broad:
            wide.append(entry)
    wide.sort(key=lambda e: -e["matches"])

    if "--json" in args:
        print(json.dumps({"dump": label, "classes": len(classes), "stems": len(where),
                          "dead": dead, "broad": wide, "unhashed": unhashed}, indent=2))
    else:
        show = lambda e: f"{e['stem']!r} ({e['uses']}x: {', '.join(e['where'][:4])}{', ...' if e['uses'] > 4 else ''})"
        print(f"{len(where)} stems checked against {len(classes)} classes of Discord {label}")
        print(f"\ndead, match nothing ({len(dead)}):")
        print("\n".join("  " + show(e) for e in dead) or "  none")
        print(f"\nbroad, match more than {broad} classes ({len(wide)}):")
        print("\n".join(f"  {e['matches']:4}  " + show(e) for e in wide) or "  none")
        print(f"\nnot in the dump, unhashed or from Vencord, not checked ({len(unhashed)}):")
        print("  " + ", ".join(repr(e["stem"]) for e in unhashed) if unhashed else "  none")
    sys.exit(1 if dead else 0)


if __name__ == "__main__":
    main()
