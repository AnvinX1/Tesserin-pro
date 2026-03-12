#!/usr/bin/env python3
"""Validate a finding block against the standard finding format.

Checks a markdown finding for required fields, valid severity/confidence
levels, and format compliance. Returns pass/fail with specific issues.

Usage:
    python validate_finding.py finding.md
    python validate_finding.py report.md --all
    echo "### Finding: ..." | python validate_finding.py -
"""

import argparse
import re
import sys
from pathlib import Path

FINDING_HEADER_RE = re.compile(r"^###\s+Finding\s*[:\-]?\s*(.+)", re.IGNORECASE)
FIELD_RE = re.compile(r"^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|")

REQUIRED_FIELDS = {
    "title",
    "severity",
    "confidence",
    "status",
    "category",
    "affected target",
    "issue summary",
    "impact",
    "remediation",
}

RECOMMENDED_FIELDS = {"evidence", "validation notes"}

VALID_SEVERITIES = {"S1", "S2", "S3", "S4", "S5"}
VALID_CONFIDENCES = {"C1", "C2", "C3", "C4"}
VALID_STATUSES = {
    "Suspected",
    "Confirmed",
    "Remediated",
    "False Positive",
    "Accepted Risk",
}


def parse_findings(text: str) -> list[dict]:
    """Extract findings from markdown text."""
    findings = []
    current = None

    for line in text.splitlines():
        match = FINDING_HEADER_RE.match(line)
        if match:
            if current is not None:
                findings.append(current)
            current = {"title": match.group(1).strip(), "fields": {}}
        elif current is not None:
            field_match = FIELD_RE.match(line)
            if field_match:
                key = field_match.group(1).strip().lower()
                val = field_match.group(2).strip()
                current["fields"][key] = val

    if current is not None:
        findings.append(current)

    return findings


def validate_finding(finding: dict) -> list[str]:
    """Validate a single finding. Returns list of issues."""
    issues = []
    fields = finding["fields"]
    title = finding["title"]

    # Required fields
    for field in REQUIRED_FIELDS:
        if field not in fields or not fields[field].strip():
            issues.append(f"[MISSING] Required field '{field}' is missing or empty")

    # Recommended fields
    for field in RECOMMENDED_FIELDS:
        if field not in fields or not fields[field].strip():
            issues.append(f"[WARN] Recommended field '{field}' is missing")

    # Severity validation
    sev = fields.get("severity", "")
    if sev:
        sev_prefix = sev.strip()[:2].upper()
        if sev_prefix not in VALID_SEVERITIES:
            issues.append(
                f"[INVALID] Severity '{sev}' doesn't start with valid level "
                f"({', '.join(sorted(VALID_SEVERITIES))})"
            )

    # Confidence validation
    conf = fields.get("confidence", "")
    if conf:
        conf_prefix = conf.strip()[:2].upper()
        if conf_prefix not in VALID_CONFIDENCES:
            issues.append(
                f"[INVALID] Confidence '{conf}' doesn't start with valid level "
                f"({', '.join(sorted(VALID_CONFIDENCES))})"
            )

    # Status validation
    status = fields.get("status", "")
    if status:
        if status.strip() not in VALID_STATUSES:
            issues.append(
                f"[INVALID] Status '{status}' is not valid "
                f"({', '.join(sorted(VALID_STATUSES))})"
            )

    # Category validation (should reference CWE or OWASP)
    category = fields.get("category", "")
    if category and not re.search(r"(CWE|OWASP|CVE|A\d{2}|M\d{1,2})", category, re.IGNORECASE):
        issues.append(
            f"[WARN] Category '{category}' doesn't reference CWE, OWASP, or CVE"
        )

    # Title length check
    if len(title) < 5:
        issues.append(f"[WARN] Title '{title}' seems too short")
    if len(title) > 200:
        issues.append(f"[WARN] Title is very long ({len(title)} chars)")

    # Placeholder detection
    for field, value in fields.items():
        if re.search(r"\[.+\]", value) and not re.search(r"\[http", value):
            if value.strip().startswith("[") and value.strip().endswith("]"):
                issues.append(
                    f"[WARN] Field '{field}' appears to contain a placeholder: {value}"
                )

    return issues


def main():
    parser = argparse.ArgumentParser(description="Validate finding format compliance.")
    parser.add_argument(
        "input",
        help="Markdown file path, or '-' for stdin",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Validate all findings in a report (default: first finding only)",
    )
    args = parser.parse_args()

    if args.input == "-":
        text = sys.stdin.read()
    else:
        path = Path(args.input)
        if not path.is_file():
            print(f"Error: File not found: {args.input}", file=sys.stderr)
            sys.exit(1)
        text = path.read_text(encoding="utf-8")

    findings = parse_findings(text)

    if not findings:
        print("No findings found.", file=sys.stderr)
        sys.exit(1)

    if not args.all:
        findings = findings[:1]

    total_issues = 0
    total_errors = 0

    for i, finding in enumerate(findings):
        issues = validate_finding(finding)
        title = finding["title"]

        if issues:
            errors = [iss for iss in issues if iss.startswith("[MISSING]") or iss.startswith("[INVALID]")]
            warnings = [iss for iss in issues if iss.startswith("[WARN]")]
            total_issues += len(issues)
            total_errors += len(errors)

            print(f"\n### Finding {i + 1}: {title}")
            for iss in errors:
                print(f"  ❌ {iss}")
            for iss in warnings:
                print(f"  ⚠️  {iss}")
        else:
            print(f"\n### Finding {i + 1}: {title}")
            print("  ✅ All checks passed")

    # Summary
    print(f"\n---")
    print(f"Validated {len(findings)} finding(s): {total_errors} errors, {total_issues - total_errors} warnings")

    if total_errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
