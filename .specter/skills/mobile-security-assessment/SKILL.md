---
name: mobile-security-assessment
description: >
  Security assessment of iOS and Android mobile applications. Covers OWASP Mobile
  Top 10, reverse engineering, runtime manipulation, data storage, network security,
  certificate pinning bypass, and platform-specific attack patterns.
applyTo: "**/*.{swift,kt,java,m,h,plist,xml,json,gradle,pbxproj,ipa,apk,dex,smali}"
---

# Mobile Security Assessment

## Purpose

Perform security assessment of iOS and Android mobile applications. Mobile clients present unique attack surface distinct from web: local data storage, binary reverse engineering, runtime hooking, inter-process communication, certificate pinning, biometric bypass, and platform-specific vulnerabilities. Covers OWASP Mobile Top 10 (2024).

## Triggers

- Mobile application (APK/IPA) available for testing
- Mobile source code (Swift, Kotlin, Java, Objective-C) in scope
- API security review identifies mobile client as consumer
- User requests mobile security assessment
- Recon identifies mobile application endpoints

## Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `governance_context` | Active engagement governance record | Yes |
| `target_app` | APK, IPA, or mobile source code | Yes |
| `platform` | iOS, Android, or both | Yes |
| `app_type` | Native, hybrid (React Native, Flutter, Cordova), or PWA | Auto-detected |
| `backend_api` | Associated backend API endpoint(s) | Recommended |
| `test_device` | Device/emulator details for dynamic testing | Recommended |

## Workflow

1. **Scope Verification** — Confirm mobile app is within authorized scope. Verify test device is available.

2. **Static Analysis — Binary/Source Review**

   **Android:**
   - Decompile APK (jadx, apktool, dex2jar)
   - Review `AndroidManifest.xml`: exported components, permissions, debug flags
   - Search for hardcoded secrets, API keys, endpoints
   - Analyze `SharedPreferences`, SQLite usage for sensitive data storage
   - Check for insecure WebView configurations (`setJavaScriptEnabled`, `addJavascriptInterface`)
   - Review `network_security_config.xml` for certificate pinning and cleartext traffic
   - Check for root detection / tamper detection implementations
   - Analyze third-party SDKs and libraries for known CVEs
   - Review ProGuard/R8 obfuscation effectiveness

   **iOS:**
   - Decrypt and extract IPA (if encrypted)
   - Analyze `Info.plist`: URL schemes, ATS exceptions, permissions
   - Search for hardcoded secrets in binary strings (`strings`, class-dump)
   - Review Keychain access groups and data protection classes
   - Check for insecure `WKWebView` / `UIWebView` configurations
   - Analyze App Transport Security (ATS) exceptions
   - Review entitlements for excessive capabilities
   - Check for jailbreak detection implementations
   - Analyze Swift/ObjC code for memory safety issues

3. **OWASP Mobile Top 10 (2024) Review:**

   **M1: Improper Credential Usage**
   - Hardcoded credentials in binary/source
   - API keys embedded in client code
   - Credentials stored in plaintext local storage
   - Shared credentials across users/devices

   **M2: Inadequate Supply Chain Security**
   - Third-party SDK vulnerabilities
   - Malicious library detection
   - Dependency version auditing
   - SDK permission analysis (over-privileged SDKs)

   **M3: Insecure Authentication/Authorization**
   - Local authentication bypass (biometric, PIN)
   - Token storage security (Keychain/Keystore vs SharedPrefs/UserDefaults)
   - Session management on mobile (token refresh, expiry)
   - Offline authentication bypass

   **M4: Insufficient Input/Output Validation**
   - Deep link / URL scheme injection
   - Intent injection (Android)
   - WebView JavaScript bridge exploitation
   - Clipboard data leakage
   - Pasteboard/clipboard sniffing

   **M5: Insecure Communication**
   - Certificate pinning implementation and bypass
   - Cleartext HTTP traffic
   - TLS version and cipher suite validation
   - Certificate validation errors (trust-all, hostname skip)
   - WebSocket security on mobile

   **M6: Inadequate Privacy Controls**
   - Excessive data collection
   - PII in logs (NSLog, Logcat)
   - Analytics SDK data leakage
   - Screenshot/screen recording protection
   - Keyboard cache exposure

   **M7: Insufficient Binary Protections**
   - Code obfuscation assessment
   - Anti-tampering mechanisms
   - Anti-debugging protections
   - Root/jailbreak detection strength
   - Runtime integrity checks

   **M8: Security Misconfiguration**
   - Debug mode enabled in production
   - Backup flag enabled (Android `android:allowBackup`)
   - Exported components without permission checks
   - Insecure `ContentProvider` exposure
   - Developer settings left in build

   **M9: Insecure Data Storage**
   - Plaintext sensitive data in local databases (SQLite, Realm, Core Data)
   - Sensitive data in SharedPreferences / NSUserDefaults
   - Sensitive data in external storage (Android SD card)
   - Cache files containing sensitive information
   - Keychain/Keystore usage and configuration
   - Backup data exposure

   **M10: Insufficient Cryptography**
   - Weak algorithms (MD5, SHA1, DES, RC4)
   - Hardcoded encryption keys
   - Insecure random number generation
   - Custom crypto implementations
   - Missing integrity checks

