export type TokenEstimateConfidence = "estimated" | "calibrated" | "measured-after-call";

export type InitialPromptToolInfo = {
  name: string;
  description?: string;
  parameters?: unknown;
};

export type InitialPromptCalibration = {
  multiplier?: number;
  lowMultiplier?: number;
  highMultiplier?: number;
  samples?: number;
};

export type InitialPromptInputEstimate = {
  /** Final best estimate after optional calibration. */
  total: number;
  /** Lower bound for dashboard/budget display. */
  low: number;
  /** Upper bound for dashboard/budget display. */
  high: number;
  /** Uncalibrated total: prompt text + tool schemas + framing. */
  uncalibratedTotal: number;
  /** Estimated tokens in Pi's assembled system prompt text. */
  promptText: number;
  /** Estimated tokens in provider-level active tool schemas. */
  toolSchemas: number;
  /** Provider/message/request framing allowance. */
  framing: number;
  /** Number of active tool schemas included in the estimate. */
  toolCount: number;
  /** Multiplier applied to uncalibratedTotal. */
  calibrationMultiplier: number;
  /** Calibration samples used for multiplier/range. */
  calibrationSamples: number;
  confidence: TokenEstimateConfidence;
};

export type EstimateInitialPromptInputOptions = {
  systemPrompt: string;
  activeTools?: string[];
  allTools?: InitialPromptToolInfo[];
  calibration?: InitialPromptCalibration | number | null;
  /** Override request framing tokens. Defaults to a conservative provider-agnostic allowance. */
  framingTokens?: number;
};

const ASCII_TOKENS_PER_CHAR = 0.25;
const LATIN_EXTENDED_TOKENS_PER_CHAR = 0.5;
const CJK_TOKENS_PER_CHAR = 1.2;
const OTHER_UNICODE_TOKENS_PER_CHAR = 0.75;
const EMOJI_TOKENS_PER_CODE_POINT = 2;

const DEFAULT_REQUEST_FRAMING_TOKENS = 64;
const SYSTEM_MESSAGE_FRAMING_TOKENS = 12;
const TOOL_SCHEMA_FRAMING_TOKENS = 8;

export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

/**
 * Legacy fast heuristic for callers that only have a character count.
 */
export function estimateTokensFromCharCount(charCount: number): number {
  return Math.max(0, Math.round(charCount / 4));
}

function isCjkLike(codePoint: number): boolean {
  return (
    (codePoint >= 0x3040 && codePoint <= 0x30ff) || // Hiragana/Katakana
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) || // CJK Extension A
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK Unified Ideographs
    (codePoint >= 0xac00 && codePoint <= 0xd7af) || // Hangul syllables
    (codePoint >= 0xf900 && codePoint <= 0xfaff) || // CJK compatibility
    (codePoint >= 0x20000 && codePoint <= 0x2fa1f)
  );
}

function isEmojiLike(codePoint: number): boolean {
  return (
    (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf)
  );
}

function isCombiningMark(codePoint: number): boolean {
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

/**
 * Provider-agnostic text token estimate.
 *
 * English/code remains close to the common chars/4 rule, while non-ASCII text is
 * weighted higher to avoid underestimating CJK or emoji-heavy prompts.
 */
export function estimateTokensFromText(text: string): number {
  if (!text) return 0;

  let tokens = 0;
  for (let i = 0; i < text.length; i++) {
    const codePoint = text.codePointAt(i) ?? 0;
    if (codePoint > 0xffff) i++;

    if (codePoint <= 0x7f) {
      tokens += ASCII_TOKENS_PER_CHAR;
    } else if (isCombiningMark(codePoint)) {
      // Combining marks usually merge into the previous token/grapheme.
      continue;
    } else if (isEmojiLike(codePoint)) {
      tokens += EMOJI_TOKENS_PER_CODE_POINT;
    } else if (isCjkLike(codePoint)) {
      tokens += CJK_TOKENS_PER_CHAR;
    } else if (codePoint <= 0x024f) {
      tokens += LATIN_EXTENDED_TOKENS_PER_CHAR;
    } else {
      tokens += OTHER_UNICODE_TOKENS_PER_CHAR;
    }
  }

  return Math.max(0, Math.ceil(tokens));
}

export function estimatePromptInjectionTokens(systemPrompt: string): number {
  return estimateTokensFromText(systemPrompt);
}

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return value.toString();
  return value;
}

