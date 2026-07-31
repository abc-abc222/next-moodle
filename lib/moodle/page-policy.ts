import { MoodlePageError } from "./page-contracts";

const ALLOWED_PAGE_PATH = /^(?:mod\/[a-z0-9_]+\/[a-z0-9_.-]+\.php|course\/[a-z0-9_.-]+\.php|user\/(?:profile|edit|files|index)\.php|my\/(?:index|courses)\.php|admin\/tool\/lp\/plans\.php|badges\/mybadges\.php|calendar\/view\.php|grade\/report\/overview\/index\.php|message\/index\.php|login\/logout\.php)$/;
const SENSITIVE_QUERY_KEYS = new Set(["password", "token", "wstoken", "logintoken", "sesskey"]);

export type MoodlePageRequest = Readonly<{
  path: string;
  search?: Readonly<Record<string, string | number | boolean | null | undefined>>;
}>;

function basePath(siteUrl: string): string {
  return new URL(siteUrl).pathname.replace(/\/+$/, "");
}

export function relativeMoodlePagePath(url: URL, siteUrl: string): string | null {
  const root = basePath(siteUrl);
  if (root !== "" && url.pathname !== root && !url.pathname.startsWith(`${root}/`)) return null;
  return url.pathname.slice(root.length).replace(/^\/+/, "");
}

export function assertAllowedMoodlePageUrl(url: URL, siteUrl: string): void {
  const site = new URL(siteUrl);
  if (url.origin !== site.origin || url.username !== "" || url.password !== "" || url.hash !== "") throw new MoodlePageError("upstream_changed");
  const relative = relativeMoodlePagePath(url, siteUrl);
  if (relative === null || !ALLOWED_PAGE_PATH.test(relative)) throw new MoodlePageError("upstream_changed");
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) throw new MoodlePageError("upstream_changed");
  }
}

export function moodlePageUrl(siteUrl: string, request: MoodlePageRequest): URL {
  const root = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const url = new URL(request.path.replace(/^\/+/, ""), root);
  for (const [key, value] of Object.entries(request.search ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  assertAllowedMoodlePageUrl(url, siteUrl);
  return url;
}
