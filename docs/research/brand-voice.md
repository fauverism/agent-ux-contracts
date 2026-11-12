# Brand voice: how this product talks, and what it can claim

A dated snapshot, written **2026-11-12** from five passes over the repo: a
voice inventory of the outward-facing copy, a read of the site's design
contract, an audience and claims read, a claim-by-claim verification against a
real run of the gate and the MCP server, and a comparison with neighbors'
public pages. This is guidance for writing copy. It changes no behavior and
creates no requirement; behavior lives in the contracts
([`AGENTS.md`](../../AGENTS.md), "The golden rule").

Quotes are verbatim from the file named, with source line wraps joined and JSX
entities rendered. Evidence in §4 was true on the date above; re-run the
command before repeating a claim in public. Counts are left out on purpose;
the commands print them.

The audience and position come from [`NORTH-STAR.md`](../NORTH-STAR.md). The
neighbor comparison extends [`landscape.md`](landscape.md).

---

## 1. Voice

### In one paragraph

The voice is one experienced engineer writing a standards document for other
engineers, and refusing to oversell it. It opens with a claim, defends the
claim with the specific thing that breaks otherwise, and then tells the reader
how to check for themselves. It is blunt about what the field gets wrong,
plain about its own limits, and proud of being small. Humor is rare, dry, and
one line long. It never sells, never cheers, and never asks to be trusted.

The stated rule in `CLAUDE.md` is "Prose tone: direct, practitioner-to-practitioner,
no marketing fluff." The README, About, Subscribe, 404, the adoption section,
the MCP README and the pattern `doc.mdx` files follow it. The Getting started
page mostly does not; most of the "doesn't sound like" examples below come
from there.

### Attributes

Each "doesn't sound like" line is real copy from the repo that breaks the
attribute, not an invented example.

**1. Thesis-first.** State the claim as a contrast, then defend it.

- Sounds like: "Gate what matters, or the gate stops mattering." (`patterns/approval-gate/doc.mdx`)
- Doesn't sound like: "This is a hands-on walkthrough. In about ten minutes you’ll build the catalog’s MCP server" (`site/app/getting-started/page.tsx`)

**2. Verify, don't trust.** Tell the reader how to check, and that they should.

- Sounds like: "its tests come along so you can verify the contract holds in your build, not take this page’s word for it." (`site/components/AdoptSection.tsx`)
- Doesn't sound like: "The catalog hands you a vetted answer." (`site/app/getting-started/page.tsx`)

**3. Blunt about the field.** Name the common failure without softening it.

- Sounds like: "a gate that summarizes one thing and executes another is theater with an audit log" (`patterns/approval-gate/doc.mdx`)
- Doesn't sound like: "these are {patterns.length} small ideas for making AI feel less like a black box" (`site/app/page.tsx`)

**4. Restraint as a value.** Small scope and low frequency are choices, stated as such.

- Sounds like: "That’s the whole deal: no digest, no roundup, nothing weekly." (`site/app/subscribe/page.tsx`)
- Doesn't sound like: "Why it’s worth it" as a section heading, followed by "Stop re-deriving the same UI." (`site/app/getting-started/page.tsx`)

**5. Shows its seams.** Say what is not proven, not built, or downgraded.

- Sounds like: "The component is deliberately dumb about transport." (`patterns/streaming-response/doc.mdx`)
- Doesn't sound like: "Green tests mean the code you just received already satisfies its own contract." (`site/app/getting-started/page.tsx`)

**6. Reasons from mechanism.** Justify a rule by what breaks without it.

- Sounds like: "the approve button is never auto-focused, because muscle-memory Enter is how users authorize things they never read." (`patterns/approval-gate/doc.mdx`)
- Doesn't sound like: "proof the search reads intent, not keywords" (`site/app/getting-started/page.tsx`). The mechanism is alias and token matching, and the same page says so two paragraphs earlier.

**7. One person, accountable.** First-person singular, and only where a human is on the hook.

