# Audio Tools — Signal Generator

A web-based audio tool with signal generation, recording, tuning, metronome, and synth pads. No build system required — pure HTML, CSS, and JavaScript.

## Features

- **Signal Generator** — Create custom waveforms using multiple frequency components with real-time visualization
- **Audio Recorder** — Record audio with live monitoring and spectrum analysis
- **Tuner** — Guitar/bass tuner with visual feedback, target note selection, and alternating reference tone
- **Metronome** — Adjustable tempo (40-240 BPM) with visual pendulum and LED level display
- **Synth Pads** — Playable synthesizer pads with multiple waveforms

## Quick Start

### GitHub Codespace
Port 3000 is auto-forwarded and opens a preview. The dev server auto-starts via `postStartCommand` in `devcontainer.json`.

### Local Development
```bash
npm run dev    # Starts dev server on port 3000
```

Or open `index.html` directly in a browser (no server required for basic functionality).

## File Structure

```
signal-generator/
├── index.html              # HTML structure
├── styles.css              # CSS styles
├── javascript/
│   ├── drawing.js         # Shared canvas drawing functions
│   ├── main.js            # Main initialization and tab switching
│   ├── presets.js         # Signal generator (page 1) logic
│   ├── recorder.js        # Audio recorder (page 2) logic
│   ├── tuner.js           # Tuner (page 3) logic
│   ├── metronome.js       # Metronome (page 4) logic
│   ├── pads.js            # Synth pads (page 5) logic
│   └── shared.js          # Shared state and utilities
├── AGENTS.md              # Instructions for AI coding agents
└── README.md
```

## Key Technical Details

- **Web Audio API** — Uses `AudioContext`, `OscillatorNode`, `AnalyserNode`, `MediaRecorder`
- **Canvas Visualizations** — High-DPI support via `devicePixelRatio`
- **Spectrum Analyzer** — Logarithmic frequency scale (10 Hz – 32 kHz), adjustable min power (-10 to -80 dB)
- **Waveforms** — Sine, square, sawtooth, triangle + white/pink/brown noise
- **Microphone Access** — Recording and tuner require microphone permission

## Coding Standards

- Each language kept in separate source files (HTML in `.html`, CSS in `.css`, JS in `.js`)
- Comments explain what code does for future maintainers
- No external dependencies or CDN resources
