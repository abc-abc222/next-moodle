export type WireRequest = {
  readonly headers: Headers;
  readonly method: string;
  readonly path: string;
  readonly form: URLSearchParams;
};

export type WireMoodle = {
  readonly baseUrl: string;
  readonly requests: readonly WireRequest[];
  readonly close: () => void;
};

type WireHandler = (
  request: WireRequest,
  requestNumber: number,
) => Response | Promise<Response>;

export function startWireMoodle(handler: WireHandler): WireMoodle {
  const requests: WireRequest[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const wireRequest = {
        headers: request.headers,
        method: request.method,
        path: new URL(request.url).pathname,
        form: new URLSearchParams(await request.text()),
      } satisfies WireRequest;
      requests.push(wireRequest);
      return handler(wireRequest, requests.length);
    },
  });

  return {
    baseUrl: server.url.toString(),
    requests,
    close: () => {
      server.stop(true);
    },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function htmlResponse(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(body, { ...init, headers });
}
