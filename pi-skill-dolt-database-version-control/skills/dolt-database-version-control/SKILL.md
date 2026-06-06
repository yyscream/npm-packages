---
name: dolt-database-version-control
description: Use automatically when evaluating or applying Dolt, the Git-like version-controlled SQL database, for database branching, merging, diffs, audit history, rollback, data collaboration, DoltHub, or versioned MySQL replica workflows.
license: MIT
---

# Dolt Database Version Control

Use this skill to decide how, when, why, and where to use Dolt, and to produce safe adoption plans for Dolt-backed systems.

## When to use

Use this skill when the user asks about any of the following:

- Dolt, DoltHub, Hosted Dolt, DoltLab, DoltgreSQL/Doltgres, or "Git for data".
- Version-controlling relational data with branches, commits, diffs, merges, remotes, or pull-request-like workflows.
- Adding audit history, rollback, review-before-publish, or branch-per-user changes to an application database.
- Creating a versioned MySQL or MariaDB replica for queryable history, disaster recovery, debugging, or change-data-capture-like workflows.
- Comparing Dolt against Git+CSV, temporal tables, soft deletes, slowly changing dimensions, CDC pipelines, event sourcing, plain MySQL, or Postgres.
- Designing commands, SQL procedures, or rollout checks for a Dolt proof of concept.

Do not use this skill for generic Git, generic SQL, or generic MySQL/Postgres administration unless Dolt or database version control is materially involved.

## Inputs and assumptions

Before recommending Dolt, identify:

- The current database engine, SQL dialect, schema size, write/read throughput, data sensitivity, and deployment topology.
- Whether the goal is application-primary storage, collaborative dataset management, audit/disaster recovery, local agent memory, or a versioned replica beside an existing database.
- Whether MySQL-compatible clients are acceptable. If Postgres compatibility is mandatory, treat Doltgres/DoltgreSQL as a separate maturity decision and verify current status from official sources.
- Whether immutable history conflicts with retention, privacy, right-to-erasure, or secret-handling requirements.
- Whether users need branch/merge conflict resolution and who will review or resolve conflicts.

Use `references/dolt-guide.md` as the packaged baseline. For current versions, installation commands, hosted offerings, maturity labels, or production claims, verify against official Dolt docs or the DoltHub GitHub repositories before finalizing.

## Portable workflow

1. **Classify the Dolt job**
   - `primary-app-db`: Dolt is the serving SQL database and the app uses branches, diffs, logs, rollback, or review workflows.
   - `collaborative-data-repo`: Dolt is used from the CLI for CSV/table data collaboration, remotes, pull/push, and reproducible datasets.
   - `versioned-replica`: Dolt follows an existing MySQL/MariaDB primary to provide an immutable, queryable audit log and recovery aid.
   - `evaluation-only`: the user needs a recommendation, comparison, architecture review, or proof-of-concept plan.

2. **State why Dolt is or is not a fit**
   - Strong fit: relational data needs Git-like branch/merge/diff/log/rollback semantics; application users need review-before-publish; teams need local clones/remotes for data; auditors need row/cell history; operators want a versioned replica of MySQL.
   - Weak fit: the system only needs ordinary backups, simple CRUD, or append-only analytics; the team cannot tolerate MySQL-compatibility gaps; write throughput requires multi-primary horizontal scaling; conflict resolution has no clear owner; immutable history is a liability.

3. **Choose where Dolt belongs**
   - In the serving path as a MySQL-compatible database server when app features require branchable versioned data.
   - Next to an existing MySQL/MariaDB primary as a read-only/versioned replica when migration risk is high but audit/history is valuable.
   - On developer machines or CI for import/diff/merge validation of tabular datasets.
   - In DoltHub/Hosted Dolt/DoltLab workflows when the team needs hosted collaboration, cloud operation, or self-hosted sharing.

