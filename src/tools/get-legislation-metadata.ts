/**
 * Tool: get_legislation_metadata
 *
 * Retrieve structured metadata for a specific piece of UK legislation
 */

import { LegislationClient, LegislationResponse } from "../api/legislation-client.js";
import { MetadataParser } from "../parsers/metadata-parser.js";

export const name = "get_legislation_metadata";

export const description = `Retrieve structured metadata for a UK legislation document. More efficient than fetching the full document when you only need metadata.

\`type\`, \`year\`, and \`number\` must be exact — use search_legislation to confirm if unsure.

Returns JSON with: \`id\`, \`type\`, \`year\`, \`number\`, \`title\`, \`status\` (\`draft\`/\`final\`/\`revised\`/\`proposed\`), \`extent\` (e.g. \`["E","W","S","NI"]\`), and key dates (\`enactmentDate\`/\`madeDate\`).

Version: use a date (\`YYYY-MM-DD\`) for a point-in-time snapshot, or \`enacted\`/\`made\`/\`created\`/\`adopted\` for the original version.

See: \`types://guide\`, \`cookbook://point-in-time-version\`, \`cookbook://check-extent\`, \`json://metadata-response\``;

export const inputSchema = {
  type: "object",
  properties: {
    type: {
      type: "string",
      description: "Type of legislation (e.g., ukpga, uksi, asp, ukla)",
    },
    year: {
      type: "string",
      description: "Year of enactment. A 4-digit calendar year (e.g., 2020) works for all legislation. For pre-1963 Acts, the canonical identifier uses a regnal year in Reign/Number format (e.g., Vict/63, Geo5/26) — but a calendar year will usually work too, as the API redirects. Use regnal years when you need to disambiguate (a calendar year can span two regnal years). See the years://regnal resource for valid identifiers.",
    },
    number: {
      type: "string",
      description: "Legislation number (e.g., 2, 1234)",
    },
    version: {
      type: "string",
      description: "Optional: Version to retrieve. Use enacted/made/created/adopted for original version, or YYYY-MM-DD for legislation as it stood on that date. Dates before first version return an error.",
    },
  },
  required: ["type", "year", "number"],
};

export async function execute(
  args: {
    type: string;
    year: string;
    number: string;
    version?: string;
  },
  client: LegislationClient
) {
  const { type, year, number, version } = args;

  // Fetch metadata XML
  const result = await client.getDocumentMetadata(type, year, number, { version });

  if (result.kind === "disambiguation") {
    return formatDisambiguation(result);
  }

  // Parse to structured JSON
  const parser = new MetadataParser();
  const metadata = parser.parse(result.content);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(metadata, null, 2)
      }
    ]
  };
}

function formatDisambiguation(result: Extract<LegislationResponse, { kind: "disambiguation" }>) {
  const list = result.alternatives
    .map(a => `- ${a.title} → use year="${a.year}", number="${a.number}"`)
    .join("\n");
  return {
    content: [
      {
        type: "text" as const,
        text: `Ambiguous request: the calendar year matched multiple regnal years. Retry with a specific regnal year:\n${list}`,
        annotations: { audience: ["assistant" as const], priority: 1 },
      },
    ],
  };
}
