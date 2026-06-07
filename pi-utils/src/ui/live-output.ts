export function isCtrlO(data: string): boolean {
  const key = data.toLowerCase();
  return data === "\x0f" || key === "ctrl+o" || data === "\x1b[111;5u" || data === "\x1b[27;5;111~";
}

export function isCtrlC(data: string): boolean {
  const key = data.toLowerCase();
  return data === "\x03" || key === "ctrl+c" || data === "\x1b[99;5u" || data === "\x1b[27;5;99~";
}

export function appendDisplayChunk(lines: string[], chunk: string): void {
  if (lines.length === 0) lines.push("");

  for (let i = 0; i < chunk.length; i++) {
    const char = chunk[i];
    if (char === "\r") {
      if (chunk[i + 1] === "\n") {
        lines.push("");
        i++;
      } else {
        lines[lines.length - 1] = "";
      }
      continue;
    }
    if (char === "\n") {
      lines.push("");
      continue;
    }
    lines[lines.length - 1] += char;
  }
}

export function outputLinesFromDisplay(lines: string[]): string[] {
  const visible = lines.slice();
  while (visible.length > 0 && visible[visible.length - 1] === "") visible.pop();
  return visible;
}

export function formatElapsed(startMs: number, nowMs = Date.now()): string {
  const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m${String(remainder).padStart(2, "0")}s` : `${remainder}s`;
}

export function truncateLine(line: string, width: number): string {
  return line.length > width ? `${line.slice(0, Math.max(0, width - 1))}…` : line;
}
