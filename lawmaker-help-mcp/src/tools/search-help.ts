/**
 * Tool: search_help_documentation
 *
 * Performs vector similarity search over the Lawmaker user manual
 * (help.lawmaker.legislation.gov.uk).
 */

import { VectorStore } from "../store/vector-store.js";
import { EmbeddingsClient } from "../embeddings/openai-client.js";

export const name = "search_help_documentation";

export const description = `Search the Lawmaker user manual using vector (semantic) similarity.

Returns the most relevant sections from help.lawmaker.legislation.gov.uk for your query.
Each result includes the page URL, title, section heading, and the matching text content.

Use this tool to find how to use Lawmaker features, understand workflows, or get
guidance from the official documentation.`;

export const inputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Natural language question or description of what you want to find in the documentation",
    },
    limit: {
      type: "number",
      description: "Maximum number of results to return (default: 5, max: 20)",
    },
  },
  required: ["query"],
};

export async function execute(
  args: { query: string; limit?: number },
  store: VectorStore,
  embeddingsClient: EmbeddingsClient
): Promise<any> {
  const limit = Math.min(args.limit ?? 5, 20);

  try {
    const queryEmbedding = await embeddingsClient.embed(args.query);
    const results = store.search(queryEmbedding, limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No results found. The vector store may be empty — run `build-index` to populate it.",
          },
        ],
      };
    }

    const formatted = results.map((r, i) => {
      const lines = [
        `## Result ${i + 1} (score: ${r.score.toFixed(4)})`,
        `**Page:** ${r.chunk.title}`,
        `**URL:** ${r.chunk.url}`,
      ];
      if (r.chunk.heading) {
        lines.push(`**Section:** ${r.chunk.heading}`);
      }
      lines.push("", r.chunk.text);
      return lines.join("\n");
    });

    return {
      content: [
        {
          type: "text",
          text: formatted.join("\n\n---\n\n"),
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching documentation: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
