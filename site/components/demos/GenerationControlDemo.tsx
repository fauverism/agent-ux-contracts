'use client';

import { GenerationControl } from '@patterns/generation-control/react/GenerationControl';

const VARIANTS = [
  'Thanks for flagging this — I’ve reviewed the usage report and summarized the three changes that matter for the renewal.',
  'Quick summary of the usage report: adoption is up 18%, two workspaces went dormant, and the renewal case rests on the API tier.',
  'Here’s the report in three bullets: growth is concentrated in the API tier; seat usage is flat; two dormant workspaces need a check-in before renewal.',
];

let call = 0;

export function GenerationControlDemo() {
  return (
    <div>
      <GenerationControl
        initialOutput={VARIANTS[0]}
        withRefine
        onGenerate={(refinement) =>
          new Promise((resolve) =>
            setTimeout(() => {
              call += 1;
              const base = VARIANTS[call % VARIANTS.length];
              resolve(refinement ? `${base} (Adjusted: ${refinement}.)` : base);
            }, 700),
          )
        }
      />
      <p className="demo-note">
        Regenerate, then walk back — earlier variants stay reachable instead of
        being silently destroyed. A refinement adjusts the instruction; it
        never replaces the original context.
      </p>
    </div>
  );
}