- Sounds like: "If you followed a link here, that’s a problem on my end —" (`site/app/not-found.tsx`)
- Doesn't sound like: "My team ships AI features." (`mcp-server/DEMO.md`)

### Which attributes carry the brand

Compared with the neighbors' public pages (design systems, AI pattern
collections, vendor guidelines, the W3C's ARIA Authoring Practices Guide, MCP
servers that serve UI code):

- **Distinctive here:** blunt about the field (3), restraint as a value (4), one person (7). No page read does any of the three.
- **Shared with the ARIA Authoring Practices Guide only:** thesis-first (1), verify-don't-trust (2), reasons from mechanism (6). That guide is the closest relative in voice.
- **Common among credible sources:** shows its seams (5). Necessary, not differentiating.

Lead with 3, 4 and 7 when there is room for only one sentence.

### Sentence habits to keep

- A short declarative, one longer sentence carrying the mechanism, a short closer.
- "X, not Y" as the default contrast: "a response, not an error", "one client, not a requirement".
- Triads of negation: "no timeouts, no defaults, no "approving in 5…4…3…"".
- Qualify by frequency or mechanism ("almost everyone", "most often violated by generated code"), not with hedge words.
- No exclamation marks. No emoji. No "just" as a softener.
- Humor by literal specificity: "No streak emojis." "Email me; the subject line is already filled in".

### A second register, on purpose

`site/lib/plain-language.ts` and the homepage's "in plain English" section
speak to a reader who will never open a JSON file. That register uses
household analogies (a contractor's quote, a washing machine's cancel button)
and is internally consistent. It is allowed. Keep it inside the labelled
plain-English panels, keep the analogies concrete, and do not let it talk
down: "a scary red error" is the one entry that does.

### Visual voice

The site's design contract (`site/styles/tokens.css`, header comment) says the
same things in another medium: warm paper and ruled lines for "a printed
document someone wrote", one accent reserved for normative force, no shadows,
no pills, no emoji. Copy and design reinforce each other when copy stays
flat and specific. They pull apart when copy sells: a benefits list set in
spec-document typography reads as a costume.

---

## 2. Vocabulary

### Use

| Word or phrase | Meaning here | Example in the repo |
| --- | --- | --- |
| contract | The `pattern.contract.json` file, and nothing looser | "the contract is the artifact" (`README.md`) |
| constraint, rule | One entry in a contract, with an id and a level | "every MUST mapped to a named test" (About) |
| manual, field manual | The site, as a genre | "Humans read the manual; agents read the contracts." (homepage) |
| clause, standard | How constraints are set on the page | "like clauses in a standard" (About) |
| receipt, anchor | The evidence that links a rule to code | "The `rationale` is the receipt" (Getting started) |
| pin, drift | Recording a version and hash; a copy falling behind its contract | "Pin what you adopted" (adoption section) |
| the gate | `npm run check` | "the gate is green" (`README.md`) |
| loudly / silently | Failures that announce themselves versus ones that do not | "enforced loudly" (`refusal-messaging/doc.mdx`) |
| on purpose, deliberately | Marks a limit as a decision | "Scope is capped on purpose." (About) |
| reference implementation | The React and vanilla code | throughout |
| known-compliant | Scaffold output, and only with the limits in §4 in mind | `mcp-server/README.md` |
| plain English | The label for the non-technical register | homepage, pattern pages |

### Avoid

| Word or phrase | Why | Where it appears now |
| --- | --- | --- |
| vetted, proven, guaranteed | Claims more than a jsdom test run shows | "a vetted answer" (Getting started) |
| proves (of a test) | Several tests show part of a rule; see §4 | "the test that proves it" (adoption section) |
| reads intent, understands | Search is lexical | Getting started, twice |
| fails your build | Nothing compares a pinned hash yet | Getting started, `DEMO.md` |
| success signal, success message | Instructional-design jargon | Getting started, five times |
| worth it, hands-on, wired up, dive in | Tutorial cheer | Getting started, homepage |
| black box, small ideas | Stock phrasing that shrinks the thesis | homepage |
| wins | Competitive language in a README | `README.md` documentation table |
| my team, we | The author is one person | `DEMO.md` |
| just | Softener | homepage, adoption section, `site.ts` |
| a hard number for tests, patterns or evals | Goes stale; the repo's own rule forbids it in standing docs | About, `mcp-server/README.md`, Getting started, `DEMO.md` |

