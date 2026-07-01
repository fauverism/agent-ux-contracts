import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { Prose } from '@/components/Prose';
import { RuleDivider } from '@/components/RuleDivider';
import { CopyButton } from '@/components/CopyButton';
import { highlightJson } from '@/lib/highlight';
import { ISSUE_URL, REPO, HELLO_MAILTO } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Getting started',
  description:
    'A step-by-step walkthrough: build the agent-ux-contracts MCP server, connect it to Claude Code, and watch it return a known-compliant pattern for a real product query.',
};

const BUILD_COMMANDS = `git clone https://github.com/fauverism/agent-ux-contracts
cd agent-ux-contracts/mcp-server
npm install
npm run build`;

const ADD_COMMAND =
  'claude mcp add agent-ux-contracts -- node /absolute/path/to/agent-ux-contracts/mcp-server/dist/index.js';

const MCP_JSON = `{
  "mcpServers": {
    "agent-ux-contracts": {
      "command": "node",
      "args": ["/absolute/path/to/agent-ux-contracts/mcp-server/dist/index.js"]
    }
  }
}`;

const LIST_COMMAND = 'claude mcp list';

/* Success signal #1 — the connection is live. This is the real shape of
   `claude mcp list` output once the server is registered. */
const LIST_OUTPUT =
  'agent-ux-contracts: node /absolute/path/to/.../dist/index.js - ✓ Connected';

/* The product-language query a developer actually types. */
const SEARCH_PROMPT = 'I need a loading state for my AI chat. Find the right pattern.';

/* Success signal #2 — the tool's own answer. Trimmed from a real
   search_patterns response (verified against the live server: streaming-response
   ranks #1, score 0.756, alias-matched). */
const SEARCH_RESULT = `{
  "results": [
    {
      "id": "streaming-response",
      "name": "Streaming Response",
      "intent": "Render model output progressively as tokens arrive, keeping the page readable, interruptible, and accessible while content is in flight.",
      "version": "0.2.1",
      "score": 0.756,
      "rationale": "Alias match: \\"AI loading state\\".",
      "constraints": {
        "counts": { "must": 4, "must_not": 1, "should": 1, "may": 1 },
        "musts": [
          { "id": "no-focus-steal", "statement": "The component MUST NOT move keyboard focus while focus is outside the component." },
          { "id": "focus-not-lost", "statement": "If the stop control holds focus when the stream settles, focus MUST move to the output region." },
          { "id": "completion-announced", "statement": "Stream completion MUST be announced through a polite live region." },
          { "id": "interruptible", "statement": "A visible control MUST allow the user to stop generation at any point." },
          { "id": "partial-preserved", "statement": "Partial output MUST remain rendered after the stream is interrupted or fails." }
        ]
      }
    }
  ]
}`;

const SCAFFOLD_PROMPT = 'Scaffold streaming-response in React.';

const TEST_COMMAND =
  'node --import tsx --import ./setup-dom.mjs --test StreamingResponse.test.tsx';

const TEST_OUTPUT = '# pass 12\n# fail 0';

/* Extra prompts worth trying once the basics work — each exercises a
   different part of the contract surface (caution path, provenance, the
   second tool). */
const MORE_PROMPTS: { prompt: string; does: string }[] = [
  {
    prompt:
      'Will streaming-response work if I have to moderate the whole response before showing any of it?',
    does: 'Triggers the caution field — the contract names this as a don’t-use-when, so the tool warns you off instead of scaffolding the wrong thing.',
  },
  {
    prompt: 'The user wants to stop generation midway. Which pattern handles that?',
    does: 'A different product phrasing that should surface interruption-cancel / generation-control — proof the search reads intent, not keywords.',
  },
  {
    prompt: 'What version and contract hash did that result come from?',
    does: 'Every response carries version + contract_hash. Pin them in your repo and a contract change fails your build instead of drifting silently.',
  },
];

function CommandBlock({
  text,
  label,
  copyable = true,
}: {
  text: string;
  label?: string;
  copyable?: boolean;
}) {
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
      {copyable ? <CopyButton text={text} /> : null}
    </div>
  );
}

/** Read-only output the user should expect to see — no copy affordance,
 *  because you don't paste output anywhere. */
function ResultBlock({ json, label }: { json: string; label: string }) {
  return (
    <div className="mt-4">
      <p className="mb-2 font-mono text-[11px] uppercase leading-4 tracking-wider text-ink-45">
        {label}
      </p>
      <pre className="agent-json">
        <code>{highlightJson(json)}</code>
      </pre>
    </div>
  );
}

