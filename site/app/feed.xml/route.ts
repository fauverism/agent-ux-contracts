import { execFileSync } from 'node:child_process';
import { getAllPatterns } from '@/lib/patterns';
import { SITE_URL } from '@/lib/site';

/*
 * RSS for the pattern index — manuals for terminals deserve a feed.
 * Generated at build time from the same contracts everything else reads.
 */
export const dynamic = 'force-static';

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Last commit date for a contract — honest publication data when the repo
    is present (it is, at build time); items go undated rather than fabricated
    if git can't answer. */
function gitDate(relPath: string): Date | undefined {
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    return iso ? new Date(iso) : undefined;
  } catch {
    return undefined;
  }
}

export function GET(): Response {
  const patterns = getAllPatterns().map((pattern) => ({
    pattern,
    date: gitDate(`../patterns/${pattern.contract.id}/pattern.contract.json`),
  }));

  // Newest first; undated items sink to the bottom in id order.
  patterns.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const items = patterns
    .map(({ pattern: { contract }, date }) => {
      const url = `${SITE_URL}/patterns/${contract.id}/`;
      const musts = contract.constraints.filter((c) => c.level.startsWith('MUST')).length;
      const description =
        `${contract.summary} ` +
        `(${contract.category}; ${contract.constraints.length} constraints, ${musts} MUST; ` +
        `v${contract.version}; React + vanilla.)`;
      return [
        '    <item>',
        `      <title>${xmlEscape(contract.name)} — ${xmlEscape(contract.id)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="false">${xmlEscape(`${contract.id}@${contract.version}`)}</guid>`,
        date ? `      <pubDate>${date.toUTCString()}</pubDate>` : undefined,
        `      <description>${xmlEscape(description)}</description>`,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>agent-ux-contracts — patterns</title>
    <link>${SITE_URL}/</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>One item when a new AI interface pattern ships: contract, tests, reference implementations. The guid carries id@version, so contract revisions show up too.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(feed, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
