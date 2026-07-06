# Source Attribution — Vanilla JS compliance

Traces `SourceAttribution.js` against `../pattern.contract.json`.

## Constraint → test mapping

Every MUST/MUST_NOT maps to at least one assertion in
`SourceAttribution.test.mjs`. Run with `npm test`.

| Constraint | Level | How satisfied | Test(s) |
| --- | --- | --- | --- |
| `citation-clickable` | MUST | `createAnchor()` builds a real `<a href>` — focusable, Tab-reachable, Enter-activatable by default. | "citation-clickable: createAnchor returns a sup containing an \<a\> with href", "citation-clickable: anchor has aria-label with index and title" |
| `source-verifiable` | MUST | Anchors and list entries link directly to `source.url`; the class never masks or rewrites targets. URL validity is the data producer's responsibility. | "source-verifiable: renderList includes publisher and date metadata", "…renders accessible section with heading", "…renders nothing for empty sources" |
| `citation-distinct` | MUST | Anchors are superscript bracketed numbers with `aria-label="Source N: title"` — structural and named, not color-dependent. | "citation-distinct: anchor text is bracketed index" |
| `metadata-available` | SHOULD | `renderList()` renders title, publisher, and date on-page in the bibliography section. | "source-verifiable: renderList includes publisher and date metadata" |
| `uncited-labeled` | SHOULD | `SourceAttribution.markUncited()` adds `data-cited="false"` plus a visible label to ungrounded passages. | "markUncited: marks element with class and data-cited=false" |
| `no-citation-spam` | MUST NOT | The constructor runs `consolidateSources()`; duplicate ids collapse to one entry, and `createAnchor()` resolves duplicates to the same index. | "no-citation-spam: consolidateSources removes duplicates preserving first-seen", "no-citation-spam: constructor deduplicates sources via consolidateSources" |

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
