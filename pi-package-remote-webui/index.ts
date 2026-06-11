import { spawn, type ChildProcessByStdio } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import {
  REMOTE_WIDGET_KEY,
  RemoteWebuiController,
  buildRemoteWidgetLines,
  closeRemoteWebui,
  formatStatus,
  generateQrLines,
  openRemoteWebui,
  parseRemoteArgs,
  requiresOpenConfirmation,
  usage,
} from "./lib/remote-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = __dirname;
const require = createRequire(import.meta.url);
const LOCAL_HOST = "127.0.0.1";

const OPEN_WARNING = [
  "Pi Web UI has no authentication.",
  "Anyone on this network who opens the URL can control Pi/WebUI and run allowed tools.",
  "",
  "Only open this on a trusted local network.",
  "",
  "Open to local network?",
].join("\n");

type WebuiChild = ChildProcessByStdio<null, Readable, Readable>;

type RemoteOptions = {
  action: "open" | "status" | "close" | "refresh";
  port: number;
  name?: string;
  yes: boolean;
};

function resolveExistingPath(candidate: string | undefined): string | undefined {
  if (!candidate) return undefined;
  return existsSync(candidate) ? candidate : undefined;
}

function resolveWebuiBin(): string {
  const candidates: Array<() => string | undefined> = [
    () => resolveExistingPath(require.resolve("@firstpick/pi-package-webui/bin/pi-webui.mjs")),
    () => resolveExistingPath(path.join(path.dirname(require.resolve("@firstpick/pi-package-webui/package.json")), "bin", "pi-webui.mjs")),
    () => resolveExistingPath(path.resolve(packageRoot, "..", "pi-package-webui", "bin", "pi-webui.mjs")),
  ];

  for (const candidate of candidates) {
    try {
      const resolved = candidate();
      if (resolved) return resolved;
    } catch {
      // Try next resolution strategy.
    }
  }

  throw new Error("Could not locate @firstpick/pi-package-webui/bin/pi-webui.mjs. Install @firstpick/pi-package-webui or run from the npm-packages checkout.");
}

function appendBoundedOutput(current: string, chunk: Buffer | string, maxChars = 20_000): string {
  const next = current + String(chunk);
  return next.length > maxChars ? next.slice(-maxChars) : next;
}

function releaseStartedChild(child: WebuiChild): void {
  child.stdout.removeAllListeners("data");
  child.stderr.removeAllListeners("data");
  (child.stdout as Readable & { unref?: () => void }).unref?.();
  (child.stderr as Readable & { unref?: () => void }).unref?.();
  child.unref();
}

function terminateFailedChild(child: WebuiChild): void {
  if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, 2_000).unref?.();
  child.stdout.destroy();
  child.stderr.destroy();
}

async function spawnWebui(options: RemoteOptions, ctx: ExtensionCommandContext): Promise<void> {
  const webuiBin = resolveWebuiBin();
  const args = [webuiBin, "--host", LOCAL_HOST, "--port", String(options.port), "--cwd", ctx.cwd];
  if (options.name) args.push("--name", options.name);

  const child = spawn(process.execPath, args, {
    cwd: ctx.cwd,
    env: { ...process.env },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let output = "";
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(startedTimer);
      child.off("error", onError);
      child.off("exit", onExit);
      if (error) {
        terminateFailedChild(child);
        reject(error);
      } else {
        releaseStartedChild(child);
        resolve();
      }
    };
    const onError = (error: Error) => finish(error);
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      finish(new Error(`Pi Web UI exited before startup (${code ?? signal ?? "unknown"}). Output:\n${output.trim() || "(no output)"}`));
    };

    child.stdout.on("data", (chunk) => {
      output = appendBoundedOutput(output, chunk);
    });
    child.stderr.on("data", (chunk) => {
      output = appendBoundedOutput(output, chunk);
    });
    child.once("error", onError);
    child.once("exit", onExit);

    // If the process survives this short preflight, the controller health poll
    // will perform the authoritative readiness check.
    const startedTimer = setTimeout(() => finish(), 250);
  });
}

function setRemoteStatus(ctx: ExtensionCommandContext, text?: string): void {
  ctx.ui.setStatus(REMOTE_WIDGET_KEY, text);
}

function clearRemoteWidget(ctx: ExtensionCommandContext): void {
  ctx.ui.setWidget(REMOTE_WIDGET_KEY, undefined);
}

