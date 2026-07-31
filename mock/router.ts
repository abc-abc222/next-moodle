import { FIXTURE_TOKENS, FIXTURE_USERS } from "./fixtures"
import { firstField, MockInputError, numberField, readMockRequestInput } from "./params"
import { handleRestFunction } from "./rest"
import { invalidLogin, jsonResponse, malformedResponse, moodleException, transientOutage } from "./responses"
import { MOODLE_FUNCTIONS } from "./types"
import type {
  FixtureUser,
  MoodleFunction,
  MoodleMockOptions,
  MoodleMockState,
  MockRequestInput,
  MoodleScenario,
} from "./types"

const isScenario = (value: string | undefined): value is MoodleScenario =>
  value !== undefined && MOODLE_SCENARIOS_SET.has(value)

const MOODLE_SCENARIOS_SET = new Set<string>([
  "success",
  "invalid_credentials",
  "expired_token",
  "missing_capability",
  "empty_data",
  "warning",
  "moodle_exception",
  "transient_outage",
  "malformed_response",
  "protected_file",
  "upload_draft",
  "save_submission",
  "submit_for_grading",
  "notification_read",
])

const functionFor = (value: string | undefined): MoodleFunction | undefined => {
  if (value === undefined) return undefined
  for (const functionName of MOODLE_FUNCTIONS) {
    if (functionName === value) return functionName
  }
  return undefined
}

const scenarioFor = (
  request: Request,
  input: MockRequestInput,
  options: MoodleMockOptions,
): MoodleScenario => {
  const urlScenario = new URL(request.url).searchParams.get("scenario") ?? undefined
  const headerScenario = request.headers.get("x-mock-moodle-scenario") ?? undefined
  const fieldScenario = firstField(input, "mock_scenario")
  return (isScenario(headerScenario) && headerScenario) ||
    (isScenario(urlScenario) && urlScenario) ||
    (isScenario(fieldScenario) && fieldScenario) ||
    options.defaultScenario ||
    "success"
}

const userForCredentials = (username: string | undefined, password: string | undefined): FixtureUser | undefined => {
  if (username === undefined || password === undefined) return undefined
  const normalized = username.trim().toLowerCase()
  for (const user of Object.values(FIXTURE_USERS)) {
    const aliases = [user.username, `${user.username}@synthetic.invalid`, `student-${user.key}`, user.key]
    if (aliases.includes(normalized) && user.password === password) return user
  }
  return undefined
}

const userForToken = (input: MockRequestInput, state: MoodleMockState): FixtureUser | undefined => {
  const token = firstField(input, "wstoken", "token")
  const userKey = token === undefined ? undefined : state.tokens.get(token)
  return userKey === undefined ? undefined : FIXTURE_USERS[userKey]
}

const outageResponse = (state: MoodleMockState, key: string): Response | undefined => {
  const attempt = (state.outageAttempts.get(key) ?? 0) + 1
  state.outageAttempts.set(key, attempt)
  return attempt === 1 ? transientOutage() : undefined
}

const loginEndpoint = (
  input: MockRequestInput,
  state: MoodleMockState,
  scenario: MoodleScenario,
): Response => {
  if (scenario === "malformed_response") return malformedResponse()
  if (scenario === "transient_outage") {
    const outage = outageResponse(state, "login")
    if (outage !== undefined) return outage
  }
  if (scenario === "invalid_credentials") return invalidLogin()
  const user = userForCredentials(firstField(input, "username"), firstField(input, "password"))
  if (user === undefined) return invalidLogin()
  const token = FIXTURE_TOKENS[user.key]
  state.tokens.set(token, user.key)
  return jsonResponse({ token, privatetoken: `private-${user.key}`, userid: user.userid, service: "moodle_mobile_app" })
}

const htmlResponse = (body: string, status = 200, headers: Readonly<Record<string, string>> = {}): Response =>
  new Response(body, { status, headers: { "cache-control": "no-store", "content-type": "text/html; charset=utf-8", ...headers } })

