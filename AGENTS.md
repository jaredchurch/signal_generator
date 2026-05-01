# Signal Generator

## Overview
Web app with separate source files — no build system, tests, or CI.

## Development
- `npm run dev` — Start dev server on port 3000 (serves `index.html`)
- Open `index.html` directly in a browser to test
- Source files are separated by language:
  - `index.html` — HTML structure
  - `styles.css` — CSS styles
  - `javascript/*.js` — JavaScript logic
- No external dependencies or CDN resources

## Coding Standards
- Always add comments to code explaining what it does
- Comments should be clear and helpful for future maintainers
- Each language must be kept in separate source files (HTML in .html, CSS in .css, JS in .js)
- Project planning information stored in `.project/` directory:
  - `tasks.md` — Incomplete tasks and feature requests
  - `bugs.md` — Open bugs and issues

## GitHub Codespace
- Port 3000 is auto-forwarded and opens preview
- Server auto-starts via `postStartCommand` in devcontainer.json

## Key Technical Details
- Uses Web Audio API (`AudioContext`, `OscillatorNode`, `AnalyserNode`, `MediaRecorder`)
- Canvas-based visualizations with high-DPI support via `devicePixelRatio`
- Recording requires microphone permission (`navigator.mediaDevices.getUserMedia`)
- Frequency range: 1 Hz – 32 kHz (logarithmic slider mapping)
- Supports sine, square, sawtooth, triangle waveforms + white/pink/brown noise

## Common Changes
- Frequency unit toggle (Hz/kHz) is per-row on page 2, per-control on page 1
- Live visualizations use `requestAnimationFrame` loops with `AnalyserNode` FFT data
- Static visualizations computed from component array, rendered to canvas
