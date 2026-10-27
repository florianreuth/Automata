# Automata

A modern, browser-based workbench for formal languages and automata theory, inspired by [JFLAP](https://www.jflap.org).
Built with [Astro](https://astro.build), [Svelte](https://svelte.dev) and TypeScript. The user interface is in German.

## Features

**Finite automata** (NFA/DFA) with ε-transitions:

- Graph editor with automatic layout, undo/redo and autosave
- Step-by-step simulation and batch testing of many words
- Analysis (determinism, completeness, unreachable states), NFA → DFA and FA → regular expression
- Formal definition `A = (Q, Σ, δ, q0, F)`, exportable as text, Markdown, LaTeX, SVG, PNG and PDF
- JSON documents and JFLAP `.jff` import/export

**Regular expressions**:

- `|`, `*`, `+`, `?` and parentheses; `\` escapes an operator, an empty alternative like `(a|)` means ε
- Batch testing and ε-NFA via Thompson construction, which opens in the automaton editor

**Grammars**:

- One production per line, e.g. `S -> aSb |`; `->` becomes `→` while typing, an empty alternative means ε
- Uppercase letters (also `S'`, `A1`) are nonterminals, every other character is a terminal
- Chomsky classification, Chomsky normal form and CYK table
- FIRST/FOLLOW sets, LL(1) table with conflicts, step-by-step LL(1) parsing and derivation tree

Special characters such as `→`, `ε` and `∅` can also be inserted with the buttons below each input.

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
