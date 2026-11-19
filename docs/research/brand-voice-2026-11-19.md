# Brand voice and marketing: a second pass, 2026-11-19

A rerun of the six-prompt series that produced
[`brand-voice.md`](brand-voice.md) on 2026-11-12, against `origin/main` at
`780306d`. Prompts 1–4 were run again from the files, not copied forward. Prompt
5 used the neighbor research in [`landscape.md`](landscape.md) (dated
2026-11-11) and re-checked the closest neighbors' public pages today. Prompt 6
is this document.

This is guidance for writing copy. It changes no behavior and creates no
requirement. Behavior lives in the contracts ([`AGENTS.md`](../../AGENTS.md),
"The golden rule").

**Read this first:** the 2026-11-12 guide's ten copy fixes are still unapplied
on `main`, and this pass found two new items. §0 lists what changed. Where this
document and the earlier one disagree, §0 says which is current.

---

## 0. What changed since 2026-11-12

| Item | Earlier guide said | Now |
| --- | --- | --- |
| Gate on `main` | Green | Green. `npm run check` exits 0 at `780306d`; the search scorecard is 79/79. |
| Attributed quotes | Verbatim | Still verbatim. All 15 quotes with a file reference were checked against the current files. The approval-gate auto-focus quote wraps across two source lines; joined, it matches. |
| Copy fixes 1–10 | Proposed | **Still unapplied.** Each current line is re-checked in §5. |
| About page count | Fix 6: remove the count | Now reads "369 tests run on every change" (`site/app/about/page.tsx:48`). The count came from the proof-audit work, which added the number that fix 6 says to remove. Fix 6 still stands; PROGRESS.md carries the same number. |
| Other stale counts | Listed as mechanical | `mcp-server/DEMO.md` still says `# pass 12` (lines 11, 68). `ARCHITECTURE.md:272` still says "drift fails your build". |
| New copy seen today | — | `mcp-server/DEMO.md:89` closes with "drift fails your build" and `site/app/getting-started/page.tsx:204` says "Drift fails loudly." Both are in fix 4's scope. |
| Competitor surface | Vercel AI Elements noted in `landscape.md` as a component kit | Its published components now include a `Confirmation` (approve/reject for tool calls) and a `Reasoning` component. Those overlap `approval-gate` and `thinking-visibility` by name. §5 treats this as a positioning question. |

---

## 1. Voice

### In one paragraph

The voice is one experienced engineer writing a standards document for other
engineers, and refusing to oversell it. It opens with a claim, defends it with
the specific thing that breaks otherwise, and then tells the reader how to check
for themselves. It is blunt about the field, plain about its own limits, and
proud of being small. Humor is rare, dry, and one line long. It never sells,
never cheers, and never asks to be trusted.

`CLAUDE.md` states the rule: "Prose tone: direct, practitioner-to-practitioner,
no marketing fluff." The homepage, About, Subscribe, the 404, the MCP README and
the pattern `doc.mdx` files follow it. Getting started mostly does not.

### Attributes

Each "doesn't sound like" line is real copy that breaks the attribute.

**1. Thesis-first.** Claim as a contrast, then defend it.
- Sounds like: "Gate what matters, or the gate stops mattering." (`patterns/approval-gate/doc.mdx`)
- Doesn't sound like: "This is a hands-on walkthrough. In about ten minutes you'll build the catalog's MCP server" (`site/app/getting-started/page.tsx`)

**2. Verify, don't trust.** Say how to check, and that the reader should.
- Sounds like: "its tests come along so you can verify the contract holds in your build, not take this page's word for it." (`site/components/AdoptSection.tsx`)
- Doesn't sound like: "The catalog hands you a vetted answer." (`site/app/getting-started/page.tsx`)

**3. Blunt about the field.** Name the common failure without softening it.
- Sounds like: "a gate that summarizes one thing and executes another is theater with an audit log" (`patterns/approval-gate/doc.mdx`)
- Doesn't sound like: "these are {patterns.length} small ideas for making AI feel less like a black box" (`site/app/page.tsx`)

