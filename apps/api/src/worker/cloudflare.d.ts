// The parts of Cloudflare's Workers runtime that src/worker/index.ts uses. Declared here rather than
// with @cloudflare/workers-types, whose globals (Request, Response …) clash with Node's in the rest of the API.
declare module "cloudflare:node" {
  /** Serves requests to the Worker through a Node HTTP server listening on `port` (e.g. Express). */
  export function httpServerHandler(options: { port: number }): {
    fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
  };
}
