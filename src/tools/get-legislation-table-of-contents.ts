/**
 * Tool: get_legislation_table_of_contents
 *
 * Retrieve the table of contents for a piece of UK legislation
 */

import { LegislationClient, LegislationResponse } from "../api/legislation-client.js";
import { TocParser } from "../parsers/toc-parser.js";

export const name = "get_legislation_table_of_contents";

export const description = `Retrieve the table of contents for a specific piece of UK legislation.

This tool fetches the hierarchical structure of legislation documents, showing Parts, Chapters, Sections, and their headings.

Returns structured JSON by default with semantic sections (introduction, body, schedules, etc.).
Optional sections are only included when present in the document.

Useful for:
- Understanding the overall structure before fetching content
- Finding specific sections by browsing the hierarchy
- Getting fragment IDs for use with get_legislation_fragment

Available formats:
- json (default): Structured, hierarchical JSON representation
- xml: Raw CLML Contents element
- akn: Akoma Ntoso format
- html: Rendered HTML

Common legislation types:
- ukpga: UK Public General Acts (Acts of Parliament)
- uksi: UK Statutory Instruments (secondary legislation)
- ukla: UK Local Acts
- asp: Acts of the Scottish Parliament
- anaw: Acts of the National Assembly for Wales
- asc: Acts of Senedd Cymru (Welsh Parliament)
- nia: Northern Ireland Acts

Examples:
- get_legislation_table_of_contents(type="ukpga", year="1968", number="60") → Structure of Theft Act 1968 as JSON
- get_legislation_table_of_contents(type="uksi", year="2020", number="1234") → Structure of specific SI
- get_legislation_table_of_contents(type="ukpga", year="2020", number="1", version="2023-01-01") → As it stood on 1 Jan 2023
- get_legislation_table_of_contents(type="ukpga", year="1968", number="60", format="xml") → Raw CLML Contents XML

Version parameter:
- Date (YYYY-MM-DD): Retrieve structure as it stood on that date
- "enacted": Original version for UK primary legislation (Acts)
- "made": Original version for UK secondary legislation (SIs, etc.)
- "created": Original version for uncommon UK types
- "adopted": Original version for EU legislation`;

export const inputSchema = {
  type: "object",
  properties: {
    type: {
      type: "string",
      description: "Type of legislation (e.g., ukpga, uksi, asp, ukla)",
    },
    year: {
      type: "string",
      description: "Year of enactment. A 4-digit calendar year (e.g., 2020) works for all legislation. For pre-1963 Acts, the canonical identifier uses a regnal year in Reign/Number format (e.g., Vict/63, Geo5/26).",
    },
    number: {
      type: "string",
      description: "Legislation number (e.g., 18, 1234)",
    },
    format: {
      type: "string",
      enum: ["json", "xml", "akn", "html"],
      description: "Response format (default: json for structured data, xml for CLML Contents, akn for Akoma Ntoso, html for rendered version)",
    },
    version: {
      type: "string",
      description: "Optional: Version to retrieve. Use enacted/made/created/adopted for original version, or YYYY-MM-DD for legislation as it stood on that date.",
    },
  },
  required: ["type", "year", "number"],
};

export async function execute(
  args: {
    type: string;
    year: string;
    number: string;
    format?: "json" | "xml" | "akn" | "html";
    version?: string;
  },
  client: LegislationClient
): Promise<any> {
  const { type, year, number, format = "json", version } = args;

  try {
    // For non-JSON formats, fetch directly in that format
    const apiFormat = format === "json" ? "xml" : format;
    const result = await client.getTableOfContents(type, year, number, {
      format: apiFormat,
      version,
    });

    if (result.kind === "disambiguation") {
      return formatDisambiguation(result);
    }

    // If JSON format requested, parse the XML to structured JSON
    const content = format === "json"
      ? JSON.stringify(new TocParser().parse(result.content), null, 2)
      : result.content;

    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving table of contents: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
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
