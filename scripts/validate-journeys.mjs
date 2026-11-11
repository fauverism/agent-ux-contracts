/**
 * Validates every docs/journeys/*.journey.json:
 *   1. against docs/journeys/journey.schema.json (ajv 2020-12, strict), and
 *   2. cross-file rules the schema cannot express:
 *      - journey.id must equal its file name
 *      - step, success, and gap ids must be unique within the journey
 *      - each `uses` carries the fields its kind requires
 *      - an unavailable step must name a gap; every named gap must exist
 *      - status must agree with the steps and the baseline:
 *          works-today  every step available, baseline result "pass"
 *          not-built    at least one step unavailable
 *      - mcp-tool steps may only call the catalog's two tools, and any
 *        pattern_id / framework they pass must exist in /patterns
 *      - every pattern and constraint id under `contracts` must exist in the
 *        real contract (a renamed constraint fails here, loudly)
 *      - every `advantage.versus` id must appear in docs/research/landscape.md
 *      - `read` / `edit` targets with where: "repo" must exist
 *      - an owner-decision gap must say which decision
 *      - a baseline report path must exist
 *      - a gap id shared by several journeys must carry the same scope,
 *        decision, and size in each (one gap, one classification)
 *
 * `--bundle` prints RUNNER.md plus every journey as one Markdown document on
 * stdout, for pasting or attaching to an AI tool that has no access to this
 * repository. `--gaps` prints the cross-journey gap index as a Markdown table,
 * most-blocking first. Neither writes to disk.
 *
 * Exit code 0 = all journeys valid.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import _Ajv2020 from "ajv/dist/2020.js";
import _addFormats from "ajv-formats";

const Ajv2020 = _Ajv2020.default ?? _Ajv2020;
const addFormats = _addFormats.default ?? _addFormats;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const journeysDir = join(root, "docs", "journeys");
const patternsDir = join(root, "patterns");
const SUFFIX = ".journey.json";

const files = readdirSync(journeysDir)
  .filter((name) => name.endsWith(SUFFIX))
  .sort();

const schema = JSON.parse(
  readFileSync(join(journeysDir, "journey.schema.json"), "utf8"),
);
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const landscape = readFileSync(
  join(root, "docs", "research", "landscape.md"),
  "utf8",
);

/** Contracts by pattern id, loaded once. */
const contracts = new Map(
  readdirSync(patternsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [
      entry.name,
      JSON.parse(
        readFileSync(
          join(patternsDir, entry.name, "pattern.contract.json"),
          "utf8",
        ),
      ),
    ]),
);

const REQUIRED_BY_KIND = {
  "mcp-tool": ["tool", "input"],
  command: ["run"],
  read: ["target", "where"],
  edit: ["target", "where", "change"],
  external: ["name"],
  judgment: [],
};

