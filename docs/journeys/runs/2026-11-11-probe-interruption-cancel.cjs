// Black-box probe, written by hand during the 2026-11-11 baseline run of the
// probe-a-running-ui journey. It drives a running page in a real browser and
// judges it against interruption-cancel's MUST-level rules using only what a
// user or assistive technology can observe: no component source, no test
// hooks, no framework knowledge. The only page-specific line is the button
// that starts the demo task.
//
//   node probe.cjs <url> [--seed-defects]
//
// --seed-defects is the negative control: it strips the work label from the
// cancel control's accessible name and removes the polite live region before
// probing, so a probe that still reports "pass" for those rules is broken.
//
// Evidence, not maintained code. Playwright is not a dependency of this repo.
const { chromium } = require('playwright');

const url = process.argv[2];
const seedDefects = process.argv.includes('--seed-defects');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const dialogs = [];
  page.on('dialog', async (d) => { dialogs.push(d.type()); await d.dismiss(); });
  await page.goto(url, { waitUntil: 'networkidle' });

  const results = [];
  const record = (id, result, evidence) => results.push({ id, result, evidence });
  const liveText = () =>
    page.evaluate(() => document.querySelector('[aria-live="polite"]')?.textContent.trim() ?? null);

  await page.getByRole('button', { name: /Run a 3-step agent task/ }).click();
  const cancel = page.getByRole('button', { name: /cancel/i });
  await cancel.waitFor({ timeout: 3000 });

  if (seedDefects) {
    await page.evaluate(() => {
      document.querySelector('button[aria-label^="Cancel"]').setAttribute('aria-label', 'Cancel');
      const live = document.querySelector('[aria-live="polite"]');
      live.removeAttribute('aria-live');
      live.removeAttribute('role');
    });
  }

  // cancel-control-accessible: the accessible name names the work.
  const name = (await cancel.getAttribute('aria-label')) ?? (await cancel.innerText());
  record('cancel-control-accessible', /task|work|draft|email/i.test(name.replace(/^cancel:?/i, '')) ? 'pass' : 'fail',
    `accessible name: "${name}"`);

  const liveBefore = await liveText();
  await page.waitForTimeout(1600); // let one step finish so there is partial work to report

  // Keyboard activation, not a pointer click.
  await cancel.focus();
  const pressedAt = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);

  // immediate-acknowledgment: the UI acknowledges before the host settles (~700ms in this demo).
  const acknowledged = /cancelling/i.test(await page.locator('main').innerText());
  record('immediate-acknowledgment', acknowledged ? 'pass' : 'fail',
    `acknowledgment visible ${Date.now() - pressedAt}ms after the keypress: ${acknowledged}`);

  // cancel-not-gated: no confirmation step.
  record('cancel-not-gated', dialogs.length === 0 ? 'pass' : 'fail', `native dialogs opened: ${dialogs.length}`);
  const liveAck = await liveText();

  // no-silent-continuation: the running state never comes back after the request.
  let reentered = false;
  for (let i = 0; i < 16; i += 1) {
    await page.waitForTimeout(70);
    if (await cancel.isVisible().catch(() => false)) reentered = true;
  }
  record('no-silent-continuation', reentered ? 'fail' : 'pass',
    `running-state control seen again after the request: ${reentered}`);

  // cancellation-announced: a polite live region carries the acknowledgment, then the outcome.
  const liveSettled = await liveText();
  const announced = Boolean(liveAck) && Boolean(liveSettled) && liveAck !== liveBefore && liveSettled !== liveAck;
  record('cancellation-announced', announced ? 'pass' : 'fail',
    liveSettled === null ? 'no polite live region on the page'
      : `polite live region: before="${liveBefore}" ack="${liveAck}" settled="${liveSettled}"`);

  // focus-not-lost: focus is somewhere meaningful once the control is gone.
  const active = await page.evaluate(() =>
    document.activeElement === document.body ? 'body' : document.activeElement.className || document.activeElement.tagName);
  record('focus-not-lost', active !== 'body' ? 'pass' : 'fail', `document.activeElement after the control was removed: ${active}`);

  // partial-work-honesty: the outcome lists what finished and what was stopped.
  const settled = await page.locator('main').innerText();
  const done = /already done/i.test(settled);
  const stopped = /stopped before/i.test(settled);
  record('partial-work-honesty', done && stopped ? 'pass' : 'fail', `"Already done" list: ${done}; "Stopped before" list: ${stopped}`);

  // completion-race-honest: not reachable from outside.
  record('completion-race-honest', 'not-evaluated',
    'needs the host to report completion while a cancel is pending; a black-box probe cannot force that race');

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((error) => {
  console.error('PROBE ERROR', error.message);
  process.exit(1);
});
