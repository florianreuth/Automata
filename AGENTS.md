# AGENTS.md

Guidelines for coding agents (and humans) working on Automata. Features and commands are described in the
[README](README.md).

## Stack

- Astro (static site) with Svelte 5 islands and strict TypeScript.
- The user interface is German; code, identifiers, comments and docs are English. Error messages that reach the user
  are German, also when they come from `src/lib/`.
- `npm test` runs the unit tests in `src/lib/` with `node --test`, `npm run build` type-checks with `astro check`. Both
  must pass before a change is done.
- Code that needs the DOM (`src/lib/ui/`, parts of `src/lib/io/`) or Svelte runes (`*.svelte.ts`) cannot run under
  `node --test`; keep it thin and put the logic it uses into plain, tested functions.

## Rules

### 1. Document only what needs explaining

- Names and types carry the meaning. No JSDoc that restates the signature (`@param fa the automaton`).
- Exported APIs get a one-line `/** … */` when the signature does not tell the whole story: side effects, thrown errors,
  units, `null` cases, ε handling, coordinate spaces. Use `@param`/`@throws` only for exactly that information.
- Inline `//` comments explain *why* (workarounds, heuristics, ordering constraints), never *what*.
- Trivial functions, getters and private helpers with a clear name stay undocumented.
- Explanations of a change belong in the commit message, not in the code. Update the README when features change.

### 2. Modern standards, frameworks first

- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`, snippets, `onclick=`). No `export let`, stores, `$:` or
  `on:` directives.
- Current TypeScript/ES features: `#private` fields, `readonly`, `const`, `??`/`?.`, `Map`/`Set`, discriminated unions.
  No `any`; narrow `unknown` instead. No enums or parameter properties (Node type stripping cannot run them).
- Prefer platform APIs and existing dependencies over hand-rolled code. For a solved, non-trivial problem, propose a
  well-maintained library instead of reimplementing it; ask before adding a dependency.
- Imports inside `src/lib/` use explicit `.ts` extensions so the tests run without a bundler.

### 3. Abstract before it becomes magic

- Logic that grows beyond a few lines, needs a comment to be understood, or appears a second time gets a name: a
  function, or a class when it owns state or several related operations.
- Algorithms (automata, geometry, layout, I/O) live as plain TypeScript in `src/lib/` and are covered by tests.
  Components only wire state to markup and call into `src/lib/`.
- Stateful behaviour is a class (`FaEditor`, `Viewport`, `EdgeRouter`); contracts between layers are interfaces
  (`GraphEditor`, `Machine`).
- No magic numbers or ad-hoc string formats: use named constants and helpers (`STATE_RADIUS`, `edgeKey`, `escapeMarkup`).
- Reuse before writing: check `src/lib/` for an existing helper first.
- Do not abstract speculatively; a one-off three-liner stays inline.

## Building blocks

Use these instead of writing new variants:

- Layout: `layouts/Editor.astro` for editor pages, `Workbench` (header, content, sidebar), `AppHeader`, `Tabs`,
  `Dropdown`, `SymbolBar` for special characters.
- Behaviour: `tooltip` and `autoReplace` attachments, `loadAutosave`/`storeAutosave`, `downloadDocument`, `printHtml`,
  `handOffAutomaton` to open an automaton in the FA editor.
- Formatting: `formatSet`, `naturalCompare`, `escapeMarkup`, `transitionLabel`.
- Styles in `global.css`: `.panel`, `.field`, `.button`, `.icon-button`, `.note`, `.verdict`, `.facts`, `.data-table`,
  `.hint`, `.mono`, `.wide`, `.scroll`. Component styles only cover what is specific to that component.

## Conventions

- Every source file starts with the MIT license header used in the existing files.
- 4-space indentation (2 for JSON/YAML), double quotes, trailing commas, LF line endings.
- Keep diffs focused: no unrelated reformatting or drive-by refactors.
- A new module adds its logic and tests under `src/lib/` (machines under `src/lib/automata/<type>/`), a workbench
  component, a page using `layouts/Editor.astro`, then sets `href` in `src/lib/modules.ts` and updates the README.
  Machines drawn as a state graph also implement `GraphEditor` so they can reuse `GraphCanvas`.
