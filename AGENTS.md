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
  - `requirements.md` — All requirements with REQ-xxxx format (update when new requirements are added)
  - `tasks.md` — Incomplete tasks and feature requests
  - `bugs.md` — Open bugs and issues

## Requirements Management
- **ALWAYS update `.project/requirements.md` when new requirements are requested**
- Each requirement must have format: `- [x] REQ-xxxx: description` (completed) or `- [ ] REQ-xxxx: description` (not done)
- REQ-xxxx where x is a numerical digit (0001, 0002, etc.)
- Review `requirements.md` for consistency and raise questions with user if inconsistencies found

## Language
- **ALL communication and code comments must be in English**

## Commit Guidelines
- **NEVER commit changes without explicit confirmation from the user**
- Always ask before creating a commit
- When user requests a commit, summarize the changes and ask for confirmation

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
