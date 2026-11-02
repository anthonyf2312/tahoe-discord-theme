"""Rewrites [class*="stem"] in a built bundle into the exact Discord classes that contain the stem,
which is precisely what *= matches, e.g. :is(.listItem__650eb,.listItem_abc123). Classes let the
engine bucket rules and reject ancestors early; a substring test on every class attribute does not.
Used by build.py --exact; src/ keeps the readable attribute selectors."""
import itertools, json, math, re

import dump

MAX = 40  # a stem with more classes than this stays an attribute selector
# Stems outside :is()/:not()/:has() are split into a selector list instead of :is() when that
# yields at most this many selectors: a rule whose subject is a plain class gets bucketed.
EXPAND = 6
LEAD = re.compile(r"(?:\s|/\*.*?\*/)*", re.S)


def ident(name: str) -> str:
    out = re.sub(r"[^\w-]", lambda m: "\\" + m.group(), name)
    return re.sub(r"^(-?)(\d)", lambda m: f"{m.group(1)}\\3{m.group(2)} ", out)


def preludes(css: str):
    """(start, end) of every rule prelude, i.e. the text before a "{" outside strings, comments
    and parentheses (url(data:...;...) holds semicolons)."""
    i, n, start, depth = 0, len(css), 0, 0
    while i < n:
        c = css[i]
        if css.startswith("/*", i):
            j = css.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "\"'":
            i = string_end(css, i)
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth = max(0, depth - 1)
        elif depth == 0 and c in "{};":
            if c == "{":
                yield start, i
            start = i + 1
        i += 1


def string_end(s: str, i: int) -> int:
    q, i = s[i], i + 1
    while i < len(s) and s[i] != q:
        i += 2 if s[i] == "\\" else 1
    return i + 1


def split_list(sel: str) -> list[str]:
    """Top-level comma-separated parts of a selector list."""
    parts, depth, last, i = [], 0, 0, 0
    while i < len(sel):
        c = sel[i]
        if c in "\"'":
            i = string_end(sel, i)
            continue
        if c in "([":
            depth += 1
        elif c in ")]":
            depth -= 1
        if c == "," and depth == 0:
            parts.append(sel[last:i])
            last = i + 1
        i += 1
    return parts + [sel[last:]]


def attrs(sel: str):
    """(start, end, stem, nested) of each [class*=] in a complex selector; nested means inside
    :is(), :not(), :has() and the like."""
    i, depth = 0, 0
    while i < len(sel):
        c = sel[i]
        if c == "[":
            m = dump.ATTR.match(sel, i)
            if m:
                yield m.start(), m.end(), dump.stem_of(m), depth > 0
                i = m.end()
                continue
            while i < len(sel) and sel[i] != "]":
                i = string_end(sel, i) if sel[i] in "\"'" else i + 1
        elif c in "\"'":
            i = string_end(sel, i)
            continue
        elif c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        i += 1


class Rewriter:
    def __init__(self, classes: set[str], max_matches: int = MAX, expand: int = EXPAND):
        self.classes, self.max, self.expand = classes, max_matches, expand
        self.memo, self.done, self.kept = {}, 0, {}

    def lookup(self, stem: str):
        """(classes, None) when the stem translates, else (None, why not)."""
        if stem not in self.memo:
            hits = dump.matching(stem, self.classes) if dump.is_module_stem(stem) else []
            reason = ("not a hashed stem" if not dump.is_module_stem(stem) else "no match" if not hits
                      else f"{len(hits)} matches" if len(hits) > self.max else None)
            self.memo[stem] = (None, reason) if reason else (hits, None)
        return self.memo[stem]

    def complex(self, sel: str) -> list[str]:
        """One complex selector rewritten, possibly as several equivalent selectors."""
        found = []
        for start, end, stem, nested in attrs(sel):
            hits, reason = self.lookup(stem)
            if hits is None:
                self.kept.setdefault(stem, [reason, 0])[1] += 1
            else:
                self.done += 1
                found.append((start, end, ["." + ident(h) for h in hits], nested))
        if not found:
            return [sel]
        split = math.prod(len(f[2]) for f in found if not f[3]) <= self.expand
        choices = [h if split and not nested else [h[0] if len(h) == 1 else ":is(" + ",".join(h) + ")"]
                   for _, _, h, nested in found]
        out = []
        for pick in itertools.product(*choices):
            s, last = [], 0
            for (start, end, _, _), rep in zip(found, pick):
                s += [sel[last:start], rep]
                last = end
            out.append("".join(s) + sel[last:])
        return out

    def prelude(self, p: str) -> str:
        lead = LEAD.match(p).end()
        body = dump.COMMENT.sub("", p[lead:])
        if p[lead:].startswith("@") or "class" not in body:
            return p
        sels = [s for part in split_list(body) for s in self.complex(part.strip())]
        return p[:lead] + ",\n".join(sels) + body[len(body.rstrip()):]

    def css(self, css: str) -> str:
        out, last = [], 0
        for start, end in preludes(css):
            out += [css[last:start], self.prelude(css[start:end])]
            last = end
        return "".join(out) + css[last:]


def rewrite(css: str, max_matches: int = MAX, expand: int = EXPAND, channel: str = "stable") -> str:
    classes, label = dump.load(channel)
    rw = Rewriter(classes, max_matches, expand)
    out = rw.css(css)
    # the stem -> classes map lets tools/classes/benchmark.mjs check the translation on the live DOM
    used = {s: hits for s, (hits, _) in rw.memo.items() if hits is not None}
    dump.CACHE.mkdir(exist_ok=True)
    (dump.CACHE / "exact-map.json").write_text(json.dumps({"dump": label, "stems": used}, indent=1))
    kept = sum(n for _, n in rw.kept.values())
    print(f"exact: Discord {label}, {rw.done} class selectors translated, {kept} kept as [class*=]")
    order = lambda kv: (kv[1][0][0].isdigit(), -int(kv[1][0].split()[0]) if kv[1][0][0].isdigit() else 0, kv[0].lower())
    for stem, (reason, n) in sorted(rw.kept.items(), key=order):
        print(f"  kept {stem!r} x{n}: {reason}")
    return out