const uiUser = (request: Request, state: MoodleMockState): FixtureUser | undefined => {
  const cookie = request.headers.get("cookie") ?? ""
  const value = /(?:^|;\s*)MoodleSession=([^;]+)/.exec(cookie)?.[1]
  const key = value === undefined ? undefined : state.uiSessions.get(value)
  return key === undefined ? undefined : FIXTURE_USERS[key]
}

const uiLoginEndpoint = (request: Request, input: MockRequestInput, state: MoodleMockState): Response => {
  if (request.method === "GET") {
    return htmlResponse('<main><form action="/login/index.php" id="login" method="post"><input name="logintoken" type="hidden" value="mock-login-token"><label>Username<input name="username"></label><label>Password<input name="password" type="password"></label></form></main>', 200, { "set-cookie": "MoodleSession=mock-login-pending; Path=/; HttpOnly" })
  }
  if (firstField(input, "logintoken") !== "mock-login-token") return htmlResponse('<main><form action="/login/index.php" id="login"><input name="username"></form></main>', 200)
  const user = userForCredentials(firstField(input, "username"), firstField(input, "password"))
  if (user === undefined) return htmlResponse('<main><form action="/login/index.php" id="login"><input name="username"></form><div class="alert alert-danger">Invalid login</div></main>', 200)
  const cookie = `mock-ui-${user.key}`
  state.uiSessions.set(cookie, user.key)
  return htmlResponse(`<body data-userid="${user.userid}"><main><h1>Dashboard</h1></main><a href="/user/profile.php?id=${user.userid}">Profile</a><a href="/login/logout.php?sesskey=mock">Logout</a></body>`, 200, { "set-cookie": `MoodleSession=${cookie}; Path=/; HttpOnly` })
}

const questionnairePage = (request: Request, input: MockRequestInput, state: MoodleMockState): Response => {
  const user = uiUser(request, state)
  if (user === undefined) return new Response(null, { status: 303, headers: { location: "/login/index.php" } })
  const id = Number(firstField(input, "id") ?? "9198")
  const key = `${user.key}:${id}`
  const saved = state.questionnaireResponses.get(key)
  const path = new URL(request.url).pathname
  if (path.endsWith("/view.php")) {
    return saved === undefined
      ? htmlResponse(`<main><h1>Fieldwork preparation survey</h1><p>Confirm your preparation before the field session.</p><a href="/mod/questionnaire/complete.php?id=${id}">アンケートに回答する</a></main>`)
      : htmlResponse(`<main><h1>Fieldwork preparation survey</h1><p>回答を受け付けました。</p><a href="/mod/questionnaire/myreport.php?instance=598&userid=${user.userid}&action=vresp">あなたの回答を表示する</a></main>`)
  }
  if (path.endsWith("/complete.php") && request.method === "GET") {
    return htmlResponse(`<main><h1>Fieldwork preparation survey</h1><form action="/mod/questionnaire/complete.php?id=${id}" method="post"><input name="sesskey" type="hidden" value="mock-sesskey"><input name="id" type="hidden" value="${id}"><fieldset><legend>Preparation</legend><p>安全確認を完了しましたか？</p><label for="q1yes">はい</label><input id="q1yes" name="q1" required type="radio" value="yes"><label for="q1no">いいえ</label><input id="q1no" name="q1" type="radio" value="no"></fieldset><label for="q2">連絡事項</label><textarea id="q2" name="q2" rows="4"></textarea><button name="submit" type="submit" value="Submit questionnaire">回答を送信</button></form></main>`)
  }
  if (path.endsWith("/complete.php") && request.method === "POST") {
    const q1 = input.fields.get("q1") ?? []
    const q2 = input.fields.get("q2") ?? []
    if (q1.length === 0) return htmlResponse(`<main><h1>Fieldwork preparation survey</h1><div class="alert alert-danger">安全確認は必須です。</div></main>`, 200)
    state.questionnaireResponses.set(key, { q1, q2 })
  }
  const answers = state.questionnaireResponses.get(key) ?? { q1: ["yes"], q2: [] }
  return htmlResponse(`<main><h1>Fieldwork preparation survey</h1><h2>あなたの回答を表示する</h2><p>提出完了: 2026年 04月 21日 10:55</p><fieldset><legend>質問 #1 安全確認を完了しましたか？</legend><h2>1</h2><p>安全確認を完了しましたか？</p><label for="r1y">はい</label><input ${answers.q1?.includes("yes") === true ? "checked" : ""} disabled id="r1y" type="radio" value="yes"><label for="r1n">いいえ</label><input ${answers.q1?.includes("no") === true ? "checked" : ""} disabled id="r1n" type="radio" value="no"></fieldset><fieldset><legend>質問 #2 連絡事項</legend><h2>2</h2><p>連絡事項</p><textarea disabled>${answers.q2?.[0] ?? ""}</textarea></fieldset></main>`)
}

