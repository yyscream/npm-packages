export function redactSensitiveText(value: string): string {
  return value
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[REDACTED_API_KEY]")
    .replace(/gh[pousr]_[A-Za-z0-9_]{10,}/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_ACCESS_KEY]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/(password|passwd|token|api[_-]?key|secret|access[_-]?key)\s*[=:]\s*[^\s"']+/gi, "$1=[REDACTED]")
    .replace(/:\/\/([^\s:/?#]+):([^\s@/?#]+)@/g, "://[REDACTED]@");
}

export function truncateRawLog(value: string, maxChars: number): string {
  const redacted = redactSensitiveText(value);
  if (redacted.length <= maxChars) return redacted;
  const half = Math.max(1, Math.floor((maxChars - 120) / 2));
  return [
    redacted.slice(0, half),
    `\n\n[RAW LOG TRUNCATED: kept ${half * 2} of ${redacted.length} characters after redaction]\n\n`,
    redacted.slice(-half),
  ].join("");
}
