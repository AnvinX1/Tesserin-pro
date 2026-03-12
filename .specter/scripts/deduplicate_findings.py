#!/usr/bin/env python3
"""Deduplicate findings in a markdown security report.

Reads a markdown report, extracts findings, groups duplicates by
(title, affected target) similarity, and outputs a deduplicated report
with duplicate references preserved.

Usage:
    python deduplicate_findings.py report.md
    python deduplicate_findings.py report.md -o deduped.md
    python deduplicate_findings.py report.md --threshold 0.85
"""

import argparse
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

FINDING_HEADER_RE = re.compile(r"^###\s+Finding\s*[:\-]?\s*(.+)", re.IGNORECASE)
FIELD_RE = re.compile(r"^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|")


def parse_findings(text: str) -> list[dict]:
    """Extract structured findings from markdown text."""
    findings = []
    current = None
    current_lines = []

    for line in text.splitlines():
        match = FINDING_HEADER_RE.match(line)
        if match:
            if current is not None:
                current["raw"] = "\n".join(current_lines)
                findings.append(current)
            current = {"title": match.group(1).strip(), "fields": {}}
            current_lines = [line]
        elif current is not None:
            current_lines.append(line)
            field_match = FIELD_RE.match(line)
            if field_match:
                key = field_match.group(1).strip().lower()
                val = field_match.group(2).strip()
                current["fields"][key] = val

    if current is not None:
        current["raw"] = "\n".join(current_lines)
        findings.append(current)

    return findings


def similarity(a: str, b: str) -> float:
    """Compute string similarity ratio."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def deduplicate(findings: list[dict], threshold: float) -> list[dict]:
    """Group and deduplicate findings by title + target similarity."""
    groups: list[list[int]] = []
    assigned = set()

    for i, f1 in enumerate(findings):
        if i in assigned:
            continue
        group = [i]
        assigned.add(i)
        for j, f2 in enumerate(findings):
            if j in assigned:
                continue
            title_sim = similarity(f1["title"], f2["title"])
            target1 = f1["fields"].get("affected target", "")
            target2 = f2["fields"].get("affected target", "")
            target_sim = similarity(target1, target2) if target1 and target2 else 0.0

            combined = (title_sim * 0.6) + (target_sim * 0.4)
            if combined >= threshold:
                group.append(j)
                assigned.add(j)
        groups.append(group)

    deduped = []
    for group in groups:
        primary = findings[group[0]]
        if len(group) > 1:
            dupes = [findings[idx]["title"] for idx in group[1:]]
            note = f"\n\n> **Duplicates merged ({len(group)} occurrences):** {'; '.join(dupes)}"
            primary["raw"] += note
        primary["duplicate_count"] = len(group)
        deduped.append(primary)

    return deduped


def main():
    parser = argparse.ArgumentParser(description="Deduplicate findings in a markdown report.")
    parser.add_argument("report", help="Path to markdown report file")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.80,
        help="Similarity threshold for dedup (0.0-1.0, default: 0.80)",
    )
    args = parser.parse_args()

    report_path = Path(args.report)
    if not report_path.is_file():
        print(f"Error: File not found: {args.report}", file=sys.stderr)
        sys.exit(1)

    text = report_path.read_text(encoding="utf-8")
    findings = parse_findings(text)

    if not findings:
        print("No findings found in report.", file=sys.stderr)
        sys.exit(0)

    deduped = deduplicate(findings, args.threshold)

    # Rebuild report: everything before first finding + deduped findings
    first_finding_pos = text.find(findings[0]["raw"].split("\n")[0])
    header = text[:first_finding_pos] if first_finding_pos > 0 else ""

    output_parts = [header.rstrip()]
    output_parts.append("")
    for f in deduped:
        output_parts.append(f["raw"])
        output_parts.append("")

    result = "\n".join(output_parts)

    # Summary
    summary = (
        f"\n---\n\n**Deduplication Summary:** {len(findings)} findings → "
        f"{len(deduped)} unique (threshold: {args.threshold})\n"
    )
    result += summary

    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
        print(f"Deduplicated report written to {args.output}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
