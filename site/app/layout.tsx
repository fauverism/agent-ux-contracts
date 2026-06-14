import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'agent-ux-contracts',
    template: '%s — agent-ux-contracts',
  },
  description:
    'A field manual of AI interface patterns, shipped as machine-readable contracts with reference implementations.',
  alternates: {
    types: { 'application/rss+xml': '/feed.xml' },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load text and mono faces from Google Fonts CDN */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Google+Sans+Code:ital,wght,MONO@0,300..800,1;1,300..800,1&display=swap" rel="stylesheet"
        />
      </head>
      
      <body>{children}</body>
    </html>
  );
}
