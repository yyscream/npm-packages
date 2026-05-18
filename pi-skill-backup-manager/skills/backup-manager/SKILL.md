---
name: backup-manager
description: Agents should invoke this skill for backup health checks, restore testing, NAS/Gitea backup integrity, 3-2-1 strategy review, backup script audits, or verifying repositories and archives can be restored safely.
---

# Backup Manager

Verify, test, and manage backups across the infrastructure.

## Quick Start

### Verify a Git Backup

```bash
# Clone to temp directory and check integrity
TEMP_DIR=$(mktemp -d)
git clone --bare <repo-url> "$TEMP_DIR/test-repo" 2>&1
cd "$TEMP_DIR/test-repo"
git fsck --full --no-dangling
echo "Exit code: $?"
rm -rf "$TEMP_DIR"
```

### Check Gitea Backup Status

```bash
# List repos on Gitea
curl -s "http://<gitea-host>:3000/api/v1/user/repos" \
  -H "Authorization: token <token>" | jq '.[].name'

# Check last push time
curl -s "http://<gitea-host>:3000/api/v1/repos/<owner>/<repo>" \
  -H "Authorization: token <token>" | jq '.updated_at'
```

---

## Backup Verification

### Git Repository Integrity

```bash
# Full integrity check
git fsck --full --no-dangling

# Check for corruption
git fsck --strict

# Verify all objects are reachable
git rev-list --all --objects | wc -l
```

**Expected:** Exit code 0, no errors. Any "broken link", "missing", or "corrupt" messages indicate problems.

### File Count Verification

```bash
# Compare file counts between source and backup
# Source
find /path/to/source -type f | wc -l

# Backup
find /path/to/backup -type f | wc -l
```

### Backup Freshness

A backup is only useful if it's recent enough. Check age:

```bash
# Last commit date in a git backup
git log -1 --format="%ci"

# Age of newest file in a directory backup
find /path/to/backup -type f -printf '%T@\n' | sort -n | tail -1 | xargs -I{} date -d @{}
```

**Freshness criteria:**
- < 24h: Fresh
- 24h–72h: Acceptable (check if auto-backup is running)
- > 72h: Stale (investigate why backups stopped)

---

## Restore Testing

### Git Restore Test

Full restore test to verify disaster recovery:

```bash
# 1. Create isolated test directory
TEST_DIR=$(mktemp -d)
echo "Testing restore in: $TEST_DIR"

# 2. Clone from backup source
git clone <backup-repo-url> "$TEST_DIR/restored" 2>&1

# 3. Verify integrity
cd "$TEST_DIR/restored"
git fsck --full

# 4. Verify structure (check key files exist)
for f in AGENTS.md APPEND_SYSTEM.md MEMORY.md; do
  if [ -f "$f" ]; then
    echo "OK: $f exists"
  else
    echo "MISSING: $f"
  fi
done

# 5. Count files
echo "Total files: $(find . -type f | wc -l)"

# 6. Cleanup
rm -rf "$TEST_DIR"
```

### NAS Restore Test

```bash
# 1. Check NAS accessibility
ssh -p <ssh-port> <nas-user>@<nas-host> "ls <backup-path>/" 2>&1

# 2. Check file integrity (sample random files)
ssh -p <ssh-port> <nas-user>@<nas-host> "find <backup-path> -type f | shuf | head -5 | xargs md5sum"

# 3. Check disk usage
ssh -p <ssh-port> <nas-user>@<nas-host> "df -h /Volume1/"
```

---

## 3-2-1 Backup Strategy

The gold standard: **3** copies of data, on **2** different media types, with **1** offsite.

### Current Status Assessment

| Requirement | Status | Details |
|---|---|---|
| Copy 1: Primary | Local machine | Working directory |
| Copy 2: Local backup | Gitea/NAS/local backup target | Auto-backup on a defined schedule |
| Copy 3: Offsite | GitHub | Mirror (if configured) |
| 2 media types | SSD + NAS | Different physical devices |
| 1 offsite | GitHub/cloud | Internet-accessible backup |

### Recommendations

When evaluating backup strategy, check:

1. **Auto-backup running?** — Verify `git-autobackup` skill is active
2. **Gitea mirror healthy?** — Check `github-mirror-check` skill
3. **NAS sync active?** — Verify OneDrive sync to NAS
4. **Recovery time objective (RTO)?** — How fast can we restore?
5. **Recovery point objective (RPO)?** — How much data can we afford to lose?

---

## Gitea Backup Operations

### Verify Auto-Backup

```bash
# Check when workspace was last pushed to Gitea
cd /path/to/workspace
git log --remotes=gitea -1 --format="%ci %s"

# Check Gitea repo last update via API
curl -s "http://<gitea-host>:3000/api/v1/repos/<owner>/<repo>" \
  -H "Authorization: token <token>" | jq '.updated_at'
```

### Manual Backup Trigger

```bash
# Force push to Gitea
git push gitea --all
git push gitea --tags
```

---

## Backup Health Report Format

When delivering a backup status report:

1. **Summary** — Overall backup health (Healthy / At Risk / Critical)
2. **Freshness** — Last backup time for each target
3. **Integrity** — Results of `git fsck` or file verification
4. **3-2-1 Compliance** — Which requirements are met
5. **Recommendations** — Any actions needed

---

## Alert Conditions

Alert when:
- Backup is **older than 72 hours** (auto-backup may have failed)
- `git fsck` reports **any errors** (corruption detected)
- Gitea API is **unreachable** (backup target down)
- NAS is **unreachable** (secondary backup target down)
- **3-2-1 compliance drops** below 2 copies

---

_Kai skill — Backup verification and strategy management_