**4. Restraint as a value.** Small scope and low frequency are stated as choices.
- Sounds like: "That's the whole deal: no digest, no roundup, nothing weekly." (`site/app/subscribe/page.tsx`)
- Doesn't sound like: "Why it's worth it" as a heading, followed by "Stop re-deriving the same UI." (`site/app/getting-started/page.tsx`)

**5. Shows its seams.** Say what is not proven, not built, or downgraded.
- Sounds like: "The component is deliberately dumb about transport." (`patterns/streaming-response/doc.mdx`)
- Doesn't sound like: "Green tests mean the code you just received already satisfies its own contract." (`site/app/getting-started/page.tsx`)

**6. Reasons from mechanism.** Justify a rule by what breaks without it.
- Sounds like: "the approve button is never auto-focused, because muscle-memory Enter is how users authorize things they never read." (`patterns/approval-gate/doc.mdx`)
- Doesn't sound like: "proof the search reads intent, not keywords" (`site/app/getting-started/page.tsx`). The mechanism is alias and token matching, which the same page states two paragraphs earlier.

**7. One person, accountable.** First person singular, only where a human is on the hook.
- Sounds like: "If you followed a link here, that's a problem on my end —" (`site/app/not-found.tsx`)
- Doesn't sound like: "My team ships AI features." (`mcp-server/DEMO.md`)

### Which attributes carry the brand

Set against the neighbors read today and in `landscape.md`:

- **Distinctive in the field:** blunt about the field (3), restraint (4), one person (7). None of the pages read today does all three.
- **Closest in voice:** the W3C ARIA Authoring Practices Guide, for thesis-first (1), verify-don't-trust (2) and mechanism (6). That guide also describes itself without normative keywords.
- **Common among credible sources:** shows its seams (5). Microsoft's HAX Toolkit calls its guidelines "evidence-based best practices", which is the same instinct stated more loosely.

Lead with 3, 4 and 7 when there is room for one sentence.

### Contrast with today's neighbors (read 2026-11-19)

| Source | Headline, as read today | Tone and audience (inferred from the page) |
| --- | --- | --- |
| The Shape of AI | "UX Patterns for Artificial Intelligence Design"; intro opens "The rise of AI has caused a paradigm shift" | Confident, community-minded ("Our interfaces"). Unhedged claims. Calls to action to subscribe and join a Slack. |
| Microsoft HAX Toolkit | "Guidelines for Human-AI Interaction"; "evidence-based best practices" | Instructional and professional, for AI designers and product teams. Its 18 guidelines are in a poster image, so the page text does not list them. |
| AI UX Playground | "Solved AI UX problems, ready to reuse." | Product-focused and polished. Promotes a newsletter, build guides and an affiliate tool. Its one definition read is one sentence, "Show replies token-by-token as they generate." |
| WAI-ARIA APG | "This guide describes how to apply accessibility semantics to common design patterns and widgets." | Reference. Says nothing about its own normative status and uses no RFC 2119 keywords. |
| Vercel AI Elements (search results only) | React components for the AI SDK, installed via the shadcn registry | Component library, not guidance. Sources disagree on the component count; check the repo before quoting one. |

What this table shows: the Shape of AI's "paradigm shift" is the register this
product avoids. The HAX Toolkit's "evidence-based" is the nearest claim to ours,
and it is a claim we can back with a test run. The AI UX Playground promotes a
monetized surface, which our "no digest, no roundup" line is written against.
AI Elements is the one neighbor that ships components named like two of our
patterns; §5 covers that.

### A second register, on purpose

`site/lib/plain-language.ts` and the homepage's "in plain English" section speak
to a reader who will never open a JSON file. They use household analogies and
are internally consistent. That is allowed. Keep it inside the labelled
plain-English panels and do not let it talk down. "A scary red error" is the one
entry that does.

