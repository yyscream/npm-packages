import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_PORT,
  REMOTE_CONTROLS_PAYLOAD_TYPE,
  buildRemoteControlsPayload,
  buildRemoteWidgetLines,
  formatStatus,
  generateQrLines,
  parseRemoteArgs,
  remoteAuthQrUrl,
  requiresOpenConfirmation,
  selectLanUrl,
  tokenizeArgs,
} from "../lib/remote-core.mjs";

test("tokenizeArgs handles quoted values", () => {
  assert.deepEqual(tokenizeArgs('status --name "mobile phone" --port 31500'), ["status", "--name", "mobile phone", "--port", "31500"]);
});

test("parseRemoteArgs defaults to open on the default port", () => {
  assert.deepEqual(parseRemoteArgs(""), {
    action: "open",
    port: DEFAULT_PORT,
    name: undefined,
    yes: false,
  });
});

test("parseRemoteArgs supports action, port, name, and confirmation bypass", () => {
  assert.deepEqual(parseRemoteArgs('status --port 31500 --name "mobile phone" --yes'), {
    action: "status",
    port: 31500,
    name: "mobile phone",
    yes: true,
  });
});

test("parseRemoteArgs supports numeric port shortcut", () => {
  assert.deepEqual(parseRemoteArgs("refresh 31501 -y"), {
    action: "refresh",
    port: 31501,
    name: undefined,
    yes: true,
  });
});

test("parseRemoteArgs supports Remote PIN auth actions", () => {
  assert.deepEqual(parseRemoteArgs("auth on --port 31502 --yes"), {
    action: "auth",
    port: 31502,
    name: undefined,
    yes: true,
    authEnabled: true,
  });
  assert.deepEqual(parseRemoteArgs("auth off"), {
    action: "auth",
    port: DEFAULT_PORT,
    name: undefined,
    yes: false,
    authEnabled: false,
  });
});

test("parseRemoteArgs rejects invalid ports, auth actions, and unknown options", () => {
  assert.throws(() => parseRemoteArgs("--port 70000"), /port/i);
  assert.throws(() => parseRemoteArgs("auth maybe"), /Unknown option|requires on or off/);
  assert.throws(() => parseRemoteArgs("--bogus"), /Unknown option/);
});

test("requiresOpenConfirmation is only bypassed for /remote --yes", () => {
  assert.equal(requiresOpenConfirmation(parseRemoteArgs("")), true);
  assert.equal(requiresOpenConfirmation(parseRemoteArgs("--yes")), false);
  assert.equal(requiresOpenConfirmation(parseRemoteArgs("status")), false);
});

test("selectLanUrl chooses the first HTTP LAN URL", () => {
  assert.equal(
    selectLanUrl({ networkUrls: ["ftp://ignored", "http://192.168.1.20:31415/", "http://10.0.0.5:31415/"] }),
    "http://192.168.1.20:31415/",
  );
});

test("remoteAuthQrUrl embeds an available remote PIN in a URL fragment auth link", () => {
  assert.equal(
    remoteAuthQrUrl("http://192.168.1.20:31415/", { auth: { enabled: true, pin: "1234" } }),
    "http://192.168.1.20:31415/remote-auth?return=%2F#pin=1234",
  );
  assert.equal(
    remoteAuthQrUrl("http://192.168.1.20:31415/tree?tab=abc", { auth: { enabled: true, pin: "1234" } }),
    "http://192.168.1.20:31415/remote-auth?return=%2Ftree%3Ftab%3Dabc#pin=1234",
  );
  assert.equal(
    remoteAuthQrUrl("http://192.168.1.20:31415/", { auth: { enabled: true } }),
    "http://192.168.1.20:31415/",
  );
});

test("formatStatus renders offline, online, and auth states", () => {
  assert.match(formatStatus({ online: false, url: "http://127.0.0.1:31415/", health: { error: "offline" } }), /Online:\s+no/);
  const onlineStatus = formatStatus({
    online: true,
    url: "http://192.168.1.20:31415/",
    health: { data: { webuiVersion: "0.3.8" } },
    network: { open: true, host: "0.0.0.0", port: 31415, networkUrls: ["http://192.168.1.20:31415/"], auth: { enabled: true, pin: "1234" } },
  });
  assert.match(onlineStatus, /open to LAN/);
  assert.match(onlineStatus, /Remote PIN auth: on · PIN 1234/);
});

test("buildRemoteControlsPayload declares browser control commands", () => {
  const payload = buildRemoteControlsPayload({ port: 31503 });
  assert.equal(payload.type, REMOTE_CONTROLS_PAYLOAD_TYPE);
  assert.equal(payload.featureId, "remoteWebui");
  assert.equal(payload.port, 31503);
  assert.equal(payload.commands.open, "/remote --port 31503");
  assert.equal(payload.commands.authOn, "/remote auth on --port 31503");
});

test("buildRemoteWidgetLines includes QR, URL, auth state, and close instruction", () => {
  const lines = buildRemoteWidgetLines({
    url: "http://192.168.1.20:31415/",
    qrLines: ["QR-A", "QR-B"],
    network: { auth: { enabled: true, pin: "1234" } },
    started: true,
  });
  assert(lines.includes("QR-A"));
  assert(lines.includes("http://192.168.1.20:31415/"));
  assert(lines.some((line) => line.includes("PIN 1234")));
  assert(lines.some((line) => line.includes("QR signs in")));
  assert(lines.some((line) => line.includes("/remote close")));
  assert(lines.some((line) => line.includes("Started a Pi Web UI server")));
});

test("generateQrLines accepts an injected QR module", async () => {
  const lines = await generateQrLines("http://example.test/", {
    qrcodeModule: {
      generate(value, options, callback) {
        assert.equal(value, "http://example.test/");
        assert.equal(options.small, true);
        callback("QR\nCODE");
      },
    },
  });
  assert.deepEqual(lines, ["QR", "CODE"]);
});

test("generateQrLines reports QR failures without duplicating the URL", async () => {
  const lines = await generateQrLines("http://example.test/", {
    qrcodeModule: {
      generate() {
        throw new Error("boom");
      },
    },
  });
  assert.deepEqual(lines, ["[QR generation failed: boom]"]);
});

test("extension asks whether to activate Remote PIN auth while opening /remote", async () => {
  const source = await readFile(new URL("../index.ts", import.meta.url), "utf8");
  assert.match(source, /ctx\.ui\.confirm\("Activate Remote PIN auth\?", AUTH_WARNING\)/);
  assert.match(source, /controller\.setRemoteAuth\(options\.port, true\)/);
  assert.match(source, /prepareNetwork: async \(network: unknown\) => maybeActivateRemoteAuth/);
});

test("extension publishes package-owned Remote WebUI browser controls in RPC mode", async () => {
  const source = await readFile(new URL("../index.ts", import.meta.url), "utf8");
  assert.match(source, /ctx\.mode !== "rpc"/);
  assert.match(source, /ctx\.ui\.setStatus\(REMOTE_CONTROLS_STATUS_KEY, JSON\.stringify\(buildRemoteControlsPayload/);
  assert.match(source, /pi\.on\("session_start"[\s\S]*publishRemoteControls/);
});
