import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import _Ajv2020 from "ajv/dist/2020.js";
import _addFormats from "ajv-formats";

const Ajv2020 = _Ajv2020.default ?? _Ajv2020;
const addFormats = _addFormats.default ?? _addFormats;

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const schema = JSON.parse(readFileSync(here("./pattern-contract.schema.json"), "utf8"));
// The real streaming-response contract doubles as the known-good base for
// mutation tests. Validation of every contract lives in scripts/validate-contracts.mjs.
const streamingFixture = JSON.parse(
  readFileSync(here("../patterns/streaming-response/pattern.contract.json"), "utf8"),
);

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const clone = () => structuredClone(streamingFixture);

function expectInvalid(contract, messagePattern) {
  const valid = validate(contract);
  assert.equal(valid, false, "expected contract to be rejected");
  const text = ajv.errorsText(validate.errors, { separator: "\n" });
  assert.match(text, messagePattern);
}

test("schema compiles under ajv 2020-12 strict mode", () => {
  assert.equal(typeof validate, "function");
});

test("valid fixture contract passes", () => {
  const valid = validate(streamingFixture);
  assert.equal(valid, true, ajv.errorsText(validate.errors, { separator: "\n" }));
});

test("rejects a contract with no accessibility-category constraint", () => {
  const c = clone();
  c.constraints = c.constraints.filter((x) => x.category !== "accessibility");
  expectInvalid(c, /constraints.*must contain at least 1 valid item/);
});

test("rejects a contract with no MUST-level constraint", () => {
  const c = clone();
  c.constraints = [
    {
      id: "completion-announced",
      level: "SHOULD",
      category: "accessibility",
      statement:
        "Stream completion SHOULD be announced to assistive technology through a polite live region.",
      rationale:
        "Without an announcement, screen reader users have no signal that the response is ready.",
      verification: "Unit test asserting the live region updates on completion.",
    },
  ];
  expectInvalid(c, /constraints.*must contain at least 1 valid item/);
});

test("rejects a MUST constraint whose statement lacks the MUST keyword", () => {
  const c = clone();
  const target = c.constraints.find((x) => x.id === "interruptible");
  target.statement = "A visible control allows the user to stop generation at any point.";
  expectInvalid(c, /statement must match pattern/);
});

test("rejects a compound MUST statement that also says MUST NOT", () => {
  const c = clone();
  const target = c.constraints.find((x) => x.id === "interruptible");
  target.statement =
    "A visible control MUST stop generation and MUST NOT discard the partial output.";
  expectInvalid(c, /statement must NOT be valid/);
});

test("rejects unknown top-level properties (typo guard)", () => {
  const c = clone();
  c.constriants = [];
  expectInvalid(c, /must NOT have additional properties/);
});

test("rejects a non-kebab-case id", () => {
  const c = clone();
  c.id = "StreamingResponse";
  expectInvalid(c, /\/id must match pattern/);
});

test("rejects two initial states", () => {
  const c = clone();
  c.states.find((s) => s.id === "streaming").initial = true;
  expectInvalid(c, /states must contain at least 1 and no more than 1 valid item/);
});

test("rejects a non-semver version", () => {
  const c = clone();
  c.version = "1.0";
  expectInvalid(c, /\/version must match pattern/);
});

test("rejects an empty dontUseWhen list", () => {
  const c = clone();
  c.dontUseWhen = [];
  expectInvalid(c, /dontUseWhen must NOT have fewer than 1 items/);
});

test("rejects supersededBy on a non-deprecated contract", () => {
  const c = clone();
  c.supersededBy = "structured-output";
  expectInvalid(c, /status must be equal to constant/);
});

test("rejects a stable contract missing the vanilla implementation", () => {
  const c = clone();
  c.status = "stable";
  c.implementations = ["react"];
  expectInvalid(c, /implementations must contain at least 1 valid item/);
});

test("accepts a stable contract that ships react and vanilla", () => {
  const c = clone();
  c.status = "stable";
  const valid = validate(c);
  assert.equal(valid, true, ajv.errorsText(validate.errors, { separator: "\n" }));
});

test("rejects a kit contract whose anatomy parts lack export mappings", () => {
  const c = clone();
  c.kind = "kit";
  expectInvalid(c, /anatomy.*must have required property 'export'/);
});

test("accepts a kit contract when every anatomy part names its exports", () => {
  const c = clone();
  c.kind = "kit";
  for (const part of c.anatomy) {
    part.export = { react: "StreamingResponse", vanilla: "StreamingResponse" };
  }
  const valid = validate(c);
  assert.equal(valid, true, ajv.errorsText(validate.errors, { separator: "\n" }));
});

test("rejects an unknown kind", () => {
  const c = clone();
  c.kind = "library";
  expectInvalid(c, /kind must be equal to one of the allowed values/);
});

test("accepts export mappings on a component contract (optional there)", () => {
  const c = clone();
  c.anatomy[0].export = { react: "StreamingResponse" };
  const valid = validate(c);
  assert.equal(valid, true, ajv.errorsText(validate.errors, { separator: "\n" }));
});
