import { SUBSCRIBE_ACTION } from '@/lib/site';

/*
 * One field, one button, no tricks. Plain form POST to Buttondown's embed
 * endpoint — works without JS, lands on their minimal confirmation page.
 * The filled button is the subscribe affordance (sanctioned accent use).
 */
export function SubscribeBlock({ id = 'subscribe' }: { id?: string }) {
  const inputId = `${id}-email`;
  return (
    <section id={id} className="subscribe" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className="subscribe-label">
        Subscribe
      </p>
      <form
        action={SUBSCRIBE_ACTION}
        method="post"
        acceptCharset="utf-8"
        className="subscribe-form"
      >
        <label htmlFor={inputId}>Email</label>
        <input
          id={inputId}
          type="email"
          name="email"
          required
          autoComplete="email"
          spellCheck={false}
          placeholder="you@work.dev"
        />
        <input type="hidden" name="embed" value="1" />
        <button type="submit">Get new patterns</button>
      </form>
      <p className="subscribe-micro">
        One email when a new pattern ships. No streak emojis.
      </p>
    </section>
  );
}
