#!/usr/bin/env python3
"""
severity_stats.py — Parse a markdown report and generate severity/confidence statistics.

Usage:
    python severity_stats.py report.md

Reads a markdown report file, extracts finding metadata from tables,
and outputs summary statistics.
"""

import re
import sys
from collections import Counter


SEVERITY_LABELS = {
    "S1": "Critical",
    "S2": "High",
    "S3": "Medium",
    "S4": "Low",
    "S5": "Informational",
}

CONFIDENCE_LABELS = {
    "C1": "Confirmed",
    "C2": "High Confidence",
    "C3": "Moderate",
    "C4": "Tentative",
}


def extract_findings(content):
    """Extract severity, confidence, and status from finding table rows."""
    findings = []

    # Match finding headers like "### F-001: Title"
    finding_blocks = re.split(r"(?=^### F-\d+:)", content, flags=re.MULTILINE)

    for block in finding_blocks:
        header_match = re.match(r"^### (F-\d+): (.+)", block)
        if not header_match:
            continue

        finding_id = header_match.group(1)
        title = header_match.group(2).strip()

        severity = None
        confidence = None
        status = None

        sev_match = re.search(r"\*\*Severity\*\*\s*\|\s*(S[1-5])", block)
        if sev_match:
            severity = sev_match.group(1)

        conf_match = re.search(r"\*\*Confidence\*\*\s*\|\s*(C[1-4])", block)
        if conf_match:
            confidence = conf_match.group(1)

        status_match = re.search(r"\*\*Status\*\*\s*\|\s*(\w[\w\s]*)", block)
        if status_match:
            status = status_match.group(1).strip()

        findings.append({
            "id": finding_id,
            "title": title,
            "severity": severity,
            "confidence": confidence,
            "status": status,
        })

    return findings


def print_stats(findings):
    """Print formatted statistics."""
    if not findings:
        print("No findings found in report.")
        return

    sev_counts = Counter(f.get("severity") for f in findings if f.get("severity"))
    conf_counts = Counter(f.get("confidence") for f in findings if f.get("confidence"))
    status_counts = Counter(f.get("status") for f in findings if f.get("status"))

    print(f"## Finding Statistics\n")
    print(f"**Total Findings:** {len(findings)}\n")

    print("### By Severity\n")
    print("| Severity | Label | Count |")
    print("|----------|-------|-------|")
    for sev in ["S1", "S2", "S3", "S4", "S5"]:
        count = sev_counts.get(sev, 0)
        label = SEVERITY_LABELS[sev]
        print(f"| {sev} | {label} | {count} |")
    print()

    print("### By Confidence\n")
    print("| Confidence | Label | Count |")
    print("|------------|-------|-------|")
    for conf in ["C1", "C2", "C3", "C4"]:
        count = conf_counts.get(conf, 0)
        label = CONFIDENCE_LABELS[conf]
        print(f"| {conf} | {label} | {count} |")
    print()

    print("### By Status\n")
    print("| Status | Count |")
    print("|--------|-------|")
    for status, count in sorted(status_counts.items()):
        print(f"| {status} | {count} |")
    print()

    # Risk score: simple weighted sum
    weights = {"S1": 10, "S2": 7, "S3": 4, "S4": 1, "S5": 0}
    risk_score = sum(weights.get(f.get("severity", "S5"), 0) for f in findings)
    print(f"### Aggregate Risk Score: **{risk_score}**")
    print(f"(Weighted: S1=10, S2=7, S3=4, S4=1, S5=0)")


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <report.md>", file=sys.stderr)
        sys.exit(1)

    report_path = sys.argv[1]
    try:
        with open(report_path, "r") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"ERROR: File not found: {report_path}", file=sys.stderr)
        sys.exit(1)

    findings = extract_findings(content)
    print_stats(findings)


if __name__ == "__main__":
    main()
