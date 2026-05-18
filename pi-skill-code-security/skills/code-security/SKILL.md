---
name: code-security
description: Agents should invoke this skill for code security reviews, leaked secret checks, dependency risk, unsafe shell/Python/TypeScript/Rust patterns, auth/input-validation flaws, SAST-style audits, or supply-chain concerns in repositories.
---

# Code Security

Secret scanning, dependency vulnerability auditing, static analysis patterns, and supply chain security for the user's codebases.

## Quick Start

### Quick Repo Security Check

Run these in order for any repository:

```bash
# 1. Check for leaked secrets
grep -rn "sk-proj-\|sk-\|AKIA\|ghp_\|gho_\|github_pat_\|xoxb-\|xoxp-" --include="*.py" --include="*.ts" --include="*.js" --include="*.rs" --include="*.sh" --include="*.toml" --include="*.json" --include="*.yml" --include="*.yaml" --include="*.env" .

# 2. Check .gitignore covers sensitive files
cat .gitignore | grep -i "env\|secret\|key\|token\|credential"

# 3. Check for .env files in repo
find . -name ".env*" -not -path "./.git/*"

# 4. Run dependency audit (language-specific)
cargo audit          # Rust
npm audit            # JavaScript/TypeScript
pip-audit            # Python (via pip install pip-audit)
```

---

## Secret Scanning

### Patterns to Detect

| Pattern | Regex | Severity |
|---|---|---|
| OpenAI API key | `sk-proj-[A-Za-z0-9_-]{20,}` | Critical |
| OpenAI legacy key | `sk-[A-Za-z0-9]{20,}` | Critical |
| AWS access key | `AKIA[0-9A-Z]{16}` | Critical |
| GitHub PAT | `ghp_[A-Za-z0-9]{36}` | Critical |
| GitHub OAuth | `gho_[A-Za-z0-9]{36}` | Critical |
| GitHub App token | `github_pat_[A-Za-z0-9_]{22,}` | Critical |
| Slack token | `xox[bpors]-[A-Za-z0-9-]{10,}` | High |
| Telegram bot token | `[0-9]{8,10}:AA[A-Za-z0-9_-]{33}` | High |
| Discord bot token | `[MN][A-Za-z0-9]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}` | High |
| JWT token | `eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*` | High |
| Generic API key | `[Aa]pi[_-]?[Kk]ey.*[=:]\s*["'][A-Za-z0-9]{20,}` | Medium |
| Password in URL | `://[^:]+:[^@]+@` | High |
| Private key header | `-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----` | Critical |
| Password assignment | `[Pp]assword\s*[=:]\s*["'][^"']{8,}` | High |

### Manual Secret Scan

```bash
# Comprehensive secret scan across a repo
grep -rn \
    -e "sk-proj-" \
    -e "sk-[A-Za-z0-9]\{20,\}" \
    -e "AKIA[0-9A-Z]\{16\}" \
    -e "ghp_" \
    -e "gho_" \
    -e "github_pat_" \
    -e "xox[bpors]-" \
    -e "BEGIN.*PRIVATE KEY" \
    -e "password\s*=" \
    -e "api_key\s*=" \
    -e "secret\s*=" \
    --include="*.py" --include="*.ts" --include="*.js" --include="*.rs" \
    --include="*.sh" --include="*.toml" --include="*.json" --include="*.yml" \
    --include="*.yaml" --include="*.env" --include="*.cfg" --include="*.ini" \
    .
```

### Git History Check

Secrets removed from current files may still be in git history:

```bash
# Search git history for secrets (simplified)
git log --all -p | grep -n "sk-proj-\|AKIA\|ghp_\|BEGIN.*PRIVATE KEY"

# Check specific file history
git log --all -p -- "path/to/suspicious/file"
```