const htmlActivityPage = (request: Request, moduleName: string, state: MoodleMockState): Response => {
  const user = uiUser(request, state)
  if (user === undefined) return new Response(null, { status: 303, headers: { location: "/login/index.php" } })
  const body = moduleName === "url"
    ? `<p data-userid="${user.userid}">リソースを開くには <a href="https://resources.synthetic.invalid/lesson-video">学習リソースを開く</a> をクリックしてください。</p>`
    : `<p data-userid="${user.userid}">Moodle内で確認できる活動情報です。</p><button type="button">Continue</button>`
  return htmlResponse(`<html><head><title>Activity overview</title></head><body><nav>Moodle navigation</nav><main><h1>${moduleName.toUpperCase()} learning content</h1>${body}</main><footer>Moodle footer</footer></body></html>`)
}

const missingCapability = (functionName: string): Response =>
  moodleException(
    "webservice_access_exception",
    "accessexception",
    `The function ${functionName} is not available for this synthetic user.`,
  )

const restEndpoint = async (
  request: Request,
  input: MockRequestInput,
  state: MoodleMockState,
  options: MoodleMockOptions,
  scenario: MoodleScenario,
): Promise<Response> => {
  const functionName = functionFor(firstField(input, "wsfunction"))
  if (functionName === undefined) {
    return moodleException("invalid_parameter_exception", "invalidparameter", "Unknown wsfunction.")
  }
  if (scenario === "malformed_response") return malformedResponse()
  const user = userForToken(input, state)
  if (scenario === "expired_token") {
    return moodleException("moodle_exception", "invalidtoken", "The synthetic token has expired.")
  }
  if (user === undefined) {
    return moodleException("moodle_exception", "invalidtoken", "Invalid or missing synthetic token.")
  }
  if (scenario === "missing_capability" || options.missingFunctions?.includes(functionName)) {
    return missingCapability(functionName)
  }
  if (scenario === "moodle_exception") {
    return moodleException("moodle_exception", "syntheticfailure", "Synthetic Moodle exception.")
  }
  if (scenario === "transient_outage") {
    const token = firstField(input, "wstoken") ?? "anonymous"
    const outage = outageResponse(state, `rest:${token}:${functionName}`)
    if (outage !== undefined) return outage
  }
  const payload = handleRestFunction(functionName, {
    input,
    state,
    user,
    options,
    scenario,
    siteUrl: new URL(request.url).origin,
  })
  return jsonResponse(payload)
}

