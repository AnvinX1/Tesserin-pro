#!/usr/bin/env python3
"""Redact sensitive data from finding evidence blocks.

Scans markdown text for common PII and secret patterns and replaces
them with redaction markers. Designed for use before report delivery.

Usage:
    python redact_evidence.py report.md -o redacted_report.md
    python redact_evidence.py report.md --dry-run
    cat finding.md | python redact_evidence.py - -o redacted.md
"""

import argparse
import re
import sys
from pathlib import Path

# Redaction patterns: (name, regex, replacement)
REDACTION_RULES = [
    # Credit card numbers (13-19 digits, with optional separators)
    (
        "Credit Card",
        re.compile(r"\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,7})\b"),
        lambda m: m.group(0)[:4] + "-XXXX-XXXX-" + m.group(0)[-4:].lstrip("-").lstrip(),
    ),
    # SSN (US)
    (
        "SSN",
        re.compile(r"\b(\d{3}[\s\-]\d{2}[\s\-]\d{4})\b"),
        "XXX-XX-XXXX",
    ),
    # Email addresses
    (
        "Email",
        re.compile(r"\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b"),
        "[REDACTED_EMAIL]",
    ),
    # Phone numbers (various formats)
    (
        "Phone",
        re.compile(r"\b(\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})\b"),
        "[REDACTED_PHONE]",
    ),
    # IP addresses (private ranges are kept, public redacted)
    (
        "Public IP",
        re.compile(
            r"\b(?!10\.)(?!172\.(?:1[6-9]|2\d|3[01])\.)(?!192\.168\.)(?!127\.)"
            r"(?!169\.254\.)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b"
        ),
        "[REDACTED_IP]",
    ),
    # AWS Access Key ID
    (
        "AWS Key",
        re.compile(r"\b(AKIA[0-9A-Z]{16})\b"),
        "AKIA[REDACTED]",
    ),
    # AWS Secret Access Key (40 char base64)
    (
        "AWS Secret",
        re.compile(r"(?<=aws_secret_access_key\s{0,5}=\s{0,5})[A-Za-z0-9/+=]{40}"),
        "[REDACTED_AWS_SECRET]",
    ),
    # Generic API keys / tokens (long hex or base64 strings in key= context)
    (
        "API Key",
        re.compile(
            r"(?:api[_\-]?key|token|secret|password|passwd|authorization)"
            r"[\s:=]+['\"]?([a-zA-Z0-9\-_.~+/=]{20,})['\"]?",
            re.IGNORECASE,
        ),
        lambda m: m.group(0)[: m.start(1) - m.start(0)] + "[REDACTED_SECRET]",
    ),
    # JWT tokens
    (
        "JWT",
        re.compile(r"\beyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\b"),
        "[REDACTED_JWT]",
    ),
    # Password hashes (bcrypt, SHA-256/512 crypt, MD5 crypt)
    (
        "Password Hash",
        re.compile(r"\$(?:2[aby]|5|6|1)\$[a-zA-Z0-9./+]+\$[a-zA-Z0-9./+=]+"),
        "[REDACTED_HASH]",
    ),
    # Private key blocks
    (
        "Private Key",
        re.compile(
            r"-----BEGIN[A-Z\s]*PRIVATE KEY-----[\s\S]*?-----END[A-Z\s]*PRIVATE KEY-----"
        ),
        "[REDACTED_PRIVATE_KEY]",
    ),
    # Bearer tokens in headers
    (
        "Bearer Token",
        re.compile(r"(Bearer\s+)[a-zA-Z0-9\-_.~+/=]{20,}", re.IGNORECASE),
        r"\1[REDACTED_TOKEN]",
    ),
    # Cookie values (session cookies)
    (
        "Session Cookie",
        re.compile(
            r"((?:session|sess|sid|jsessionid|phpsessid|asp\.net_sessionid|connect\.sid)"
            r"\s*=\s*)[a-zA-Z0-9\-_.%]{16,}",
            re.IGNORECASE,
        ),
        r"\1[REDACTED_SESSION]",
    ),
]


def redact_text(text: str, dry_run: bool = False) -> tuple[str, list[dict]]:
    """Apply all redaction rules. Returns (redacted_text, redaction_log)."""
    log = []
    result = text

    for name, pattern, replacement in REDACTION_RULES:
        matches = list(pattern.finditer(result))
        if matches:
            log.append({"rule": name, "count": len(matches)})
            if not dry_run:
                if callable(replacement):
                    result = pattern.sub(replacement, result)
                else:
                    result = pattern.sub(replacement, result)

    return result, log


def main():
    parser = argparse.ArgumentParser(description="Redact sensitive data from security reports.")
    parser.add_argument("input", help="Markdown file path, or '-' for stdin")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be redacted without modifying",
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

    redacted, log = redact_text(text, dry_run=args.dry_run)

    if args.dry_run:
        print("## Redaction Dry Run\n")
        if log:
            print("| Rule | Matches |")
            print("|------|---------|")
            for entry in log:
                print(f"| {entry['rule']} | {entry['count']} |")
            total = sum(e["count"] for e in log)
            print(f"\n**Total redactions:** {total}")
        else:
            print("No sensitive data patterns detected.")
        return

    if args.output:
        Path(args.output).write_text(redacted, encoding="utf-8")
        total = sum(e["count"] for e in log)
        print(f"Redacted {total} items → {args.output}", file=sys.stderr)
    else:
        print(redacted)

    # Append redaction summary if there were changes
    if log:
        summary_lines = ["\n---", "**Redaction Log:**"]
        for entry in log:
            summary_lines.append(f"- {entry['rule']}: {entry['count']} redaction(s)")
        print("\n".join(summary_lines), file=sys.stderr)


if __name__ == "__main__":
    main()