4. **Dynamic Analysis — Runtime Testing**

   - Instrument with Frida/Objection for runtime hooking
   - Bypass certificate pinning (SSL Kill Switch, Frida scripts)
   - Bypass root/jailbreak detection
   - Intercept and modify network traffic (Burp/mitmproxy)
   - Monitor file system changes during app usage
   - Hook authentication/authorization functions
   - Test deep link handling with crafted URIs
   - Analyze inter-process communication (Intents, URL schemes, Universal Links)
   - Monitor memory for sensitive data leakage
   - Test biometric authentication bypass

5. **Backend API Correlation** — Cross-reference mobile findings with `api-security-review`:
   - Are mobile-specific API endpoints secured?
   - Does the API trust client-side validation?
   - Are device binding/attestation tokens validated server-side?
   - Can mobile API be called from non-mobile client?

6. **Classify & Route** — Per `severity-matrix.md`, route to `bug-bounty-triage`

## Allowed Actions

- Decompile and reverse engineer authorized mobile applications
- Instrument runtime with Frida/Objection within authorized scope
- Bypass certificate pinning for traffic analysis
- Bypass jailbreak/root detection for testing
- Analyze local data storage on test device
- Intercept network traffic via proxy
- Test deep link and intent handling
- Hook and modify function behavior at runtime
- Analyze binary protections and obfuscation

## Forbidden Actions

- Test mobile applications outside authorized scope
- Distribute decompiled source code
- Attack mobile backend infrastructure not in scope
- Install malicious apps on devices belonging to others
- Exfiltrate real user data from mobile applications
- Bypass DRM protections for purposes other than security testing
- Target app store infrastructure

## Output Format

```markdown
### [FINDING-ID]: [Title]

| Field | Value |
|-------|-------|
| **Severity** | [S1-S5] |
| **Confidence** | [C1-C4] |
| **Status** | Suspected / Confirmed |
| **Category** | [OWASP Mobile M1-M10 + CWE] |
| **Platform** | iOS / Android / Both |
| **Affected Component** | [Activity, class, file, endpoint] |

#### Issue Summary
[Description of mobile-specific vulnerability]

#### Evidence
\```
[Frida script output, decompiled code snippet, traffic capture, storage dump — REDACTED]
\```

**Reproduction Steps:**
1. [Install app on test device / emulator]
2. [Instrument with tool]
3. [Trigger vulnerable behavior]
4. [Observe result]

#### Impact
[Account takeover, data theft, privilege escalation, etc.]

#### Remediation
\```[language]
[Corrected code / configuration]
\```

#### Validation Notes
[How to verify the fix on mobile platform]
```

## References

- `references/severity-matrix.md` — Severity classification
- `references/secrets-and-config-checklist.md` — Secrets in mobile apps
- `references/authz-and-authn-checklist.md` — Authentication on mobile
