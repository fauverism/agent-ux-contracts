/**
 * Tool input/output Zod schemas — DESIGN.md §1. Inputs are validated by the
 * SDK; outputs are re-validated before returning (both directions, per the
 * build brief). `framework` is a free string on input so an unknown value
 * produces the structured FRAMEWORK_UNSUPPORTED error with the supported
 * list, instead of an opaque input-validation failure.
 */
import { z } from 'zod';

export const CATEGORIES = ['input', 'output', 'control', 'feedback', 'transparency'] as const;

// --- search_patterns ---

export const searchInputShape = {
  query: z.string().min(1).max(500).describe('Free-text description of the UX need'),
  category: z
    .enum(CATEGORIES)
    .optional()
    .describe('Hard filter: only patterns in this category'),
  framework: z
    .string()
    .optional()
    .describe('Hard filter: only patterns implemented for this framework (react | vanilla)'),
};

export const searchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  intent: z.string(),
  category: z.enum(CATEGORIES),
  version: z.string(),
  contract_hash: z.string().length(64),
  score: z.number().min(0).max(1),
  rationale: z.string(),
  caution: z.string().optional(),
  constraints: z.object({
    counts: z.object({
      must: z.number().int(),
      must_not: z.number().int(),
      should: z.number().int(),
      may: z.number().int(),
    }),
    musts: z.array(z.object({ id: z.string(), statement: z.string() })),
  }),
});

export const searchOutputSchema = z.object({
  results: z.array(searchResultSchema).max(5),
  nearest: z
    .object({
      categories: z.array(
        z.object({ category: z.enum(CATEGORIES), pattern_ids: z.array(z.string()) }),
      ),
      suggestions: z.array(z.string()),
    })
    .optional(),
});

export const searchOutputShape = {
  results: searchOutputSchema.shape.results,
  nearest: searchOutputSchema.shape.nearest,
};

// --- scaffold_pattern ---

export const scaffoldInputShape = {
  pattern_id: z.string().min(1).describe('Pattern id, e.g. "streaming-response"'),
  framework: z.string().min(1).describe('Implementation framework: react | vanilla'),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Pattern-specific scaffold options; invalid keys are rejected with the option schema'),
};

export const scaffoldOutputSchema = z.object({
  pattern_id: z.string(),
  version: z.string(),
  contract_hash: z.string().length(64),
  framework: z.string(),
  options_applied: z.record(z.string(), z.unknown()),
  files: z.array(
    z.object({
      path: z.string(),
      role: z.enum(['component', 'test', 'compliance']),
      content: z.string(),
    }),
  ),
  constraints: z.array(z.unknown()),
  compliance_notes: z.array(
    z.object({
      constraint_id: z.string(),
      level: z.string(),
      satisfied_by: z.object({ file: z.string(), anchor: z.string(), note: z.string() }),
    }),
  ),
});

export const scaffoldOutputShape = {
  pattern_id: scaffoldOutputSchema.shape.pattern_id,
  version: scaffoldOutputSchema.shape.version,
  contract_hash: scaffoldOutputSchema.shape.contract_hash,
  framework: scaffoldOutputSchema.shape.framework,
  options_applied: scaffoldOutputSchema.shape.options_applied,
  files: scaffoldOutputSchema.shape.files,
  constraints: scaffoldOutputSchema.shape.constraints,
  compliance_notes: scaffoldOutputSchema.shape.compliance_notes,
};
