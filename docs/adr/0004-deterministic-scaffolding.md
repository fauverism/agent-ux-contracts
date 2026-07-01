# ADR-0004: Deterministic scaffolding over reference implementations

**Status:** Accepted
**Date:** 2026-06-11 (recorded retrospectively 2026-06-18)
**Deciders:** project owner

## Context

`scaffold_pattern` hands an agent a starting implementation of a pattern. The
whole premise of the catalog is that this code is **known-compliant** — the agent
should be able to _verify_ it against the contract, not merely trust it. That
means the scaffold output cannot be freehand generation (which would re-introduce
the drift the contract exists to prevent), and it cannot quietly omit the code
that satisfies a MUST.

## Decision

Generate scaffolds as **deterministic transforms over the reference
implementations** that already live in `patterns/<id>/{react,vanilla}/`. The
transforms are anchored string operations (`replaceOnce`, `stripTest`) that
**throw if their anchor isn't found**, so a drifted reference fails the build
rather than emitting wrong code. Output is byte-deterministic and snapshot-tested.

Every scaffold returns, alongside the files, the **full constraints array** and
**`compliance_notes`** mapping each MUST/MUST_NOT to the code symbol that
satisfies it. Scaffold `options` are per-pattern Zod schemas; unknown keys are
rejected. **Options that would strip MUST-implementing code were cut** (recorded
as a DESIGN.md amendment) — an option may vary inessentials, never remove a
guarantee.

## Options Considered

### Option A — Deterministic transform over the reference impl (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — anchored transforms + per-pattern option schemas |
| Cost | Reference impls must stay exactly compliant (they must anyway) |
| Scalability | Linear in patterns × frameworks |
| Team familiarity | High — string transforms, snapshot tests |

**Pros:** output is the audited reference, not new code; deterministic and
snapshot-testable; `compliance_notes` make every MUST checkable; the generated
React is typechecked and generated tests are executed in CI. **Cons:** transforms
are brittle to reference edits — mitigated by throw-on-missing-anchor.

### Option B — LLM/freehand generation from the contract

**Pros:** flexible; no transform code. **Cons:** non-deterministic; re-opens the
drift problem the contract closes; "known-compliant" becomes "probably
compliant"; can't be snapshot-tested.

### Option C — Ship static files verbatim (copy the reference, no transform)

**Pros:** maximally simple and deterministic. **Cons:** no parameterization at
all (framework selection, naming, option variants); the reference impls carry
test scaffolding and harness assumptions a consumer doesn't want verbatim.

## Trade-off Analysis

Option B contradicts the project's reason to exist — if the scaffold can drift
from the contract, the contract has stopped being the source of truth at the
exact moment it matters most (code generation). Option C is too rigid: consumers
need at least framework choice and clean output, and the references include
test-harness specifics. Option A keeps determinism and auditability (the output
_is_ the reference, transformed in legible, throwing steps) while allowing safe
parameterization — with the hard rule that no option removes MUST code. The CI
gate that **typechecks generated React and runs generated tests** turns
"known-compliant" into something enforced on every build.

## Consequences

- **Easier:** trusting the scaffold (it's the audited reference); catching a
  drifted reference (anchors throw); proving compliance (notes + executed tests).
- **Harder:** editing a reference implementation — you may break an anchor and
  must update the transform; adding scaffold options requires proving they don't
  strip MUST code.
- **Revisit when:** a `check_consistency` tool lands (verify an _existing_ impl
  against its contract) — it shares this plumbing and is deferred only to hold
  the 2-tool scope cap.

## Action Items

- [x] Anchored `replaceOnce`/`stripTest` transforms that throw on drift
- [x] `compliance_notes` coverage tested for every MUST × pattern × framework
- [x] Generated React typechecked + generated vanilla parse-checked + variant tests executed in CI
- [x] Drop scaffold options that strip MUST code (DESIGN.md amendment)
