# Semantic Section Search Response Format

Response format for `search_legislation_sections_semantic` tool.

## Overview

The semantic section search tool returns individual sections ranked by semantic relevance to your query, optionally including the full section text.

## Response Structure

```typescript
MappedLegislationSection[]
```

Returns an array of section objects, ordered by relevance.

## MappedLegislationSection Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `provisionId` | string | Section fragment path within the parent legislation (e.g., `"section/1"`). Falls back to document ID or raw URI if fragment cannot be extracted. | `"section/1"` |
| `provisionType` | string (optional) | Type of provision | `"section"`, `"regulation"`, `"article"` |
| `number` | number (optional) | Section number | `1`, `2`, `42` |
| `title` | string (optional) | Section heading/title | `"Overview"`, `"Definitions"` |
| `text` | string (optional) | Full section text content | See below |
| `extent` | string[] (optional) | Geographical extent codes | `["E", "W"]` |
| `legislation` | LegislationReference | Parent legislation info | See below |

### LegislationReference Object

Information about the parent legislation containing this section:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Normalized legislation identifier | `"ukpga/2018/12"` |
| `type` | string (optional) | Legislation type code | `"ukpga"` |
| `year` | number (optional) | Year of enactment | `2018` |
| `number` | number (optional) | Legislation number | `12` |

**Note:** The parent legislation title is NOT included. Use `get_legislation_metadata` or `get_legislation` to retrieve the Act title if needed.

## Extent Codes

The `extent` field uses normalized jurisdiction codes:

| Code | Meaning |
|------|---------|
| `E` | England |
| `W` | Wales |
| `S` | Scotland |
| `NI` | Northern Ireland |

Example: `["E", "W", "S"]` means England, Wales, and Scotland (Great Britain).

## Text Content

When `includeText=true` is used, the `text` field contains the full section content including:
- Section number and heading
- All subsections and paragraphs
- Complete legislative text

When `includeText=false` (or omitted), the `text` field is absent, making responses much faster but excluding the actual content.

## Complete Example

```json
[
  {
    "provisionId": "section/1",
    "provisionType": "section",
    "number": 1,
    "title": "Overview",
    "extent": ["E", "W", "S", "NI"],
    "legislation": {
      "id": "ukpga/2018/12",
      "type": "ukpga",
      "year": 2018,
      "number": 12
    },
    "text": "(1) This Act makes provision about the processing of personal data.\n\n(2) Most processing of personal data is subject to—\n\n(a) the GDPR (see section 2),\n\n(b) Parts 5 to 7 of this Act, and\n\n(c) regulations made under this Act."
  },
  {
    "provisionId": "section/3",
    "provisionType": "section",
    "number": 3,
    "title": "Terms relating to the processing of personal data",
    "extent": ["E", "W", "S", "NI"],
    "legislation": {
      "id": "ukpga/2018/12",
      "type": "ukpga",
      "year": 2018,
      "number": 12
    },
    "text": "(1) This section defines some terms used in this Act.\n\n(2) 'Personal data' means any information relating to an identified or identifiable living individual..."
  }
]
```

## Minimal Example (includeText=false)

```json
[
  {
    "provisionId": "section/1",
    "provisionType": "section",
    "number": 1,
    "title": "Overview",
    "extent": ["E", "W", "S", "NI"],
    "legislation": {
      "id": "ukpga/2018/12",
      "type": "ukpga",
      "year": 2018,
      "number": 12
    }
  }
]
```

## Important Notes

1. **Data Freshness**: Results come from a pre-computed vector index that may be days or weeks behind live legislation.gov.uk data. Always verify critical results using `search_legislation` and `get_legislation`.

2. **Performance**: Setting `includeText=true` significantly increases response size and processing time. Only include text when you need it.

3. **No Act Title**: The parent legislation title is not included in results. To get "Data Protection Act 2018" from `ukpga/2018/12`, use:
   - `get_legislation_metadata(type="ukpga", year="2018", number="12")`
   - Or `get_legislation(type="ukpga", year="2018", number="12")`

4. **Result Ordering**: Sections are ordered by semantic relevance to your query (most relevant first), not by their position in the legislation.

5. **Missing Fields**: Optional fields may be absent if not available in the source data. Always check for field existence before using.

6. **Year Filter Limitations**: The `yearFrom` and `yearTo` filters do not work reliably for regnal-year legislation (historical Acts using monarch's reign years like "1 & 2 Eliz. 2").

## Related Resources

- **`json://semantic-search-response`** - Format for Act-level semantic search results
- **`json://metadata-response`** - Format for get_legislation_metadata results
- **`clml://schema-guide`** - How to parse full CLML documents
- **`cookbook://check-extent`** - Working with geographical extent
