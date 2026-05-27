# Security Policy

This repository contains publishable npm packages (currently Pi extensions) and release automation scripts.

## Supported Versions

Only the latest published version of each package is supported with security fixes.

| Package version | Supported |
| --- | --- |
| Latest (`>=0.x` current) | ✅ |
| Older versions | ❌ |

## Reporting a Vulnerability

Please report vulnerabilities **privately**.

### Preferred (private)
- Use GitHub Security Advisories / private vulnerability reporting for this repository.

### If private reporting is unavailable
- Open an issue **without exploit details** and request a private contact channel.

## What to include

- Affected package(s) and version(s)
- Impact summary
- Reproduction steps / proof of concept
- Suggested fix or mitigation (if available)

## Response expectations

- Initial triage response: within **72 hours**
- Status update after validation: within **7 days**
- Fix/release timing depends on severity and exploitability

## Scope notes

In scope:
- Code in `pi-extension-*` packages
- Release scripts (`dev/scripts/check-publish-readiness.sh`, `dev/scripts/publish-packages.sh`)

Out of scope:
- Third-party services (npm registry, Brave API infrastructure, etc.)
- Misconfiguration in downstream user environments

## Disclosure policy

Please do not publicly disclose vulnerabilities until a fix is available and maintainers confirm coordinated disclosure timing.
