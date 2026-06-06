# Dolt guide: how, when, why, and where to use it

This reference is a source-backed baseline for the `dolt-database-version-control` skill. Verify current release, platform, and production details from official sources before making time-sensitive claims.

## Source baseline

Checked on 2026-06-06 against these primary sources:

- Dolt docs, Version Controlled Database: https://docs.dolthub.com/introduction/getting-started/database
- Dolt docs, Git for Data: https://docs.dolthub.com/introduction/getting-started/git-for-data
- Dolt docs, Version Control in Dolt: https://docs.dolthub.com/sql-reference/version-control
- Dolt docs, Version Control Your Application: https://docs.dolthub.com/introduction/use-cases/vc-your-app
- Dolt docs, Versioned MySQL Replica: https://docs.dolthub.com/introduction/use-cases/versioned-replica
- Dolt docs, MySQL to Dolt Replication: https://docs.dolthub.com/guides/binlog-replication
- Dolt FAQ: https://docs.dolthub.com/other/faq.md
- Dolt GitHub repository: https://github.com/dolthub/dolt

## What Dolt is

Dolt is a version-controlled SQL database. Its official materials describe it as "Git for Data": Git versions files; Dolt versions tables. Dolt can run as a MySQL-compatible database server, and it also has a Git-like CLI.

Core model:

- Tables, schemas, and rows live in a commit graph.
- CLI commands mirror Git concepts: `init`, `status`, `add`, `commit`, `diff`, `log`, `branch`, `checkout`, `merge`, `clone`, `pull`, and `push`.
- SQL clients can access version-control reads through system tables/functions and writes through stored procedures.
- Dolt supports branches, commits, diffs, merges, conflicts, remotes, time-travel/history queries, rollback/revert, backups, and replication.
- Dolt itself is Apache-2.0 licensed according to the `dolthub/dolt` repository license.

## Why use Dolt

Use Dolt when version control is a database feature, not just an operational backup concern:

- Review changes to relational data before they go live.
- Give users or agents isolated branches, then merge reviewed changes into `main`.
- Query who changed data, when, and how, including row/cell-level lineage through history/diff tables.
- Roll back bad updates with database-aware diffs and patches.
- Clone and share datasets with Git-like remotes.
- Build application-level pull-request workflows without adding soft-delete or slowly-changing-dimension columns to every table.
- Add queryable history beside an existing MySQL/MariaDB deployment through a versioned replica.

## When Dolt is a strong fit

### Primary application database

Best when the application itself needs branchable, mergeable data:

- Customer configuration, rules, catalogs, CMS-like content, pricing, network source-of-truth, or reference data that needs review before publication.
- Multi-user editing where every user/session/agent can work on a branch.
- Apps that need `diff`, `log`, `merge`, rollback, or pull-request-like behavior in the data layer.

### Collaborative data repository

Best when data is tabular and teams currently trade CSVs, scripts, dumps, or Git-tracked artifacts:

- Import CSVs with primary keys, inspect diffs, commit changes, push/pull remotes.
- Keep reproducible historical datasets with SQL querying.

### Versioned MySQL replica

Best when an existing MySQL/MariaDB primary should remain in place, but the team wants queryable history:

- Dolt consumes binlog replication events and creates Dolt commits.
- Useful for auditing, disaster recovery, debugging production data locally, and change-data-capture-like analysis.
- The docs call MySQL-to-Dolt replication a convenient way to try Dolt without migrating the primary.

## When not to use Dolt, or when to pause

Pause before adopting Dolt when:

- The team does not need branches, merges, diffs, history, rollback, or review workflows.
- The workload is write-throughput bound beyond a single-primary architecture.
- The application depends on unsupported MySQL syntax or behavior; Dolt aims for broad MySQL compatibility but still requires workload-specific validation.
- Postgres compatibility is mandatory. Doltgres/DoltgreSQL exists, but its maturity should be verified separately before production commitments.
- Immutable history conflicts with privacy, retention, right-to-erasure, or secret-management obligations.
- No team or workflow owns branch conflict resolution.
- The problem is primarily analytics warehousing, search, event streaming, or multi-primary global writes rather than versioned relational OLTP data.

