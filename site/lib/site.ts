/* One place for the site's outward-facing facts. */

export const SITE_URL = 'https://agent-ux-contracts.vercel.app';
export const REPO = 'https://github.com/fauverism/agent-ux-contracts';
export const EMAIL = 'robertfauver@gmail.com';

/* Buttondown embed endpoint — a plain form POST, no JS. The username must
   exist at buttondown.com before launch; swap here if it's claimed under
   a different name. */
export const BUTTONDOWN_USERNAME = 'agent-ux-contracts';
export const SUBSCRIBE_ACTION = `https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`;

/* "Found a problem?" — lands on a pre-filled issue so reports arrive with
   the parts that make them actionable. */
export const ISSUE_URL =
  `${REPO}/issues/new?` +
  new URLSearchParams({
    title: 'Problem: ',
    body: [
      '**Where:** (pattern id, page URL, or file)',
      '',
      '**What happened:**',
      '',
      '**What you expected:**',
      '',
      '_If it concerns a contract, the version and hash are in the rail on the pattern page._',
    ].join('\n'),
  }).toString();

/* The consulting door, kept understated. */
export const CONSULTING_MAILTO =
  `mailto:${EMAIL}?` +
  new URLSearchParams({
    subject: 'Implementing agent-ux-contracts at [your org]',
  })
    .toString()
    .replace(/\+/g, '%20');

export const HELLO_MAILTO = `mailto:${EMAIL}`;

export interface ContactChannel {
  question: string;
  label: string;
  href: string;
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    question: 'Found a problem?',
    label: 'Open an issue — template included',
    href: ISSUE_URL,
  },
  {
    question: 'Want help implementing this at your org?',
    label: 'Email me; the subject line is already filled in',
    href: CONSULTING_MAILTO,
  },
  {
    question: 'Just want to say something?',
    label: EMAIL,
    href: HELLO_MAILTO,
  },
];