async function renderRemoteWidget(ctx: ExtensionCommandContext, result: { url: string; network?: unknown; started?: boolean }): Promise<void> {
  const qrLines = await generateQrLines(result.url);
  const lines = buildRemoteWidgetLines({ url: result.url, qrLines, network: result.network, started: result.started });
  ctx.ui.setWidget(REMOTE_WIDGET_KEY, lines, { placement: "aboveEditor" });
  setRemoteStatus(ctx, `remote ${result.url}`);
}

async function confirmRemoteOpen(options: RemoteOptions, ctx: ExtensionCommandContext): Promise<boolean> {
  if (!requiresOpenConfirmation(options)) return true;
  if (!ctx.hasUI) throw new Error("/remote requires confirmation. Re-run with /remote --yes in non-interactive modes.");
  return await ctx.ui.confirm("Open Pi Web UI to LAN?", OPEN_WARNING);
}

async function handleStatus(options: RemoteOptions, ctx: ExtensionCommandContext, controller: RemoteWebuiController): Promise<void> {
  setRemoteStatus(ctx, "checking remote webui…");
  try {
    const status = await controller.status(options.port);
    ctx.ui.notify(formatStatus(status), status.online ? "info" : "warning");
  } finally {
    setRemoteStatus(ctx, undefined);
  }
}

async function handleRefresh(options: RemoteOptions, ctx: ExtensionCommandContext, controller: RemoteWebuiController): Promise<void> {
  setRemoteStatus(ctx, "refreshing remote QR…");
  try {
    const status = await controller.status(options.port);
    if (!status.online) {
      clearRemoteWidget(ctx);
      ctx.ui.notify(`${formatStatus(status)}\n\nRun /remote to start and open it.`, "warning");
      return;
    }
    if (!status.network?.open || !status.url || !/^https?:\/\//i.test(status.url)) {
      clearRemoteWidget(ctx);
      ctx.ui.notify(`${formatStatus(status)}\n\nRun /remote to open LAN access and show a QR code.`, "warning");
      return;
    }
    await renderRemoteWidget(ctx, { url: status.url, network: status.network, started: false });
    ctx.ui.notify(`Pi Remote WebUI QR refreshed:\n${status.url}`, "info");
  } finally {
    setRemoteStatus(ctx, undefined);
  }
}

async function handleClose(options: RemoteOptions, ctx: ExtensionCommandContext, controller: RemoteWebuiController): Promise<void> {
  setRemoteStatus(ctx, "closing remote webui…");
  try {
    const result = await closeRemoteWebui(options, { controller });
    clearRemoteWidget(ctx);
    setRemoteStatus(ctx, undefined);
    if (!result.online) {
      ctx.ui.notify("Pi Web UI is not running; cleared the remote QR widget.", "warning");
      return;
    }
    ctx.ui.notify("Pi Web UI LAN access closed. The local Web UI server may keep running on localhost.", "info");
  } finally {
    setRemoteStatus(ctx, undefined);
  }
}

async function handleOpen(options: RemoteOptions, ctx: ExtensionCommandContext, controller: RemoteWebuiController): Promise<void> {
  if (!(await confirmRemoteOpen(options, ctx))) {
    ctx.ui.notify("Remote WebUI cancelled; LAN access was not opened.", "info");
    return;
  }

  setRemoteStatus(ctx, "opening remote webui…");
  const result = await openRemoteWebui(options, {
    controller,
    startWebui: async (startOptions: RemoteOptions) => spawnWebui(startOptions, ctx),
  });
  await renderRemoteWidget(ctx, result);
  ctx.ui.notify(`Pi Remote WebUI ready:\n${result.url}\n\nScan the QR code above from your phone.`, "info");
}

export default function remoteWebuiExtension(pi: ExtensionAPI) {
  pi.registerCommand("remote", {
    description: "Open Pi Web UI to a trusted LAN and show a mobile QR code",
    handler: async (args, ctx) => {
      let options: RemoteOptions;
      try {
        options = parseRemoteArgs(args) as RemoteOptions;
      } catch (error) {
        ctx.ui.notify(`${error instanceof Error ? error.message : String(error)}\n${usage()}`, "error");
        return;
      }

      const controller = new RemoteWebuiController();
      try {
        if (options.action === "status") {
          await handleStatus(options, ctx, controller);
          return;
        }
        if (options.action === "refresh") {
          await handleRefresh(options, ctx, controller);
          return;
        }
        if (options.action === "close") {
          await handleClose(options, ctx, controller);
          return;
        }
        await handleOpen(options, ctx, controller);
      } catch (error) {
        setRemoteStatus(ctx, undefined);
        ctx.ui.notify(`Pi Remote WebUI failed:\n${error instanceof Error ? error.message : String(error)}\n${usage()}`, "error");
      }
    },
  });
}