function stringifyForTokenEstimate(value: unknown): string {
  try {
    return JSON.stringify(value, replacer) ?? "";
  } catch {
    return String(value ?? "");
  }
}

function buildActiveToolSchemaPayload(activeTools: string[] | undefined, allTools: InitialPromptToolInfo[] | undefined) {
  if (!allTools || allTools.length === 0) return [];

  const toolsByName = new Map<string, InitialPromptToolInfo>();
  for (const tool of allTools) {
    if (tool?.name && !toolsByName.has(tool.name)) {
      toolsByName.set(tool.name, tool);
    }
  }

  const orderedNames = activeTools && activeTools.length > 0 ? activeTools : Array.from(toolsByName.keys()).sort();
  return orderedNames
    .map((name) => toolsByName.get(name))
    .filter((tool): tool is InitialPromptToolInfo => !!tool)
    .map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.parameters ?? {},
    }));
}

function normalizeMultiplier(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(4, Math.max(0.25, n));
}

function resolveCalibration(calibration: InitialPromptCalibration | number | null | undefined): Required<InitialPromptCalibration> {
  if (typeof calibration === "number") {
    const multiplier = normalizeMultiplier(calibration, 1);
    return {
      multiplier,
      lowMultiplier: multiplier * 0.95,
      highMultiplier: multiplier * 1.05,
      samples: 1,
    };
  }

  const samples = Math.max(0, Math.floor(Number(calibration?.samples ?? 0) || 0));
  const multiplier = normalizeMultiplier(calibration?.multiplier, 1);
  const lowMultiplier = normalizeMultiplier(calibration?.lowMultiplier, samples > 0 ? multiplier * 0.95 : 0.85);
  const highMultiplier = normalizeMultiplier(calibration?.highMultiplier, samples > 0 ? multiplier * 1.05 : 1.25);

  return {
    multiplier: samples > 0 ? multiplier : 1,
    lowMultiplier: Math.min(lowMultiplier, highMultiplier),
    highMultiplier: Math.max(lowMultiplier, highMultiplier),
    samples,
  };
}

export function estimateInitialPromptInput(options: EstimateInitialPromptInputOptions): InitialPromptInputEstimate {
  const systemPrompt = options.systemPrompt ?? "";
  const promptText = estimatePromptInjectionTokens(systemPrompt);
  const toolPayload = buildActiveToolSchemaPayload(options.activeTools, options.allTools);
  const toolSchemas = toolPayload.length > 0 ? estimateTokensFromText(stringifyForTokenEstimate(toolPayload)) : 0;
  const framing = Math.max(
    0,
    Math.round(
      options.framingTokens ??
        DEFAULT_REQUEST_FRAMING_TOKENS + SYSTEM_MESSAGE_FRAMING_TOKENS + toolPayload.length * TOOL_SCHEMA_FRAMING_TOKENS,
    ),
  );
  const uncalibratedTotal = Math.max(0, promptText + toolSchemas + framing);
  const calibration = resolveCalibration(options.calibration);
  const total = Math.max(0, Math.round(uncalibratedTotal * calibration.multiplier));
  const low = Math.max(0, Math.round(uncalibratedTotal * calibration.lowMultiplier));
  const high = Math.max(low, Math.round(uncalibratedTotal * calibration.highMultiplier));

  return {
    total,
    low,
    high,
    uncalibratedTotal,
    promptText,
    toolSchemas,
    framing,
    toolCount: toolPayload.length,
    calibrationMultiplier: calibration.multiplier,
    calibrationSamples: calibration.samples,
    confidence: calibration.samples > 0 ? "calibrated" : "estimated",
  };
}
