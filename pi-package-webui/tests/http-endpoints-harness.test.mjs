import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, stat } from "node:fs/promises";
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
  env: {
    ...process.env,
    GIT_AUTHOR_NAME: "Pi WebUI Test",
    GIT_AUTHOR_EMAIL: "pi-webui-test@example.invalid",
    GIT_COMMITTER_NAME: "Pi WebUI Test",
    GIT_COMMITTER_EMAIL: "pi-webui-test@example.invalid",
  },
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

  // Static assets: brotli/gzip compression plus ETag revalidation (P0-2).
  const brotliResponse = await fetch(`http://127.0.0.1:${port}/app.js`, {
    headers: { "accept-encoding": "br, gzip" },
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(brotliResponse.status, 200);
  assert.equal(brotliResponse.headers.get("content-encoding"), "br", "app.js should be served brotli-compressed");
  assert.equal(brotliResponse.headers.get("cache-control"), "no-cache", "static assets should allow ETag revalidation");
  assert.equal(brotliResponse.headers.get("vary"), "Accept-Encoding");
  const appEtag = brotliResponse.headers.get("etag");
  assert.ok(appEtag, "app.js response should carry an ETag");
  // Node fetch transparently decompresses; equal size proves the brotli
  // round-trip reproduced the exact raw asset.
  const appBody = await brotliResponse.arrayBuffer();
  const rawAppSize = (await stat(join(root, "public", "app.js"))).size;
  assert.equal(appBody.byteLength, rawAppSize, "decompressed app.js should match the raw file byte-for-byte in size");

  const conditionalResponse = await fetch(`http://127.0.0.1:${port}/app.js`, {
    headers: { "if-none-match": appEtag },
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(conditionalResponse.status, 304, "matching If-None-Match should return 304");
  await conditionalResponse.arrayBuffer();

  const gzipResponse = await fetch(`http://127.0.0.1:${port}/styles.css`, {
    headers: { "accept-encoding": "gzip" },
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(gzipResponse.status, 200);
  assert.equal(gzipResponse.headers.get("content-encoding"), "gzip", "styles.css should fall back to gzip");
  await gzipResponse.arrayBuffer();

  const tabsResponse = await request("127.0.0.1", "/api/tabs");
  assert.equal(tabsResponse.status, 200);
  const tabList = tabsResponse.body?.data?.tabs || tabsResponse.body?.tabs || [];
  assert.equal(tabList.length, 1, "startup should create one tab for --cwd");
  const tabId = tabList[0].id;
  assert.ok(tabId, "tab should have an id");

  const state = await request("127.0.0.1", `/api/state?tab=${encodeURIComponent(tabId)}`);
  assert.equal(state.status, 200);
  assert.equal(state.body?.data?.model?.provider, "fake", "state should come from the fake pi RPC");

  const gitAvailable = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;
  if (gitAvailable) {
    const gitInit = await request("127.0.0.1", "/api/git-workflow/init", { method: "POST", body: { tab: tabId } });
    assert.equal(gitInit.status, 200);
    assert.equal(gitInit.body?.ok, true, "git init endpoint should initialize a temp repository");

    const initFileStatus = await request("127.0.0.1", `/api/git-workflow/init-files-status?tab=${encodeURIComponent(tabId)}`);
    assert.equal(initFileStatus.status, 200);
    assert.equal(initFileStatus.body?.ok, true, "init files status endpoint should check README.md and .gitignore");
    assert.equal(initFileStatus.body?.data?.readmeExists, false);
    assert.equal(initFileStatus.body?.data?.gitignoreExists, false);

    const gitReadme = await request("127.0.0.1", "/api/git-workflow/readme", { method: "POST", body: { repoName: "pi-webui-http-harness", stack: "Node.js / TypeScript", tab: tabId } });
    assert.equal(gitReadme.status, 200);
    assert.equal(gitReadme.body?.ok, true, "README endpoint should create/stage README.md and .gitignore");
    assert.equal(gitReadme.body?.data?.readme?.created, true);
    assert.equal(gitReadme.body?.data?.gitignore?.created, true);

    const gitReadmeAgain = await request("127.0.0.1", "/api/git-workflow/readme", { method: "POST", body: { repoName: "pi-webui-http-harness", stack: "Node.js / TypeScript", tab: tabId } });
    assert.equal(gitReadmeAgain.status, 200);
    assert.equal(gitReadmeAgain.body?.ok, true, "README endpoint should re-check existing files without overwriting");
    assert.equal(gitReadmeAgain.body?.data?.readme?.created, false);
    assert.equal(gitReadmeAgain.body?.data?.gitignore?.created, false);

    const gitCommit = await request("127.0.0.1", "/api/git-workflow/initial-commit", { method: "POST", body: { tab: tabId } });
    assert.equal(gitCommit.status, 200);
    assert.equal(gitCommit.body?.ok, true, "initial commit endpoint should commit the staged README.md");

    const gitMain = await request("127.0.0.1", "/api/git-workflow/main-branch", { method: "POST", body: { tab: tabId } });
    assert.equal(gitMain.status, 200);
    assert.equal(gitMain.body?.ok, true, "main branch endpoint should rename the branch");

    const gitRemote = await request("127.0.0.1", "/api/git-workflow/remote", { method: "POST", body: { username: "Firstp1ck", repoName: "pi-webui-http-harness", tab: tabId } });
    assert.equal(gitRemote.status, 200);
    assert.equal(gitRemote.body?.ok, true, "remote endpoint should add origin without pushing");
    assert.equal(gitRemote.body?.data?.remoteUrl, "https://github.com/Firstp1ck/pi-webui-http-harness.git");
  } else {
    console.log("http-endpoints-harness: git not available; skipping git init workflow endpoint checks");
  }

  // Delta transcript endpoint (P1-1): ?since= returns only the tail plus merge metadata.
  const fullMessages = await request("127.0.0.1", `/api/messages?tab=${encodeURIComponent(tabId)}`);
  assert.equal(fullMessages.status, 200);
  assert.equal((fullMessages.body?.data?.messages || []).length, 3, "fake pi should provide a 3-message transcript");
  assert.equal(fullMessages.body?.data?.totalCount, undefined, "full fetches should keep the legacy payload shape");

  const deltaMessages = await request("127.0.0.1", `/api/messages?since=2&tab=${encodeURIComponent(tabId)}`);
  assert.equal(deltaMessages.status, 200);
  assert.equal(deltaMessages.body?.data?.since, 2);
  assert.equal(deltaMessages.body?.data?.totalCount, 3);
  assert.equal((deltaMessages.body?.data?.messages || []).length, 1, "since=2 should return only the tail message");
  assert.equal(deltaMessages.body?.data?.messages?.[0]?.content, "fake follow-up");

  const clampedMessages = await request("127.0.0.1", `/api/messages?since=99&tab=${encodeURIComponent(tabId)}`);
  assert.equal(clampedMessages.status, 200);
  assert.equal(clampedMessages.body?.data?.since, 3, "since beyond the transcript should clamp to the total count");
  assert.equal((clampedMessages.body?.data?.messages || []).length, 0);

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