**If secrets found in history:**
1. Rotate the credential immediately (it's already compromised)
2. Use `git filter-repo` to remove from history (if critical)
3. Force push (coordinate with team)
4. Document in `MEMORY.md`

### .gitignore Hygiene

Every repo should ignore:

```gitignore
# Secrets and credentials
.env
.env.*
*.pem
*.key
credentials.json
service-account.json
**/secrets/

# IDE and editor files
.idea/
.vscode/settings.json
*.swp

# OS files
.DS_Store
Thumbs.db
```

**Audit checklist:**
- [ ] `.env` and `.env.*` are in `.gitignore`
- [ ] No `.env` files are tracked: `git ls-files | grep "\.env"`
- [ ] Private keys (`.pem`, `.key`) are ignored
- [ ] Credential JSON files are ignored
- [ ] No sensitive files in git history

---

## Dependency Vulnerability Audit

### Rust (cargo audit)

```bash
# Install cargo-audit if not present
cargo install cargo-audit

# Run audit
cargo audit

# JSON output for parsing
cargo audit --json

# Fix by updating Cargo.lock
cargo update
cargo audit
```

**Evaluate findings:**

| Advisory Severity | Action |
|---|---|
| Critical / unmaintained | Update or replace immediately |
| High | Update within 24h |
| Medium | Include in next release |
| Low | Update when convenient |

### JavaScript / TypeScript (npm audit)

```bash
# Run audit
npm audit

# Fix automatically where possible
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force

# JSON output
npm audit --json
```

### Python (pip-audit)

```bash
# Install pip-audit
pip install pip-audit

# Audit current environment
pip-audit

# Audit a requirements file
pip-audit -r requirements.txt

# JSON output
pip-audit --format json
```

### Supply Chain Risk Indicators

Look for these red flags in dependencies:

| Indicator | Risk | Check |
|---|---|---|
| Very new package (<1 month) | Typosquatting | Check publish date and download count |
| Single maintainer | Bus factor | Check maintainer count |
| No recent updates (>2 years) | Abandoned | Check last commit/release |
| Unexpected install scripts | Malicious payload | Review `postinstall` scripts |
| Excessive permissions | Over-privileged | Review package permissions |
| Name similar to popular package | Typosquatting | Compare with intended package |

---

## Static Analysis (SAST) Patterns

### Common Vulnerability Patterns

**Command Injection:**
```
# Dangerous patterns
os.system(user_input)
subprocess.call(user_input, shell=True)
exec(user_input)
eval(user_input)
```

**Path Traversal:**
```
# Dangerous patterns
open(user_input)               # Unsanitized file path
os.path.join(base, user_input) # Without validation
```

**SQL Injection:**
```
# Dangerous patterns
f"SELECT * FROM users WHERE id = {user_input}"
cursor.execute("SELECT * FROM users WHERE id = " + user_input)
```

**Hardcoded Credentials:**
```
# Dangerous patterns
password = "hardcoded_value"
API_KEY = "sk-..."
conn_string = "postgres://user:pass@host/db"
```

### Language-Specific Checks

**Rust:**
```bash
# Check for unsafe blocks
grep -rn "unsafe" --include="*.rs" .

# Check for unwrap (potential panics)
grep -rn "\.unwrap()" --include="*.rs" .

# Run clippy with security lints
cargo clippy -- -W clippy::all
```

**Python:**
```bash
# Check for dangerous functions
grep -rn "eval\|exec\|os.system\|subprocess.call.*shell=True" --include="*.py" .

# Check for pickle (deserialization risk)
grep -rn "pickle\|cPickle" --include="*.py" .

# Run bandit (Python SAST)
pip install bandit
bandit -r . -f json
```

**Shell Scripts:**
```bash
# Check for unquoted variables (injection risk)
# shellcheck is the best tool for this
shellcheck *.sh

# Check for eval with variables
grep -rn 'eval.*\$' --include="*.sh" .
```

---

## Code Security Report Format

```markdown
# Code Security Report: [Repository Name]

**Date:** YYYY-MM-DD
**Analyst:** Zero
**Repository:** [path or URL]
**Commit:** [short hash]

## Summary

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Secrets | X | X | X | X |
| Dependencies | X | X | X | X |
| Code patterns | X | X | X | X |

## Findings

### Secrets
[List any found secrets with file:line references]

### Dependency Vulnerabilities
[List from cargo audit / npm audit / pip-audit]

### Code Vulnerabilities
[List from SAST scan with file:line references]

## Recommendations

1. [Prioritized actions]

## .gitignore Status

- [ ] Adequate for this project type
- [ ] Missing entries: [list]
```

---

_Zero skill — Code security analysis and dependency auditing_
