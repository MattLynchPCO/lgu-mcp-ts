/**
 * Tool: search_legislation_sections_semantic
 *
 * Semantic search across legislation sections using the Lex API.
 */

import { LexClient } from "../api/lex-client.js";

import {
  mapLegislationSection,
  type MappedLegislationSection,
} from "../api/lex-mapper.js";

export const name = "search_legislation_sections_semantic";

export const description = `Semantic search for finding which individual sections are relevant to a query. Returns section hits directly (rather than grouped by Act) ranked by relevance.

Returns sections with \`provisionId\`, \`number\`, legislation identifier, \`extent\`, and optionally section text (\`includeText=true\`, slower). Pagination (\`offset\`/\`limit\`) operates at the section level. Use \`search_legislation_semantic\` when you want legislation-level results instead.

Note: The index is a snapshot and may lag behind live legislation.gov.uk. Verify critical results with \`search_legislation\`. Does not include Act titles — use \`get_legislation_metadata\` to look up titles by identifier.

See: \`cookbook://semantic-search-workflow\`, \`json://semantic-section-response\``;

export const inputSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Natural language query for semantic section search",
    },
    types: {
      type: "array",
      items: { type: "string" },
      description: "Legislation type codes (e.g., ukpga, uksi)",
    },
    yearFrom: {
      type: "number",
      description: "Start year (inclusive). Not reliable for regnal-year legislation.",
    },
    yearTo: {
      type: "number",
      description: "End year (inclusive). Not reliable for regnal-year legislation.",
    },
    offset: {
      type: "number",
      description: "Pagination offset",
    },
    limit: {
      type: "number",
      description: "Max results (default: 10)",
    },
    includeText: {
      type: "boolean",
      description: "Include section text in results (slower)",
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
    includeText?: boolean;
  },
  client: LexClient
) {
  try {
    const results = await client.searchLegislationSections({
      query: args.query,
      legislation_type: args.types,
      year_from: args.yearFrom,
      year_to: args.yearTo,
      offset: args.offset,
      size: args.limit,
      include_text: args.includeText,
    });

    const mapped: MappedLegislationSection[] = results.map(mapLegislationSection);

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
            text: `Error searching legislation sections (semantic): ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
