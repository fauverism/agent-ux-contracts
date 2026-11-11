# Source Attribution — Vanilla JS compliance

Traces `SourceAttribution.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`SourceAttribution.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `citation-clickable` | MUST | `createAnchor()` builds a real `<a href>` — focusable, Tab-reachable, Enter-activatable by default. | "citation-clickable: the anchor is a focusable link in the tab order, with no hover-only path", "citation-clickable: createAnchor returns a sup containing an \<a\> with href", "citation-clickable: anchor has aria-label with index and title" |
| `source-verifiable` | MUST | Anchors and list entries link directly to `source.url`; the class never masks or rewrites targets. URL validity is the data producer's responsibility. | "source-verifiable: anchors and list entries link straight to the source URL, unmasked", "source-verifiable: renderList includes publisher and date metadata", "source-verifiable: renderList renders accessible section with heading", "source-verifiable: renderList renders nothing for empty sources" (linking only — see Limits of the proof) |
| `citation-distinct` | MUST | Anchors are superscript bracketed numbers with `aria-label="Source N: title"` — structural and named, not color-dependent. | "citation-distinct: the anchor is distinguishable without color and named for assistive technology", "citation-distinct: anchor text is bracketed index" |
| `consolidated-numbering` | MUST | The constructor consolidates once; `createAnchor` derives every index via `indexOf` on that consolidated list, so repeat citations of one source share one index and `renderList` shows one entry per id — the numbering cannot diverge from the list. | "consolidated-numbering: each anchor index is the 1-based position of its source in the rendered list", "consolidated-numbering: duplicate citations share one index and one list entry" |
| `metadata-available` | SHOULD | `renderList()` renders title, publisher, and date on-page in the bibliography section. | "source-verifiable: renderList includes publisher and date metadata" |
| `uncited-labeled` | SHOULD | `SourceAttribution.markUncited()` adds `data-cited="false"` plus a visible label to ungrounded passages. | "markUncited: marks element with class and data-cited=false" |
| `no-citation-spam` | MUST NOT | The constructor runs `consolidateSources()`; duplicate ids collapse to one entry, and `createAnchor()` resolves duplicates to the same index. | "no-citation-spam: consolidateSources removes duplicates preserving first-seen", "no-citation-spam: constructor deduplicates sources via consolidateSources" |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) covers the implemented states: "axe: anchors, the source list, and an uncited passage have no WCAG A/AA violations" (`uncited`, `cited`). `source-expanded` and `broken-link` are not implemented (see State coverage).

## Limits of the proof

- `source-verifiable`: tests prove every citation and list entry links to the literal `source.url`, unmasked. Whether that URL is publicly accessible and independently verifiable is the data producer's responsibility and cannot be tested in a component.
- `citation-clickable`: keyboard operation is by proxy — a native `<a href>` in the tab order, focusable, with no hover-only path.
- `citation-distinct`: "visually distinct" is proven structurally (superscript, bracketed number, no reliance on inline color). Rendered appearance depends on the host stylesheet.
- `url` is required by type only. A source with an empty or missing `url` renders a link that goes nowhere; neither implementation rejects it at runtime. Hosts that might hold linkless sources need their own guard.

## Deviations and notes

- All DOM built via `createElement`/`textContent` — no `innerHTML` — so source titles and notes cannot inject markup.
- `createAnchor()` throws on unknown source ids rather than rendering a dead marker; fail loud beats fail wrong — asserted by "createAnchor: throws for unknown sourceId".
- Index stability across dedup is asserted by "indexOf: returns 1-based position of source in consolidated list".

## State coverage

- `source-expanded` — not implemented: `SourceList` renders a flat,
  always-visible bibliography with no per-source disclosure to expand. Hosts
  that add a disclosure own this state.
- `broken-link` — intentionally unreachable in the reference: `url` is
  required, per the pattern's rule that you never cite what you can't link.
  Hosts that accept linkless sources must design this state themselves.
