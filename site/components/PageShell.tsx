import type { ReactNode } from 'react';
import { CONTACT_CHANNELS, REPO } from '@/lib/site';

export type NavPage = 'patterns' | 'getting-started' | 'about' | 'subscribe';

interface PageShellProps {
  children: ReactNode;
  /** Which nav item is the current page; omit for routes outside the nav. */
  current?: NavPage;
  /** Replace the default site nav entirely (styleguide uses this). */
  nav?: ReactNode;
}

const NAV: { page: NavPage; href: string; label: string }[] = [
  { page: 'patterns', href: '/', label: 'Patterns' },
  { page: 'getting-started', href: '/getting-started/', label: 'Getting started' },
  { page: 'about', href: '/about/', label: 'About' },
  { page: 'subscribe', href: '/subscribe/', label: 'Subscribe' },
];

export function PageShell({ children, current, nav }: PageShellProps) {
  return (
    <div className="shell">
      <header className="shell-header">
        <a href="/" className="shell-mark">
          agent-ux-contracts
        </a>
        <nav className="shell-nav" aria-label="Site">
          {nav ??
            NAV.map(({ page, href, label }) => (
              <a
                key={page}
                href={href}
                aria-current={current === page ? 'page' : undefined}
              >
                {label}
              </a>
            ))}
        </nav>
      </header>
      <main className="shell-main">{children}</main>
      <footer className="shell-footer">
        <div className="footer-grid">
          <div>
            <p className="footer-head">Catalog</p>
            <p>
              <a href="/">Pattern index</a>
            </p>
            <p>
              <a href="/getting-started/">Getting started</a>
            </p>
            <p>
              <a href="/about/">About</a>
            </p>
            <p>
              <a href="/feed.xml">RSS</a>
            </p>
          </div>
          <div>
            <p className="footer-head">Source</p>
            <p>
              <a href={REPO}>GitHub</a>
            </p>
            <p>
              <a href={`${REPO}/blob/main/patterns/TEMPLATE.md`}>Authoring template</a>
            </p>
            <p>
              <a href={`${REPO}/tree/main/mcp-server`}>MCP server</a>
            </p>
          </div>
          <div>
            <p className="footer-head">Contact</p>
            {CONTACT_CHANNELS.map((channel) => (
              <p key={channel.href}>
                <a href={channel.href}>{channel.question}</a>
              </p>
            ))}
          </div>
        </div>
        <p className="footer-colophon">
          A field manual of AI interface patterns, shipped as machine-readable
          contracts. Set in Stack Sans Notch and Google Sans Code.
        </p>
      </footer>
    </div>
  );
}
