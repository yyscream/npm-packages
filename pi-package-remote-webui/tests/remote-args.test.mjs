import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PORT,
  buildRemoteWidgetLines,
  formatStatus,
  generateQrLines,
  parseRemoteArgs,
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

test("parseRemoteArgs rejects invalid ports and unknown options", () => {
  assert.throws(() => parseRemoteArgs("--port 70000"), /port/i);
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

test("formatStatus renders offline and online states", () => {
  assert.match(formatStatus({ online: false, url: "http://127.0.0.1:31415/", health: { error: "offline" } }), /Online:\s+no/);
  assert.match(
    formatStatus({
      online: true,
      url: "http://192.168.1.20:31415/",
      health: { data: { webuiVersion: "0.3.8" } },
      network: { open: true, host: "0.0.0.0", port: 31415, networkUrls: ["http://192.168.1.20:31415/"] },
    }),
    /open to LAN/,
  );
});

test("buildRemoteWidgetLines includes QR, URL, and close instruction", () => {
  const lines = buildRemoteWidgetLines({
    url: "http://192.168.1.20:31415/",
    qrLines: ["QR-A", "QR-B"],
    started: true,
  });
  assert(lines.includes("QR-A"));
  assert(lines.includes("http://192.168.1.20:31415/"));
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
