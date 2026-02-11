/**
 * Parser for legislation metadata XML
 *
 * Converts XML metadata responses to clean JSON structure with key fields.
 * This is an experimental feature to improve AI agent usability.
 */

import { XMLParser } from 'fast-xml-parser';
import { parseLegislationUri } from '../utils/legislation-uri.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load types data for longName -> shortCode mapping
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const typesDataPath = join(__dirname, '..', 'resources', 'types', 'data.json');
const typesData = JSON.parse(readFileSync(typesDataPath, 'utf-8'));

// Build lookup map: longName -> shortCode
const longToShortTypeMap = new Map<string, string>();
for (const type of typesData.types) {
  longToShortTypeMap.set(type.longName, type.shortCode);
}

/**
 * Structured metadata extracted from legislation
 */
export interface LegislationMetadata {
  // Identification
  id: string;            // e.g., "ukpga/2020/2"
  type: string;          // e.g., "ukpga"
  year: number;          // e.g., 2020
  number: number;        // e.g., 2
  title: string;

  // Version status
  status?: string;       // "draft", "final", "revised", "proposed"

  // Geographical extent
  extent?: string[];     // ["E", "W"], ["E", "W", "S"], ["E", "W", "S", "NI"], etc. (normalized from N.I.)

  // Important dates
  enactmentDate?: string;   // When enacted (primary legislation)
  madeDate?: string;        // When made (secondary legislation)

  // Version/language of this response (if URI included them)
  version?: string;        // e.g., "enacted", "2024-01-01"
  language?: string;       // "english" or "welsh"

  // Additional metadata
  isbn?: string;            // TODO: Extract from metadata
}

export class MetadataParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true  // Strip ukm:, dc:, etc. prefixes
    });
  }

  /**
   * Parse XML metadata into structured JSON
   */
  parse(xml: string): LegislationMetadata {
    const obj = this.parser.parse(xml);

    // Debug: uncomment to see full structure
    // console.error(JSON.stringify(obj, null, 2));

    // Navigate to root Legislation element
    const legislation = obj.Legislation;

    if (!legislation) {
      throw new Error('Unable to find Legislation element in metadata XML');
    }

    const longType = this.extractLongType(legislation);
    const shortType = longToShortTypeMap.get(longType) || '';

    const parsed = this.parseDocumentUri(legislation);

    return {
      id: parsed.id,
      type: shortType,
      year: this.extractYear(legislation),
      number: this.extractNumber(legislation),
      title: this.extractTitle(legislation),
      status: this.extractStatus(legislation),
      extent: this.extractExtent(legislation),
      enactmentDate: this.extractEnactmentDate(legislation),
      madeDate: this.extractMadeDate(legislation),
      version: parsed.version,
      language: parsed.language,
    };
  }

  private parseDocumentUri(legislation: any): { id: string; version?: string; language?: string } {
    const fullUri = legislation['@_DocumentURI'] || '';
    if (!fullUri) return { id: '' };

    const parsed = parseLegislationUri(fullUri);
    if (!parsed) {
      // Fall back to stripping the base URL prefix
      return { id: fullUri.replace(/^https?:\/\/www\.legislation\.gov\.uk\/(id\/)?/, '') };
    }
    const id = `${parsed.type}/${parsed.year}/${parsed.number}`;
    return { id, version: parsed.version, language: parsed.language };
  }

  private extractLongType(legislation: any): string {
    const metadata = legislation?.Metadata;
    const typeMetadata = metadata?.PrimaryMetadata || metadata?.SecondaryMetadata || metadata?.EUMetadata;
    return typeMetadata?.DocumentClassification?.DocumentMainType?.['@_Value'] || '';
  }

  private extractYear(legislation: any): number {
    const metadata = legislation?.Metadata;
    const typeMetadata = metadata?.PrimaryMetadata || metadata?.SecondaryMetadata || metadata?.EUMetadata;
    const value = typeMetadata?.Year?.['@_Value'];
    return value ? parseInt(value, 10) : 0;
  }

  private extractNumber(legislation: any): number {
    const metadata = legislation?.Metadata;
    const typeMetadata = metadata?.PrimaryMetadata || metadata?.SecondaryMetadata || metadata?.EUMetadata;
    const value = typeMetadata?.Number?.['@_Value'];
    return value ? parseInt(value, 10) : 0;
  }

  private extractTitle(legislation: any): string {
    const metadata = legislation?.Metadata;
    const title = metadata?.title;

    // Handle both single title and multiple titles (array)
    if (Array.isArray(title)) {
      return title[0] || '';
    }

    return title || '';
  }

  private extractExtent(legislation: any): string[] | undefined {
    const extentStr = legislation?.['@_RestrictExtent'];
    if (!extentStr) return undefined;

    // Split by "+" and normalize N.I. to NI
    return extentStr.split('+').map((code: string) =>
      code === 'N.I.' ? 'NI' : code
    );
  }

  private extractEnactmentDate(legislation: any): string | undefined {
    const metadata = legislation?.Metadata;
    // Check PrimaryMetadata and EUMetadata (both have EnactmentDate)
    const typeMetadata = metadata?.PrimaryMetadata || metadata?.EUMetadata;
    return typeMetadata?.EnactmentDate?.['@_Date'];
  }

  private extractMadeDate(legislation: any): string | undefined {
    const metadata = legislation?.Metadata;
    // Only SecondaryMetadata has MadeDate
    const typeMetadata = metadata?.SecondaryMetadata;
    return typeMetadata?.MadeDate?.['@_Date'];
  }

  private extractStatus(legislation: any): string | undefined {
    const metadata = legislation?.Metadata;
    const typeMetadata = metadata?.PrimaryMetadata || metadata?.SecondaryMetadata || metadata?.EUMetadata;
    return typeMetadata?.DocumentClassification?.DocumentStatus?.['@_Value'];
  }
}
