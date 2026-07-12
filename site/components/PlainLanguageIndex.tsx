import type { Pattern } from '@/lib/patterns';
import { getPlainLanguage } from '@/lib/plain-language';

/* The non-technical front door to the catalog: what each pattern does, in
   one sentence, no RFC-2119 or contract vocabulary. Sits above the
   technical index table for readers who just want to know what's here. */
export function PlainLanguageIndex({ patterns }: { patterns: Pattern[] }) {
  return (
    <dl className="plain-index">
      {patterns.map(({ contract }) => {
        const entry = getPlainLanguage(contract.id);
        if (!entry) return null;
        return (
          <div key={contract.id} className="plain-index-row">
            <dt>
              <a href={`/patterns/${contract.id}/`}>{contract.name}</a>
            </dt>
            <dd>{entry.oneLiner}</dd>
          </div>
        );
      })}
    </dl>
  );
}
