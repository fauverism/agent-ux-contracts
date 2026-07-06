import { CopyButton } from '@/components/CopyButton';
import { REPO } from '@/lib/site';
import type { Pattern } from '@/lib/patterns';

/**
 * The exit ramp: three ways to take a pattern home, none of which require
 * Claude Code. Before this section existed the page ended at the contract
 * JSON with no next step — the adoption gap the UX review flagged.
 */

const REACT_TEST_DEPS =
  'react react-dom @testing-library/react @testing-library/dom axe-core jsdom global-jsdom tsx typescript';
const VANILLA_TEST_DEPS = 'jsdom global-jsdom';

function Cmd({ text, label }: { text: string; label?: string }) {
  return (
    <div className="cmd-block mt-3">
      {label ? (
        <p className="mb-2 font-mono text-[11px] uppercase leading-4 tracking-wider text-ink-45">
          {label}
        </p>
      ) : null}
      <pre>
        <code>{text}</code>
      </pre>
      <CopyButton text={text} />
    </div>
  );
}

export function AdoptSection({ pattern }: { pattern: Pattern }) {
  const { contract, contractHash } = pattern;
  const id = contract.id;
  const hasReact = contract.implementations.includes('react');
  const fw = hasReact ? 'react' : contract.implementations[0];
  const otherFws = contract.implementations.filter((f) => f !== fw);

  const vendorCommands = [
    `git clone --depth 1 ${REPO} /tmp/agent-ux-contracts`,
    `cp -r /tmp/agent-ux-contracts/patterns/${id}/${fw} src/patterns/${id}`,
    `cp /tmp/agent-ux-contracts/scripts/setup-dom.mjs src/patterns/${id}/`,
  ].join('\n');

  const setupPath = `./src/patterns/${id}/setup-dom.mjs`;
  const testCommand = hasReact
    ? `npm i -D ${REACT_TEST_DEPS}\nnode --import tsx --import ${setupPath} --test src/patterns/${id}/*.test.tsx`
    : `npm i -D ${VANILLA_TEST_DEPS}\nnode --import ${setupPath} --test src/patterns/${id}/*.test.mjs`;

  const pinLine = `${id} ${contract.version} sha256:${contractHash}`;

  return (
    <div className="max-w-[68ch]">
      <p className="mt-3">
        Three routes, no lock-in — the implementation is three files with no
        dependencies beyond{' '}
        {hasReact ? <code>react</code> : <span>the platform</span>}, and its
        tests come along so you can verify the contract holds in <em>your</em>{' '}
        build, not take this page&rsquo;s word for it.
      </p>

      <p className="mb-1 mt-6 font-mono text-xs font-semibold uppercase tracking-wider">
        1 · Vendor the files (no tooling required)
      </p>
      <Cmd label={`copy the ${fw} implementation into your project`} text={vendorCommands} />
      <p className="mt-2 text-sm text-ink-70">
        You get the component, its test suite, and{' '}
        <a href={`${REPO}/blob/main/patterns/${id}/${fw}/COMPLIANCE.md`}>
          COMPLIANCE.md
        </a>{' '}
        mapping every MUST to the test that proves it
        {otherFws.length > 0 && (
          <>
            {' '}
            (swap <code>{fw}</code> for <code>{otherFws.join(' / ')}</code> for
            the other implementation{otherFws.length > 1 ? 's' : ''})
          </>
        )}
        . Then run the contract&rsquo;s own tests against your copy:
      </p>
      <Cmd label="verify your copy" text={testCommand} />
      <p className="mt-2 text-sm text-ink-70">
        {hasReact && (
          <>
            The runner picks up your project&rsquo;s <code>tsconfig.json</code>;
            it needs <code>&quot;jsx&quot;: &quot;react-jsx&quot;</code>, which
            any React project already sets.{' '}
          </>
        )}
        {contract.implementations.includes('vanilla') && (
          <>
            The vanilla files are ES modules: your <code>package.json</code>{' '}
            needs <code>&quot;type&quot;: &quot;module&quot;</code>, or rename{' '}
            <code>.js</code> to <code>.mjs</code> (the vanilla tests then need
            only <code>{VANILLA_TEST_DEPS.split(' ').join(' + ')}</code>, no
            TypeScript toolchain).
          </>
        )}
      </p>

      <p className="mb-1 mt-6 font-mono text-xs font-semibold uppercase tracking-wider">
        2 · Scaffold over MCP (any MCP client)
      </p>
      <p className="mt-2 text-sm text-ink-70">
        The server speaks standard MCP over stdio — Claude Code is one client,
        not a requirement. Point any MCP-capable agent at it (
        <a href="/getting-started/">setup</a>) and call:
      </p>
      <Cmd
        label="tool call"
        text={`scaffold_pattern({ pattern_id: "${id}", framework: "${fw}" })`}
      />
      <p className="mt-2 text-sm text-ink-70">
        The response carries the same three files plus <code>agent_notes</code>,
        a <code>verify</code> command, and <code>compliance_notes</code>{' '}
        anchoring every MUST to the code that satisfies it.
      </p>

      <p className="mb-1 mt-6 font-mono text-xs font-semibold uppercase tracking-wider">
        3 · Pin what you adopted
      </p>
      <p className="mt-2 text-sm text-ink-70">
        Record this line wherever your copy lives. If a later check shows a
        different hash, the contract changed and your copy needs re-verifying —
        drift fails loudly instead of accumulating.
      </p>
      <Cmd label="version + contract hash" text={pinLine} />

      <p className="mt-4 text-sm text-ink-70">
        Or just read the source:{' '}
        <a href={`${REPO}/tree/main/patterns/${id}`}>
          patterns/{id}/ on GitHub
        </a>
        .
      </p>
    </div>
  );
}
