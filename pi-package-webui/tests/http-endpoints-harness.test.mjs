import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { networkInterfaces, tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverScript = join(root, "bin", "pi-webui.mjs");
const fakePi = join(root, "tests", "fixtures", "fake-pi.mjs");
const port = 30000 + Math.floor(Math.random() * 20000);

function lanAddress() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return undefined;
}

async function request(host, pathname, { method = "GET", body, timeoutMs = 5_000 } = {}) {
  const response = await fetch(`http://${host}:${port}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  return { status: response.status, body: payload };
}

const cwd = await mkdtemp(path.join(tmpdir(), "pi-webui-http-harness-"));
await chmod(fakePi, 0o755);

const child = spawn(process.execPath, [serverScript, "--cwd", cwd, "--host", "0.0.0.0", "--port", String(port), "--pi", fakePi], {
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
child.stdout.on("data", (chunk) => {
  serverOutput += String(chunk);
});
child.stderr.on("data", (chunk) => {
  serverOutput += String(chunk);
});

try {
  // Wait for the HTTP server to accept requests.
  let health;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) break;
    try {
      health = await request("127.0.0.1", "/api/health", { timeoutMs: 1_000 });
      if (health.status === 200) break;
    } catch {
      // Server not listening yet.
    }
    await delay(200);
  }
  assert.equal(health?.status, 200, `server should become healthy, output:\n${serverOutput}`);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.piRunning, true, "fake pi RPC process should be attached and running");

  const tabsResponse = await request("127.0.0.1", "/api/tabs");
  assert.equal(tabsResponse.status, 200);
  const tabList = tabsResponse.body?.data?.tabs || tabsResponse.body?.tabs || [];
  assert.equal(tabList.length, 1, "startup should create one tab for --cwd");
  const tabId = tabList[0].id;
  assert.ok(tabId, "tab should have an id");

  const state = await request("127.0.0.1", `/api/state?tab=${encodeURIComponent(tabId)}`);
  assert.equal(state.status, 200);
  assert.equal(state.body?.data?.model?.provider, "fake", "state should come from the fake pi RPC");

  // Native slash command routed through the adapter (/copy → get_last_assistant_text).
  const copy = await request("127.0.0.1", "/api/prompt", {
    method: "POST",
    body: { message: "/copy", tab: tabId },
  });
  assert.equal(copy.status, 200);
  assert.equal(copy.body?.data?.status, "succeeded", "native /copy should succeed through the adapter");
  assert.equal(copy.body?.data?.copyText, "fake last text");

  // Bash FIFO queue: concurrent requests must execute serially on the RPC.
  const [bashA, bashB] = await Promise.all([
    request("127.0.0.1", "/api/bash", { method: "POST", body: { command: "echo a", tab: tabId }, timeoutMs: 10_000 }),
    request("127.0.0.1", "/api/bash", { method: "POST", body: { command: "echo b", tab: tabId }, timeoutMs: 10_000 }),
  ]);
  assert.equal(bashA.status, 200);
  assert.equal(bashB.status, 200);
  for (const result of [bashA, bashB]) {
    assert.equal(result.body?.data?.output, "peak:1", "bash queue must never run two commands concurrently");
  }

  // Session-dir confinement: traversal targets are rejected even from localhost.
  const traversalDelete = await request("127.0.0.1", "/api/session-delete", {
    method: "POST",
    body: { sessionPath: path.join(cwd, "outside.jsonl"), confirmed: true, tab: tabId },
  });
  assert.equal(traversalDelete.status, 403, "session delete outside the session dir must return 403");
  assert.match(String(traversalDelete.body?.error || ""), /session directory/i);

  const lan = lanAddress();
  if (lan) {
    const remoteDelete = await request(lan, "/api/session-delete", {
      method: "POST",
      body: { sessionPath: path.join(cwd, "outside.jsonl"), confirmed: true, tab: tabId },
    });
    assert.equal(remoteDelete.status, 403, "session delete must be localhost-only");

    const remoteExport = await request(lan, "/api/prompt", {
      method: "POST",
      body: { message: "/export", tab: tabId },
    });
    assert.equal(remoteExport.status, 200, "guarded slash commands return blocked adapter cards, not raw HTTP errors");
    assert.equal(remoteExport.body?.data?.status, "blocked", "guards-driven dispatch must block /export for LAN clients");

    const remoteClose = await request(lan, "/api/network/close", { method: "POST" });
    assert.equal(remoteClose.status, 403, "network close must be localhost-only");
  } else {
    console.log("http-endpoints-harness: no LAN address detected; skipping remote-client checks");
  }

  const localClose = await request("127.0.0.1", "/api/network/close", { method: "POST" });
  assert.equal(localClose.status, 202, "network close from localhost should be accepted");

  const shutdownResponse = await request("127.0.0.1", "/api/shutdown", { method: "POST" });
  assert.equal(shutdownResponse.status, 200);

  for (let attempt = 0; attempt < 50 && child.exitCode === null; attempt++) {
    await delay(100);
  }
  assert.notEqual(child.exitCode, null, "server should exit after /api/shutdown");
} finally {
  if (child.exitCode === null) child.kill("SIGKILL");
  await rm(cwd, { recursive: true, force: true });
}

console.log("http-endpoints-harness.test.mjs passed");
