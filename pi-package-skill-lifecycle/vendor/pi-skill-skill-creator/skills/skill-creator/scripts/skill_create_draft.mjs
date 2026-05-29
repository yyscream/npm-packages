#!/usr/bin/env node
import { runCli } from "./skill_creator_lib.mjs";

const code = await runCli(process.argv.slice(2));
process.exitCode = code;