### Visual voice

The site's design contract (`site/styles/tokens.css`, header comment) says the
same things in another medium: warm paper and ruled lines, one accent reserved
for normative force, no shadows, no pills, no emoji. Copy and design reinforce
each other when the copy stays flat and specific. They pull apart when the copy
sells.

---

## 2. Vocabulary

### Use

| Word or phrase | Meaning here | Where it appears |
| --- | --- | --- |
| contract | The `pattern.contract.json` file, and nothing looser | "The contract is the artifact" (`README.md`) |
| constraint, rule | One entry in a contract, with an id and a level | "every MUST mapped to a named test" (About) |
| manual, field manual | The site, as a genre | "Humans read the manual; agents read the contracts." (homepage) |
| clause, standard | How constraints are set on the page | "like clauses in a standard" (About) |
| receipt, anchor | The evidence that links a rule to code | `compliance_notes` in the MCP output |
| pin, drift | Recording a version and hash; a copy falling behind its contract | Adoption section |
| the gate | `npm run check` | `README.md` |
| loudly, silently | Failures that announce themselves versus ones that do not | `refusal-messaging/doc.mdx` |
| on purpose, deliberately | Marks a limit as a decision | "Scope is capped on purpose." (About) |
| known-compliant | Scaffold output, with the limits in §4 in mind | `mcp-server/README.md` |

### Avoid

| Word or phrase | Why | Where it appears now |
| --- | --- | --- |
| vetted, proven, guaranteed | Claims more than a jsdom test run shows | "a vetted answer" (Getting started) |
| proves (of a test) | Tests show part of a rule; see §4 | Adoption section, `AdoptSection.tsx:70` |
| reads intent, understands | Search is lexical | Getting started, `page.tsx:86, 323` |
| fails your build, drift fails loudly | Nothing compares a pinned hash yet | `DEMO.md:89`, `ARCHITECTURE.md:272`, `page.tsx:204` (new today) |
| success signal | Instructional-design jargon | Getting started |
| worth it, hands-on, wired up, dive in | Tutorial cheer | Getting started; homepage (`page.tsx:23`) |
| black box, small ideas | Stock phrasing that shrinks the thesis | Homepage plain-English section |
| my team, we | The author is one person | `DEMO.md` |
| just | Softener | Homepage, adoption section, `site.ts` |
| a hard count in standing copy | Goes stale; the repo's own rule forbids it | About (`page.tsx:48`), `PROGRESS.md`, `AGENTS.md`, `ARCHITECTURE.md`, `DEMO.md` |

### RFC-2119 keywords in prose

`AGENTS.md` says: "Do **not** introduce a new MUST/SHOULD in prose, in a code
comment, or in a test." Copy can still use the words. The test is whether the
sentence reports a rule that exists or creates one that does not.

1. **Capitals name a contract level and nothing else.** Write `MUST` only when naming a constraint that exists, ideally with its id ("`focus-not-lost` is a MUST"). Do not capitalize for emphasis.
2. **A list of "its MUSTs" is a quotation.** Use constraint ids or the contract's own statements. `mcp-server/README.md:66` still lists "render progressively", which is not a constraint, and omits `focus-not-lost`.
3. **Lowercase "must", "never" and "always" are ordinary English and still need a source.** "Escape rejects; nothing auto-approves, ever." is backed by `explicit-consent`.
4. **Agent notes are the risk area.** Imperative "Never…" lines read as normative to an agent. Each should trace to a constraint id or be worded as advice. PROGRESS already records that three patterns' `doc.mdx` state guidance as requirements.
5. **The site's design rules borrow the format.** `tokens.css` writes "accent MUST appear only on…". That is a review convention with no test and should not be described in copy as a contract.
6. **When copy and contract disagree, the contract is right** and the copy is a bug.

---

## 3. Positioning

### Statement

