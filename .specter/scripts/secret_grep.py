#!/usr/bin/env python3
"""
secret_grep.py — Scan files for common secret patterns.

Usage:
    python secret_grep.py [directory] [--include "*.py,*.js"]

Outputs findings in structured format for ingestion by the agent.
"""

import argparse
import os
import re
import sys
from pathlib import Path

# Patterns: (name, regex, severity)
SECRET_PATTERNS = [
    ("AWS Access Key ID", r"(?:^|[^A-Z0-9])([A-Z0-9]{20})(?:$|[^A-Z0-9])", "S2"),
    ("AWS Secret Access Key", r"(?i)aws[_\-]?secret[_\-]?access[_\-]?key\s*[=:]\s*['\"]?([A-Za-z0-9/+=]{40})", "S1"),
    ("Generic API Key Assignment", r"(?i)(api[_\-]?key|api[_\-]?secret)\s*[=:]\s*['\"]([^'\"]{8,})['\"]", "S2"),
    ("Generic Password Assignment", r"(?i)(password|passwd|pwd)\s*[=:]\s*['\"]([^'\"]{4,})['\"]", "S2"),
    ("Generic Secret Assignment", r"(?i)(secret|token|auth)\s*[=:]\s*['\"]([^'\"]{8,})['\"]", "S2"),
    ("Private Key Header", r"-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)\s+PRIVATE\s+KEY-----", "S1"),
    ("GitHub Token", r"(?i)(gh[pousr]_[A-Za-z0-9_]{36,})", "S1"),
    ("Slack Token", r"xox[baprs]-[0-9a-zA-Z-]{10,}", "S2"),
    ("JWT Token", r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", "S3"),
    ("Database URL with Credentials", r"(?i)(mysql|postgres|mongodb|redis)://[^:]+:[^@]+@", "S1"),
    ("Stripe Secret Key", r"sk_live_[A-Za-z0-9]{20,}", "S1"),
    ("Twilio Auth Token", r"(?i)twilio[_\-]?auth[_\-]?token\s*[=:]\s*['\"]?([a-f0-9]{32})", "S2"),
    ("SendGrid API Key", r"SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}", "S1"),
    ("Heroku API Key", r"(?i)heroku[_\-]?api[_\-]?key\s*[=:]\s*['\"]?([a-f0-9-]{36})", "S2"),
]

DEFAULT_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".rb", ".java", ".go", ".php", ".cs",
    ".c", ".cpp", ".rs", ".swift", ".kt", ".scala", ".sh", ".bash",
    ".yml", ".yaml", ".json", ".xml", ".toml", ".ini", ".cfg", ".conf",
    ".env", ".tf", ".hcl", ".dockerfile",
}

IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "vendor",
    "dist", "build", ".next", ".nuxt", "target",
}


def should_scan(path, include_exts):
    return path.suffix.lower() in include_exts


def scan_file(filepath, patterns):
    findings = []
    try:
        with open(filepath, "r", errors="ignore") as f:
            for line_num, line in enumerate(f, 1):
                for name, pattern, severity in patterns:
                    if re.search(pattern, line):
                        # Redact the actual secret value in output
                        redacted_line = line.strip()
                        if len(redacted_line) > 200:
                            redacted_line = redacted_line[:200] + "..."
                        findings.append({
                            "file": str(filepath),
                            "line": line_num,
                            "pattern": name,
                            "severity": severity,
                            "context": redacted_line,
                        })
    except (PermissionError, OSError):
        pass
    return findings


def scan_directory(directory, include_exts):
    all_findings = []
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for filename in files:
            filepath = Path(root) / filename
            if should_scan(filepath, include_exts):
                all_findings.extend(scan_file(filepath, SECRET_PATTERNS))
    return all_findings


def print_findings(findings):
    if not findings:
        print("No secrets detected.")
        return

    print(f"## Secret Scan Results\n")
    print(f"**Total Matches:** {len(findings)}\n")
    print("| # | Severity | Pattern | File | Line | Context |")
    print("|---|----------|---------|------|------|---------|")
    for i, f in enumerate(findings, 1):
        ctx = f["context"][:80].replace("|", "\\|")
        print(f"| {i} | {f['severity']} | {f['pattern']} | {f['file']} | {f['line']} | `{ctx}` |")

    print(f"\n⚠ Review each match manually — pattern matching produces false positives.")
    print(f"  Validate findings before reporting. See `references/secrets-and-config-checklist.md`.")


def main():
    parser = argparse.ArgumentParser(description="Scan directory for hardcoded secrets.")
    parser.add_argument("directory", nargs="?", default=".", help="Directory to scan (default: current)")
    parser.add_argument("--include", help="Comma-separated file extensions (e.g., '.py,.js')")

    args = parser.parse_args()

    if args.include:
        include_exts = {ext.strip() if ext.startswith(".") else f".{ext.strip()}" for ext in args.include.split(",")}
    else:
        include_exts = DEFAULT_EXTENSIONS

    directory = Path(args.directory).resolve()
    if not directory.is_dir():
        print(f"ERROR: Not a directory: {directory}", file=sys.stderr)
        sys.exit(1)

    findings = scan_directory(directory, include_exts)
    print_findings(findings)


if __name__ == "__main__":
    main()