function duplicates(ids) {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

function checkJourney(name, journey) {
  const errors = [];
  const fail = (message) => errors.push(message);

  if (!validate(journey)) {
    for (const e of validate.errors ?? []) {
      fail(`schema: ${e.instancePath || "/"} ${e.message}`);
    }
    // Cross-file checks assume the shape is right.
    return errors;
  }

  const expectedId = name.slice(0, -SUFFIX.length);
  if (journey.id !== expectedId) {
    fail(`id "${journey.id}" does not match file name "${expectedId}"`);
  }

  for (const [label, list] of [
    ["step", journey.steps],
    ["success", journey.success],
    ["gap", journey.gaps],
  ]) {
    for (const id of duplicates(list.map((item) => item.id))) {
      fail(`duplicate ${label} id "${id}"`);
    }
  }

  const gapIds = new Set(journey.gaps.map((gap) => gap.id));

  for (const step of journey.steps) {
    const { uses } = step;
    for (const field of REQUIRED_BY_KIND[uses.kind]) {
      if (uses[field] === undefined) {
        fail(`${step.id}: uses.kind "${uses.kind}" requires "${field}"`);
      }
    }
    if (!step.available && !step.gap) {
      fail(`${step.id}: unavailable step must name a gap`);
    }
    if (step.gap && !gapIds.has(step.gap)) {
      fail(`${step.id}: gap "${step.gap}" is not defined in gaps`);
    }
    if (uses.kind === "mcp-tool" && uses.input) {
      const { pattern_id: patternId, framework } = uses.input;
      if (patternId !== undefined) {
        const contract = contracts.get(patternId);
        if (!contract) {
          fail(`${step.id}: pattern_id "${patternId}" is not in /patterns`);
        } else if (
          framework !== undefined &&
          !contract.implementations.includes(framework)
        ) {
          fail(
            `${step.id}: "${patternId}" has no "${framework}" implementation`,
          );
        }
      }
    }
    if (
      (uses.kind === "read" || uses.kind === "edit") &&
      uses.where === "repo" &&
      step.available &&
      !existsSync(join(root, uses.target))
    ) {
      fail(`${step.id}: repo target "${uses.target}" does not exist`);
    }
  }

  const unavailable = journey.steps.filter((step) => !step.available);
  if (journey.status === "works-today") {
    if (unavailable.length > 0) {
      fail(
        `status works-today but ${unavailable.map((s) => s.id).join(", ")} unavailable`,
      );
    }
    if (journey.baseline.result !== "pass") {
      fail(
        `status works-today requires a passing baseline, found "${journey.baseline.result}"`,
      );
    }
  }
  if (journey.status === "not-built" && unavailable.length === 0) {
    fail("status not-built but every step is available");
  }

  for (const gap of journey.gaps) {
    if (gap.scope === "owner-decision" && !gap.decision) {
      fail(`gap "${gap.id}": owner-decision must say which decision`);
    }
  }

  for (const ref of journey.contracts ?? []) {
    const contract = contracts.get(ref.pattern);
    if (!contract) {
      fail(`contracts: pattern "${ref.pattern}" is not in /patterns`);
      continue;
    }
    const known = new Set(contract.constraints.map((c) => c.id));
    for (const id of ref.constraints) {
      if (!known.has(id)) {
        fail(`contracts: "${ref.pattern}" has no constraint "${id}"`);
      }
    }
  }

  for (const id of journey.advantage.versus) {
    if (!landscape.includes(`\`${id}\``)) {
      fail(`advantage.versus "${id}" is not in docs/research/landscape.md`);
    }
  }

  const { report } = journey.baseline;
  if (report && !existsSync(join(root, report))) {
    fail(`baseline.report "${report}" does not exist`);
  }

  return errors;
}

const mode = process.argv.includes("--bundle")
  ? "bundle"
  : process.argv.includes("--gaps")
    ? "gaps"
    : "validate";

/** gap id -> the gap plus the journeys that list it. */
const gapIndex = new Map();
const report = [];
let failed = 0;

for (const name of files) {
  let journey;
  try {
    journey = JSON.parse(readFileSync(join(journeysDir, name), "utf8"));
  } catch (error) {
    report.push(`  ✗ ${name}\n      invalid JSON: ${error.message}`);
    failed += 1;
    continue;
  }
  const errors = checkJourney(name, journey);
  for (const gap of Array.isArray(journey.gaps) ? journey.gaps : []) {
    const seen = gapIndex.get(gap.id);
    if (!seen) {
      gapIndex.set(gap.id, { ...gap, journeys: [journey.id] });
      continue;
    }
    seen.journeys.push(journey.id);
    for (const field of ["summary", "scope", "decision", "size"]) {
      if (seen[field] !== gap[field]) {
        errors.push(
          `gap "${gap.id}": ${field} differs from the same gap in ${seen.journeys[0]}`,
        );
      }
    }
  }
  if (errors.length === 0) {
    report.push(`  ✓ ${journey.id} (${journey.status})`);
  } else {
    failed += 1;
    report.push(`  ✗ ${name}`, ...errors.map((message) => `      ${message}`));
  }
}

function bundle() {
  const out = [readFileSync(join(journeysDir, "RUNNER.md"), "utf8").trimEnd()];
  out.push("\n---\n\n# Journeys\n");
  for (const name of files) {
    const text = readFileSync(join(journeysDir, name), "utf8").trimEnd();
    out.push(`## ${name}\n\n\`\`\`json\n${text}\n\`\`\`\n`);
  }
  return out.join("\n");
}

function gapTable() {
  const rows = [...gapIndex.values()].sort(
    (a, b) =>
      b.journeys.length - a.journeys.length || a.id.localeCompare(b.id),
  );
  const lines = [
    "| Gap | Journeys | Scope | Size | What is wrong |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const gap of rows) {
    const scope =
      gap.scope === "in-scope" ? "in scope" : `owner: ${gap.decision}`;
    lines.push(
      `| \`${gap.id}\` | ${gap.journeys.length} | ${scope} | ${gap.size} | ${gap.summary} |`,
    );
  }
  return lines.join("\n");
}

// Set the exit code instead of calling process.exit so that large output
// written to a pipe is flushed before the process ends.
if (files.length === 0) {
  console.error("No journey files found in docs/journeys.");
  process.exitCode = 1;
} else if (mode === "bundle") {
  console.log(bundle());
} else if (mode === "gaps") {
  console.log(gapTable());
} else {
  for (const line of report) console.log(line);
  if (failed > 0) {
    console.error(`\n${failed} of ${files.length} journeys invalid.`);
    process.exitCode = 1;
  } else {
    console.log(`All ${files.length} journeys valid.`);
  }
}
