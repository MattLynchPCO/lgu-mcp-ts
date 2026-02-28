/**
 * HTTP transport using Hono and WebStandardStreamableHTTPServerTransport.
 *
 * Follows the same pattern as the lgu-mcp-ts HTTP transport.
 */

import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { createServer } from "../server.js";

export interface HttpAppOptions {
  mcpServer?: Server;
  serverKey?: string;
}

/**
 * Creates the Hono app with MCP endpoints.
 * Exported for testing.
 */
export function createHttpApp(options: HttpAppOptions = {}): Hono {
  const { mcpServer, serverKey } = options;

  const app = new Hono();

  // CORS for MCP headers
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "mcp-session-id",
        "Last-Event-ID",
        "mcp-protocol-version",
      ],
      exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
    })
  );

  // Health check (always unauthenticated)
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Bearer token auth when MCP_SERVER_KEY is set
  if (serverKey) {
    const keyBuffer = Buffer.from(serverKey);
    app.use("*", async (c, next) => {
      const auth = c.req.header("Authorization") ?? "";
      const match = auth.match(/^Bearer\s+(.+)$/i);
      const token = match?.[1];
      const tokenBuffer = token ? Buffer.from(token) : Buffer.alloc(0);
      if (
        token &&
        tokenBuffer.length === keyBuffer.length &&
        timingSafeEqual(tokenBuffer, keyBuffer)
      ) {
        return next();
      }
      return c.text("Unauthorized", 401, { "WWW-Authenticate": "Bearer" });
    });
  }

  // MCP endpoint — creates a new server and transport per request
  if (mcpServer) {
    app.all("/mcp", async (c) => {
      // Create a new server instance for this request
      const requestServer = await createServer();
      const transport = new WebStandardStreamableHTTPServerTransport();
      await requestServer.connect(transport);
      return transport.handleRequest(c.req.raw);
    });
  }

  return app;
}

/**
 * Starts the HTTP server with Hono.
 */
export async function startHttpServer(): Promise<void> {
  const port = parseInt(process.env.PORT || "3000", 10);

  const mcpServer = await createServer();

  const serverKey = process.env.MCP_SERVER_KEY;
  const app = createHttpApp({ mcpServer, serverKey });

  console.log(`Lawmaker Help MCP Server (HTTP mode)`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`Authentication: ${serverKey ? "enabled (MCP_SERVER_KEY)" : "disabled"}`);

  serve({ fetch: app.fetch, port });
}