For frontend and UX engineers who build AI interfaces and have a coding agent
write the first draft, agent-ux-contracts is a small catalog of interface
patterns. Each pattern is a list of testable rules, shipped with reference code
and the tests that check it. Pattern galleries tell you what good looks like;
component kits hand you code. This gives the agent the rules and gives you a way
to check the result in your own build.

From `NORTH-STAR.md`: "The others give an agent a component. This gives it the
rules and the proof." Until the §4 items are resolved, prefer "the rules and the
tests" in public copy.

### One message per audience

| Audience | What they are trying to do | Message | Where it lands today |
| --- | --- | --- | --- |
| Frontend engineer building an AI feature (primary) | Ship streaming, cancel, refusal or approval UI without re-deriving it | Copy three files and run the tests that came with them. Every required rule has a test with its name on it. | Getting started; each pattern's adoption section |
| Team grounding a coding agent | Make the agent follow known rules, and check that it did | The agent gets the rules as data and a reference-based starting implementation, with a note pointing each required rule at its code. | About; `mcp-server/README.md` |
| Accessibility lead or design-system owner | Get accessibility treated as testable rules | Focus, keyboard and announcement behavior are constraints, tested in every state, with a written list of what the tests cannot show. | Only each pattern's Accessibility section. No page opens with this. |

### Competitive position, one line

Against AI Elements, the closest neighbor by name: it gives you components to
install; this gives you the rules those components must meet and a test you
can run on whatever you install. Say this only once the §4 "hold" items allow it,
because the claim is about rules and tests, not about a better component.

---

## 4. Claims

Verified 2026-11-19 by running `npm run check` on `origin/main` at `780306d`
(exit 0), by reading each `COMPLIANCE.md`'s "Limits of the proof", and by reading
PROGRESS.md's deferred list. Counts are left out on purpose; the commands print
them.

### Claims we can make today

| Claim | Evidence | Check it with |
| --- | --- | --- |
| The gate runs on every pull request and was green on `main` today | `npm run check` exit 0; `.github/workflows/check.yml` | `npm run check` |
| Every MUST and MUST_NOT has a test named for it, in both frameworks | Constraint ids appear as test-name prefixes and COMPLIANCE rows for all ten patterns | `npm test`; the COMPLIANCE tables. A convention; the validator does not enforce it. |
| axe-core runs in both frameworks in every implemented state | 2026-11-11 proof audit; color contrast is excluded because jsdom has no layout | Pattern test files |
| Contracts are schema-validated, and invalid ones are not served | ajv strict in the validator and in the server loader | `npm run validate`; `mcp-server/test/loader.test.ts` |
| The scaffold is the reference implementation, transformed deterministically | Byte-identical output test; generated React is typechecked, vanilla parse-checked | `npm --prefix mcp-server test` |
| Search results say why they matched; an empty result returns the category map | Rationale on every result; `nearest` on no match | `npm --prefix mcp-server run eval` (79/79 today) |
| Ten patterns, two tools, by choice | Server lists two tools | `CLAUDE.md` scope limits |
| Every pattern is `draft` | Shown on every pattern page | `pattern.contract.json` status fields |

### Claims to hold, and what releases each

