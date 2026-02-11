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

export const description = `Semantic search across legislation sections using a vector index.

Returns individual sections ranked by relevance to your query, including the actual section text.

IMPORTANT: This tool searches a pre-computed vector index that may not reflect the most recent legislation.
The index is a snapshot and may be days or weeks behind the live legislation.gov.uk dataset. For critical
research or to ensure you have the latest amendments, verify results against search_legislation or the
live website.

Returned fields:
- provisionId: Section fragment path (e.g., "section/1", "regulation/5"). May fall back to document ID if fragment is unavailable.
- provisionType: Section type (e.g., "section", "regulation")
- number: Section number
- legislation: Parent legislation object with id (e.g., "ukpga/2018/12"), type, year, number
- text: Section text (unless includeText=false)
- extent: Geographical extent codes (e.g., ["E", "W"] for England and Wales)

Usage:
- Call with a query to find relevant sections across all legislation
- Use includeText=true to retrieve the actual section text (slower)

Notes:
- Does not include Act title, but provides legislation identifier (e.g., "ukpga/2018/12") which can be used directly with get_legislation_metadata to retrieve title and other details.
- Year filters (yearFrom/yearTo) do not work reliably for regnal-year legislation.`;

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
