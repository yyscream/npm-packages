---
name: server-audit
description: Agents should invoke this skill for Linux server security reviews, SSH hardening, firewall/open-port audits, user/permission checks, exposed services, or host hardening requests. Produces severity-rated findings and practical remediation steps.
---

# Server Audit

Security auditing and hardening for Linux systems. Covers SSH, firewalls, ports, users, and general hardening.

## Quick Start

### Run a Quick Security Audit

Check the essentials in order:

```bash
# 1. Open ports
ss -tlnp

# 2. SSH config
grep -E "^(PasswordAuthentication|PermitRootLogin|PubkeyAuthentication)" /etc/ssh/sshd_config

# 3. Firewall status
sudo ufw status verbose   # Ubuntu/Debian
sudo firewall-cmd --list-all  # RHEL/Arch (firewalld)
sudo iptables -L -n        # Raw iptables

# 4. Failed login attempts (last 24h)
journalctl -u sshd --since "24 hours ago" | grep -c "Failed password"

# 5. Users with login shells
grep -v "nologin\|false" /etc/passwd | cut -d: -f1
```

---

## SSH Hardening

### Audit Checklist

| Check | Command | Expected | Severity |
|---|---|---|---|
| Root login disabled | `grep PermitRootLogin /etc/ssh/sshd_config` | `no` | Critical |
| Password auth disabled | `grep PasswordAuthentication /etc/ssh/sshd_config` | `no` | High |
| Key auth enabled | `grep PubkeyAuthentication /etc/ssh/sshd_config` | `yes` | High |
| Non-standard port | `grep "^Port" /etc/ssh/sshd_config` | Not 22 (optional) | Medium |
| Max auth tries | `grep MaxAuthTries /etc/ssh/sshd_config` | `3` or less | Medium |
| Idle timeout | `grep ClientAliveInterval /etc/ssh/sshd_config` | Set (e.g., 300) | Low |
| Protocol 2 only | `grep Protocol /etc/ssh/sshd_config` | `2` (default in modern) | Low |
| Allowed users set | `grep AllowUsers /etc/ssh/sshd_config` | Specific users listed | Medium |

### Recommended SSH Config

```
# /etc/ssh/sshd_config — hardened
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowTcpForwarding no
```

### After SSH Changes

```bash
# Validate config before restarting
sudo sshd -t

# Restart SSH
sudo systemctl restart sshd
```

---

## Firewall Audit

### UFW (Ubuntu/Debian)

```bash
# Status
sudo ufw status verbose

# List rules with numbers
sudo ufw status numbered

# Check default policies
sudo ufw show raw | head -20
```

**Expected defaults:**
- Incoming: DENY
- Outgoing: ALLOW
- Only required ports open (22/SSH, 80/443 if web server, etc.)

### Firewalld (Arch/RHEL)

```bash
# Active zone and rules
sudo firewall-cmd --list-all

# List all zones
sudo firewall-cmd --get-active-zones

# Check specific port
sudo firewall-cmd --query-port=8080/tcp
```

### Iptables (Raw)

```bash
# List all rules
sudo iptables -L -n -v

# Check for wide-open rules
sudo iptables -L -n | grep "0.0.0.0/0.*ACCEPT"
```

---

## Open Port Audit

### Discover Listening Ports

```bash
# All listening TCP ports with process names
ss -tlnp

# All listening UDP ports
ss -ulnp

# Combined with process info (requires root for all)
sudo ss -tlnp
```

### Evaluate Open Ports

| Port | Service | Should Be Open? | Notes |
|---|---|---|---|
| 22 | SSH | Yes (if needed) | Consider non-standard port |
| 53 | DNS (Pi-hole) | Yes (local only) | Should not face internet |
| 80/443 | HTTP/HTTPS | Depends | Only if serving web content |
| 3000 | Gitea | Yes (local only) | Should not face internet |
| 9222 | NAS SSH | Yes (local only) | Non-standard port, good |
| 11434 | Ollama | Yes (local only) | AI inference endpoint |

### Scan from External Perspective

```bash
# Scan a host from this machine
nmap -sT -O <target-ip>

# Quick scan common ports
nmap -F <target-ip>

# Scan specific port range
nmap -p 1-1024 <target-ip>
```

---

## User and Permission Audit

### Check Users

```bash
# Users with login shells (potential interactive users)
grep -v "nologin\|false" /etc/passwd | cut -d: -f1

# Users with UID 0 (root-level)
awk -F: '$3 == 0 {print $1}' /etc/passwd

# Users in sudo group
getent group sudo | cut -d: -f4
getent group wheel | cut -d: -f4  # Arch/RHEL
```

### Check Permissions

```bash
# World-writable files (security risk)
find / -type f -perm -o+w 2>/dev/null | head -20

# SUID binaries (potential privilege escalation)
find / -type f -perm -4000 2>/dev/null

# Check home directory permissions
ls -la /home/
```

### Check Sudoers

```bash
# View sudoers (never edit directly, use visudo)
sudo cat /etc/sudoers
sudo ls -la /etc/sudoers.d/
```

---

## Fail2ban Integration

### Check Status

```bash
# Fail2ban status
sudo fail2ban-client status

# SSH jail specifically
sudo fail2ban-client status sshd

# Banned IPs
sudo fail2ban-client get sshd banip --with-time
```

### Recommended Jail Config

```ini
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
```

---

## Severity Ratings

When reporting audit findings, rate each item:

| Severity | Meaning | Action |
|---|---|---|
| Critical | Actively exploitable, immediate risk | Fix now |
| High | Significant risk, should fix soon | Fix within 24h |
| Medium | Moderate risk, best practice violation | Fix within a week |
| Low | Minor improvement, defense-in-depth | Fix when convenient |
| Info | Observation, no action needed | Document only |

---

## Audit Report Format

When delivering an audit, structure it as:

1. **Executive Summary** — Overall health rating, critical findings count
2. **Critical Findings** — Items that need immediate attention
3. **Recommendations** — Prioritized list with severity, fix commands, and reasoning
4. **What's Good** — Positive findings (acknowledge what's already well-configured)

---

_Kai skill — Security auditing and server hardening_
