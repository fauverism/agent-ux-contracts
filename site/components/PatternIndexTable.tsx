import type { Pattern } from '@/lib/patterns';
import { RevStamp } from '@/components/RevStamp';

/* Category marks draw from the extended palette (tokens.css). */
const CATEGORY_COLOR: Record<string, string> = {
  input: 'var(--c-blue)',
  output: 'var(--c-green)',
  control: 'var(--c-orange)',
  transparency: 'var(--c-purple)',
  feedback: 'var(--c-fuschia)',
};

/* The typographic index: mono ID links, ruled rows. Used as the homepage's
   main content and as the 404's recovery path. */
export function PatternIndexTable({ patterns }: { patterns: Pattern[] }) {
  return (
    <table className="index-table">
      <thead>
        <tr>
          <th scope="col">ID</th>
          <th scope="col" className="max-sm:hidden">
            Name
          </th>
          <th scope="col">Category</th>
          <th scope="col">Constraints</th>
          <th scope="col" className="max-sm:hidden">
            Impl.
          </th>
        </tr>
      </thead>
      <tbody>
        {patterns.map(({ contract }) => {
          const musts = contract.constraints.filter((c) =>
            c.level.startsWith('MUST'),
          ).length;
          return (
            <tr key={contract.id}>
              <td className="col-id">
                <a href={`/patterns/${contract.id}/`}>{contract.id}</a>{' '}
                <RevStamp id={contract.id} version={contract.version} />
              </td>
              <td className="col-name max-sm:hidden">{contract.name}</td>
              <td className="col-cat">
                <span
                  className="cat-mark"
                  style={{ ['--cat-color' as string]: CATEGORY_COLOR[contract.category] }}
                  aria-hidden="true"
                />
                {contract.category}
              </td>
              <td className="col-count">
                {contract.constraints.length} · {musts} MUST
              </td>
              <td className="col-fw max-sm:hidden">
                {contract.implementations.join(' / ')}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
