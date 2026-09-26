#!/usr/bin/env python3
"""
validate_state.py - deterministic completion gate for a feature.

The skill's strongest invariant is "the Verifier is always-on, never prompted;
Execute is not done until validation.md reports PASS." That is prose the model
must remember. This turns it into a checkable pass/fail the closing step runs
automatically, so declaring a feature done without a real Verifier report fails
loudly instead of slipping through.

It does NOT merely check that validation.md exists - a report that exists but is
empty, still holds the template placeholder, or has no evidence would pass a
shallow existence check while proving nothing. This gate requires a real,
filled verdict plus at least one file:line evidence citation.

Operates on explicit feature artifact directories (stack- and tool-agnostic). No
fixed project storage directory is assumed. Run from the project root or pass
--root when autodetecting.

Usage:
  python .kiro/scripts/validate_state.py [feature]
  python .kiro/scripts/validate_state.py [feature-dir]

  Invoke from the project root or pass --root when autodetecting.

Exit codes: 0 ok, 1 a completed feature is missing a real PASS report,
            2 usage error.
"""

import argparse
import os
import re
import sys

# A file:line citation: a path with an extension, then :<line>. e.g. src/a.ts:42
EVIDENCE_RE = re.compile(r"[\w./-]+\.[A-Za-z0-9]+:\d+")


def _feature_dirs(root):
    """Find explicit feature artifact directories without assuming a storage folder."""
    dirs = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in {".git", "node_modules", "references", "scripts"}]
        if "validation.md" in filenames or "tasks.md" in filenames:
            dirs.append(dirpath)
    return root, sorted(set(dirs))


def _verdict(text):
    """Return 'pass', 'fail', 'unfilled', or None from a validation report."""
    # Look at the '## Validation' heading first, then a '**Result**' line.
    lines = text.splitlines()
    candidates = [
        ln for ln in lines
        if re.search(r"^#{1,4}\s*validation\b", ln.strip(), re.IGNORECASE)
        or re.search(r"\*{0,2}result\*{0,2}\s*:", ln.strip(), re.IGNORECASE)
    ]
    hay = " ".join(candidates) if candidates else text
    has_pass = re.search(r"\bPASS\b", hay) is not None
    has_fail = re.search(r"\bFAIL\b", hay) is not None
    if has_pass and has_fail:
        # Both present on the verdict line = unfilled template "[PASS | FAIL]".
        return "unfilled"
    if has_pass:
        return "pass"
    if has_fail:
        return "fail"
    return None


def _appears_complete(fdir):
    """Conservative completeness heuristic for the cross-check mode.

    A feature 'appears complete' if it already has a validation.md, or if it has
    a tasks.md with at least one task and no unchecked '- [ ]' boxes left. When
    the signal is ambiguous (no tasks.md, Tasks phase skipped), returns False so
    an in-flight feature is never falsely flagged.
    """
    if os.path.exists(os.path.join(fdir, "validation.md")):
        return True
    tasks = os.path.join(fdir, "tasks.md")
    if not os.path.exists(tasks):
        return False
    body = open(tasks, encoding="utf-8", errors="replace").read()
    if not re.search(r"^#{2,4}\s+T\d+\s*:", body, re.MULTILINE):
        return False
    if re.search(r"^\s*-\s*\[\s\]", body, re.MULTILINE):
        return False  # unchecked box remains -> still in progress
    return True


def _check_feature(fdir, name):
    """Return list of error strings for one feature (empty = pass)."""
    errors = []
    vpath = os.path.join(fdir, "validation.md")
    if not os.path.exists(vpath):
        errors.append(
            f"{name}: no validation.md - Execute is not done until the Verifier "
            f"writes it (author != verifier). Dispatch validation before marking done."
        )
        return errors
    text = open(vpath, encoding="utf-8", errors="replace").read()
    verdict = _verdict(text)
    if verdict is None:
        errors.append(f"{name}: validation.md has no PASS/FAIL verdict (a prose-only report does not count)")
    elif verdict == "unfilled":
        errors.append(f"{name}: validation.md verdict is still the template placeholder '[PASS | FAIL]' - not filled")
    elif verdict == "fail":
        errors.append(f"{name}: validation.md verdict is FAIL - route the ranked gaps to fix tasks, then re-verify (feature is not done)")
    if verdict == "pass" and not EVIDENCE_RE.search(text):
        errors.append(f"{name}: validation.md is PASS but cites no file:line evidence - evidence-or-zero not satisfied")
    return errors


def _resolve(root, feature):
    _, dirs = _feature_dirs(root)
    if feature:
        fdir = feature if os.path.isdir(feature) else None
        if fdir is None:
            matches = [d for d in dirs if os.path.basename(d) == feature]
            if len(matches) == 1:
                fdir = matches[0]
        if not fdir or not os.path.isdir(fdir):
            print(f"validate_state: feature directory not found: {feature}", file=sys.stderr)
            raise SystemExit(2)
        return [(fdir, os.path.basename(fdir.rstrip("/\\")))]
    if len(dirs) == 1:
        return [(dirs[0], os.path.basename(dirs[0].rstrip("/\\")))]
    if not dirs:
        print("validate_state: no feature artifact directory found - nothing to check.")
        return []
    picked = [(d, os.path.basename(d.rstrip("/\\"))) for d in dirs if _appears_complete(d)]
    if not picked:
        print("validate_state: no completed feature detected (all in progress) - nothing to gate.")
    return picked


def main(argv=None):
    p = argparse.ArgumentParser(prog="validate_state.py", description="Deterministic completion gate: a done feature must have a real PASS validation report.")
    p.add_argument("feature", nargs="?", default=None, help="Feature dir or name (default: sole feature, else cross-check all completed)")
    p.add_argument("--root", default=".", help="Search root for explicit feature artifacts (default: current dir)")
    args = p.parse_args(argv)
    root = os.path.abspath(args.root)

    targets = _resolve(root, args.feature)
    all_errors = []
    for fdir, name in targets:
        all_errors += _check_feature(fdir, name)

    for e in all_errors:
        print(f"  ERROR {e}")
    n = len(all_errors)
    checked = ", ".join(name for _, name in targets) or "(none)"
    print(f"\nvalidate_state: {n} error(s) across [{checked}]")
    return 1 if n else 0


if __name__ == "__main__":
    raise SystemExit(main())
