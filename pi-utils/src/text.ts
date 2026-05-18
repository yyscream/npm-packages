export type SlugifyOptions = {
  maxLength?: number;
  fallback?: string;
};

export function slugify(input: string, options: SlugifyOptions = {}): string {
  const maxLength = options.maxLength ?? 80;
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
  return slug || options.fallback || "";
}
