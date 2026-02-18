/**
 * Tool: get_legislation
 *
 * Retrieve a specific piece of UK legislation by citation
 */

import { LegislationClient, LegislationResponse } from "../api/legislation-client.js";
import { CLMLTextParser } from "../parsers/clml-text-parser.js";

export const name = "get_legislation";

export const description = `Retrieve a specific piece of UK legislation by citation in CLML (Crown Legislation Markup Language) XML format.

This tool fetches full legislation documents from legislation.gov.uk by their type, year, and number.

Returns CLML XML by default - a structured, machine-readable format that preserves all legislative metadata and content.

**For help parsing CLML XML structure, read the resource at: clml://schema-guide**
**For step-by-step examples, see: cookbook://check-extent**

Available formats:
- xml (default): CLML format - UK-specific legislative XML schema
- text: Plain-text rendering of CLML content, readable without XML knowledge
- akn: Akoma Ntoso format - international LegalDocML standard
- html: Rendered HTML for human reading

Common legislation types:
- ukpga: UK Public General Acts (Acts of Parliament)
- uksi: UK Statutory Instruments (secondary legislation)
- ukla: UK Local Acts
- asp: Acts of the Scottish Parliament
- ukia: UK Impact Assessments
- anaw: Acts of the National Assembly for Wales
- asc: Acts of Senedd Cymru (Welsh Parliament)
- nia: Northern Ireland Acts

Examples:
- get_legislation(type="ukpga", year="1968", number="60") → Theft Act 1968 in CLML XML
- get_legislation(type="uksi", year="2020", number="1234") → Specific SI in CLML XML
- get_legislation(type="ukpga", year="2020", number="1", version="2023-01-01") → As it stood on 1 Jan 2023
- get_legislation(type="ukpga", year="2025", number="1", version="enacted") → Original enacted version
- get_legislation(type="ukpga", year="1968", number="60", format="akn") → Akoma Ntoso XML format
- get_legislation(type="ukpga", year="1968", number="60", format="html") → HTML rendering
- get_legislation(type="ukpga", year="Vict/63", number="52") → A Victorian-era Act in CLML XML

Version parameter:
- Date (YYYY-MM-DD): Retrieve legislation as it stood on that date
- "enacted": Original version for UK primary legislation (Acts)
- "made": Original version for UK secondary legislation (SIs, etc.)
- "created": Original version for uncommon UK types (e.g., Church Instruments)
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
      description: "Year of enactment. A 4-digit calendar year (e.g., 2020) works for all legislation. For pre-1963 Acts, the canonical identifier uses a regnal year in Reign/Number format (e.g., Vict/63, Geo5/26) — but a calendar year will usually work too, as the API redirects. Use regnal years when you need to disambiguate (a calendar year can span two regnal years). See the years://regnal resource for valid identifiers.",
    },
    number: {
      type: "string",
      description: "Legislation number (e.g., 18, 1234)",
    },
    format: {
      type: "string",
      enum: ["xml", "text", "akn", "html"],
      description: "Response format (default: xml for CLML, text for plain-text rendering, akn for Akoma Ntoso, html for rendered version)",
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
    format?: "xml" | "text" | "akn" | "html";
    version?: string;
  },
  client: LegislationClient
): Promise<any> {
  const { type, year, number, format = "xml", version } = args;

  try {
    const apiFormat = format === "text" ? "xml" : format;
    const result = await client.getDocument(type, year, number, {
      format: apiFormat,
      version,
    });

    if (result.kind === "disambiguation") {
      return formatDisambiguation(result);
    }

    const content = format === "text"
      ? new CLMLTextParser().parse(result.content)
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
            text: `Error retrieving legislation: ${error.message}`,
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
