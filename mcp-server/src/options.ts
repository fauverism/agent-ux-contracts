/**
 * Per-pattern scaffold options — DESIGN.md §4 (as amended).
 *
 * Every option is a Zod schema; unknown options are a validation error.
 * Each transform is one of: default-literal replacement, default-parameter
 * flip, or anchored removal of a non-MUST optional block (plus its tests).
 * A transform throws if its anchor is not found exactly once — drift in the
 * reference implementation fails loudly instead of emitting broken output.
 *
 * Amendment (discovered during implementation): the DESIGN options
 * `withDetail` (confidence-indicator), `withDetailDisclosure`
 * (approval-gate), and `parts` (source-attribution) are dropped — each
 * would strip MUST-implementing code, producing a contract-violating
 * scaffold. Those toggles are runtime props in the reference
 * implementations anyway. `workLabelDefault` (interruption-cancel) is
 * dropped because workLabel is data, not structure: a baked-in default
 * invites unlabeled cancel controls.
 */
import { z } from 'zod';

export interface ScaffoldFiles {
  component: string;
  test: string;
}

export type Framework = 'react' | 'vanilla';

/** Replace `find` exactly once; throw if absent or ambiguous. */
export function replaceOnce(source: string, find: string, replace: string): string {
  const first = source.indexOf(find);
  if (first === -1) {
    throw new Error(`scaffold transform anchor not found: ${JSON.stringify(find.slice(0, 60))}`);
  }
  if (source.indexOf(find, first + find.length) !== -1) {
    throw new Error(`scaffold transform anchor is ambiguous: ${JSON.stringify(find.slice(0, 60))}`);
  }
  return source.slice(0, first) + replace + source.slice(first + find.length);
}

/** Remove a whole `test('<name>', …)` block (top-level `});` terminator). */
export function stripTest(source: string, testName: string): string {
  const lines = source.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`test('${testName}'`));
  if (start === -1) {
    throw new Error(`scaffold transform: test not found: ${testName}`);
  }
  let end = start;
  while (end < lines.length && lines[end] !== '});') end += 1;
  if (end === lines.length) {
    throw new Error(`scaffold transform: unterminated test block: ${testName}`);
  }
  // Also remove the blank line that follows the block, if any.
  const removeTo = lines[end + 1] === '' ? end + 2 : end + 1;
  return [...lines.slice(0, start), ...lines.slice(removeTo)].join('\n');
}

const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

type Transform = (files: ScaffoldFiles, framework: Framework, value: unknown) => ScaffoldFiles;

interface OptionSpec {
  schema: z.ZodTypeAny;
  /** Frameworks this option applies to; others reject it. */
  frameworks: Framework[];
  description: string;
  apply: Transform;
}

const safeString = z.string().min(1).max(200).refine((s) => !s.includes('\n'), {
  message: 'must be a single line',
});

/** Replace a default-parameter string literal in both implementations. */
function defaultLiteral(reactAnchor: string, vanillaAnchor: string, wrap: (v: string) => [string, string]): Transform {
  return (files, framework, value) => {
    const anchor = framework === 'react' ? reactAnchor : vanillaAnchor;
    const [before, after] = wrap(String(value));
    return { ...files, component: replaceOnce(files.component, anchor, `${before}${after}`) };
  };
}