## Where Dolt can run

- Local CLI repository for dataset collaboration and proof-of-concept work.
- `dolt sql-server` as a MySQL-compatible server for applications and SQL workbenches.
- Docker images: official README lists `dolthub/dolt` for CLI and `dolthub/dolt-sql-server` for server mode.
- Hosted/cloud collaboration: DoltHub for shared data, Hosted Dolt for managed server operation, and DoltLab for self-hosted DoltHub-like sharing.
- Beside MySQL/MariaDB as a versioned replica consuming binlog events.

## How to use Dolt: starter patterns

### CLI "Git for Data" pattern

```bash
dolt config --global --add user.name "Your Name"
dolt config --global --add user.email "you@example.com"
mkdir my-data && cd my-data
dolt init
dolt table import --create-table --pk id customers customers.csv
dolt status
dolt add customers
dolt commit -m "Import customers"
dolt diff
dolt branch experiment
dolt checkout experiment
```

Notes:

- Configure `user.name` and `user.email` before committing.
- Prefer primary keys. Dolt uses primary keys to identify rows across versions, making diffs and merges more useful.

### SQL server pattern

```bash
dolt sql-server
mysql --host 127.0.0.1 --port 3306 -u root
```

Useful SQL examples:

```sql
CALL DOLT_ADD('customers');
CALL DOLT_COMMIT('-m', 'Commit customers');
SELECT * FROM dolt_log;
SELECT * FROM dolt_status;
CALL DOLT_CHECKOUT('-b', 'review-branch');
SELECT * FROM customers AS OF 'main';
SELECT * FROM dolt_diff('main', 'review-branch', 'customers');
CALL DOLT_MERGE('review-branch');
```

Remember: SQL `COMMIT` commits a transaction / working-set change. `DOLT_COMMIT()` creates a Dolt commit on the current branch.

### Versioned replica pattern

Before using MySQL/MariaDB -> Dolt replication, validate at least:

- Row-based binlog replication.
- GTID mode and GTID auto-positioning.
- Non-zero/unique `server_id` values.
- Replica warming with a consistent dump when required.
- Restart behavior and replication filters.
- Drift detection or reconciliation approach.

The official replication docs list limitations including syntax gaps, only the default replication channel, limited filter support, and no replication checksum validation in the documented implementation.

## Evaluation scorecard

| Criterion | Good sign | Risk sign |
|---|---|---|
| Version-control need | Users need branch, merge, diff, log, rollback, remotes, or review | Only ordinary backup/audit is needed |
| SQL compatibility | MySQL-compatible clients and syntax are acceptable | Postgres-only or MySQL edge syntax is required |
| Data model | Relational tables with stable primary keys | Unkeyed blobs/events where merges are meaningless |
| Operations | Single writer primary plus read replicas is acceptable | Multi-primary global writes or very high write throughput |
| Governance | Immutable history is desirable | Retention/erasure constraints conflict with history |
| Workflow | Conflict owner and review process are clear | No owner for conflicts or branch lifecycle |
| Adoption path | Disposable POC, migration rollback, benchmarks | Direct production cutover without compatibility proof |

## Minimum proof-of-concept checklist

- Install Dolt from an official package/source for the target platform.
- Load representative schema and data.
- Run representative application queries and migrations.
- Exercise branch, diff, merge, conflict, rollback, and history queries.
- Benchmark representative write/read workloads.
- Test backup/restore or remote clone/push/pull as applicable.
- If using replication, test replica warming, replication lag, restart, filters, failure recovery, and drift checks.
- Document privacy/retention implications of immutable history.

## Recommendation language

Use precise language:

- "Dolt is a strong fit if the product needs Git-like branch/merge/diff/review semantics over relational data."
- "Dolt can be trialed as a versioned MySQL replica before replacing a primary database."
- "Dolt is not automatically a safe drop-in for this workload; validate SQL compatibility, migrations, client behavior, and performance."
- "If Postgres compatibility is mandatory, evaluate Doltgres separately and verify current maturity from official sources."
