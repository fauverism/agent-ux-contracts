# Source Attribution — React compliance

Traces `SourceAttribution.tsx` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`SourceAttribution.test.tsx`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `citation-clickable` | MUST | `CitationAnchor` renders a real `<a href>` — focusable, Tab-reachable, Enter-activatable. No hover-only affordance exists. | "citation-clickable: CitationAnchor renders an \<a\> element with an href", "citation-clickable: CitationAnchor link has descriptive aria-label" |
| `source-verifiable` | MUST | Anchors and list entries link directly to `source.url`. URL accessibility itself is the data producer's responsibility; the component never hides or rewrites the target. | "source-verifiable: SourceList renders links with publisher and date metadata", "…renders accessible section heading", "…renders nothing when sources array is empty" |
| `citation-distinct` | MUST | Anchors render as superscript bracketed numbers (`<sup>[1]</sup>`) — a structural affordance, not color — with `aria-label="Source N: title"` carrying the accessible name. | "citation-distinct: CitationAnchor renders bracketed index, not plain text" |
| `consolidated-numbering` | MUST | `SourceList` renders from `consolidateSources(sources)`, so the rendered order is the consolidated order and duplicate ids collapse to one entry; hosts derive anchor indices from the same `consolidateSources` output, making shared sources share an index by construction. | "consolidated-numbering: with duplicates, list entries and positions follow the consolidated order" |
| `metadata-available` | SHOULD | `SourceList` renders title, publisher, and date on-page; users judge credibility without navigation. | "source-verifiable: SourceList renders links with publisher and date metadata" |
| `uncited-labeled` | SHOULD | `UncitedPassage` wraps ungrounded passages with `data-cited="false"` and a visible "Model reasoning — no source" label. Hosts must apply it to uncited content. | "UncitedPassage: renders children with the uncited label" |
| `no-citation-spam` | MUST NOT | `consolidateSources()` dedupes by id; anchors referencing the same id resolve to one list entry and one index. | "no-citation-spam: consolidateSources removes duplicates, preserving first-seen order", "no-citation-spam: SourceList deduplicates sources automatically" |

## Accessibility fields

- axe: "axe: CitationAnchor has no WCAG A/AA violations" and "axe: SourceList has no WCAG A/AA violations" run axe-core (WCAG A/AA tags); `color-contrast` is excluded (no layout engine in jsdom).

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