export const PATTERN_OPTIONS: Record<string, Record<string, OptionSpec>> = {
  'streaming-response': {
    stopLabel: {
      schema: safeString,
      frameworks: ['react', 'vanilla'],
      description: 'Visible text of the stop control (accessible name stays "Stop generation").',
      apply: (files, framework, value) => {
        const label = String(value);
        if (framework === 'react') {
          return {
            ...files,
            component: replaceOnce(files.component, '\n          Stop\n        </button>', `\n          ${label}\n        </button>`),
          };
        }
        return {
          ...files,
          component: replaceOnce(files.component, "this.stopBtn.textContent = 'Stop';", `this.stopBtn.textContent = ${quote(label)};`),
        };
      },
    },
    tokenBatching: {
      schema: z.literal(true),
      frameworks: ['vanilla'],
      description:
        'Implements the token-batching MAY constraint: appends coalesce into one paint per animation frame. Vanilla only — the React reference is prop-driven, so append frequency belongs to the host.',
      apply: (files, _framework, _value) => {
        let component = replaceOnce(
          files.component,
          'export class StreamingResponse {\n',
          'export class StreamingResponse {\n  /** Pending paint handle (option: tokenBatching — MAY constraint token-batching). */\n  #flushHandle = null;\n\n',
        );
        component = replaceOnce(
          component,
          `  appendContent(chunk) {
    if (this.state !== 'streaming') return;
    this.content += chunk;
    this.contentEl.textContent = this.content;
  }`,
          `  appendContent(chunk) {
    if (this.state !== 'streaming') return;
    this.content += chunk;
    // Batch appends into one paint per frame (constraint: token-batching).
    if (this.#flushHandle !== null) return;
    const flush = () => {
      this.#flushHandle = null;
      this.contentEl.textContent = this.content;
    };
    this.#flushHandle =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(flush)
        : setTimeout(flush, 16);
  }`,
        );
        // Settling flushes synchronously so partial output is never stale.
        component = replaceOnce(
          component,
          "    if (document.activeElement === this.stopBtn) this.output.focus();\n    this.state = state;",
          "    if (document.activeElement === this.stopBtn) this.output.focus();\n    this.state = state;\n    this.#flushHandle = null;\n    this.contentEl.textContent = this.content;",
        );
        return { ...files, component };
      },
    },
  },
  'prompt-composer': {
    label: {
      schema: safeString,
      frameworks: ['react', 'vanilla'],
      description: 'Default visible label for the textarea.',
      apply: defaultLiteral("label = 'Message',", "label = 'Message',", (v) => [`label = ${quote(v)},`, '']),
    },
    hint: {
      schema: safeString,
      frameworks: ['react', 'vanilla'],
      description: 'Default visible keyboard hint.',
      apply: defaultLiteral(
        "hint = 'Enter to send. Shift+Enter for a new line.',",
        "hint = 'Enter to send. Shift+Enter for a new line.',",
        (v) => [`hint = ${quote(v)},`, ''],
      ),
    },
    maxLength: {
      schema: z.number().int().min(1).max(1_000_000),
      frameworks: ['react', 'vanilla'],
      description: 'Default length budget (counter + over-limit gating; never native maxLength).',
      apply: (files, framework, value) => {
        const anchor = framework === 'react' ? '  maxLength,\n' : '    maxLength,\n';
        const replacement =
          framework === 'react' ? `  maxLength = ${value},\n` : `    maxLength = ${value},\n`;
        return { ...files, component: replaceOnce(files.component, anchor, replacement) };
      },
    },
  },
  'thinking-visibility': {
    label: {
      schema: safeString,
      frameworks: ['react', 'vanilla'],
      description: 'Default label for the reasoning region and its disclosure.',
      apply: (files, framework, value) => {
        const label = quote(String(value));
        const [anchor, replacement] =
          framework === 'react'
            ? ["label = 'Working notes',", `label = ${label},`]
            : ["label = 'Working notes' } = {}", `label = ${label} } = {}`];
        return { ...files, component: replaceOnce(files.component, anchor, replacement) };
      },
    },
  },
  'generation-control': {
    withRefine: {
      schema: z.boolean(),
      frameworks: ['react', 'vanilla'],
      description: 'Default for the refine-instruction field (maps to the existing constructor option).',
      apply: (files, framework, value) => {
        const anchor =
          framework === 'react' ? 'withRefine = false,' : 'withRefine = false }';
        const replacement =
          framework === 'react' ? `withRefine = ${value},` : `withRefine = ${value} }`;
        return { ...files, component: replaceOnce(files.component, anchor, replacement) };
      },
    },
  },
  'error-recovery': {
    withPartialOutput: {
      schema: z.literal(false),
      frameworks: ['react'],
      description:
        'Pass false to omit the partial-output region (React only; the vanilla reference has none). Optional block — no MUST anchors here.',
      apply: (files) => {
        let component = replaceOnce(
          files.component,
          "  /** Output that arrived before the failure, kept visible. */\n  partialOutput?: string;\n",
          '',
        );
        component = replaceOnce(component, '  partialOutput,\n', '');
        component = replaceOnce(
          component,
          `      {partialOutput && (
        <div className="error-recovery__partial">{partialOutput}</div>
      )}

`,
          '',
        );
        const test = stripTest(
          files.test,
          'partialOutput: partial output rendered above the failure summary',
        );
        return { component, test };
      },
    },
  },
  'refusal-messaging': {
    withPolicyDetail: {
      schema: z.literal(false),
      frameworks: ['react', 'vanilla'],
      description:
        'Pass false to omit the policy-detail disclosure (MAY constraint policy-detail-available).',
      apply: (files, framework) => {
        if (framework === 'react') {
          let component = replaceOnce(
            files.component,
            "  /** Expandable policy reference (constraint: policy-detail-available). */\n  policyDetail?: string;\n",
            '',
          );
          component = replaceOnce(component, '  policyDetail,\n', '');
          component = replaceOnce(
            component,
            "  const [policyOpen, setPolicyOpen] = useState(false);\n  const policyId = useId();\n",
            '',
          );
          component = replaceOnce(
            component,
            `
        {policyDetail && (
          <>
            <button
              type="button"
              className="refusal-messaging__policy-toggle"
              aria-expanded={policyOpen}
              aria-controls={policyId}
              onClick={() => setPolicyOpen((open) => !open)}
            >
              Why this is declined
            </button>
            <div id={policyId} className="refusal-messaging__policy" hidden={!policyOpen}>
              {policyDetail}
            </div>
          </>
        )}`,
            '',
          );
          component = replaceOnce(
            component,
            "import { useEffect, useId, useState, type ReactNode } from 'react';",
            "import { useEffect, useState, type ReactNode } from 'react';",
          );
          let test = stripTest(
            files.test,
            'policy-detail-available: the disclosure toggles with aria-expanded',
          );
          // The axe test exercises the policy disclosure too; drop the prop.
          test = replaceOnce(test, ' policyDetail="Policy text." />', ' />');
          test = replaceOnce(test, '      policyDetail="Policy text."\n', '');
          return { component, test };
        }
        let component = replaceOnce(
          files.component,
          "   * @param {string} [options.policyDetail] Expandable policy reference.\n",
          '',
        );
        component = replaceOnce(
          component,
          'constructor({ statement, reason, alternatives, fulfilledText, policyDetail }) {',
          'constructor({ statement, reason, alternatives, fulfilledText }) {',
        );
        component = replaceOnce(
          component,
          '    this.policyDetail = policyDetail;\n    this.policyOpen = false;\n',
          '',
        );
        component = replaceOnce(component, 'let policyIdCounter = 0;\n\n', '');
        const start = component.indexOf('    if (this.policyDetail) {');
        const end = component.indexOf('\n\n    this.wrapper.append(refusal);');
        if (start === -1 || end === -1 || end < start) {
          throw new Error('scaffold transform: policy block anchors not found (vanilla)');
        }
        component = component.slice(0, start) + component.slice(end + 1);
        const test = stripTest(
          files.test,
          'policy-detail-available: the disclosure toggles with aria-expanded',
        );
        return { component, test };
      },
    },
  },
};

