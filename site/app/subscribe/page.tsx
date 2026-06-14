import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { Prose } from '@/components/Prose';
import { SubscribeBlock } from '@/components/SubscribeBlock';

export const metadata: Metadata = {
  title: 'Subscribe',
  description:
    'One email when a new pattern ships — contract, tests, implementations. Or take the RSS feed.',
};

export default function Subscribe() {
  return (
    <PageShell current="subscribe">
      <Prose>
        <h1>Subscribe</h1>
        <p>
          The catalog grows slowly on purpose. When a new pattern lands —
          contract, tests, reference implementations — you get one email
          saying what it is and why it exists. That&rsquo;s the whole deal:
          no digest, no roundup, nothing weekly.
        </p>
      </Prose>
      <SubscribeBlock id="subscribe-page" />
      <Prose>
        <p style={{ marginTop: '1.75rem' }}>
          Prefer a feed reader? There&rsquo;s <a href="/feed.xml">RSS</a> —
          same announcements, your software.
        </p>
      </Prose>
    </PageShell>
  );
}