| Do not say | Why not | Released when |
| --- | --- | --- |
| A test "proves" each MUST; green tests mean the code "satisfies its own contract" | PROGRESS deferred items: `no-false-confidence`, `source-verifiable` and `draft-preserved` are only partly testable as written. Two deviations are recorded: vanilla approval-gate's public `approve()`, and React refusal-messaging accepting an empty `reason`. | Those contracts are revised with a version bump, and the deviations are closed or accepted |
| "Keyboard-operable", "visible", "inserts a newline" as tested facts | Jsdom proves them by proxy only. The 2026-11-11 notes say a browser pass is needed. | A real-browser test pass exists |
| "IME-safe" without qualification | Safari's confirming Enter (keyCode 229) is unverified | Verified in Safari |
| "Vetted", or any screen-reader claim | No assistive-technology pass exists. Open gaps: confidence-indicator vanilla drops focus on `update()`; streaming-response vanilla `reset()` drops focus mid-stream | A screen-reader pass, and those two fixed or recorded |
| "Citations users can verify" as a property of the component | The component links to the URL it is given; reachability is the host's data | `source-verifiable` is reworded |
| "Drift fails your build", "drift fails loudly" | Nothing compares a pinned hash to the current one. `check_consistency` is deferred to hold the two-tool cap. | An adopter-side check ships |
| "Every response carries version + contract_hash" | Empty results and errors carry neither (`pin_note` is the only pin) | Say "every result" |
| The search "reads intent" | Ranking is lexical. The "don't use this here" caution misses paraphrases (NORTH-STAR gap 8). | Gap 8 is fixed; describe the mechanism even then |
| "Tests pass on arrival" without the tsconfig condition | Tests fail with `"jsx": "preserve"` (NORTH-STAR gap 7) | Gap 7 is fixed |
| "No lock-in", "vendor the files" as an invitation | `LICENSE.md` is "All Rights Reserved" (NORTH-STAR decision 1) | The license permits copying |
| "One email when a new pattern ships"; any link to the live site or feed | Buttondown username unclaimed; deploy URL unverified (NORTH-STAR gaps 1 and 4) | Both are live |
| "Coding agents now write a large share of interface code" | No source in the repo | A cited source, or reword as the author's observation |
| Any pattern described as stable or production-ready | All ten contracts are `draft` | Status is promoted |
| Any hard count of tests, patterns or evals in standing copy | The About page, PROGRESS, AGENTS and ARCHITECTURE all carry one; each will be stale after the next test | Never; link to the command |

---

## 5. Ten copy fixes, rechecked today

Proposals only. "Current" is the line as it stands on `origin/main` today. Fixes
1–10 match the 2026-11-12 guide; the notes say what changed.

| # | File and line | Current | Proposed | Reason |
| --- | --- | --- | --- | --- |
| 1 | `site/app/getting-started/page.tsx:73` (`TEST_OUTPUT`), and `site/__tests__/getting-started.code.test.tsx:107` | `# pass 12\n# fail 0` | `# fail 0` | Still true that the count is stale. Update the test assertion with it. `mcp-server/DEMO.md:11, 68` repeats the number. |
| 2 | `site/app/getting-started/page.tsx:314` | "Green tests mean the code you just received already satisfies its own contract. You verified it — you didn't take anyone's word for it." | "Green tests mean every MUST in the contract has a passing test in your project. You ran them — you didn't take anyone's word for it." | The original claims more than jsdom tests show (§4). |
| 3 | `site/app/getting-started/page.tsx:86` (`MORE_PROMPTS`) | "…should surface interruption-cancel / generation-control — proof the search reads intent, not keywords." | "Expect streaming-response first and interruption-cancel second: stopping a text stream and cancelling agent work are separate patterns." | Matches what the server returns. Removes the "reads intent" overclaim. |
| 4 | `site/app/getting-started/page.tsx:90`; `:204` ("Drift fails loudly."); `mcp-server/DEMO.md:89`; `ARCHITECTURE.md:272` | "Pin them in your repo and a contract change fails your build instead of drifting silently." | "Record both where your copy lives; a different hash on a later fetch means the contract changed." | Nothing fails a build today. The `:204` and `DEMO.md:89` lines need the same correction. |
| 5 | `site/app/about/page.tsx:42` | "Every constraint is testable, or it is downgraded — untestable tone rules stay at SHOULD_NOT and are flagged as copy review." | "Constraints are written to be testable. Where a test covers only part of a rule, COMPLIANCE.md says which part." | Three MUSTs are partly testable and were not downgraded. |
| 6 | `site/app/about/page.tsx:48`; `PROGRESS.md:4` and `:69`; `AGENTS.md`; `ARCHITECTURE.md` | "369 tests run on every change." | "The full suite runs on every pull request." | Updated: this count is the one the proof-audit work introduced. Standing copy should link the command. |
| 7 | `site/components/AdoptSection.tsx:85–86` | "…it needs `"jsx": "react-jsx"`, which any React project already sets." | "…it needs `"jsx": "react-jsx"`. With `"preserve"` every test fails with “React is not defined”." | The claim is false for projects that set `preserve`, which is the failure §4 already records. |
| 8 | `site/components/AdoptSection.tsx:70` | "mapping every MUST to the test that proves it" | "mapping every MUST to the test named for it, and listing what the tests cannot show" | "Proves" is the overclaim. Each COMPLIANCE.md has a "Limits of the proof" section to point at. |
| 9 | `mcp-server/README.md:66` | "Its MUSTs: render progressively, visible stop control, partial output preserved, completion announced to assistive tech, never steal focus." | "Its MUSTs: visible stop control, partial output preserved, completion announced to assistive tech, never steal focus, focus never lost when the stop control goes away." | "Render progressively" is not a constraint; `focus-not-lost` is missing. |
| 10 | `site/app/page.tsx:23` | "…will guide you through connecting the server to Claude Code and scaffolding your first pattern. Or, if you just want to dive into the patterns, the index is below." | "Getting started connects the server to Claude Code and scaffolds a first pattern. The index is below." | Voice only. Keep the link on "Getting started". |

