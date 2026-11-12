# Source Attribution — React compliance

Traces `SourceAttribution.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`SourceAttribution.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `citation-clickable` | MUST | `CitationAnchor` renders a real `<a href>` — focusable, Tab-reachable, Enter-activatable. No hover-only affordance exists. | "citation-clickable: the anchor is a focusable link in the tab order, with no hover-only path", "citation-clickable: CitationAnchor renders an \<a\> element with an href", "citation-clickable: CitationAnchor link has descriptive aria-label" |
| `source-verifiable` | MUST | Anchors and list entries link directly to `source.url`. URL accessibility itself is the data producer's responsibility; the component never hides or rewrites the target. | "source-verifiable: anchors and list entries link straight to the source URL, unmasked", "source-verifiable: SourceList renders links with publisher and date metadata", "source-verifiable: SourceList renders accessible section heading", "source-verifiable: SourceList renders nothing when sources array is empty" (linking only — see Limits of the proof) |
| `citation-distinct` | MUST | Anchors render as superscript bracketed numbers (`<sup>[1]</sup>`) — a structural affordance, not color — with `aria-label="Source N: title"` carrying the accessible name. | "citation-distinct: the anchor is distinguishable without color and named for assistive technology", "citation-distinct: CitationAnchor renders bracketed index, not plain text" |
| `consolidated-numbering` | MUST | `SourceList` renders from `consolidateSources(sources)`, so the rendered order is the consolidated order and duplicate ids collapse to one entry; hosts derive anchor indices from the same `consolidateSources` output, making shared sources share an index by construction. | "consolidated-numbering: an anchor numbered from the consolidated list points at that position in the rendered list", "consolidated-numbering: with duplicates, list entries and positions follow the consolidated order" |
| `metadata-available` | SHOULD | `SourceList` renders title, publisher, and date on-page; users judge credibility without navigation. | "source-verifiable: SourceList renders links with publisher and date metadata" |
| `uncited-labeled` | SHOULD | `UncitedPassage` wraps ungrounded passages with `data-cited="false"` and a visible "Model reasoning — no source" label. Hosts must apply it to uncited content. | "UncitedPassage: renders children with the uncited label" |
| `no-citation-spam` | MUST NOT | `consolidateSources()` dedupes by id; anchors referencing the same id resolve to one list entry and one index. | "no-citation-spam: consolidateSources removes duplicates, preserving first-seen order", "no-citation-spam: SourceList deduplicates sources automatically" |

## Accessibility fields

- axe (WCAG A/AA tags; `color-contrast` excluded — jsdom has no layout engine) covers the implemented states: "axe: CitationAnchor has no WCAG A/AA violations", "axe: SourceList has no WCAG A/AA violations", and "axe: UncitedPassage and a full cited answer have no WCAG A/AA violations" (`uncited`, `cited`). `source-expanded` and `broken-link` are not implemented (see State coverage).

## Limits of the proof

- `source-verifiable`: tests prove every citation and list entry links to the literal `source.url`, unmasked. Whether that URL is publicly accessible and independently verifiable is the data producer's responsibility and cannot be tested in a component.
- `citation-clickable`: keyboard operation is by proxy — a native `<a href>` in the tab order, focusable, with no hover-only path.
- `citation-distinct`: "visually distinct" is proven structurally (superscript, bracketed number, no reliance on inline color). Rendered appearance depends on the host stylesheet.
- `url` is required by type only. A source with an empty or missing `url` renders a link that goes nowhere; neither implementation rejects it at runtime. Hosts that might hold linkless sources need their own guard.
- `consolidated-numbering`: `CitationAnchor` takes its `index` as a prop, and the kit exports no index helper, so numbering anchors from `consolidateSources()` is the host's job. The test proves that an anchor numbered that way resolves to the matching list entry; it cannot stop a host from passing an arbitrary index. (The vanilla kit derives the index itself.)

## Deviations and notes

- This is a kit (`CitationAnchor`, `SourceList`, `UncitedPassage`, `consolidateSources`) rather than one container component, because citations weave through host-rendered prose.
- `uncited-labeled` is satisfied only when hosts actually wrap ungrounded passages; the kit provides the affordance, not enforcement.

## State coverage

- `source-expanded` — not implemented: `SourceList` renders a flat,
  always-visible bibliography with no per-source disclosure to expand. Hosts
  that add a disclosure own this state.
- `broken-link` — intentionally unreachable in the reference: `url` is
  required, per the pattern's rule that you never cite what you can't link.
  Hosts that accept linkless sources must design this state themselves.
