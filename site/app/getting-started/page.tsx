import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { Prose } from '@/components/Prose';
import { RuleDivider } from '@/components/RuleDivider';
import { CopyButton } from '@/components/CopyButton';

export const metadata: Metadata = {
  title: 'Getting started',
  description:
    'Connect the agent-ux-contracts MCP server to Claude Code and scaffold known-compliant AI interface patterns.',
};

const ADD_COMMAND =
  'claude mcp add agent-ux-contracts -- node /absolute/path/to/agent-ux-contracts/mcp-server/dist/index.js';

const BUILD_COMMANDS = `git clone https://github.com/fauverism/agent-ux-contracts
cd agent-ux-contracts/mcp-server
npm install
npm run build`;

const MCP_JSON = `{
  "mcpServers": {
    "agent-ux-contracts": {
      "command": "node",
      "args": ["/absolute/path/to/agent-ux-contracts/mcp-server/dist/index.js"]
    }
  }
}`;

function CommandBlock({ text, label }: { text: string; label?: string }) {
  return (
    <div className="cmd-block mt-4">
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

/* The 90-second demo, set as a ruled timeline (the recording script from
   mcp-server/DEMO.md — same beats, manual form). */
const DEMO_STEPS: { time: string; title: string; body: string }[] = [
  {
    time: '0:00–0:12',
    title: 'Install',
    body: 'One command registers the server; claude mcp list shows agent-ux-contracts connected.',
  },
  {
    time: '0:12–0:35',
    title: 'Search',
    body: '“I need a loading state for my AI chat” → streaming-response ranked first, with a rationale (“Alias match: AI loading state”) and the five MUST rules, machine-readable.',
  },
  {
    time: '0:35–1:00',
    title: 'Scaffold',
    body: '“Scaffold it in React” → the reference implementation is stamped out deterministically: component, tests, COMPLIANCE.md. The tests pass on arrival.',
  },
  {
    time: '1:00–1:22',
    title: 'Verify',
    body: 'Every MUST rule in compliance_notes maps to a code anchor. Search the file for reclaimFocusFromStop and land on the function that satisfies focus-not-lost. The receiving agent can check, not just trust.',
  },
  {
    time: '1:22–1:30',
    title: 'Pin',
    body: 'Every response carries version + contract_hash. Pin them, and contract drift fails your build.',
  },
];

export default function GettingStarted() {
  return (
    <PageShell current="getting-started">
      <Prose>
        <h1>Getting started</h1>
        <p>
          The catalog ships as an MCP server with two tools:{' '}
          <code>search_patterns</code> finds the right pattern for a
          product-language query and explains why it matched;{' '}
          <code>scaffold_pattern</code> returns a known-compliant
          implementation — component, tests, and a note mapping every MUST
          rule to the code that satisfies it.
        </p>

        <h2>1 · Build the server</h2>
        <p>
          The server reads the contracts from the repo at startup and refuses
          to serve any that fail schema validation.
        </p>
      </Prose>
      <CommandBlock text={BUILD_COMMANDS} />

      <Prose>
        <h2>2 · Connect Claude Code</h2>
        <p>Register the server (use the absolute path to your checkout):</p>
      </Prose>
      <CommandBlock text={ADD_COMMAND} />
      <Prose>
        <p style={{ marginTop: '1.75rem' }}>
          Or declare it in <code>.mcp.json</code> (project scope) /{' '}
          <code>~/.claude.json</code> (user scope):
        </p>
      </Prose>
      <CommandBlock text={MCP_JSON} />

      <Prose>
        <h2>3 · Use it</h2>
        <p>
          Ask in product language — “I need a loading state for my AI chat”,
          “the user wants to stop generation”, “the agent is about to delete
          records”. The search is evaluated against 19 realistic agent
          queries on every build; misses are treated as contract bugs, not
          tuning opportunities.
        </p>
      </Prose>

      <RuleDivider label="the 90-second demo" />

      <div>
        {DEMO_STEPS.map((step) => (
          <div key={step.time} className="demo-step">
            <span className="demo-step-time">{step.time}</span>
            <div>
              <p className="m-0 font-mono text-xs font-semibold uppercase tracking-wider">
                {step.title}
              </p>
              <p className="m-0 mt-1 max-w-[60ch] text-ink-70">{step.body}</p>
            </div>
          </div>
        ))}
        <p className="mt-4 max-w-[68ch] font-mono text-xs leading-5 text-ink-45">
          Recording in production — the script above is the cut. Until it
          lands, the full walkthrough lives in{' '}
          <a
            className="underline hover:text-accent"
            href="https://github.com/fauverism/agent-ux-contracts/blob/main/mcp-server/DEMO.md"
          >
            mcp-server/DEMO.md
          </a>
          .
        </p>
      </div>
    </PageShell>
  );
}
