# Text Format Guide

The default output format for `get_legislation` and `get_legislation_fragment`. Converted from CLML XML into a readable, markdown-inspired plain text format designed for AI consumption.

## Document Structure

### UK Primary Legislation (Acts)

```
# Equality Act 2010                   (title)
2010 c. 15                            (chapter number)
An Act to make provision...            (long title / purpose)
[8th April 2010]                       (date of enactment)

## Part 1                              (major division)
## Socio-economic inequalities

### Chapter 1                          (subdivision within a Part)
### Chapter Title

#### Cross-heading                     (groups related sections, from Pblock)

##### Sub cross-heading                (lower-level grouping, from PsubBlock)

Section 1) **Section Title**           (from P1group)
1) Section text...                     (provisions)
  a) Subsection text...                (nested provisions, indented)
    i) Paragraph text...               (deeper nesting)

## SCHEDULES                           (schedules wrapper heading)

## Schedule 1                          (individual schedule)
## Schedule Title
```

### UK Secondary Legislation (Statutory Instruments)

```
2024 No. 49                            (instrument number)
# The Example Regulations 2024         (title)
Made 17th January 2024                 (date labels joined with dates)
Laid before Parliament 20th January 2024
Coming into force 1st February 2024

The Secretary of State makes these...  (preamble / enabling power)
A draft has been laid before...        (enacting text)

## PART 1
## Introduction
...
```

### EU Retained Legislation

```
# Regulation (EU) 2016/679 of the European Parliament and of the Council
of 27 April 2016
on the protection of natural persons...
(Text with EEA relevance)

THE EUROPEAN PARLIAMENT AND...         (preamble)

(1) The protection of natural persons... (recitals as numbered paragraphs)
(2) The principles should respect...
```

## Heading Levels

| Markdown | CLML Source | Purpose |
|----------|------------|---------|
| `#` | PrimaryPrelims / SecondaryPrelims / EUPrelims Title | Act, instrument, or regulation title |
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
- **Contents** - table of contents (use `get_legislation_table_of_contents` instead)

## What Is Included But Simplified

- **Footnotes** - authorial notes, rendered as plain text with line breaks between them
- **Figures/Images** - rendered as `[Figure]` placeholder
- **Inline markup** (Citation, Emphasis, Addition, Substitution, Repeal, etc.) - text content is preserved, formatting is stripped
- **Secondary legislation preambles** - the enabling power and enacting text

## Other Formats

If you need structured data rather than readable text:
- `format="xml"` returns CLML XML with full legislative markup and metadata (see `clml://schema-guide`)
- `format="akn"` returns Akoma Ntoso XML (international LegalDocML standard)
- `format="html"` returns rendered HTML

## Consistency with Semantic Search

The text format is designed to be consistent with section text returned by `search_legislation_sections_semantic` (when `includeText=true`). Both produce readable plain text from the same underlying CLML source.

## Related Resources

- `clml://schema-guide` - Full CLML XML structure (for `format="xml"`)
- `json://metadata-response` - Metadata JSON format
- `json://semantic-section-response` - Semantic search response format
