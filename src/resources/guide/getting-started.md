# Getting Started with UK Legislation

This MCP server provides tools and resources for working with UK legislation from legislation.gov.uk.

## Quick Start: Basic Workflow

1. **Search** for legislation by title or keyword using `search_legislation`
2. **Review** the search results (JSON by default) to find relevant documents
3. **Retrieve** full documents using `get_legislation` with type/year/number
4. **Parse** the CLML XML to extract specific provisions

## Choosing the Right Tool

### Search Tools: Which One to Use?

| Use Case | Recommended Tool | Why |
|----------|-----------------|-----|
| Find legislation by exact title | `search_legislation` | Guaranteed current, official results |
| Find recent/latest legislation | `search_legislation` | Real-time data from legislation.gov.uk |
| Search by keyword or concept | `search_legislation_semantic` | Better at understanding meaning and intent |
| Exploratory research across topics | `search_legislation_semantic` | Finds relevant sections across all legislation |
| Find specific sections matching a concept | `search_legislation_sections_semantic` | Returns individual sections ranked by relevance |
| Critical legal research | `search_legislation` | Always verify semantic results here for accuracy |

**Key Trade-offs:**
- **Standard search** (`search_legislation`): Real-time, authoritative, exact matching
- **Semantic search** (`search_legislation_semantic`, `search_legislation_sections_semantic`): Better conceptual matching but may be days/weeks behind live data

### Retrieval Tools: Which One to Use?

| Use Case | Recommended Tool | Why |
|----------|-----------------|-----|
| Just need title, dates, extent | `get_legislation_metadata` | Fast, lightweight JSON response |
| Need specific section text | `get_legislation` | Full document with all provisions |
| Building citations | `get_legislation_metadata` | Has all citation components |
| Comparing versions over time | `get_legislation` with `version` | Point-in-time snapshots |
| Human-readable display | `get_legislation` format="html" | Pre-rendered for reading |

## Available Tools

### `search_legislation`
Search for UK legislation by various criteria:
- `title`: Search in legislation titles
- `text`: Full-text search across content
- `type`: Filter by legislation type (ukpga, uksi, etc.)
- `year`: Filter by year or year range
- `format`: Response format (json or xml, default: json)

Returns clean JSON with array of matching documents by default.
Set `format="xml"` for raw Atom feed.

### `get_legislation`
Retrieve a specific piece of legislation by citation:
- `type`: Legislation type short code (ukpga, uksi, asp, etc.)
- `year`: Year of enactment
- `number`: Legislation number
- `format`: xml (CLML), akn (Akoma Ntoso), or html
- `version`: Optional point-in-time date (YYYY-MM-DD)

Returns the full legislation document in the requested format.

### `get_legislation_metadata`
Retrieve structured metadata for legislation:
- `type`: Legislation type short code (ukpga, uksi, asp, etc.)
- `year`: Year of enactment
- `number`: Legislation number
- `version`: Optional point-in-time date (YYYY-MM-DD)

Returns clean JSON with extracted fields (title, extent, dates, etc.).
More efficient than fetching the full document when you only need metadata.

### `search_legislation_semantic` (Experimental)
Semantic search across legislation using vector index:
- `query`: Natural language query
- `types`: Optional legislation type filter
- `yearFrom`/`yearTo`: Optional year range
- `limit`: Max results

Returns Acts ranked by semantic relevance with best-matching section identifiers.
**Note:** Searches a pre-computed index that may lag behind live data.

### `search_legislation_sections_semantic` (Experimental)
Semantic search across individual sections:
- `query`: Natural language query
- `types`: Optional legislation type filter
- `yearFrom`/`yearTo`: Optional year range
- `includeText`: Whether to include full section text
- `limit`: Max results

Returns sections ranked by semantic relevance with actual text.
**Note:** Searches a pre-computed index that may lag behind live data.

## Available Resources

### Step-by-Step Recipes (Cookbook)

**See `cookbook://index` for the complete catalog of recipes.**

Common workflow recipes available:

- **`cookbook://check-extent`** - Check geographical extent/applicability
  - "Does this Act apply to Scotland?"
  - Step-by-step guide from search to answer
  - Interpreting extent codes

- **`cookbook://point-in-time-version`** - Retrieve historical versions
  - "Show me this Act as it stood on a specific date"
  - Use `version` parameter for enacted/made or date-based retrieval

### Reference Documentation

Read these resources to understand UK legislation data structures:

#### JSON Formats

- **`json://search-response`** - Search result format
  - SearchResponse and SearchResult field documentation
  - Simplified `id` field format
  - Complete examples

- **`json://metadata-response`** - Metadata format
  - LegislationMetadata field documentation
  - Extent arrays and date fields
  - Primary vs secondary legislation examples

- **`json://table-of-contents-response`** - Table of contents format
  - Response structure for `get_legislation_table_of_contents`
  - Hierarchical `contents` with semantic sections
  - `fragmentId` values for use with `get_legislation_fragment`

