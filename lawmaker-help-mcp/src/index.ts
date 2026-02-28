#!/usr/bin/env node

/**
 * MCP Server for Lawmaker Help documentation (help.lawmaker.legislation.gov.uk)
 *
 * Provides a vector search tool over the Lawmaker user manual.
 *
 * Supports two transport modes:
 * - stdio (default): For local development and Claude Desktop
 * - http: For remote access via HTTP/SSE
 *
 * Set MCP_TRANSPORT=http to enable HTTP mode.
 *
 * Prerequisites:
 *   1. Run `npm run build-index` to build the vector store from the help site.
 *   2. Set OPENAI_API_KEY for embedding generation (both build-index and runtime).
 *   3. Optionally set VECTOR_STORE_PATH to specify a custom store location.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { startHttpServer } from "./transports/http.js";

/**
 * Start server in stdio mode (default)
 */
async function startStdioServer(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP communication)
  console.error("Lawmaker Help MCP Server (stdio mode)");
  console.error("Tool: search_help_documentation");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const transport = process.env.MCP_TRANSPORT || "stdio";

  switch (transport) {
    case "stdio":
      await startStdioServer();
      break;
    case "http":
      await startHttpServer();
      break;
    default:
      console.error(`Unknown transport: ${transport}`);
      console.error("Valid options: stdio, http");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
