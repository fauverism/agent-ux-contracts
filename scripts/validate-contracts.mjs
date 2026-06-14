/**
 * Validates every /patterns/<id>/pattern.contract.json:
 *   1. against schema/pattern-contract.schema.json (ajv 2020-12, strict), and
 *   2. cross-file rules the schema cannot express:
 *      - contract.id must equal its directory name
 *      - constraint / state / anatomy ids must be unique within the contract
 *      - every states[].transitionsTo target must exist in states
 *      - every relatedPatterns / supersededBy id must exist under /patterns/
 *      - every implementations[] entry must have a directory containing COMPLIANCE.md
 *
 * Exit code 0 = all contracts valid. This is the CI gate.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import _Ajv2020 from "ajv/dist/2020.js";
import _addFormats from "ajv-formats";

const Ajv2020 = _Ajv2020.default ?? _Ajv2020;
const addFormats = _addFormats.default ?? _addFormats;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const patternsDir = join(root, "patterns");

const schema = JSON.parse(
  readFileSync(join(root, "schema", "pattern-contract.schema.json"), "utf8"),
);
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const patternIds = readdirSync(patternsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

let failures = 0;
const fail = (id, message) => {
  failures += 1;
  console.error(`  ✗ ${id}: ${message}`);
};

const duplicates = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);

for (const dirName of patternIds) {
  const contractPath = join(patternsDir, dirName, "pattern.contract.json");
  if (!existsSync(contractPath)) {
    fail(dirName, "missing pattern.contract.json");
    continue;
  }

  let contract;
  try {
    contract = JSON.parse(readFileSync(contractPath, "utf8"));
  } catch (err) {
    fail(dirName, `unparseable JSON: ${err.message}`);
    continue;
  }

  const before = failures;

  if (!validate(contract)) {
    fail(dirName, `schema violations:\n      ${ajv.errorsText(validate.errors, { separator: "\n      " })}`);
  }

  if (contract.id !== dirName) {
    fail(dirName, `contract.id "${contract.id}" does not match directory name`);
  }

  for (const [field, items] of [
    ["constraints", contract.constraints],
    ["states", contract.states],
    ["anatomy", contract.anatomy],
  ]) {
    const dupes = duplicates((items ?? []).map((item) => item.id));
    if (dupes.length > 0) {
      fail(dirName, `duplicate ${field} ids: ${[...new Set(dupes)].join(", ")}`);
    }
  }

  const stateIds = new Set((contract.states ?? []).map((s) => s.id));
  for (const state of contract.states ?? []) {
    for (const target of state.transitionsTo ?? []) {
      if (!stateIds.has(target)) {
        fail(dirName, `state "${state.id}" transitions to unknown state "${target}"`);
      }
    }
  }

  for (const related of contract.relatedPatterns ?? []) {
    if (!patternIds.includes(related)) {
      fail(dirName, `relatedPatterns references unknown pattern "${related}"`);
    }
  }
  if (contract.supersededBy && !patternIds.includes(contract.supersededBy)) {
    fail(dirName, `supersededBy references unknown pattern "${contract.supersededBy}"`);
  }

  for (const impl of contract.implementations ?? []) {
    const implDir = join(patternsDir, dirName, impl);
    if (!existsSync(implDir)) {
      fail(dirName, `declared implementation "${impl}" has no directory`);
    } else if (!existsSync(join(implDir, "COMPLIANCE.md"))) {
      fail(dirName, `implementation "${impl}" is missing COMPLIANCE.md`);
    }
  }

  if (failures === before) {
    console.log(`  ✓ ${dirName}`);
  }
}

console.log(
  failures === 0
    ? `\nAll ${patternIds.length} contracts valid.`
    : `\n${failures} problem(s) across ${patternIds.length} contracts.`,
);
process.exit(failures === 0 ? 0 : 1);
