/**
 * Scaffolds a new pattern: directory layout, contract skeleton, COMPLIANCE
 * stubs, doc.mdx stub, and test stubs wired to the shared jsdom setup.
 *
 *   npm run new-pattern -- <pattern-id> [Display Name]
 *
 * The skeleton deliberately FAILS `npm run validate` until every TODO is
 * resolved — the validator is the checklist. See patterns/TEMPLATE.md for the
 * full authoring procedure.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [id, ...nameParts] = process.argv.slice(2);

if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error("Usage: npm run new-pattern -- <kebab-case-id> [Display Name]");
  process.exit(1);
}

const name =
  nameParts.join(" ") ||
  id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "patterns", id);

if (existsSync(dir)) {
  console.error(`patterns/${id}/ already exists.`);
  process.exit(1);
}

const pascal = id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");

const contract = {
  $schema: "../../schema/pattern-contract.schema.json",
  id,
  version: "0.1.0",
  name,
  summary: "TODO: one or two sentences, 20-200 chars, on what this pattern guarantees.",
  status: "draft",
  category: "TODO: output | input | feedback | control | transparency",
  aliases: [],
  tags: [],
  problem: "TODO: at least 40 chars on the user-facing problem this pattern exists to solve.",
  useWhen: ["TODO: at least one concrete situation"],
  dontUseWhen: ["TODO: at least one concrete counter-situation"],
  anatomy: [
    { id: "TODO-part", description: "TODO: what this part is and does.", required: true },
  ],
  states: [
    {
      id: "TODO-initial-state",
      description: "TODO: exactly one state carries initial: true.",
      initial: true,
    },
  ],
  constraints: [
    {
      id: "TODO-a11y-constraint",
      level: "MUST",
      category: "accessibility",
      statement: "TODO: testable rule whose keyword matches its level (MUST here).",
      rationale: "TODO: why this rule exists; what breaks without it.",
      verification: "TODO: the exact assertion that proves it, e.g. 'Unit test: …'.",
    },
  ],
  accessibility: {
    wcagCriteria: [
      { criterion: "4.1.2", name: "Name, Role, Value", level: "A", relevance: "TODO" },
    ],
    keyboard: [{ keys: "Tab", action: "TODO" }],
    screenReader: [{ when: "TODO", behavior: "TODO" }],
    focusManagement: "TODO: who moves focus, when, and the exceptions.",
    reducedMotion: "TODO: behavior under prefers-reduced-motion.",
  },
  implementations: ["react", "vanilla"],
  guidance: { do: ["TODO"], dont: ["TODO"] },
  relatedPatterns: [],
  references: [{ title: "TODO", url: "https://example.com/TODO" }],
};

const complianceStub = (impl, testFile) => `# ${name} — ${impl} compliance

Traces the implementation against \`../pattern.contract.json\`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in \`${testFile}\`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| TODO | TODO | TODO | TODO |

## Deviations and notes

- TODO: SHOULD/MAY items not implemented, host-contract requirements, jsdom-deferred checks.
`;

const docStub = `---
pattern: ${id}
---

TODO: practitioner prose. Why the pattern exists, the failure modes it
prevents, and the judgment calls behind the contract's constraints.

## Using the implementations

TODO: minimal react + vanilla usage snippets.

## Agent notes

TODO: the rules an agent must not violate when scaffolding this pattern.
`;

const reactTestStub = `import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { ${pascal} } from './${pascal}';

afterEach(() => cleanup());

// TODO: one test per MUST/MUST_NOT, named "<constraint-id>: <behavior>".

test('axe: no WCAG A/AA violations', async () => {
  const { container } = render(<${pascal} />);
  const results = await axe.run(container, {
    runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  assert.deepEqual(results.violations, [], results.violations.map((v) => v.id).join(', '));
});
`;

const vanillaTestStub = `import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ${pascal} } from './${pascal}.js';

let host;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

// TODO: one test per MUST/MUST_NOT, named "<constraint-id>: <behavior>".
test('mounts without throwing', () => {
  assert.doesNotThrow(() => new ${pascal}({}).mount(host));
});
`;

mkdirSync(join(dir, "react"), { recursive: true });
mkdirSync(join(dir, "vanilla"), { recursive: true });

writeFileSync(join(dir, "pattern.contract.json"), JSON.stringify(contract, null, 2) + "\n");
writeFileSync(join(dir, "doc.mdx"), docStub);
writeFileSync(join(dir, "react", "COMPLIANCE.md"), complianceStub("React", `${pascal}.test.tsx`));
writeFileSync(join(dir, "react", `${pascal}.test.tsx`), reactTestStub);
writeFileSync(join(dir, "vanilla", "COMPLIANCE.md"), complianceStub("Vanilla JS", `${pascal}.test.mjs`));
writeFileSync(join(dir, "vanilla", `${pascal}.test.mjs`), vanillaTestStub);

console.log(`Scaffolded patterns/${id}/
  pattern.contract.json   (fails validation until TODOs are resolved — that's the checklist)
  doc.mdx
  react/${pascal}.test.tsx + COMPLIANCE.md
  vanilla/${pascal}.test.mjs + COMPLIANCE.md

Next: follow patterns/TEMPLATE.md. Write the contract first, then the
implementations (react/${pascal}.tsx, vanilla/${pascal}.js), then make
'npm run check' green.`);
