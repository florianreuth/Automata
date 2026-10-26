# Automata

A modern, browser-based workbench for formal languages and automata theory, inspired by [JFLAP](https://www.jflap.org).
Built with [Astro](https://astro.build), [Svelte](https://svelte.dev) and TypeScript. The user interface is in German.

## Features

Currently available: **finite automata** (NFA/DFA).

- Graph editor: create, move, rename and delete states, mark initial/final states, draw transitions and self-loops
- ε-transitions (leave a label empty or type `ε`, `λ` or `eps`)
- Automatic layered layout to tidy up messy graphs
- Step-by-step simulation that tracks all active states, including ε-closures, and points out missing error (trap) states
- Batch testing of many words at once
- Analysis: determinism, completeness, alphabet, unreachable states
- NFA → DFA conversion (powerset construction)
- Formal definition `A = (Q, Σ, δ, q0, F)` with transition table and/or diagram, exportable as plain text, Markdown,
  LaTeX, SVG, PNG and printable as PDF
- Undo/redo, autosave in the browser, JSON documents and JFLAP `.jff` import/export

Planned: minimal DFA, regular expressions, regular grammars, pushdown automata, multi-tape Turing machines, grammars and
parsing (LL(1), SLR(1), CYK) and L-systems.

### Keyboard shortcuts

| Key                 | Action                                    |
|---------------------|-------------------------------------------|
| `V` `Z` `U` `L`     | Select, state, transition and delete tool |
| `Del` / `Backspace` | Delete selection                          |
| `F2`                | Rename selected state                     |
| `F`                 | Fit view                                  |
| `A`                 | Arrange automatically                     |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo                               |
| `Ctrl+S` / `Ctrl+O` | Save / open                               |

In the select tool, drag with `Shift` held to create a transition and hold `Alt` while dragging to disable grid snapping.

## Project structure

```
src/
├── lib/
│   ├── automata/        machine models and algorithms, framework independent
│   │   ├── machine.ts   shared state/edge model for all graph-based machines
│   │   └── fa/          finite automata: model, simulation, conversion, formal definition, examples
│   ├── editor/          reactive editor state; GraphEditor is the contract for future PDA/TM editors
│   ├── graph/           edge geometry and standalone SVG rendering
│   ├── io/              JSON documents, JFLAP files, downloads
│   └── modules.ts       registry of available and planned modules shown on the start page
├── components/
│   ├── editor/          generic graph canvas
│   ├── fa/              finite automaton workbench and panels
│   └── ui/              shared UI components
└── pages/               routes
```

New machine types add a model under `src/lib/automata/<type>/`, an editor implementing `GraphEditor`, a workbench
component and a route, then set `href` for the module in `src/lib/modules.ts`.

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # unit tests for the automata library
npm run build    # type-check and build static site into dist/
```

## AI notice

Large parts of this project were written with the help of AI ([Claude Code](https://claude.com/claude-code)).
All changes are reviewed and tested before they are published.

## Contact

- Issues: https://github.com/florianreuth/Automata/issues
- Discord: https://florianreuth.de/discord
