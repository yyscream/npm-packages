import { setTimeout as sleep } from "node:timers/promises";

export const DEFAULT_PORT = 31415;
export const DEFAULT_LOCAL_HOST = "127.0.0.1";
export const DEFAULT_START_TIMEOUT_MS = 12_000;
export const DEFAULT_NETWORK_TIMEOUT_MS = 8_000;
export const DEFAULT_POLL_MS = 250;

export const REMOTE_WIDGET_KEY = "pi-remote-webui";

const ACTIONS = new Set(["open", "status", "close", "refresh"]);

export function tokenizeArgs(input = "") {
  const tokens = [];
  let current = "";
  let quote;
  let escaped = false;

  for (const char of String(input || "")) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaped) current += "\\";
  if (quote) throw new Error(`Unclosed ${quote} quote`);
  if (current) tokens.push(current);
  return tokens;
}

function takeValue(tokens, index, flag) {
  const value = tokens[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

export function parsePort(value, label = "port") {
  const port = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535 || String(port) !== String(value).trim()) {
    throw new Error(`${label} must be a TCP port between 1 and 65535`);
  }
  return port;
}

export function parseRemoteArgs(args = "") {
  const options = {
    action: "open",
    port: DEFAULT_PORT,
    name: undefined,
    yes: false,
  };
  const tokens = tokenizeArgs(args);
  let actionSeen = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const lower = token.toLowerCase();

    if (ACTIONS.has(lower) && !actionSeen) {
      options.action = lower === "open" ? "open" : lower;
      actionSeen = true;
      continue;
    }
    if (token === "--yes" || token === "-y") {
      options.yes = true;
      continue;
    }
    if (token === "--port") {
      options.port = parsePort(takeValue(tokens, i, token), "--port");
      i++;
      continue;
    }
    if (token.startsWith("--port=")) {
      options.port = parsePort(token.slice("--port=".length), "--port");
      continue;
    }
    if (token === "--name") {
      options.name = takeValue(tokens, i, token).trim();
      if (!options.name) throw new Error("--name requires a non-empty value");
      i++;
      continue;
    }
    if (token.startsWith("--name=")) {
      options.name = token.slice("--name=".length).trim();
      if (!options.name) throw new Error("--name requires a non-empty value");
      continue;
    }
    if (/^\d+$/.test(token)) {
      options.port = parsePort(token, "port");
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return options;
}

export function usage() {
  return [
    "Usage: /remote [status|close|refresh] [port] [--port N] [--name NAME] [--yes]",
    "Opens the existing Pi Web UI to a trusted local network and shows a QR code for mobile.",
  ].join("\n");
}

export function requiresOpenConfirmation(options) {
  return options?.action === "open" && options?.yes !== true;
}

export function localBaseUrl(port) {
  return `http://${DEFAULT_LOCAL_HOST}:${parsePort(port)}`;
}

export function endpointUrl(port, path) {
  return `${localBaseUrl(port)}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchJsonWithTimeout(url, init = {}, timeoutMs = 1_500, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("fetch is not available in this Node.js runtime");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    const body = await response.json().catch(() => undefined);
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: undefined, error };
  } finally {
    clearTimeout(timeout);
  }
}

export class RemoteWebuiController {
  constructor({ fetchImpl = globalThis.fetch, sleepImpl = sleep } = {}) {
    this.fetchImpl = fetchImpl;
    this.sleepImpl = sleepImpl;
  }

  async probeHealth(port, timeoutMs = 1_200) {
    const result = await fetchJsonWithTimeout(endpointUrl(port, "/api/health"), {}, timeoutMs, this.fetchImpl);
    const body = result.body;
    if (result.ok && body?.ok === true && typeof body.webuiVersion === "string") {
      return { online: true, status: result.status, data: body };
    }
    return {
      online: false,
      status: result.status,
      error: body?.error || result.error?.message || "No Pi Web UI responded at this URL",
    };
  }

  async waitForHealth(port, { timeoutMs = DEFAULT_START_TIMEOUT_MS, pollMs = DEFAULT_POLL_MS } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last = await this.probeHealth(port, Math.min(1_200, timeoutMs));
    while (!last.online && Date.now() < deadline) {
      await this.sleepImpl(pollMs);
      last = await this.probeHealth(port, Math.min(1_200, Math.max(200, deadline - Date.now())));
    }
    if (!last.online) throw new Error(`Timed out waiting for Pi Web UI at ${localBaseUrl(port)}/`);
    return last;
  }

  async getNetwork(port, timeoutMs = 1_500) {
    const result = await fetchJsonWithTimeout(endpointUrl(port, "/api/network"), {}, timeoutMs, this.fetchImpl);
    if (result.ok && result.body?.ok === true && result.body.data && typeof result.body.data === "object") return result.body.data;
    throw new Error(result.body?.error || "Failed to read Pi Web UI network status");
  }

  async openNetwork(port, timeoutMs = 1_500) {
    const result = await fetchJsonWithTimeout(endpointUrl(port, "/api/network/open"), { method: "POST" }, timeoutMs, this.fetchImpl);
    if (result.ok && result.body?.ok === true) return result.body.data;
    throw new Error(result.body?.error || "Failed to open Pi Web UI to the local network");
  }

  async closeNetwork(port, timeoutMs = 1_500) {
    const result = await fetchJsonWithTimeout(endpointUrl(port, "/api/network/close"), { method: "POST" }, timeoutMs, this.fetchImpl);
    if (result.ok && result.body?.ok === true) return result.body.data;
    throw new Error(result.body?.error || "Failed to close Pi Web UI network access");
  }

  async waitForNetworkOpen(port, { timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS, pollMs = DEFAULT_POLL_MS } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last;
    do {
      last = await this.getNetwork(port, Math.min(1_500, Math.max(200, deadline - Date.now())));
      if (last?.open === true && selectLanUrl(last)) return last;
      await this.sleepImpl(pollMs);
    } while (Date.now() < deadline);

    if (last?.open === true) {
      throw new Error("Pi Web UI is open to the network, but no LAN URL was reported. Check Wi-Fi/LAN connectivity.");
    }
    throw new Error("Timed out waiting for Pi Web UI to open to the local network");
  }

  async status(port) {
    const health = await this.probeHealth(port);
    if (!health.online) return { online: false, url: `${localBaseUrl(port)}/`, health };
    let network;
    try {
      network = await this.getNetwork(port);
    } catch (error) {
      network = health.data?.network;
      if (!network) return { online: true, url: `${localBaseUrl(port)}/`, health, error: error?.message || String(error) };
    }
    return { online: true, url: selectLanUrl(network) || network?.localUrl || `${localBaseUrl(port)}/`, health, network };
  }
}

export function selectLanUrl(network) {
  const urls = Array.isArray(network?.networkUrls) ? network.networkUrls : [];
  return urls.find((url) => typeof url === "string" && /^https?:\/\//i.test(url)) || undefined;
}

export async function openRemoteWebui(options, { controller, startWebui }) {
  if (!controller) throw new Error("RemoteWebuiController is required");
  let health = await controller.probeHealth(options.port);
  let started = false;

  if (!health.online) {
    if (typeof startWebui !== "function") throw new Error("Pi Web UI is not running and no start function is available");
    await startWebui(options);
    started = true;
    health = await controller.waitForHealth(options.port);
  }

  let network;
  try {
    network = await controller.getNetwork(options.port);
  } catch {
    network = health.data?.network;
  }

  if (!network?.open || network?.closing) {
    await controller.openNetwork(options.port);
    network = await controller.waitForNetworkOpen(options.port);
  } else if (!selectLanUrl(network)) {
    network = await controller.waitForNetworkOpen(options.port, { timeoutMs: 2_000 });
  }

  const url = selectLanUrl(network);
  if (!url) throw new Error("No LAN URL was reported by Pi Web UI. Connect this machine to a local network and retry.");
  return { started, health, network, url };
}

export async function closeRemoteWebui(options, { controller }) {
  if (!controller) throw new Error("RemoteWebuiController is required");
  const health = await controller.probeHealth(options.port);
  if (!health.online) return { online: false, url: `${localBaseUrl(options.port)}/`, health };
  const network = await controller.closeNetwork(options.port);
  return { online: true, url: `${localBaseUrl(options.port)}/`, health, network };
}

export function formatStatus(status) {
  if (!status?.online) {
    return [
      "Pi Remote WebUI status",
      "",
      `URL:     ${status?.url || "unknown"}`,
      "Online:  no",
      `Error:   ${status?.health?.error || "offline"}`,
      "",
      "Start and show QR with: /remote",
    ].join("\n");
  }

  const network = status.network || status.health?.data?.network || {};
  const networkUrls = Array.isArray(network.networkUrls) ? network.networkUrls : [];
  const state = network.open ? (network.opening ? "opening to LAN" : "open to LAN") : network.closing ? "closing" : "local only";
  const lines = [
    "Pi Remote WebUI status",
    "",
    `URL:      ${status.url || selectLanUrl(network) || network.localUrl || "unknown"}`,
    "Online:   yes",
    `Network:  ${state}`,
    `Bind:     ${network.host || "unknown"}:${network.port || "?"}`,
  ];
  if (networkUrls.length) lines.push(`LAN URLs: ${networkUrls.join(", ")}`);
  if (status.health?.data?.webuiVersion) lines.push(`Version:  ${status.health.data.webuiVersion}`);
  if (status.error) lines.push(`Warning:  ${status.error}`);
  return lines.join("\n");
}

export function buildRemoteWidgetLines({ url, qrLines = [], network = {}, started = false } = {}) {
  const auth = network?.auth || {};
  const authLine = auth.enabled ? `Remote PIN auth: on${auth.pin ? ` · PIN ${auth.pin}` : ""}` : "Remote PIN auth: off";
  const warningLine = auth.enabled
    ? "Trusted LAN only. Anyone with this URL and PIN can control Pi/WebUI."
    : "Trusted LAN only. Remote PIN auth is off; anyone with this URL can control Pi/WebUI.";
  const lines = [
    "Pi Remote WebUI",
    "",
    "Scan with your phone:",
    "",
    ...qrLines,
    "",
    url || selectLanUrl(network) || network.localUrl || "(no URL)",
    authLine,
    "",
    warningLine,
    "Close LAN access with: /remote close",
  ];
  if (started) lines.push("Started a Pi Web UI server for this session.");
  return lines;
}

export async function generateQrLines(url, { qrcodeModule } = {}) {
  let qrcode = qrcodeModule;
  if (!qrcode) {
    try {
      qrcode = (await import("qrcode-terminal")).default || (await import("qrcode-terminal"));
    } catch {
      return ["[QR generator unavailable: qrcode-terminal is not installed]"];
    }
  }

  return new Promise((resolve) => {
    try {
      qrcode.generate(url, { small: true }, (qrText) => {
        const lines = String(qrText || "").split(/\r?\n/);
        resolve(lines.filter((line, index, array) => line.trim() || (index > 0 && index < array.length - 1)));
      });
    } catch (error) {
      resolve([`[QR generation failed: ${error?.message || String(error)}]`]);
    }
  });
}
