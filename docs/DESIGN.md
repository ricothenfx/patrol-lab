# DESIGN — patrol-lab visual system

Control-room aesthetic: near-black industrial, one signal color, calm motion.

## Tokens (CSS custom properties, `globals.css`)

| Token | Dark (default) | Light (`data-theme="light"`) | Use |
|---|---|---|---|
| `--bg-0` | `#07090c` | `#eef1f5` | app background |
| `--bg-1` | `#0b0f14` | `#f7f9fb` | panels |
| `--bg-2` | `#11161d` | `#e4e9ef` | elevated surfaces |
| `--line` | `#1b2330` | `#ccd4de` | hairlines |
| `--text-0` | `#e8edf4` | `#17202e` | primary text |
| `--text-1` | `#93a1b5` | `#3d4c61` | secondary text |
| `--text-2` | `#5c6a7e` | `#66788f` | tertiary/meta |
| `--accent` | `#35e0a1` | `#0c9d68` | live/success/robot path |
| `--warn` | `#ffb454` | `#b26a00` | warnings |
| `--alert` | `#ff5d5d` | `#d43f3f` | critical alerts |
| `--info` | `#57b6ff` | `#1668b8` | informational |
| `--mono` | `ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace` | same | code, numbers |
| `--sans` | `system-ui, 'Inter', 'Segoe UI', sans-serif` | same | UI text |

Editor/code tokens follow the same pattern (`--code-keyword`, `--code-atom`,
`--code-number`, `--code-comment`, `--code-operator`, `--code-variable`,
`--code-gutter`, `--selection`) and are consumed by the CodeMirror theme and
highlight style, so the editor adapts with the theme.

## Themes

- **Dark is the default** and the identity of the product.
- A `data-theme` attribute on `<html>` (`light`/`dark`) switches token sets.
  An inline script in `layout.tsx` resolves it before first paint: stored
  `localStorage["patrol-lab-theme"]`, else the OS `prefers-color-scheme`.
- The `ThemeToggle` in the topbar flips and persists the choice.
- **The 3D viewport, POI labels and the canvas minimap stay dark in both
  themes** — they are the monitor feeds of the console, tuned for the dark
  scene (fog, grid, beacons). Do not light-theme the canvas.
- Semantic colors keep their meaning across themes; light values are darkened
  for contrast on light surfaces. No pure white backgrounds; panels sit on
  `--bg-1`.

## Rules

- No pure white; text on `--bg-1` uses `--text-0/1/2`.
- Motion = data: transitions ≤ 200 ms for state, mission progress may animate
  continuously. No decorative animation.
- Every displayed number is a real metric; meta rows show the source in `--text-2`.
- Panels: 1px `--line` borders, no shadows heavier than `0 0 0 1px rgba(0,0,0,.4)`.
- Status language: `IDLE / PLANNING / EXECUTING / INSPECTING / PAUSED / DONE / FAULT`.
- Content pages (`/qa`, `/faq`) reuse the topbar/statusbar tokens and own their
  scrolling via `.page-body` (the app shell keeps `html/body` overflow hidden).