### RFC-2119 keywords in prose

`AGENTS.md` says: "Do **not** introduce a new MUST/SHOULD in prose, in a code
comment, or in a test." Copy can still use the words. The line is whether the
sentence reports a rule that exists or creates one that does not.

1. **Uppercase keywords refer to a contract level, and nothing else.** Write `MUST` or `SHOULD` in capitals only when naming the level of a constraint that exists, ideally with its id: "`focus-not-lost` is a MUST". Do not capitalize for emphasis.
2. **A list of "its MUSTs" is a quotation.** Use the constraint ids or the contract's own statements. A loose paraphrase becomes a second, wrong contract. `mcp-server/README.md` lists "render progressively" among streaming-response's MUSTs; no such constraint exists, and `focus-not-lost` is missing from the list.
3. **Lowercase "must", "never" and "always" are ordinary English, and still need a source.** "Escape rejects; nothing auto-approves, ever." is fine because `explicit-consent` says so. If no constraint backs the sentence, either it is guidance (say "we recommend", or put it under the contract's `guidance` field) or it is a contract change waiting to be made.
4. **Agent notes are the risk area.** The imperative mood there reads as normative to an agent. Each "Never…" should trace to a constraint id, or be worded as advice. PROGRESS already records that `doc.mdx` in three patterns "states a few requirements that are guidance, not constraints".
5. **The site's own design rules borrow the format; treat that as style.** `tokens.css` writes "accent MUST appear only on…". That is a design convention enforced by review. It is not a pattern contract, has no test, and should not be described in copy as if it had one.
6. **When copy and contract disagree, the contract is right** and the copy is a bug.

---

## 3. Positioning

### Statement

For frontend and UX engineers who build AI interfaces and have a coding agent
write the first draft, agent-ux-contracts is a small catalog of interface
patterns in which each pattern is a list of testable rules, shipped with
reference code and the tests that check it. Pattern galleries tell you what
good looks like and component kits hand you code. This gives the agent the
rules and gives you a way to check the result in your own build.

Short form, from `NORTH-STAR.md`: "The others give an agent a component. This
gives it the rules and the proof." Until the items in §4 are resolved, prefer
"the rules and the tests" in public copy.

### One message per audience

| Audience | What they are trying to do | Message | Where it lands today |
| --- | --- | --- | --- |
| Frontend engineer building an AI feature (primary) | Ship streaming, cancel, refusal or approval UI without re-deriving it | Copy three files and run the tests that came with them. Every required rule has a test with its name on it. | Getting started; the adoption section on each pattern page |
| Team grounding a coding agent | Make the agent follow known rules, and check that it did | The agent gets the rules as data and a starting implementation that is the reference, not a guess, with a note pointing each required rule at the code. | About; `mcp-server/README.md` |
| Accessibility lead or design-system owner | Get accessibility treated as testable rules | Focus, keyboard and announcement behavior are constraints in the contract, tested in every state, with a written list of what the tests cannot show. | Only the Accessibility section of each pattern page. No page opens with this. |

The non-technical reader the plain-English panels address has a voice and no
stated purpose. See §6.

---

## 4. Claims

Verified 2026-11-12 by running `npm run check`, the site tests and static
build, and both MCP tools over stdio, and by reading every `COMPLIANCE.md`.

### Claims we can make today

| Claim | Evidence | Check it with |
| --- | --- | --- |
| Every MUST and MUST_NOT has a test named for it, in both frameworks | Each constraint id appears as a test-name prefix and as a COMPLIANCE row for all ten patterns | `npm test`; the `COMPLIANCE.md` tables. Convention, not yet enforced by the validator. |
| The gate is green and runs on every pull request | Catalog tests, contract and journey validation, typecheck, MCP tests, search evals at 100%, site typecheck | `npm run check`; `.github/workflows/check.yml` |
| Contracts are schema-validated, and invalid ones are not served | ajv strict in the validator and in the server's loader; startup log reports loaded and invalid counts | `npm run validate`; `mcp-server/test/loader.test.ts` |
| The scaffold is the reference implementation, transformed deterministically | Byte-identical output test; generated React is typechecked and generated vanilla is parse-checked in the MCP tests | `npm --prefix mcp-server test` |
| Every required rule in a scaffold is anchored to a code symbol | `compliance_notes` coverage test for every MUST × pattern × framework | same |
| Scaffolded tests pass in a fresh project that sets `"jsx": "react-jsx"` | Reproduced for streaming-response and approval-gate | the `verify` command in the scaffold response |
| Site and server report the same contract hash | The built pattern page and the tool response carry the same sha256 | `npm --prefix site run build`, then compare with a `search_patterns` result |
| A different hash on a later fetch means the contract changed | Hash is over the canonicalized contract | `mcp-server/src/hash.ts` |
| Search results say why they matched, and an empty result returns the category map | Rationale on every result; `nearest` on no match | `npm --prefix mcp-server run eval` |
| Accessibility is part of the contract | Schema requires at least one accessibility constraint; every contract carries WCAG criteria and a keyboard table | `schema/pattern-contract.schema.json` |
| axe-core runs in both frameworks in every implemented state | Recorded in the 2026-11-11 proof audit; color contrast is excluded because jsdom has no layout | pattern test files |
| Ten patterns, two tools, by choice | Server lists exactly two tools | `CLAUDE.md` scope limits |
| The reference implementations have no dependency beyond React | Component files import only from `react`; vanilla imports nothing | `patterns/*/react`, `patterns/*/vanilla` |
| A new pattern starts from a skeleton that fails validation | Reproduced | `npm run new-pattern -- <id>`, then `npm run validate` |

### Claims to hold, and what releases each

| Do not say | Why not | Released when |
| --- | --- | --- |
| A test "proves" each MUST; green tests mean the code "satisfies its own contract" | PROGRESS, deferred contract questions: `no-false-confidence`, `source-verifiable` and `draft-preserved` are only partly testable as written. Two deviations are recorded: vanilla approval-gate has a public `approve()`, React refusal-messaging accepts an empty `reason`. | Those contracts are revised with a version bump and the deviations are closed or accepted in the contract |
| "Every constraint is testable, or it is downgraded" | Same three MUSTs were neither made testable nor downgraded | Same |
| "Keyboard-operable", "visible", "inserts a newline" as tested facts | PROGRESS, deferred, needs a browser: these are "proven by proxy in jsdom" | A real-browser test pass exists |
| "IME-safe" without qualification | Safari's confirming Enter (keyCode 229) is unverified | Verified in Safari |
| "Vetted" or any screen-reader claim | No assistive-technology pass exists. Known open gaps: confidence-indicator vanilla drops focus on `update()`; streaming-response vanilla `reset()` drops focus mid-stream | A screen-reader pass, and those two fixed or recorded as deviations |
| "Citations users can verify" as a property of the component | The component links to the URL it is given; whether the source is reachable is the host's data | `source-verifiable` is reworded |
| "Drift fails your build", "drift fails loudly" | Nothing compares a pinned hash to the current one; `check_consistency` is deferred to hold the two-tool cap | An adopter-side check ships |
| "Every response carries version + contract_hash" | Empty search results and error responses carry neither | Say "every result" instead; no code change needed |
| The search "reads intent" | Ranking is lexical; the "don't use this here" caution misses paraphrases and fires on substrings (NORTH-STAR gap 8) | Gap 8 is fixed; even then, describe the mechanism |
| "Tests pass on arrival" without the tsconfig condition | Every test fails with `"jsx": "preserve"` (NORTH-STAR gap 7) | Gap 7 is fixed |
| "No lock-in", "vendor the files" as an invitation | `LICENSE.md` is "All Rights Reserved" (NORTH-STAR decision 1) | A license permits copying |
| "One email when a new pattern ships"; any link to the live site or feed | The Buttondown username is unclaimed and the deploy URL returns `DEPLOYMENT_NOT_FOUND` (NORTH-STAR gaps 1 and 4) | Both are live |
| "Coding agents now write a large share of interface code" | No source in the repo | A cited source, or reword as the author's observation |
| Any pattern described as stable or production-ready | All ten contracts have `status: "draft"`, shown on every pattern page | Status is promoted |
| Any hard count of tests, patterns or evals in standing copy | Four such numbers were stale on the day of this audit | Never; link to the command |

---

## 5. Ten copy fixes

Proposals only. Each is the smallest change that makes the line true or puts
it back in voice. "Current" text is exact.

| # | File | Current | Proposed | Reason |
| --- | --- | --- | --- | --- |
| 1 | `site/app/getting-started/page.tsx` (`TEST_OUTPUT`) | `# pass 12\n# fail 0` | `# fail 0` | The scaffolded suite no longer has 12 tests, and any count will go stale again. `site/__tests__/getting-started.code.test.tsx` asserts `/# pass 12/` and needs the same change. `mcp-server/DEMO.md` repeats the number twice. |
| 2 | `site/app/getting-started/page.tsx` | "Green tests mean the code you just received already satisfies its own contract. You verified it — you didn’t take anyone’s word for it." | "Green tests mean every MUST in the contract has a passing test in your project. You ran them — you didn’t take anyone’s word for it." | True as reworded. The original claims more than jsdom tests show (§4). |
| 3 | `site/app/getting-started/page.tsx` (`MORE_PROMPTS`) | "A different product phrasing that should surface interruption-cancel / generation-control — proof the search reads intent, not keywords." | "A different product phrasing. Expect streaming-response first and interruption-cancel second: stopping a text stream and cancelling agent work are separate patterns." | Matches what the server returns. Removes the one hedge in the copy and the "reads intent" overclaim. |
| 4 | `site/app/getting-started/page.tsx` (`MORE_PROMPTS`) | "Every response carries version + contract_hash. Pin them in your repo and a contract change fails your build instead of drifting silently." | "Every result carries version + contract_hash. Record both where your copy lives; a different hash on a later fetch means the contract changed." | Nothing fails a build today. The proposed wording is the server's own `pin_note`. The bullet "Drift fails loudly." on the same page and the close of `DEMO.md` need the same correction. |
| 5 | `site/app/about/page.tsx` | "Every constraint is testable, or it is downgraded — untestable tone rules stay at SHOULD_NOT and are flagged as copy review, not code assertions." | "Constraints are written to be testable. Where a test covers only part of a rule, COMPLIANCE.md says which part — untestable tone rules stay at SHOULD_NOT and are flagged as copy review, not code assertions." | Three MUSTs are partly testable and were not downgraded. The rewrite is also a better example of showing the seams. |
| 6 | `site/app/about/page.tsx` | "369 tests run on every change." | "The full suite runs on every pull request." | Hard-coded count in standing copy; the repo's own rule says to link the command instead. |
| 7 | `site/components/AdoptSection.tsx` | "it needs `"jsx": "react-jsx"`, which any React project already sets." | "it needs `"jsx": "react-jsx"`. With `"preserve"` every test fails with “React is not defined”." | The original is false for projects that set `preserve`, and the failure it hides is the first thing such a reader hits. |
| 8 | `site/components/AdoptSection.tsx` | "mapping every MUST to the test that proves it" | "mapping every MUST to the test named for it, and listing what the tests cannot show" | "Proves" is the overclaim; each COMPLIANCE.md already has a "Limits of the proof" section worth pointing at. |
| 9 | `mcp-server/README.md` (example 1) | "Its MUSTs: render progressively, visible stop control, partial output preserved, completion announced to assistive tech, never steal focus." | "Its MUSTs: visible stop control, partial output preserved, completion announced to assistive tech, never steal focus, focus never lost when the stop control goes away." | "Render progressively" is not a constraint and `focus-not-lost` was missing. A paraphrased MUST list is a second contract (§2, rule 2). |
| 10 | `site/app/page.tsx` | "Getting started will guide you through connecting the server to Claude Code and scaffolding your first pattern. Or, if you just want to dive into the patterns, the index is below." | "Getting started connects the server to Claude Code and scaffolds a first pattern. The index is below." | Voice only. The sentence follows "Same rules.", the strongest line on the site, with onboarding filler. Keep the link on "Getting started". |

Mechanical corrections found in the same audit, not counted above:

- `mcp-server/README.md`: "32 unit/integration tests", "14 pass", "v0.2.0", and "`version 0.1.0` + `contract_hash 9a41…`" are all out of date; the first-example rationale no longer matches what the server returns.
- `mcp-server/README.md`, `mcp-server/DEMO.md`, `site/components/AdoptSection.tsx`: the scaffold returns four files, not three (`setup-dom.mjs` is the fourth).
- `mcp-server/DEMO.md`: "eval cases 1 and 10" no longer points at the two loading-state queries.
- `site/app/about/page.tsx`: "Set in Google Sans Code." The site is set in DM Sans and Google Sans Code. `site/app/styleguide/page.tsx` has the same error.
- `site/app/getting-started/page.tsx`: "so a clean build means the catalog is intact". The build does not read contracts; validation happens when the server starts.
- `site/app/getting-started/page.tsx`: "You started with an empty project." The reader started by cloning a repo.
- `README.md`: the comment on `npm test` describes only the schema suite; the command runs every pattern test as well.

---

## 6. Open questions for the owner

Questions already listed in `NORTH-STAR.md` ("Decisions only the owner can
make") are referenced, not repeated.

1. **Does the Getting started page keep its tutorial register?** It is the only page that sells and cheers. Rewriting it in the practitioner voice is a larger change than the ten fixes above. The alternative is to accept a second, friendlier register for onboarding and write that down as a rule.
2. **Who is the plain-English reader, and what should they do next?** The homepage and every pattern page address someone non-technical. No doc names them. A buyer, a product manager, a prospective consulting client? The answer decides whether those panels stay on the homepage above the index.
3. **"I" or no person at all?** First-person singular is one of the three distinctive attributes. It appears on the 404 and in contact copy, and `DEMO.md` says "My team". Should the demo and About use "I" as well?
4. **"The rules and the proof" or "the rules and the tests"?** The NORTH-STAR position line says "proof". Until a browser and assistive-technology pass exists, "tests" is the claim the evidence supports. Hold the stronger word for after, or keep it and qualify it?
5. **Should the three partly-testable MUSTs be resolved before launch copy is written?** `no-false-confidence`, `source-verifiable` and `draft-preserved` block the two best lines on the About page. This is a contract decision with version bumps.
6. **Does the accessibility reader get an entry point?** The strongest accessibility statement is in the README. The homepage and About do not mention accessibility. One sentence on either would do it, if that audience matters for launch.
7. **How much of the adoption copy waits on the license?** `NORTH-STAR.md` decision 1 is open. Until it is made, "Three routes, no lock-in" invites copying that the license does not permit.
8. **Is "draft" the right public status for all ten contracts?** It is honest, and it sits beside "known-compliant" on the same page. Either promote the status under a stated bar, or say in About what draft means here.
9. **Should the site's design contract get a check?** Its rules are written as MUSTs and are enforced by review only; the audit found four accent uses outside the sanctioned list and a mismatch between "four" and five placements. A small lint would make the borrowed format honest. This is new tooling, so it needs a yes.
10. **Does the accent keep two jobs?** It marks normative force and it fills the subscribe button. If colour means "this is a MUST", the one marketing control arguably should not share it.
