# Automata

A modern, browser-based workbench for formal languages and automata theory, inspired by [JFLAP](https://www.jflap.org).
Built with [Astro](https://astro.build), [Svelte](https://svelte.dev) and TypeScript. The user interface is in German.

![Start page](docs/screenshots/home.png)

## Features

**Finite automata** (NFA/DFA) with ε-transitions:

- Graph editor with automatic layout, undo/redo and autosave
- Step-by-step simulation and batch testing of many words
- Analysis (determinism, completeness, unreachable states), NFA → DFA and FA → regular expression
- Formal definition `A = (Q, Σ, δ, q0, F)`, exportable as text, Markdown, LaTeX, SVG, PNG and PDF
- JSON documents and JFLAP `.jff` import/export

![Finite automaton editor](docs/screenshots/finite-automaton.png)

**Regular expressions**: batch testing and conversion to an ε-NFA (Thompson construction).

![Regular expressions](docs/screenshots/regular-expression.png)

**Grammars**: Chomsky classification, Chomsky normal form, CYK, FIRST/FOLLOW sets and LL(1) parsing with derivation
tree. Type `->` for `→`; an empty alternative means ε.

![Grammars and parsing](docs/screenshots/grammar.png)

Planned: minimal DFA, regular grammar ↔ FA, SLR(1) and brute-force parsing, pushdown automata, Turing machines and
L-systems.

### Keyboard shortcuts (automaton editor)

| Key                 | Action                                    |
|---------------------|-------------------------------------------|
| `V` `Z` `U` `L`     | Select, state, transition and delete tool |
| `Del` / `Backspace` | Delete selection                          |
| `F2`                | Rename selected state                     |
| `F` / `A`           | Fit view / arrange automatically          |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo                               |
| `Ctrl+S` / `Ctrl+O` | Save / open                               |

In the select tool, `Shift`-drag creates a transition and `Alt`-drag disables grid snapping.

## Development

```sh
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # type-check and build into dist/
```

## AI notice

Large parts of this project were written with the help of AI ([Claude Code](https://claude.com/claude-code)).
All changes are reviewed and tested before they are published.

## Contact

- Issues: https://github.com/florianreuth/Automata/issues
- Discord: https://florianreuth.de/discord
