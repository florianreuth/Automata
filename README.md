# Automata

A modern, browser-based workbench for formal languages and automata theory, inspired by [JFLAP](https://www.jflap.org).
Built with [Astro](https://astro.build), [Svelte](https://svelte.dev) and TypeScript. The user interface is in German.

![Start page](.github/images/home.png)

## Features

**Finite automata** (NFA/DFA) with ε-transitions:

- Symbols can be single characters or whole words such as `hallo`. Input words are split at spaces (`hallo welt`), or,
  without spaces, by the longest matching alphabet symbol (`hallowelt`)
- Graph editor with automatic layout, undo/redo and autosave
- Step-by-step simulation and batch testing of many words
- Analysis (determinism, completeness, unreachable states), adding a missing trap state, NFA → DFA, DFA minimization,
  FA → regular expression and FA → right-linear grammar
- Formal definition `A = (Q, Σ, δ, q0, F)`, exportable as text, Markdown, LaTeX, SVG, PNG and PDF
- JSON documents and JFLAP `.jff` import/export

![Finite automaton editor](.github/images/finite-automaton.png)

**Regular expressions**: batch testing and conversion to an ε-NFA (Thompson construction).

![Regular expressions](.github/images/regular-expression.png)

**Grammars**: Chomsky classification, Chomsky normal form, CYK, FIRST/FOLLOW sets and LL(1) parsing with derivation
tree, and regular (right- or left-linear) grammar → NFA. Type `->` for `→`; an empty alternative means ε.

![Grammars and parsing](.github/images/grammar.png)

Planned: SLR(1) and brute-force parsing, pushdown automata, Turing machines and L-systems.

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
