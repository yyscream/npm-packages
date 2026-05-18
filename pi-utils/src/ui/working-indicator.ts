export type ExtensionWorkingIndicator = {
  update(message: string): void;
  stop(): void;
};

export type ExtensionWorkingIndicatorOptions = {
  id?: string;
  title?: string;
  placement?: "aboveEditor" | "belowEditor";
  intervalMs?: number;
  frames?: string[];
};

export function createExtensionWorkingIndicator(ctx: any, initialMessage: string, options: ExtensionWorkingIndicatorOptions = {}): ExtensionWorkingIndicator {
  const id = options.id ?? "extension-working";
  const title = options.title ?? "Working";
  const frames = options.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const intervalMs = options.intervalMs ?? 100;
  const placement = options.placement ?? "aboveEditor";
  let frameIndex = 0;
  let message = initialMessage;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    const frame = frames[frameIndex % frames.length] ?? "•";
    frameIndex += 1;
    ctx?.ui?.setStatus?.(id, `${frame} ${message}`);
    ctx?.ui?.setWidget?.(id, [`${frame} ${title}… ${message}`], { placement });
  };

  render();
  const timer = setInterval(render, intervalMs);

  return {
    update(nextMessage: string) {
      message = nextMessage;
      render();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      ctx?.ui?.setStatus?.(id, undefined);
      ctx?.ui?.setWidget?.(id, undefined);
    },
  };
}

export async function withExtensionWorkingIndicator<T>(ctx: any, initialMessage: string, run: (indicator: ExtensionWorkingIndicator) => Promise<T>, options?: ExtensionWorkingIndicatorOptions): Promise<T> {
  const indicator = createExtensionWorkingIndicator(ctx, initialMessage, options);
  try {
    return await run(indicator);
  } finally {
    indicator.stop();
  }
}
