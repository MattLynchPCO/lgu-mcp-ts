/**
 * Tests for lex-mapper
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  mapLegislationActResult,
  mapLegislationSearchResponse,
  mapLegislationSection,
} from '../../api/lex-mapper.js';
import type {
  LexLegislationActResult,
  LexLegislationSearchResponse,
  LexLegislationSection,
} from '../../api/lex-client.js';

test('mapLegislationActResult normalizes ID and extent', () => {
  const sample: LexLegislationActResult = {
    id: 'https://www.legislation.gov.uk/id/ukpga/2020/2',
    title: 'Test Act',
    type: 'ukpga',
    year: 2020,
    number: 2,
    extent: ['England', 'Wales', 'Scotland', 'Northern Ireland', ''],
  };

  const result = mapLegislationActResult(sample);

  assert.strictEqual(result.id, 'ukpga/2020/2');
  assert.deepStrictEqual(result.extent, ['E', 'W', 'S', 'NI']);
});

test('mapLegislationActResult expands United Kingdom extent', () => {
  const sample: LexLegislationActResult = {
    id: 'ukpga/2020/2',
    title: 'Test Act',
    extent: ['United Kingdom'],
  };

  const result = mapLegislationActResult(sample);

  assert.deepStrictEqual(result.extent, ['E', 'W', 'S', 'NI']);
});

test('mapLegislationActResult falls back to uri when id is missing', () => {
  const sample: LexLegislationActResult = {
    uri: 'https://www.legislation.gov.uk/id/ukpga/2020/2',
    title: 'Test Act',
  };

  const result = mapLegislationActResult(sample);

  assert.strictEqual(result.id, 'ukpga/2020/2');
});

test('mapLegislationActResult handles empty extent array', () => {
  const sample: LexLegislationActResult = {
    id: 'ukpga/2020/2',
    title: 'Test Act',
    extent: [],
  };

  const result = mapLegislationActResult(sample);

  assert.strictEqual(result.extent, undefined);
});

test('mapLegislationSearchResponse maps results', () => {
  const sample: LexLegislationSearchResponse = {
    results: [
      {
        id: 'ukpga/2020/1',
        title: 'Act 1',
        sections: [
          { number: '1', provision_type: 'section', score: 0.9 }
        ]
      }
    ],
    total: 1,
    offset: 0,
    limit: 10
  };

  const result = mapLegislationSearchResponse(sample);

  assert.strictEqual(result.results.length, 1);
  assert.strictEqual(result.results[0].id, 'ukpga/2020/1');
  assert.strictEqual(result.results[0].sections?.[0].number, '1');
  assert.strictEqual(result.results[0].sections?.[0].provisionType, 'section');
});

test('mapLegislationSection maps section details', () => {
  const sample: LexLegislationSection = {
    id: 'https://www.legislation.gov.uk/id/ukpga/2020/2/section/1',
    legislation_id: 'https://www.legislation.gov.uk/id/ukpga/2020/2',
    title: 'Section 1',
    text: 'Some text',
    extent: ['England'],
    provision_type: 'section',
    number: 1,
    legislation_type: 'ukpga',
    legislation_year: 2020,
    legislation_number: 2
  };

  const result = mapLegislationSection(sample);

  assert.strictEqual(result.provisionId, 'section/1');
  assert.strictEqual(result.legislation.id, 'ukpga/2020/2');
  assert.strictEqual(result.legislation.type, 'ukpga');
  assert.deepStrictEqual(result.extent, ['E']);
  assert.strictEqual(result.text, 'Some text');
});

test('mapLegislationSection falls back to uri when id is missing', () => {
  const sample: LexLegislationSection = {
    uri: 'https://www.legislation.gov.uk/id/ukpga/2020/2/section/1',
    legislation_id: 'ukpga/2020/2',
    title: 'Section 1',
  };

  const result = mapLegislationSection(sample);

  assert.strictEqual(result.provisionId, 'section/1');
  assert.strictEqual(result.legislation.id, 'ukpga/2020/2');
});
