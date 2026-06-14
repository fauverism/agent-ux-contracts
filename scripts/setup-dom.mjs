/**
 * Shared test bootstrap: registers a jsdom global environment and marks the
 * process as a React `act()` environment. Loaded via `--import` ahead of the
 * node:test runner (see the `test` script in package.json).
 */
import 'global-jsdom/register';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
