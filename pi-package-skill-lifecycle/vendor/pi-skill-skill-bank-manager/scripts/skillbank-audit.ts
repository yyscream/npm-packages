#!/usr/bin/env bun
import { auditSkillBank, DEFAULT_REPORT_PATH, writeAuditReport } from "../src/audit";

const outputPath = process.argv[2] || DEFAULT_REPORT_PATH;
const audit = await auditSkillBank({ cwd: process.cwd() });
const written = await writeAuditReport(audit, outputPath);

console.log(`Wrote read-only skill-bank audit to ${written}`);
console.log(`Summary: ${audit.summary.enabled}/${audit.summary.total} enabled, ${audit.summary.highRisk} high risk, ${audit.summary.overlapGroups} overlap groups`);
