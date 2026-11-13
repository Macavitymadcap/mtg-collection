import { setupServer } from "msw/node";

/** Fake BFF and API. Tests add handlers with server.use(...); they're reset after each test. */
export const server = setupServer();
