# DESIGN — patrol-lab visual system

Control-room aesthetic: near-black industrial, one signal color, calm motion.

## Tokens (CSS custom properties, `globals.css`)

| Token | Value | Use |
|---|---|---|
| `--bg-0` | `#07090c` | app background |
| `--bg-1` | `#0b0f14` | panels |
| `--bg-2` | `#11161d` | elevated surfaces |
| `--line` | `#1b2330` | hairlines |
| `--text-0` | `#e8edf4` | primary text |
| `--text-1` | `#93a1b5` | secondary text |
| `--text-2` | `#5c6a7e` | tertiary/meta |
| `--accent` | `#35e0a1` | live/success/robot path |
| `--warn` | `#ffb454` | warnings |
| `--alert` | `#ff5d5d` | critical alerts |
| `--info` | `#57b6ff` | informational |
| `--mono` | `ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace` | code, numbers |
| `--sans` | `system-ui, 'Inter', 'Segoe UI', sans-serif` | UI text |

## Rules

- Dark theme only. No pure white; text on `--bg-1` uses `--text-0/1/2`.
- Motion = data: transitions ≤ 200 ms for state, mission progress may animate
  continuously. No decorative animation.
- Every displayed number is a real metric; meta rows show the source in `--text-2`.
- Panels: 1px `--line` borders, no shadows heavier than `0 0 0 1px rgba(0,0,0,.4)`.
- Status language: `IDLE / PLANNING / EXECUTING / INSPECTING / PAUSED / DONE / FAULT`.
