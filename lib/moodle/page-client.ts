import "server-only";

import type { MoodleSession, MoodleUiSession } from "./site";
import { MoodlePageError } from "./page-contracts";
import {
  assertAllowedMoodlePageUrl as assertAllowedUrl,
  moodlePageUrl as pageUrl,
  relativeMoodlePagePath as relativePagePath,
  type MoodlePageRequest,
} from "./page-policy";

const MAX_HTML_BYTES = 2_500_000;
const MAX_REDIRECTS = 5;

export type MoodlePageResponse = Readonly<{
  html: string;
  uiSession: MoodleUiSession;
  url: URL;
}>;

function nextUiSession(current: MoodleUiSession, response: Response): MoodleUiSession {
  const extended = response.headers as Headers & { getSetCookie?: () => string[] };
  const headers = typeof extended.getSetCookie === "function"
    ? extended.getSetCookie()
    : response.headers.get("set-cookie")?.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g) ?? [];
  for (const header of headers) {
    const pair = header.split(";", 1)[0]?.trim();
    if (pair === undefined) continue;
    const equals = pair.indexOf("=");
    if (equals <= 0 || pair.slice(0, equals).trim() !== current.cookieName) continue;
    const value = pair.slice(equals + 1).trim();
    if (value !== "" && value.length <= 512 && !/[;\r\n]/.test(value)) {
      return { ...current, cookieValue: value };
    }
  }
  return current;
}

function responseFailure(status: number): MoodlePageError {
  if (status === 401) return new MoodlePageError("reauth_required");
  if (status === 403) return new MoodlePageError("forbidden");
  if (status === 404 || status === 410) return new MoodlePageError("closed");
  if (status === 408 || status === 425 || status === 429 || status >= 500) return new MoodlePageError("transient_failure");
  return new MoodlePageError("upstream_changed");
}

function appearsToBeLoginPage(url: URL, html: string): boolean {
  return /\/login\/index\.php$/i.test(url.pathname)
    || (/<form[^>]+(?:id=["']login["']|action=["'][^"']*\/login\/index\.php)/i.test(html)
      && /name=["']username["']/i.test(html));
}

async function boundedHtml(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_HTML_BYTES) throw new MoodlePageError("upstream_changed");
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new MoodlePageError("upstream_changed");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export class MoodlePageClient {
  private uiSession: MoodleUiSession;

  constructor(
    private readonly session: Pick<MoodleSession, "site" | "uiSession">,
    private readonly timeoutMs = 15_000,
  ) {
    this.uiSession = session.uiSession;
  }

  currentUiSession(): MoodleUiSession {
    return this.uiSession;
  }

  get(request: MoodlePageRequest): Promise<MoodlePageResponse> {
    return this.request(pageUrl(this.session.site.siteUrl, request), { method: "GET" });
  }

  post(
    request: MoodlePageRequest,
    body: URLSearchParams,
  ): Promise<MoodlePageResponse> {
    return this.request(pageUrl(this.session.site.siteUrl, request), {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      method: "POST",
    });
  }

  postAction(action: URL, body: URLSearchParams): Promise<MoodlePageResponse> {
    assertAllowedUrl(action, this.session.site.siteUrl);
    return this.request(action, {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      method: "POST",
    });
  }

  getAction(action: URL, search: URLSearchParams): Promise<MoodlePageResponse> {
    const target = new URL(action);
    for (const [key, value] of search) target.searchParams.append(key, value);
    assertAllowedUrl(target, this.session.site.siteUrl);
    return this.request(target, { method: "GET" });
  }

  private async request(initialUrl: URL, initialInit: RequestInit): Promise<MoodlePageResponse> {
    let url = initialUrl;
    let init = initialInit;
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      assertAllowedUrl(url, this.session.site.siteUrl);
      const headers = new Headers(init.headers);
      headers.set("accept", "text/html,application/xhtml+xml");
      headers.set("cookie", `${this.uiSession.cookieName}=${this.uiSession.cookieValue}`);
      let response: Response;
      try {
        response = await fetch(url, {
          ...init,
          cache: "no-store",
          credentials: "omit",
          headers,
          redirect: "manual",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch {
        throw new MoodlePageError("transient_failure");
      }
      this.uiSession = nextUiSession(this.uiSession, response);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (location === null || redirectCount === MAX_REDIRECTS) throw new MoodlePageError("upstream_changed");
        const next = new URL(location, url);
        const relative = relativePagePath(next, this.session.site.siteUrl);
        if (relative === "login/index.php") throw new MoodlePageError("reauth_required");
        assertAllowedUrl(next, this.session.site.siteUrl);
        url = next;
        init = response.status === 307 || response.status === 308 ? init : { method: "GET" };
        continue;
      }
      if (!response.ok) throw responseFailure(response.status);
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new MoodlePageError("upstream_changed");
      }
      const html = await boundedHtml(response);
      if (appearsToBeLoginPage(url, html)) throw new MoodlePageError("reauth_required");
      return { html, uiSession: this.uiSession, url };
    }
    throw new MoodlePageError("upstream_changed");
  }
}
