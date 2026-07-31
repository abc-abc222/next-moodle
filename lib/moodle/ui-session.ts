import { parseDocument } from "htmlparser2";

import type { MoodleConfig } from "./config";
import { MoodleAuthError, MoodleOutageError, MoodleResponseError } from "./errors";
import type { MoodleCredentials, MoodleUserId } from "./identifiers";
import { MoodleUiSessionSchema, type MoodleUiSession } from "./site";

const MAX_LOGIN_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;

type ParsedNode = Readonly<{
  type?: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: readonly ParsedNode[];
}>;

type CookieJar = Map<string, string>;

function endpoint(config: MoodleConfig, path: string): URL {
  const base = new URL(config.baseUrl);
  const pathname = `${base.pathname.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  base.pathname = pathname;
  base.search = "";
  base.hash = "";
  return base;
}

function splitSetCookieHeader(value: string): readonly string[] {
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g);
}

function setCookieHeaders(headers: Headers): readonly string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof extended.getSetCookie === "function") return extended.getSetCookie();
  const combined = headers.get("set-cookie");
  return combined === null ? [] : splitSetCookieHeader(combined);
}

function updateCookieJar(jar: CookieJar, headers: Headers): void {
  for (const header of setCookieHeaders(headers)) {
    const pair = header.split(";", 1)[0]?.trim();
    if (pair === undefined) continue;
    const equals = pair.indexOf("=");
    if (equals <= 0) continue;
    const name = pair.slice(0, equals).trim();
    const value = pair.slice(equals + 1).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(name) || /[;\r\n]/.test(value)) continue;
    if (value === "") jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function assertSameMoodleOrigin(candidate: URL, config: MoodleConfig): void {
  const base = new URL(config.baseUrl);
  if (candidate.origin !== base.origin || candidate.username !== "" || candidate.password !== "") {
    throw new MoodleResponseError();
  }
  const basePath = base.pathname.replace(/\/+$/, "");
  if (basePath !== "" && candidate.pathname !== basePath && !candidate.pathname.startsWith(`${basePath}/`)) {
    throw new MoodleResponseError();
  }
}

async function fetchWithJar(
  config: MoodleConfig,
  jar: CookieJar,
  initialUrl: URL,
  init: RequestInit = {},
): Promise<Readonly<{ response: Response; url: URL }>> {
  let url = initialUrl;
  let requestInit = init;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    assertSameMoodleOrigin(url, config);
    const headers = new Headers(requestInit.headers);
    const cookies = cookieHeader(jar);
    if (cookies !== "") headers.set("cookie", cookies);
    let response: Response;
    try {
      response = await fetch(url, {
        ...requestInit,
        cache: "no-store",
        credentials: "omit",
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch {
      throw new MoodleOutageError();
    }
    updateCookieJar(jar, response.headers);
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, url };
    const location = response.headers.get("location");
    if (location === null || redirects === MAX_REDIRECTS) throw new MoodleResponseError();
    url = new URL(location, url);
    requestInit = response.status === 307 || response.status === 308
      ? requestInit
      : { method: "GET" };
  }
  throw new MoodleResponseError();
}

async function readLoginHtml(response: Response): Promise<string> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new MoodleAuthError();
    if (response.status >= 500) throw new MoodleOutageError();
    throw new MoodleResponseError();
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/html")) throw new MoodleResponseError();
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_LOGIN_HTML_BYTES) throw new MoodleResponseError();
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_LOGIN_HTML_BYTES) {
        await reader.cancel();
        throw new MoodleResponseError();
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

function findInputValue(html: string, name: string): string | null {
  const document = parseDocument(html, { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true }) as unknown as Readonly<{ children: readonly ParsedNode[] }>;
  const stack = [...document.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (node.type === "tag" && node.name === "input" && node.attribs?.name === name) {
      return node.attribs.value ?? "";
    }
    stack.push(...(node.children ?? []));
  }
  return null;
}

function appearsAuthenticated(html: string, expectedUserId: MoodleUserId): boolean {
  if (/name=["']username["']/i.test(html) && /login\/index\.php/i.test(html)) return false;
  const dataUser = /data-userid=["'](\d+)["']/i.exec(html)?.[1];
  const configUser = /["']userid["']\s*:\s*(\d+)/i.exec(html)?.[1];
  const observed = dataUser ?? configUser;
  if (observed !== undefined) return Number(observed) === expectedUserId;
  const profilePattern = new RegExp(`user/profile\\.php\\?id=${expectedUserId}(?:[&#"'])`, "i");
  return profilePattern.test(html) && /login\/logout\.php/i.test(html);
}

function selectUiSessionCookie(jar: CookieJar): Readonly<{ cookieName: string; cookieValue: string }> {
  const preferred = [...jar].find(([name]) => /moodlesession/i.test(name));
  const selected = preferred ?? (jar.size === 1 ? [...jar][0] : undefined);
  if (selected === undefined) throw new MoodleAuthError();
  return { cookieName: selected[0], cookieValue: selected[1] };
}

export async function requestMoodleUiSession(
  config: MoodleConfig,
  credentials: MoodleCredentials,
  expectedUserId: MoodleUserId,
  now = Date.now(),
): Promise<MoodleUiSession> {
  const jar: CookieJar = new Map();
  const loginUrl = endpoint(config, "login/index.php");
  const loginPage = await fetchWithJar(config, jar, loginUrl);
  const loginHtml = await readLoginHtml(loginPage.response);
  const loginToken = findInputValue(loginHtml, "logintoken");
  if (loginToken === null || loginToken === "") throw new MoodleResponseError();

  const body = new URLSearchParams({
    anchor: "",
    logintoken: loginToken,
    password: credentials.password,
    username: credentials.username,
  });
  const result = await fetchWithJar(config, jar, loginUrl, {
    body,
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    method: "POST",
  });
  const authenticatedHtml = await readLoginHtml(result.response);
  if (!appearsAuthenticated(authenticatedHtml, expectedUserId)) throw new MoodleAuthError();
  const selected = selectUiSessionCookie(jar);
  return MoodleUiSessionSchema.parse({
    ...selected,
    expiresAt: now + 8 * 60 * 60 * 1_000,
  });
}

function logoutUrlFromHtml(html: string, siteUrl: string): URL | null {
  const document = parseDocument(html, { decodeEntities: true, lowerCaseAttributeNames: true, lowerCaseTags: true }) as unknown as Readonly<{ children: readonly ParsedNode[] }>;
  const stack = [...document.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (node.type === "tag" && node.name === "a" && node.attribs?.href !== undefined) {
      const candidate = new URL(node.attribs.href, `${siteUrl}/`);
      const site = new URL(siteUrl);
      if (candidate.origin === site.origin && /\/login\/logout\.php$/i.test(candidate.pathname) && candidate.searchParams.has("sesskey")) {
        return candidate;
      }
    }
    stack.push(...(node.children ?? []));
  }
  return null;
}

/** Best-effort upstream logout. Session secrets and the discovered sesskey never leave this server call. */
export async function terminateMoodleUiSession(siteUrl: string, uiSession: MoodleUiSession): Promise<void> {
  const site = new URL(siteUrl);
  const rootPath = site.pathname.replace(/\/+$/, "");
  const home = new URL(`${rootPath}/my/`, site.origin);
  const headers = { accept: "text/html,application/xhtml+xml", cookie: `${uiSession.cookieName}=${uiSession.cookieValue}` };
  try {
    const page = await fetch(home, { cache: "no-store", credentials: "omit", headers, redirect: "manual", signal: AbortSignal.timeout(5_000) });
    if (!page.ok || !(page.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) return;
    const bytes = new Uint8Array(await page.arrayBuffer());
    if (bytes.byteLength > MAX_LOGIN_HTML_BYTES) return;
    const logout = logoutUrlFromHtml(new TextDecoder().decode(bytes), siteUrl);
    if (logout === null) return;
    assertSameMoodleOrigin(logout, { baseUrl: siteUrl, service: "moodle_mobile_app", timeoutMs: 5_000 });
    await fetch(logout, { cache: "no-store", credentials: "omit", headers, redirect: "manual", signal: AbortSignal.timeout(5_000) });
  } catch {
    // Local destruction is authoritative; an unavailable upstream must not trap the user in the app session.
  }
}