#### XML Formats

- **`clml://schema-guide`** - How to parse CLML XML documents
  - Document structure, sections, provisions
  - Finding section numbers and headings
  - Common XML patterns

- **`clml://metadata/extent`** - Geographical extent in CLML
  - Understanding RestrictExtent attributes
  - Extent codes and jurisdiction mapping

- **`atom://feed-guide`** - How to parse Atom feed XML
  - Atom feed structure and elements
  - Extracting type/year/number from metadata
  - Link elements and data formats

#### Other References

- **`types://guide`** - Legislation types reference
  - All UK legislation types (primary, secondary, EU retained)
  - Short code ↔ long name mappings
  - Conversion examples

- **`types://data`** - Structured JSON data
  - Programmatic access to type mappings
  - Includes categories and descriptions

- **`getting-started`** (this document) - Overview and external links

### External Official Resources

These official resources provide additional context and documentation:

#### Understanding UK Legislation
**URL**: https://www.legislation.gov.uk/understanding-legislation

Official guide covering fundamental concepts:
- Primary vs secondary legislation
- UK's multi-jurisdictional legislative system
- Citation systems and numbering
- Geographical extent and application
- Associated documents (Explanatory Notes, Impact Assessments)
- How legislation comes into force
- Database coverage and scope

**When to read**: Essential background for understanding UK legislative structures and how different parliaments create law.

#### CLML Schema Definition
**URL**: https://www.legislation.gov.uk/schema/legislation.xsd

Official XML Schema Definition (XSD) for Crown Legislation Markup Language:
- Complete technical specification
- All element and attribute definitions
- Complex type definitions
- Documentation annotations

**When to read**: For detailed technical reference when parsing CLML XML or understanding specific elements.

## Typical Usage Patterns

### Pattern 1: Find and Retrieve by Title

1. Search: `search_legislation(title="data protection")`
2. Parse the Atom feed results
3. Identify: "Data Protection Act 2018"
4. Extract: `ukpga`, `2018`, `12` from `<ukm:*>` elements
5. Retrieve: `get_legislation(type="ukpga", year="2018", number="12")`

### Pattern 2: Browse by Type and Year

1. Search: `search_legislation(type="uksi", year="2023")`
2. Browse all UK Statutory Instruments from 2023
3. Select specific instrument
4. Retrieve full text

### Pattern 3: Point-in-Time Query

1. Find current legislation
2. Retrieve historical version: `get_legislation(type="ukpga", year="2018", number="12", version="2020-01-01")`
3. See how the law looked on a specific date

## Understanding Response Formats

### Search Results (Atom Feed)
- XML format based on Atom Syndication Format
- Each `<entry>` is a search result
- Use `atom://feed-guide` resource for parsing details

### Documents (CLML XML)
- UK-specific legislative XML schema
- Structured with `<Metadata>` and `<Body>` sections
- Use `clml://schema-guide` resource for parsing details

### Documents (Akoma Ntoso)
- International LegalDocML standard (ISO)
- Alternative to CLML with more modern structure
- Format: `get_legislation(..., format="akn")`

### Documents (HTML)
- Rendered HTML for human reading
- Format: `get_legislation(..., format="html")`

## Key Concepts

### Legislation Types
UK legislation comes in many types across different jurisdictions:
- **Primary**: Acts of Parliament and devolved legislatures (ukpga, asp, asc, nia, etc.)
- **Secondary**: Statutory Instruments and delegated legislation (uksi, ssi, wsi, nisr, etc.)
- **EU Retained**: European Union law retained post-Brexit (eur, eudn, eudr, eut)

See `types://guide` for complete reference.

### Point-in-Time Versions
Most legislation on legislation.gov.uk is available "as enacted" and "as currently in force." You can also request how it looked on any specific date using the `version` parameter.

### Citation Formats
Different citation styles exist:
- Modern: "Data Protection Act 2018" or "2018 c. 12"
- Regnal years: Historical Acts use monarch's reign (e.g., "1 & 2 Eliz. 2 c. 3")
- Devolved: Scottish Acts use "asp", Welsh use "asc", NI use "nia"

## Tips for Success

1. **Start with types reference** - Understand the different legislation types before searching
2. **Read the Atom guide** - Search results are in Atom feed format, not plain JSON
3. **Use CLML by default** - Most complete and accurate format
4. **Reference official docs** - The Understanding Legislation page has essential context
5. **Check the schema** - When in doubt about CLML structure, consult the XSD

## Need Help?

- For data structure questions: Read the relevant resource guide
- For UK legislative concepts: Visit https://www.legislation.gov.uk/understanding-legislation
- For CLML technical details: Consult https://www.legislation.gov.uk/schema/legislation.xsd
- For tool parameters: Check the tool's `inputSchema` description
