import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { RemoteWebuiController, closeRemoteWebui, openRemoteWebui } from "../lib/remote-core.mjs";

async function withMockWebui(handler, fn) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    return await fn(port);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

test("openRemoteWebui starts when offline, opens network, and returns a LAN URL", async () => {
  const calls = [];
  let online = false;
  let networkOpen = false;

  await withMockWebui((req, res) => {
    calls.push(`${req.method} ${req.url}`);
    if (req.url === "/api/health" && req.method === "GET") {
      if (!online) return sendJson(res, 503, { ok: false, error: "offline" });
      return sendJson(res, 200, { ok: true, webuiVersion: "0.3.8" });
    }
    if (req.url === "/api/network" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        data: {
          open: networkOpen,
          opening: false,
          closing: false,
          host: networkOpen ? "0.0.0.0" : "127.0.0.1",
          port: 0,
          localUrl: "http://127.0.0.1/",
          networkUrls: networkOpen ? ["http://192.168.1.44:31415/"] : [],
        },
      });
    }
    if (req.url === "/api/network/open" && req.method === "POST") {
      networkOpen = true;
      return sendJson(res, 202, { ok: true, data: { opening: true } });
    }
    sendJson(res, 404, { ok: false, error: "not found" });
  }, async (port) => {
    const controller = new RemoteWebuiController({ sleepImpl: () => Promise.resolve() });
    const result = await openRemoteWebui({ port }, {
      controller,
      startWebui: async () => {
        calls.push("startWebui");
        online = true;
      },
    });

    assert.equal(result.started, true);
    assert.equal(result.url, "http://192.168.1.44:31415/");
    assert.deepEqual(calls, [
      "GET /api/health",
      "startWebui",
      "GET /api/health",
      "GET /api/network",
      "POST /api/network/open",
      "GET /api/network",
    ]);
  });
});

test("openRemoteWebui reuses an already open WebUI", async () => {
  let startCalled = false;

  await withMockWebui((req, res) => {
    if (req.url === "/api/health" && req.method === "GET") return sendJson(res, 200, { ok: true, webuiVersion: "0.3.8" });
    if (req.url === "/api/network" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        data: {
          open: true,
          opening: false,
          closing: false,
          host: "0.0.0.0",
          port: 0,
          localUrl: "http://127.0.0.1/",
          networkUrls: ["http://10.0.0.8:31415/"],
        },
      });
    }
    sendJson(res, 404, { ok: false });
  }, async (port) => {
    const controller = new RemoteWebuiController({ sleepImpl: () => Promise.resolve() });
    const result = await openRemoteWebui({ port }, {
      controller,
      startWebui: async () => {
        startCalled = true;
      },
    });

    assert.equal(startCalled, false);
    assert.equal(result.started, false);
    assert.equal(result.url, "http://10.0.0.8:31415/");
  });
});

test("closeRemoteWebui calls the close endpoint when online", async () => {
  const calls = [];

  await withMockWebui((req, res) => {
    calls.push(`${req.method} ${req.url}`);
    if (req.url === "/api/health" && req.method === "GET") return sendJson(res, 200, { ok: true, webuiVersion: "0.3.8" });
    if (req.url === "/api/network/close" && req.method === "POST") return sendJson(res, 202, { ok: true, data: { open: false } });
    sendJson(res, 404, { ok: false });
  }, async (port) => {
    const controller = new RemoteWebuiController({ sleepImpl: () => Promise.resolve() });
    const result = await closeRemoteWebui({ port }, { controller });

    assert.equal(result.online, true);
    assert.deepEqual(calls, ["GET /api/health", "POST /api/network/close"]);
  });
});