export default function GettingStarted() {
  return (
    <PageShell current="getting-started">
      {/* ---- Intro --------------------------------------------------------- */}
      <Prose>
        <h1>Getting started</h1>
        <p>
          This is a hands-on walkthrough. In about ten minutes you’ll build the
          catalog’s MCP server, connect it to Claude Code, and ask it — in plain
          product language — for the right pattern to solve a real problem. By
          the end you’ll have seen two success signals with your own eyes: the
          server reporting <code>✓ Connected</code>, and the{' '}
          <code>search_patterns</code> tool returning a ranked, machine-readable
          answer with the rules its implementation must satisfy.
        </p>
        <p>
          You don’t need to know how the server works internally. If you can run
          a few terminal commands and type a sentence into Claude Code, you can
          finish this.
        </p>
      </Prose>

      {/* ---- Workflow of the lesson --------------------------------------- */}
      <Prose>
        <h2>What you’ll do</h2>
        <p>Five steps, each with a visible result before you move on:</p>
        <ol>
          <li>
            <strong>Build</strong> the server from the repo.
          </li>
          <li>
            <strong>Connect</strong> it to Claude Code.
          </li>
          <li>
            <strong>Confirm</strong> the connection — first success message.
          </li>
          <li>
            <strong>Search</strong> in product language — the tool’s success
            message.
          </li>
          <li>
            <strong>Scaffold &amp; verify</strong> — generate the reference
            implementation and watch its tests pass.
          </li>
        </ol>
        <p>
          <strong>Before you start, you’ll need:</strong> Node.js 20 or newer,{' '}
          <code>git</code>, and Claude Code already installed and signed in.
        </p>
      </Prose>

      {/* ---- Benefits ------------------------------------------------------ */}
      <Prose>
        <h2>Why it’s worth it</h2>
        <ul>
          <li>
            <strong>Stop re-deriving the same UI.</strong> Loading, streaming,
            cancellation, refusal — every AI feature reinvents these, usually
            with the accessibility bugs left in. The catalog hands you a vetted
            answer.
          </li>
          <li>
            <strong>The agent gets rules, not vibes.</strong> Results include
            RFC-2119 <code>MUST</code> constraints, so generated code has a
            spec to satisfy instead of a screenshot to imitate.
          </li>
          <li>
            <strong>You can verify, not just trust.</strong> Scaffolds ship with
            tests and a note mapping every rule to the line that satisfies it.
          </li>
          <li>
            <strong>Drift fails loudly.</strong> Each response carries a version
            and a content hash you can pin.
          </li>
        </ul>
      </Prose>

      <RuleDivider label="the walkthrough" />

      {/* ---- Step 1 -------------------------------------------------------- */}
      <Prose>
        <h2>Step 1 · Build the server</h2>
        <p>
          Clone the repo and build the server. It reads every contract at
          startup and refuses to serve any that fail schema validation, so a
          clean build means the catalog is intact.
        </p>
      </Prose>
      <CommandBlock text={BUILD_COMMANDS} label="run in your terminal" />
      <Prose>
        <p>
          When it finishes, <code>mcp-server/dist/index.js</code> exists. That’s
          the file Claude Code will run.
        </p>
      </Prose>

      {/* ---- Step 2 -------------------------------------------------------- */}
      <Prose>
        <h2>Step 2 · Connect Claude Code</h2>
        <p>
          Register the server with one command — use the{' '}
          <strong>absolute path</strong> to the <code>dist/index.js</code> you
          just built:
        </p>
      </Prose>
      <CommandBlock text={ADD_COMMAND} label="register the server" />
      <Prose>
        <p style={{ marginTop: '1.75rem' }}>
          Prefer a config file? Declare it in <code>.mcp.json</code> (project
          scope) or <code>~/.claude.json</code> (user scope) instead:
        </p>
      </Prose>
      <CommandBlock text={MCP_JSON} label=".mcp.json" />

      {/* ---- Step 3 -------------------------------------------------------- */}
      <Prose>
        <h2>Step 3 · Confirm the connection</h2>
        <p>
          Ask Claude Code to list its MCP servers. This is your first success
          message — the server is registered and responding:
        </p>
      </Prose>
      <CommandBlock text={LIST_COMMAND} label="check it's live" />
      <CommandBlock text={LIST_OUTPUT} label="expected output" copyable={false} />
      <Prose>
        <p>
          See <code>✓ Connected</code>? You’re wired up. If you see{' '}
          <code>✗ Failed to connect</code> instead, the path is almost always
          the culprit — re-run Step 2 with the absolute path to{' '}
          <code>dist/index.js</code>, not a relative one.
        </p>
      </Prose>

      {/* ---- Step 4 -------------------------------------------------------- */}
      <Prose>
        <h2>Step 4 · Search in product language</h2>
        <p>
          Now use it. Open Claude Code in any project and ask the way you’d
          describe the problem to a teammate — no pattern names required:
        </p>
      </Prose>
      <CommandBlock text={SEARCH_PROMPT} label="paste this into Claude Code" />
      <Prose>
        <p>
          Claude calls <code>search_patterns</code> and gets back a ranked
          answer. This is the success message the tutorial is built around —
          the tool not only picks <code>streaming-response</code>, it tells you{' '}
          <em>why</em> it matched and the rules any implementation must obey:
        </p>
      </Prose>
      <ResultBlock json={SEARCH_RESULT} label="search_patterns result" />
      <Prose>
        <p>
          The <code>rationale</code> is the receipt: your phrase “AI loading
          state” is a registered alias of this pattern, so the match is
          explainable, not a guess. If your case were one the pattern{' '}
          <em>excludes</em>, the result would carry a <code>caution</code> field
          instead — try the first prompt under “More prompts” below to see that
          path.
        </p>
      </Prose>

      {/* ---- Step 5 -------------------------------------------------------- */}
      <Prose>
        <h2>Step 5 · Scaffold &amp; verify</h2>
        <p>Ask for the implementation:</p>
      </Prose>
      <CommandBlock text={SCAFFOLD_PROMPT} label="paste this into Claude Code" />
      <Prose>
        <p>
          Claude calls <code>scaffold_pattern</code> and writes the reference
          component, its tests, and a <code>COMPLIANCE.md</code> mapping each{' '}
          <code>MUST</code> rule to the code that satisfies it. This isn’t
          free-hand generation — it’s the vetted reference, stamped out. The
          tests pass on arrival:
        </p>
      </Prose>
      <CommandBlock text={TEST_COMMAND} label="run the generated tests" />
      <CommandBlock text={TEST_OUTPUT} label="expected output" copyable={false} />
      <Prose>
        <p>
          Green tests mean the code you just received already satisfies its own
          contract. You verified it — you didn’t take anyone’s word for it.
        </p>
      </Prose>

      {/* ---- More prompts -------------------------------------------------- */}
      <Prose>
        <h2>More prompts to try</h2>
        <p>
          The search reads intent, so it’s worth poking at. Each of these
          exercises a different corner of the catalog:
        </p>
      </Prose>
      {MORE_PROMPTS.map(({ prompt, does }) => (
        <div key={prompt} className="mt-5">
          <CommandBlock text={prompt} />
          <Prose>
            <p className="mt-2" style={{ maxWidth: '60ch' }}>
              {does}
            </p>
          </Prose>
        </div>
      ))}

      {/* ---- Summary ------------------------------------------------------- */}
      <RuleDivider label="recap" />
      <Prose>
        <h2>What you’ve got now</h2>
        <p>You started with an empty project. You now have:</p>
        <ul>
          <li>
            The MCP server <strong>built and connected</strong> to Claude Code
            (<code>✓ Connected</code>).
          </li>
          <li>
            A working way to <strong>ask for patterns in plain language</strong>{' '}
            and get back ranked, explained, rule-bearing answers.
          </li>
          <li>
            A <strong>scaffolded, test-passing</strong> implementation you
            verified rather than trusted.
          </li>
        </ul>
        <p>
          From here, browse the full{' '}
          <a href="/">pattern index</a> to see what else the catalog covers, or
          read any pattern’s contract to understand the rules behind it.
        </p>
      </Prose>

      {/* ---- Help ---------------------------------------------------------- */}
      <Prose>
        <h2>If you get stuck</h2>
        <ul>
          <li>
            <strong>Something’s broken or unclear?</strong>{' '}
            <a href={ISSUE_URL}>Open an issue</a> — the template is pre-filled
            with the fields that make a report actionable.
          </li>
          <li>
            <strong>Want to read the source?</strong> The server, its design
            notes, and the demo script live in the{' '}
            <a href={`${REPO}/tree/main/mcp-server`}>mcp-server directory</a>.
          </li>
          <li>
            <strong>Anything else?</strong>{' '}
            <a href={HELLO_MAILTO}>Email me</a>.
          </li>
        </ul>
      </Prose>
    </PageShell>
  );
}