const uploadEndpoint = (
  input: MockRequestInput,
  state: MoodleMockState,
  scenario: MoodleScenario,
): Response => {
  if (scenario === "malformed_response") return malformedResponse()
  const userKey = firstField(input, "token")
  const user = userKey === undefined ? undefined : state.tokens.get(userKey)
  if (scenario === "expired_token" || user === undefined) {
    return moodleException("moodle_exception", "invalidtoken", "Invalid or expired synthetic token.")
  }
  if (scenario === "moodle_exception") {
    return moodleException("moodle_exception", "filetransferfailed", "Synthetic upload failure.")
  }
  if (scenario === "transient_outage") {
    const outage = outageResponse(state, `upload:${userKey}`)
    if (outage !== undefined) return outage
  }
  const file = input.files[0]
  if (file === undefined) return jsonResponse({ error: "missing file" }, 400)
  const requestedItemid = numberField(input, "itemid")
  const itemid = requestedItemid ?? state.nextDraftItemId++
  if (requestedItemid !== undefined && requestedItemid >= state.nextDraftItemId) {
    state.nextDraftItemId = requestedItemid + 1
  }
  const filename = file.name.replace(/[^A-Za-z0-9._-]/g, "_") || "upload.bin"
  const item = {
    itemid,
    filename,
    filepath: "/",
    filesize: file.size,
    mimetype: file.type,
  } as const
  state.uploadItems.set(itemid, { ...item, user, itemid })
  return jsonResponse([item])
}

const fileEndpoint = (request: Request, state: MoodleMockState, scenario: MoodleScenario): Response => {
  const url = new URL(request.url)
  const token = url.searchParams.get("token") ?? ""
  const userKey = state.tokens.get(token)
  const user = userKey === undefined ? undefined : FIXTURE_USERS[userKey]
  if (user === undefined) {
    return moodleException("webservice_access_exception", "invalidtoken", "Protected file requires a valid token.", 401)
  }
  if (scenario === "protected_file") {
    return moodleException("webservice_access_exception", "nopermissions", "Protected file denied.", 403)
  }
  if (scenario === "malformed_response") return malformedResponse()
  if (scenario === "transient_outage") {
    const outage = outageResponse(state, `file:${token}:${url.pathname}`)
    if (outage !== undefined) return outage
  }
  const assignment = user.assignments.find((candidate) => url.pathname.includes(`/${candidate.id}/`))
  if (assignment === undefined || !url.pathname.includes("mod_assign")) {
    return moodleException("webservice_access_exception", "nopermissions", "Protected file denied.", 403)
  }
  const rawName = url.pathname.split("/").pop() ?? "download.bin"
  const filename = decodeURIComponent(rawName).replace(/[^A-Za-z0-9._-]/g, "_") || "download.bin"
  const bytes = new TextEncoder().encode(`Synthetic protected file for ${user.key}; assignment ${assignment.id}.\n`)
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  })
}

export const handleMoodleRequest = async (
  request: Request,
  state: MoodleMockState,
  options: MoodleMockOptions,
): Promise<Response> => {
  const path = new URL(request.url).pathname.replace(/\/$/, "") || "/"
  try {
    const input = await readMockRequestInput(request)
    const scenario = scenarioFor(request, input, options)
    if (path === "/login/token.php") return loginEndpoint(input, state, scenario)
    if (path === "/login/index.php") return uiLoginEndpoint(request, input, state)
    if (path.startsWith("/mod/questionnaire/")) return questionnairePage(request, input, state)
    const htmlModule = /^\/mod\/(scorm|h5pactivity|lti|bigbluebuttonbn|url)\//.exec(path)?.[1]
    if (htmlModule !== undefined) return htmlActivityPage(request, htmlModule, state)
    if (path === "/webservice/rest/server.php") return restEndpoint(request, input, state, options, scenario)
    if (path === "/webservice/upload.php") return uploadEndpoint(input, state, scenario)
    if (path === "/webservice/pluginfile.php" || path.startsWith("/webservice/pluginfile.php/")) {
      return fileEndpoint(request, state, scenario)
    }
    return jsonResponse({ error: "unknown mock Moodle endpoint" }, 404)
  } catch (error) {
    if (error instanceof MockInputError) return jsonResponse({ error: error.message }, 400)
    throw error
  }
}