Mechanical items, not counted above:

- `site/app/about/page.tsx:81`: "Set in Google Sans Code." The site is set in DM Sans and Google Sans Code.
- `mcp-server/README.md`: out-of-date figures ("32 unit/integration tests", "14 pass", "v0.2.0") should be checked against `npm --prefix mcp-server test` before editing; do not copy a new number in.
- `mcp-server/DEMO.md`: the scaffold returns four files, not three.

---

## 6. Open questions for the owner

Questions already in `NORTH-STAR.md` are referenced, not repeated.

1. **Does the Getting started page keep its tutorial register?** It is the only page that sells and cheers. Rewriting it in the practitioner voice is larger than fixes 2–4. The alternative is to accept a friendlier onboarding register and write that down as a rule.
2. **Who is the plain-English reader, and what do they do next?** The homepage and each pattern page address someone non-technical. No doc names them. The answer decides whether those panels stay above the index.
3. **Do we answer the Shape of AI's "paradigm shift" framing at all?** Our voice does not use it. If a reader arrives from there, is an explicit contrast useful, or does it give the neighbor the frame?
4. **Do we name Vercel AI Elements in public copy?** It ships `Confirmation` and `Reasoning` components. Naming it invites a comparison; not naming it leaves the closest neighbor unaddressed on the pattern pages that overlap.
5. **"I" or no person at all?** First person singular is one of the distinctive attributes. Should `DEMO.md` and About use "I" as well as the 404 and contact copy?
6. **"The rules and the proof" or "the rules and the tests"?** Until a browser and assistive-technology pass exists, "tests" is the supported claim. Hold "proof" for after, or qualify it.
7. **Should the three partly-testable MUSTs be resolved before launch copy?** `no-false-confidence`, `source-verifiable` and `draft-preserved` block the strongest lines on About. This is a contract decision with version bumps.
8. **How much of the adoption copy waits on the license?** `NORTH-STAR.md` decision 1 is open, and "Three routes, no lock-in" invites copying the license does not allow.
9. **Is "draft" the right public status for all ten contracts?** It is honest. Either promote under a stated bar, or say in About what draft means here.
10. **Should the site's design rules get a check?** They are written as MUSTs and enforced by review only. A small lint would make the borrowed format honest. This is new tooling, so it needs a yes.
11. **Does the accent keep two jobs?** It marks normative force and fills the subscribe button. If colour means "this is a MUST", the one marketing control arguably should not share it.
