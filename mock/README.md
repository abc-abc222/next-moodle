# Mock Moodle

`createMoodleMock()` starts an in-process, deterministic Moodle wire server. It uses Bun's native
HTTP listener and does not contact a real site, persist credentials, or write uploaded bytes.

```ts
import { createMoodleMock } from "./moodle-server"

const mock = createMoodleMock()
const server = await mock.start()
try {
  const baseUrl = server.url
} finally {
  await mock.stop()
}
```

The default listener starts at `127.0.0.1:28765` and scans the next 19 ports when that port is
occupied. Pass `{ port: 29100 }` or set `MOODLE_MOCK_PORT` when running `bun mock/run.ts`. The run
helper prints only the URL and port, and stops on SIGINT/SIGTERM. `stop()` closes active connections;
call it from every test's `finally` block.

Synthetic users are:

| Username | Password | Token | User ID | Courses |
| --- | --- | --- | --- | --- |
| `alice` | `alice-password` | `mock-token-alice` | 101 | BIO-101, STAT-210 |
| `bob` | `bob-password` | `mock-token-bob` | 202 | HIST-330 |

The supported wire paths are `/login/token.php`, `/login/index.php`, `/webservice/rest/server.php`,
`/webservice/upload.php`, and `/webservice/pluginfile.php`. The REST handler implements the
function list in `types.ts`, including course, calendar, assignment, completion, and notification
calls. URL-encoded, JSON, and multipart bodies are accepted. Repeated form keys and Moodle's
bracketed keys (`plugindata[onlinetext_editor][text]`, `courseids[0]`) are normalized at the input
boundary.

Every request may select a scenario with `X-Mock-Moodle-Scenario`, `?scenario=`, or the
`mock_scenario` field. Supported values are `success`, `invalid_credentials`, `expired_token`,
`missing_capability`, `empty_data`, `warning`, `moodle_exception`, `transient_outage`,
`malformed_response`, `protected_file`, `upload_draft`, `save_submission`, `submit_for_grading`,
and `notification_read`. `transient_outage` returns one HTTP 503 with `Retry-After: 1` per request
key, then returns the normal response so a single read-only retry can be tested.

The protected-file response is private and `no-store`; its token is accepted only in the query
string used by Moodle's file endpoint and never appears in a browser-facing path. Response samples
are under `tests/fixtures/moodle/`.
