#!/usr/bin/env python3
"""
normalize_finding.py — Normalize raw finding data into standard finding format.

Usage:
    python normalize_finding.py --title "XSS in search" \
        --severity S2 --confidence C1 --status Confirmed \
        --category "CWE-79" --target "/search?q=" \
        --summary "Reflected XSS in search parameter" \
        --impact "Session hijack, credential theft" \
        --evidence "evidence.txt" \
        --remediation "Encode output with context-aware escaping"

Outputs structured markdown finding to stdout.
"""

import argparse
import sys
import os
from datetime import datetime, timezone

VALID_SEVERITIES = {"S1", "S2", "S3", "S4", "S5"}
VALID_CONFIDENCES = {"C1", "C2", "C3", "C4"}
VALID_STATUSES = {"Suspected", "Confirmed", "Remediated", "False Positive", "Accepted Risk"}


def validate_inputs(args):
    errors = []
    if args.severity not in VALID_SEVERITIES:
        errors.append(f"Invalid severity '{args.severity}'. Must be one of: {', '.join(sorted(VALID_SEVERITIES))}")
    if args.confidence not in VALID_CONFIDENCES:
        errors.append(f"Invalid confidence '{args.confidence}'. Must be one of: {', '.join(sorted(VALID_CONFIDENCES))}")
    if args.status not in VALID_STATUSES:
        errors.append(f"Invalid status '{args.status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}")
    if args.evidence and not os.path.isfile(args.evidence):
        errors.append(f"Evidence file not found: {args.evidence}")
    return errors


def render_finding(args, finding_id):
    evidence_content = ""
    if args.evidence:
        with open(args.evidence, "r") as f:
            evidence_content = f.read().strip()
    else:
        evidence_content = "[No evidence file provided — add manually]"

    return f"""### {finding_id}: {args.title}

| Field | Value |
|-------|-------|
| **Severity** | {args.severity} |
| **Confidence** | {args.confidence} |
| **Status** | {args.status} |
| **Category** | {args.category} |
| **Affected Target** | {args.target} |
| **Date** | {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} |

#### Issue Summary
{args.summary}

#### Impact
{args.impact}

#### Evidence
```
{evidence_content}
```

#### Remediation
{args.remediation}

#### Validation Notes
{args.validation or '[Add validation steps]'}
"""


def main():
    parser = argparse.ArgumentParser(description="Normalize a security finding into standard markdown format.")
    parser.add_argument("--id", default="F-XXX", help="Finding ID (default: F-XXX)")
    parser.add_argument("--title", required=True, help="Finding title")
    parser.add_argument("--severity", required=True, help="Severity level: S1-S5")
    parser.add_argument("--confidence", required=True, help="Confidence level: C1-C4")
    parser.add_argument("--status", required=True, help="Status: Suspected, Confirmed, Remediated, False Positive, Accepted Risk")
    parser.add_argument("--category", required=True, help="CWE or OWASP category")
    parser.add_argument("--target", required=True, help="Affected target (URL, file, component)")
    parser.add_argument("--summary", required=True, help="Issue summary")
    parser.add_argument("--impact", required=True, help="Impact description")
    parser.add_argument("--evidence", help="Path to evidence file (optional)")
    parser.add_argument("--remediation", required=True, help="Remediation recommendation")
    parser.add_argument("--validation", help="Validation notes (optional)")

    args = parser.parse_args()

    errors = validate_inputs(args)
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    print(render_finding(args, args.id))


if __name__ == "__main__":
    main()
