# Automata

A modern, browser-based workbench for formal languages and automata theory, inspired by [JFLAP](https://www.jflap.org).
Built with [Astro](https://astro.build), [Svelte](https://svelte.dev) and TypeScript. The user interface is in German.

## Features

Currently available: **finite automata** (NFA/DFA) with ε-transitions.

- Graph editor with automatic layout, undo/redo and autosave
- Step-by-step simulation and batch testing of many words
- Analysis (determinism, completeness, unreachable states) and NFA → DFA conversion
- Formal definition `A = (Q, Σ, δ, q0, F)`, exportable as text, Markdown, LaTeX, SVG, PNG and PDF
- JSON documents and JFLAP `.jff` import/export

Planned: minimal DFA, regular expressions and grammars, pushdown automata, Turing machines, parsing and L-systems.

### Keyboard shortcuts

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