4. **Plan how to use it**
   - Start with a throwaway repository or isolated server; never begin on production data.
   - Configure commit identity with `dolt config --global --add user.name ...` and `dolt config --global --add user.email ...`.
   - For CLI workflows, use Git-like commands: `dolt init`, `dolt table import`, `dolt status`, `dolt add`, `dolt commit`, `dolt diff`, `dolt branch`, `dolt checkout`, `dolt merge`, `dolt log`, `dolt push`, and `dolt pull`.
   - For SQL workflows, use a MySQL-compatible client with `dolt sql-server`; read version-control state through system tables/table functions such as `dolt_log`, `dolt_status`, `dolt_diff(...)`, and `dolt_history_<table>`; write version-control state through procedures such as `DOLT_ADD`, `DOLT_COMMIT`, `DOLT_CHECKOUT`, and `DOLT_MERGE`.
   - Prefer primary keys for tables so diffs and merges are meaningful.
   - For versioned replicas, validate row-based binlog replication, GTID auto-positioning, unique `server_id`, replica warming, and restart/filter behavior before relying on it.

5. **Produce an adoption recommendation**
   - Include: recommended Dolt role, fit rationale, commands or SQL sketch, migration/rollback path, operational risks, validation checklist, and a confidence level.
   - Separate verified facts from assumptions and explicitly name anything that still needs benchmark, compatibility, or production testing.

## Decision checklist

Answer these before saying "use Dolt":

- What exact version-control feature is needed: branch, merge, diff, log, blame/history, rollback, remote sync, or pull-request-style review?
- Is MySQL compatibility acceptable for the application and tooling?
- Can the workload fit a single primary write bottleneck with read replicas, or is a different database architecture required?
- How will branch conflicts be detected, reviewed, and resolved?
- Which data may not be stored in immutable history?
- What proof will show Dolt works here: client compatibility tests, SQL syntax coverage, import size, write throughput, merge behavior, replication drift checks, backup/restore, or disaster-recovery drill?

## Safety and side effects

- Ask for confirmation before commands that mutate, delete, rewrite, publish, or connect production systems: `dolt reset --hard`, `dolt clean`, `dolt gc`, `dolt filter-branch`, destructive SQL, replication reconfiguration, remote `push`, or production imports.
- Do not run install commands requiring root/admin privileges unless the user explicitly approves.
- Do not claim Dolt is a drop-in replacement for a specific MySQL workload until the user's schema, queries, migrations, clients, and operational requirements have been tested.
- Treat Dolt history as durable. Do not import secrets, regulated data, or personal data without an explicit retention/privacy plan.
- For replication, do not change binlog/GTID settings on a production primary without a reviewed database operations plan.
- Prefer read-only diagnostics and disposable proof-of-concept repositories before touching live databases.

## Scripts, references, and dependencies

- Reference guide: `references/dolt-guide.md`.
- Contract tests: `tests/test_contract.py`.
- No runtime dependencies are bundled.
- Optional external tools, depending on the user's task: `dolt`, a MySQL-compatible client, Docker, or access to official Dolt documentation.

## Verification

For skill/package maintenance, from the package root run:

```bash
npm test
npm pack --dry-run
```

For a Dolt recommendation or proof of concept, verify with the smallest relevant checks:

```bash
dolt version
dolt status
dolt log
dolt diff
```

SQL server checks, when applicable:

```sql
SELECT active_branch();
SELECT * FROM dolt_log LIMIT 5;
SELECT * FROM dolt_status;
CALL DOLT_COMMIT('-am', 'test commit');
```

Application checks should include client/ORM connection, migration replay, representative queries, branch/merge scenarios, backup/restore, and workload benchmarks before production use.

## Pi adapter

- In Pi, use web/documentation search for current Dolt facts before making version-specific, release-specific, or hosted-service claims.
- For unfamiliar repositories, inspect the project structure before recommending Dolt integration points.
- If the user wants this skill enabled after installation, ask before changing Pi settings or symlinks.
