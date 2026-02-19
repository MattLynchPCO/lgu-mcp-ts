/**
 * Tool: search_legislation_semantic
 *
 * Semantic search across legislation using the Lex API.
 */

import { LexClient } from "../api/lex-client.js";
import { mapLegislationSearchResponse } from "../api/lex-mapper.js";

export const name = "search_legislation_semantic";

export const description = `Semantic search across legislation using a vector index. Returns Acts ranked by relevance, with their best-matching section identifiers and scores.

Note: The index is a snapshot and may lag behind live legislation.gov.uk. Verify critical results with \`search_legislation\`.

Returns section identifiers only, not text. Use \`search_legislation_sections_semantic\` for section text, or \`get_legislation\` for the full Act.

See: \`cookbook://semantic-search-workflow\`, \`json://semantic-search-response\``;

export const inputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Natural language query for semantic search",
    },
    types: {
      type: "array",
      items: { type: "string" },
      description: "Legislation type codes (e.g., ukpga, uksi)",
    },
    yearFrom: {
      type: "number",
      description: "Start year (inclusive)",
    },
    yearTo: {
      type: "number",
      description: "End year (inclusive)",
    },
    offset: {
      type: "number",
      description: "Pagination offset",
    },
    limit: {
      type: "number",
      description: "Max results (default: 10)",
    },
  },
  required: ["query"],
};


export async function execute(
  args: {
    query: string;
    types?: string[];
    yearFrom?: number;
    yearTo?: number;
    offset?: number;
    limit?: number;
  },
  client: LexClient
) {
  try {
    const results = await client.searchLegislation({
      query: args.query,
      legislation_type: args.types,
      year_from: args.yearFrom,
      year_to: args.yearTo,
      offset: args.offset,
      limit: args.limit,
    });

    const mapped = mapLegislationSearchResponse(results);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(mapped, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching legislation (semantic): ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
