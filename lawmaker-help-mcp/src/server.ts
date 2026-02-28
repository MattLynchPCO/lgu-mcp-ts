/**
 * MCP Server factory for Lawmaker Help documentation.
 *
 * Creates a configured Server instance with vector search over
 * help.lawmaker.legislation.gov.uk.
 *
 * The vector store must be built first using the build-index CLI tool.
 * Set VECTOR_STORE_PATH to point to the built vector store JSON file.
 */

import { existsSync } from "fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import * as searchHelp from "./tools/search-help.js";
import { VectorStore } from "./store/vector-store.js";
import { EmbeddingsClient } from "./embeddings/openai-client.js";

const DEFAULT_VECTOR_STORE_PATH = "./data/vector-store.json";

/**
 * Creates a configured MCP server instance.
 * Loads the vector store from VECTOR_STORE_PATH (or default path).
 */
export async function createServer(): Promise<Server> {
  // Load vector store
  const storePath =
    process.env.VECTOR_STORE_PATH ?? DEFAULT_VECTOR_STORE_PATH;

  let store: VectorStore;
  if (existsSync(storePath)) {
    store = VectorStore.load(storePath);
    console.error(
      `Loaded vector store: ${store.size} chunks (model: ${store.model})`
    );
  } else {
    console.error(
      `Warning: Vector store not found at ${storePath}. ` +
        `Run the build-index CLI tool to create it. ` +
        `Search will return empty results until the store is built.`
    );
    store = new VectorStore();
  }

  // Create embeddings client (used at query time)
  let embeddingsClient: EmbeddingsClient | null = null;
  try {
    embeddingsClient = new EmbeddingsClient(
      store.model ? { model: store.model } : {}
    );
  } catch {
    console.error(
      "Warning: OpenAI API key not set. Search will fail. " +
        "Set OPENAI_API_KEY to enable search."
    );
  }

  const server = new Server(
    {
      name: "lawmaker-help-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handler: List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: searchHelp.name,
          description: searchHelp.description,
          inputSchema: searchHelp.inputSchema,
        },
      ],
    };
  });

  // Handler: Execute a tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!embeddingsClient) {
      return {
        content: [
          {
            type: "text",
            text: "Search is unavailable: OpenAI API key not configured. Set OPENAI_API_KEY.",
          },
        ],
        isError: true,
      };
    }

    try {
      switch (name) {
        case searchHelp.name:
          return await searchHelp.execute(
            args as { query: string; limit?: number },
            store,
            embeddingsClient
          );

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing tool: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
      throw error;
    }
  });

  return server;
}
