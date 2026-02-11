/**
 * Mapper for converting Lex API responses to legislation.gov.uk-compatible shapes.
 *
 * These interfaces currently mirror the Lex response shapes, but will
 * evolve to match legislation.gov.uk response structures for consistency across
 * MCP tools.
 *
 * Known limitations:
 * - enactmentDate is only populated for primary legislation
 * - Secondary legislation dates (madeDate) are not available in semantic search
 */

import type {
  LexLegislationActResult,
  LexLegislationActSectionMatch,
  LexLegislationSearchResponse,
  LexLegislationSection,
} from "./lex-client.js";
import { parseLegislationUri } from "../utils/legislation-uri.js";

/**
 * Normalize a legislation.gov.uk URI to a document ID (type/year/number).
 * Strips base URL prefix and any fragment, version, or language suffixes.
 * Example: "https://www.legislation.gov.uk/id/ukpga/2020/2/enacted" -> "ukpga/2020/2"
 */
function normalizeId(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = parseLegislationUri(value);
  if (!parsed) {
    // Fall back to stripping the base URL prefix
    return value.replace(/^https?:\/\/www\.legislation\.gov\.uk\/(id\/)?/, "");
  }
  return `${parsed.type}/${parsed.year}/${parsed.number}`;
}

/**
 * Extract the fragment portion from a legislation.gov.uk URI.
 * Example: "https://www.legislation.gov.uk/id/ukpga/2020/2/section/1" -> "section/1"
 */
function extractFragment(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = parseLegislationUri(value);
  return parsed?.fragment;
}

/**
 * Normalize extent values from full country names to codes.
 * Filters out empty strings and expands "United Kingdom" to all constituent countries.
 * Example: ["England", "Wales", ""] -> ["E", "W"]
 * Example: ["United Kingdom"] -> ["E", "W", "S", "NI"]
 */
function normalizeExtent(extent?: string[]): string[] | undefined {
  if (!extent) return undefined;

  const normalized: string[] = [];

  for (const name of extent) {
    // Skip empty strings
    if (name === "") continue;

    switch (name) {
      case "England":
        normalized.push("E");
        break;
      case "Wales":
        normalized.push("W");
        break;
      case "Scotland":
        normalized.push("S");
        break;
      case "Northern Ireland":
        normalized.push("NI");
        break;
      case "United Kingdom":
        // Expand UK to all constituent countries
        normalized.push("E", "W", "S", "NI");
        break;
      default:
        // Fallback: keep unknown values as-is
        normalized.push(name);
    }
  }

  return normalized.length > 0 ? normalized : undefined;
}

export interface MappedLegislationActSectionMatch {
  number: string;
  provisionType: string;
  score: number;
}

export interface MappedLegislationActResult {
  id: string;
  type?: string;
  year?: number;
  number?: number;
  title: string;
  description?: string;
  publisher?: string;
  status?: string;
  extent?: string[];
  enactmentDate?: string;
  modifiedDate?: string;
  sections?: MappedLegislationActSectionMatch[];
}

export interface MappedLegislationSearchResponse {
  results: MappedLegislationActResult[];
  total: number;
  offset: number;
  limit: number;
}

function mapLegislationActSectionMatch(
  section: LexLegislationActSectionMatch
): MappedLegislationActSectionMatch {
  return {
    number: section.number,
    provisionType: section.provision_type,
    score: section.score,
  };
}

export function mapLegislationActResult(
  result: LexLegislationActResult
): MappedLegislationActResult {
  return {
    id: normalizeId(result.id ?? result.uri) || result.id || result.uri || "",
    type: result.type,
    year: result.year,
    number: result.number,
    title: result.title,
    description: result.description,
    publisher: result.publisher,
    status: result.status,
    extent: normalizeExtent(result.extent),
    enactmentDate: result.enactment_date,
    modifiedDate: result.modified_date,
    sections: result.sections?.map(mapLegislationActSectionMatch),
  };
}

export function mapLegislationSearchResponse(
  response: LexLegislationSearchResponse
): MappedLegislationSearchResponse {
  return {
    results: response.results.map(mapLegislationActResult),
    total: response.total,
    offset: response.offset,
    limit: response.limit,
  };
}

export interface MappedLegislationSection {
  provisionId: string;
  provisionType?: string;
  number?: number;
  legislation: {
    id: string;
    type?: string;
    year?: number;
    number?: number;
  };
  title?: string;
  extent?: string[];
  text?: string;
}

export function mapLegislationSection(
  section: LexLegislationSection
): MappedLegislationSection {
  return {
    // extractFragment and normalizeId each call parseLegislationUri independently.
    // This parses the same URI twice, but the function is cheap (string splitting)
    // and keeping them as separate single-purpose functions is clearer than
    // inlining a single parse here.
    provisionId: extractFragment(section.id ?? section.uri)
      || normalizeId(section.id ?? section.uri)
      || section.id || section.uri || "",
    provisionType: section.provision_type,
    number: section.number,
    legislation: {
      id: normalizeId(section.legislation_id) || section.legislation_id || "",
      type: section.legislation_type,
      year: section.legislation_year,
      number: section.legislation_number,
    },
    title: section.title,
    extent: normalizeExtent(section.extent),
    text: section.text,
  };
}
