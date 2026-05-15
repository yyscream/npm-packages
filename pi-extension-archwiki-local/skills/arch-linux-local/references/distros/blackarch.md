# BlackArch Troubleshooting Notes

BlackArch is Arch-based and security/pentest-focused. It may be installed as a full distribution or as repositories/packages added to an Arch-based system.

## Policy

- Use local ArchWiki for shared Arch package, boot, network, filesystem, and service issues.
- Determine whether BlackArch is the base OS or only additional repositories/packages.
- Be cautious around large package groups, custom repositories, and security tools that may intentionally alter network/system behavior.
- Do not run exploit, scanning, credential, or offensive tooling unless the user explicitly requests and the scope is authorized.

## Read-only diagnostics

```bash
cat /etc/os-release
pacman-conf --repo-list
pacman -Q | grep -Ei 'blackarch|nmap|metasploit|burp|wireshark'
uname -r
```