const COMMON_OPTIONS = {
  componentName: z
    .string()
    .regex(/^[A-Z][A-Za-z0-9]*$/, 'must be a PascalCase identifier')
    .optional(),
  includeTests: z.boolean().optional(),
  includeCompliance: z.boolean().optional(),
};

/** Builds the full Zod schema for a pattern's options object. */
export function optionsSchemaFor(patternId: string, framework: Framework) {
  const specs = PATTERN_OPTIONS[patternId] ?? {};
  const shape: Record<string, z.ZodTypeAny> = { ...COMMON_OPTIONS };
  for (const [key, spec] of Object.entries(specs)) {
    if (spec.frameworks.includes(framework)) shape[key] = spec.schema.optional();
  }
  return z.object(shape).strict();
}

/** Human-readable option listing for OPTIONS_INVALID errors. */
export function describeOptions(patternId: string, framework: Framework): Record<string, string> {
  const out: Record<string, string> = {
    componentName: 'PascalCase rename of the exported component (optional)',
    includeTests: 'emit the test file (default true)',
    includeCompliance: 'emit COMPLIANCE.md (default true)',
  };
  for (const [key, spec] of Object.entries(PATTERN_OPTIONS[patternId] ?? {})) {
    if (spec.frameworks.includes(framework)) out[key] = spec.description;
  }
  return out;
}

/** Applies pattern-specific transforms in a fixed, deterministic order. */
export function applyPatternOptions(
  patternId: string,
  framework: Framework,
  files: ScaffoldFiles,
  options: Record<string, unknown>,
): ScaffoldFiles {
  const specs = PATTERN_OPTIONS[patternId] ?? {};
  let out = files;
  for (const key of Object.keys(specs).sort()) {
    if (!(key in options) || options[key] === undefined) continue;
    out = specs[key].apply(out, framework, options[key]);
  }
  return out;
}
