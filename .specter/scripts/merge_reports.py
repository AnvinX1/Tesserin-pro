#!/usr/bin/env python3
"""Merge multiple markdown security reports into one consolidated report.

Combines findings from separate reports (e.g., from different skill outputs
or assessment phases) into a single report with deduplication awareness.

Usage:
    python merge_reports.py report1.md report2.md report3.md -o merged.md
    python merge_reports.py reports/*.md -o consolidated.md
    python merge_reports.py report1.md report2.md --title "Consolidated Assessment"
"""

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

FINDING_HEADER_RE = re.compile(r"^###\s+Finding\s*[:\-]?\s*(.+)", re.IGNORECASE)
FIELD_RE = re.compile(r"^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|")
SEVERITY_ORDER = {"S1": 0, "S2": 1, "S3": 2, "S4": 3, "S5": 4}


def parse_findings(text: str, source: str) -> list[dict]:
    """Extract findings from a markdown report, tagging with source."""
    findings = []
    current = None
    current_lines = []

    for line in text.splitlines():
        match = FINDING_HEADER_RE.match(line)
        if match:
            if current is not None:
                current["raw"] = "\n".join(current_lines)
                findings.append(current)
            current = {
                "title": match.group(1).strip(),
                "fields": {},
                "source": source,
            }
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


def severity_key(finding: dict) -> int:
    """Sort key: lower severity number = higher priority."""
    sev = finding["fields"].get("severity", "S5")
    for prefix, order in SEVERITY_ORDER.items():
        if sev.upper().startswith(prefix):
            return order
    return 5


def merge_and_sort(all_findings: list[dict]) -> list[dict]:
    """Sort findings by severity (S1 first)."""
    return sorted(all_findings, key=severity_key)


def build_merged_report(
    findings: list[dict], title: str, sources: list[str]
) -> str:
    """Build consolidated markdown report."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        f"# {title}",
        "",
        f"**Generated:** {now}",
        f"**Source Reports:** {len(sources)}",
        f"**Total Findings:** {len(findings)}",
        "",
        "## Source Reports",
        "",
    ]
    for src in sources:
        count = sum(1 for f in findings if f["source"] == src)
        lines.append(f"- `{src}` — {count} findings")
    lines.append("")

    # Summary table
    sev_counts = {}
    for f in findings:
        sev = f["fields"].get("severity", "Unknown")
        prefix = sev[:2] if len(sev) >= 2 else sev
        sev_counts[prefix] = sev_counts.get(prefix, 0) + 1

    lines.append("## Finding Summary")
    lines.append("")
    lines.append("| Severity | Count |")
    lines.append("|----------|-------|")
    for sev in ["S1", "S2", "S3", "S4", "S5"]:
        if sev in sev_counts:
            lines.append(f"| {sev} | {sev_counts[sev]} |")
    lines.append("")

    # Findings
    lines.append("## Findings")
    lines.append("")
    for f in findings:
        lines.append(f["raw"])
        lines.append(f"\n> **Source:** `{f['source']}`")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Merge markdown security reports.")
    parser.add_argument("reports", nargs="+", help="Markdown report files to merge")
    parser.add_argument("-o", "--output", required=True, help="Output file path")
    parser.add_argument(
        "--title",
        default="Merged Security Assessment Report",
        help="Report title (default: 'Merged Security Assessment Report')",
    )
    args = parser.parse_args()

    all_findings = []
    sources = []

    for report_path_str in args.reports:
        report_path = Path(report_path_str)
        if not report_path.is_file():
            print(f"Warning: Skipping missing file: {report_path_str}", file=sys.stderr)
            continue
        text = report_path.read_text(encoding="utf-8")
        findings = parse_findings(text, report_path.name)
        all_findings.extend(findings)
        sources.append(report_path.name)

    if not all_findings:
        print("No findings found in any report.", file=sys.stderr)
        sys.exit(0)

    sorted_findings = merge_and_sort(all_findings)
    result = build_merged_report(sorted_findings, args.title, sources)

    Path(args.output).write_text(result, encoding="utf-8")
    print(
        f"Merged {len(all_findings)} findings from {len(sources)} reports → {args.output}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
