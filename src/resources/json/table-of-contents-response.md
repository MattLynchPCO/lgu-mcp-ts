# Table of Contents Response Format

JSON format for `get_legislation_table_of_contents` tool responses.

This tool returns the hierarchical structure of a legislation document, parsed from the underlying CLML XML into structured JSON with semantic sections. Use it to understand document structure and find `fragmentId` values for use with `get_legislation_fragment`.

## TableOfContents

The top-level response contains two fields:

- **meta** (LegislationMetadata) - Document metadata (see `json://metadata-response` for full field reference)
- **contents** (Contents) - Hierarchical table of contents

## Contents

The contents object organises items into semantic sections. Optional fields are omitted when not present in the source document.

- **title** (string, optional) - Overall title of the contents
  - Example: `"Fire Safety Act 2021"`

- **introduction** (Item, optional) - Introductory text section

- **body** (array of Item) - Main body of the legislation (always present)
  - Contains parts, chapters, sections, cross-headings, etc.
  - Hierarchy is expressed via nested `children` arrays

- **signature** (Item, optional) - Signature section

- **appendices** (array of Item, optional) - Appendices

- **attachmentsBeforeSchedules** (array of Item, optional) - Attachments appearing before schedules in the document

- **schedules** (array of Item, optional) - Schedules (supplementary provisions)

- **attachments** (array of Item, optional) - Attachments appearing after schedules in the document

- **explanatoryNote** (Item, optional) - Explanatory note

- **earlierOrders** (Item, optional) - Note as to earlier commencement orders

### Note on Attachments

Attachments can appear before schedules, after schedules, or both. The two separate fields (`attachmentsBeforeSchedules` and `attachments`) preserve the original document ordering.

## Item

Each item in the hierarchy represents a structural element (part, chapter, section, schedule, etc.).

- **name** (string) - Element type
  - Values: `"part"`, `"chapter"`, `"crossheading"`, `"subheading"`, `"item"` (section/regulation/article), `"schedule"`, `"attachment"`, `"appendix"`, `"division"`, `"group"`, `"title"`, `"introduction"`, `"signature"`, `"explanatoryNote"`, `"earlierOrders"`

- **number** (string, optional) - Display number
  - Examples: `"1"`, `"2A"`, `"Part 1"`, `"Schedule 1"`, `"Chapter 2"`

- **title** (string, optional) - Human-readable heading
  - Example: `"Preliminary"`, `"Interpretation"`
  - Inline elements (Abbreviation, Emphasis) are flattened to plain text

- **fragmentId** (string, optional) - Fragment path for use with `get_legislation_fragment`
  - Examples: `"section/1"`, `"part/2"`, `"schedule/1"`, `"part/1/chapter/2"`

- **extent** (array of strings, optional) - Geographical extent for this item
  - Values: `"E"`, `"W"`, `"S"`, `"NI"`
  - Present when available in CLML (from `RestrictExtent`), including for synthetic navigation-only sections where it may match the document-level extent

- **children** (array of Item, optional) - Nested items
  - Example: A part contains chapters, a chapter contains sections

## Complete Example

A short Act with an introduction, two body sections, and a schedule:

```json
{
  "meta": {
    "id": "ukpga/2021/24",
    "type": "ukpga",
    "year": 2021,
    "number": 24,
    "title": "Fire Safety Act 2021",
    "status": "revised",
    "extent": ["E", "W"],
    "enactmentDate": "2021-04-29"
  },
  "contents": {
    "title": "Fire Safety Act 2021",
    "introduction": {
      "name": "introduction",
      "title": "Introductory Text",
      "fragmentId": "introduction",
      "extent": ["E", "W"]
    },
    "body": [
      {
        "name": "item",
        "number": "1",
        "title": "Premises to which the Fire Safety Order applies",
        "fragmentId": "section/1"
      },
      {
        "name": "item",
        "number": "2",
        "title": "Short title, commencement and extent",
        "fragmentId": "section/2",
        "extent": ["E", "W"]
      }
    ],
    "schedules": [
      {
        "name": "schedule",
        "number": "Schedule 1",
        "title": "Fire Safety Order: enforcement",
        "fragmentId": "schedule/1"
      }
    ],
    "explanatoryNote": {
      "name": "explanatoryNote",
      "title": "Explanatory Note",
      "fragmentId": "note",
      "extent": ["E", "W"]
    }
  }
}
```

## Example with Hierarchical Nesting

An Act with parts and chapters:

```json
{
  "contents": {
    "body": [
      {
        "name": "part",
        "number": "Part 1",
        "title": "General provisions",
        "fragmentId": "part/1",
        "children": [
          {
            "name": "chapter",
            "number": "Chapter 1",
            "title": "Interpretation",
            "fragmentId": "part/1/chapter/1",
            "children": [
              {
                "name": "item",
                "number": "1",
                "title": "Definitions",
                "fragmentId": "section/1"
              },
              {
                "name": "item",
                "number": "2",
                "title": "Application",
                "fragmentId": "section/2"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Using with Other Tools

```javascript
// 1. Search for legislation
search_legislation(title="Fire Safety")

// 2. Get table of contents to understand structure
get_legislation_table_of_contents(type="ukpga", year="2021", number="24")

// 3. Use a fragmentId from the ToC to fetch a specific section
get_legislation_fragment(type="ukpga", year="2021", number="24", fragment="section/1")

// 4. Fetch a schedule
get_legislation_fragment(type="ukpga", year="2021", number="24", fragment="schedule/1")
```

## Related Resources

- `json://metadata-response` - Full metadata field reference (the `meta` object)
- `json://search-response` - Search results format
- `types://guide` - Legislation types reference
- `clml://schema-guide` - Full CLML XML structure
