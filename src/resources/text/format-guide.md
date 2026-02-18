# Text Format Guide

Plain text output format for `get_legislation` and `get_legislation_fragment` when using `format="text"`. Converted from CLML XML into a readable, markdown-inspired format designed for AI consumption.

## Document Structure

A full document follows this hierarchy:

```
# Act Title                          (from PrimaryPrelims/SecondaryPrelims)
2024 CHAPTER 1                       (chapter/instrument number)
Long title text...                   (purpose of the legislation)
[30th January 2024]                  (date of enactment/making)

## Part 1                            (major division)
## Part Title

### Chapter 1                        (subdivision within a Part)
### Chapter Title

#### Cross-heading                   (groups related sections, from Pblock)

##### Sub cross-heading              (lower-level grouping, from PsubBlock)

Section 1) **Section Title**         (from P1group)
1) Section text...                   (provisions)
  a) Subsection text...              (nested provisions, indented)
    i) Paragraph text...             (deeper nesting)

## SCHEDULES                         (schedules wrapper heading)

## Schedule 1                        (individual schedule)
## Schedule Title
```

## Heading Levels

| Markdown | CLML Source | Purpose |
|----------|------------|---------|
| `#` | PrimaryPrelims / SecondaryPrelims Title | Act or instrument title |
| `##` | Part, Schedule, Schedules | Major structural divisions |
| `###` | Chapter | Subdivision within a Part |
| `####` | Pblock | Cross-heading (groups related sections) |
| `#####` | PsubBlock | Sub cross-heading |

## Provisions and Numbering

Sections and subsections use a `number) text` pattern with tab indentation for nesting:

```
Section 5) **Power to make regulations**
1) The Secretary of State may by regulations—
  a) make provision about—
    i) the first matter, and
    ii) the second matter;
  b) amend other legislation.
2) Regulations under subsection (1) are subject to affirmative procedure.
```

- **P1** (sections): no indentation, number followed by `) `
- **P2** (subsections): no indentation (same as P1)
- **P3** (paragraphs): one tab indent
- **P4** (sub-paragraphs): two tab indents
- **P5+**: additional tab per level

When a section has a title (via P1group), it appears as:
- `Section 1) **Title**` for numbered sections
- `Article 1) **Title**` for articles (EU-derived legislation)

## Lists

Unordered and ordered lists use bullet points:

```
  - first item
  - second item
  - third item
```

## Tables

Tables use markdown pipe syntax:

```
| Column 1 | Column 2 |
| cell value | cell value |
| cell value | cell value |
```

No alignment or separator rows are included.

## Block Amendments

Quoted amendments (text being inserted/substituted into other legislation) appear indented relative to the surrounding text.

## What Is Excluded

- **Metadata** (`<Metadata>`) - document metadata (use `get_legislation_metadata` instead)
- **Commentaries** - editorial notes explaining the source of amendments
- **Contents** - table of contents (redundant when full text is provided)

## What Is Included But Simplified

- **Footnotes** - authorial notes, rendered as plain text with line breaks between them
- **Figures/Images** - rendered as `[Figure]` placeholder
- **Inline markup** (Citation, Emphasis, Addition, Substitution, Repeal, etc.) - text content is preserved, formatting is stripped

## Consistency with Semantic Search

The text format is designed to be consistent with section text returned by `search_legislation_sections_semantic` (when `includeText=true`). Both produce readable plain text from the same underlying CLML source.

## Related Resources

- `clml://schema-guide` - Full CLML XML structure (for `format="xml"`)
- `json://metadata-response` - Metadata JSON format
- `json://semantic-section-response` - Semantic search response format
