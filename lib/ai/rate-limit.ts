const WINDOW_MS = 60_000;
const LIMIT = 3;

type UserState = { active: boolean; requests: number[] };

export class AiRequestLimitError extends Error {
  override readonly name = "AiRequestLimitError";
  readonly code = "ai_rate_limited";
}

export class AiRequestInProgressError extends Error {
  override readonly name = "AiRequestInProgressError";
  readonly code = "ai_request_in_progress";
}

export class AiRateLimiter {
  readonly #users = new Map<string, UserState>();

  acquire(userKey: string, now = Date.now()): () => void {
    const state = this.#users.get(userKey) ?? { active: false, requests: [] };
    if (state.active) throw new AiRequestInProgressError();
    state.requests = state.requests.filter((timestamp) => now - timestamp < WINDOW_MS);
    if (state.requests.length >= LIMIT) throw new AiRequestLimitError();
    state.requests.push(now);
    state.active = true;
    this.#users.set(userKey, state);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      state.active = false;
    };
  }
}
