/**
 * Test bootstrap for the site's node:test suite. Registers a jsdom global
 * environment and marks the process as a React act() environment.
 *
 * It also pins React onto globalThis. The site's app modules (page.tsx and the
 * components it imports) live under the root tsconfig, which Next pins to
 * `jsx: "preserve"`; tsx compiles those to the classic runtime
 * (`React.createElement`) with no per-file `import React`. Exposing React
 * globally lets those classic-compiled modules render under the test runner
 * without touching the app's tsconfig. The test files themselves compile via
 * __tests__/tsconfig.json (jsx: react-jsx) and don't depend on this.
 */
import 'global-jsdom/register';
import React from 'react';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.React = React;
