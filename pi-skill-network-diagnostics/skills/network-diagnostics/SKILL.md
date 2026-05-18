---
name: network-diagnostics
description: Agents should invoke this skill for connectivity, DNS, Pi-hole, port reachability, routing, firewall reachability, TLS/network timeouts, or service access failures. Provides structured network troubleshooting commands and interpretation.
---

# Network Diagnostics

Diagnose and troubleshoot network issues including connectivity, DNS, ports, and routing.

## Quick Start

### Connectivity Check

```bash
# Check internet connectivity
ping -c 3 1.1.1.1

# Check DNS resolution
dig google.com +short

# Check a local service
curl -s -o /dev/null -w "%{http_code}" http://pi.hole/admin/
```

---

## DNS Diagnostics

### Basic DNS Resolution

```bash
# Resolve via system DNS (Pi-hole)
dig example.com +short

# Resolve via specific DNS server
dig @1.1.1.1 example.com +short   # Cloudflare
dig @8.8.8.8 example.com +short   # Google
dig @pi.hole example.com +short   # Pi-hole

# Reverse DNS lookup
dig -x <ip-address> +short

# Full DNS trace
dig example.com +trace
```

### Pi-hole DNS Analysis

```bash
# Check if Pi-hole is blocking correctly
# Query a known ad domain — should return 0.0.0.0 or NXDOMAIN
dig @pi.hole ads.google.com +short

# Check Pi-hole query log (recent queries via API)
curl -s "http://pi.hole/admin/api.php?getAllQueries=100" | jq '.data | length'

# Check upstream DNS health
curl -s "http://pi.hole/admin/api.php?getForwardDestinations" | jq '.'

# Check if Pi-hole is enabled
curl -s "http://pi.hole/admin/api.php?status" | jq '.status'
```

### DNS Troubleshooting Flow

```
DNS not resolving?
├── Can you ping 1.1.1.1?
│   ├── No → Network/routing issue (not DNS)
│   └── Yes → DNS issue confirmed
│       ├── Does dig @1.1.1.1 work?
│       │   ├── No → Upstream DNS blocked (firewall?)
│       │   └── Yes → Local DNS problem
│       │       ├── Does dig @pi.hole work?
│       │       │   ├── No → Pi-hole issue
│       │       │   │   ├── Is pihole-FTL running?
│       │       │   │   ├── Is port 53 listening?
│       │       │   │   └── Check Pi-hole logs
│       │       │   └── Yes → Client DNS config issue
│       │       │       └── Check /etc/resolv.conf
│       │       └── Is /etc/resolv.conf pointing to Pi-hole?
```

---

## Connectivity Testing

### Layer-by-Layer Diagnosis

```bash
# Layer 1-2: Physical/Link
ip link show              # Interface status
ethtool <interface>       # Link speed, duplex

# Layer 3: Network
ip addr show              # IP addresses
ip route show             # Routing table
ping -c 3 <gateway>      # Gateway reachable?
ping -c 3 1.1.1.1        # Internet reachable?

# Layer 4: Transport
ss -tlnp                  # Listening TCP ports
ss -ulnp                  # Listening UDP ports

# Layer 7: Application
curl -v http://example.com  # HTTP connectivity
```

### Traceroute

```bash
# Standard traceroute
traceroute <host>

# TCP traceroute (bypasses ICMP blocks)
traceroute -T -p 443 <host>

# MTR for continuous monitoring
mtr --report <host>
```

---

## Port Reachability

### Check if a Port is Open

```bash
# From this machine to a target
nc -zv <host> <port>           # Netcat
timeout 3 bash -c "echo > /dev/tcp/<host>/<port>" && echo "open" || echo "closed"

# Check multiple ports
for port in 22 53 80 443 3000 8080 11434; do
  nc -zv <host> $port 2>&1 | grep -E "succeeded|refused"
done
```

### Port Scan (Local Network)

```bash
# Quick scan of a host
nmap -F <host>

# Scan specific ports
nmap -p 22,53,80,443,3000,8080,11434 <host>

# Scan entire local subnet
nmap -sn <local-subnet-cidr>    # Ping sweep (who's online?)
```

### Known Service Ports

| Host | Port | Service | Protocol |
|---|---|---|---|
| pi.hole | 53 | DNS | UDP/TCP |
| pi.hole | 80 | Web UI | HTTP |
| <gitea-host> | 3000 | Gitea | HTTP |
| <nas-host> | <ssh-port> | NAS SSH | SSH |
| <ssh-host> | 22 | SSH server | SSH |
| <ollama-host> | 11434 | Ollama | HTTP |

---

## Network Topology

### Local Network Map

```
Internet
  │
  ▼
[Router/Gateway]
  │
  ├── Pi-hole (DNS) ─── pi.hole:53, :80
  │
  ├── <gitea-or-nas-host> ─── Gitea :3000, NAS SSH :<ssh-port>
  │
  ├── <ssh-host> ─── SSH server :22
  │
  ├── <ollama-host> ─── Ollama :11434
  │
  └── [This machine] ── Workstation
```

### Discover Network Devices

```bash
# ARP table (devices recently seen)
ip neigh show

# Ping sweep
nmap -sn <local-subnet-cidr>

# Check DHCP leases (if accessible)
# Often at router admin page
```

---

## Troubleshooting Workflows

### "Service X is Unreachable"

1. **Ping the host:** `ping -c 3 <host>` — Is the machine up?
2. **Check the port:** `nc -zv <host> <port>` — Is the service listening?
3. **Check locally:** SSH in, run `ss -tlnp | grep <port>` — Is it bound?
4. **Check firewall:** Is the port allowed through?
5. **Check the service:** `systemctl status <service>` — Is it running?
6. **Check logs:** `journalctl -u <service> -n 20` — Any errors?

### "Internet is Slow"

1. **Check DNS:** `time dig google.com` — Slow DNS resolution?
2. **Check latency:** `ping -c 10 1.1.1.1` — High latency?
3. **Check bandwidth:** `curl -o /dev/null -w "%{speed_download}" https://speed.cloudflare.com/__down?bytes=10000000`
4. **Check for packet loss:** `mtr --report -c 20 1.1.1.1`
5. **Check local network:** `iperf3 -c <local-host>` — LAN speed OK?

### "Pi-hole Stopped Blocking Ads"

1. **Check status:** `curl -s "http://pi.hole/admin/api.php?status" | jq '.status'`
2. **Check if disabled:** Someone might have paused it
3. **Check blocklists:** `curl -s "http://pi.hole/admin/api.php?summary" | jq '.gravity_last_updated'`
4. **Update gravity:** `pihole -g` (requires SSH to Pi-hole host)
5. **Check client DNS:** Is the client actually using Pi-hole? `cat /etc/resolv.conf`

---

## Useful One-Liners

```bash
# What's my public IP?
curl -s ifconfig.me

# What's my local IP?
ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1

# Check if a domain is blocked by Pi-hole
dig @pi.hole <domain> +short  # 0.0.0.0 = blocked

# DNS response time
time dig google.com @pi.hole > /dev/null

# Check all network interfaces
ip -br link show
```

---

_Kai skill — Network diagnostics and troubleshooting_
