# Requirements

## Format
- Each requirement has format: `- [x] REQ-xxxx: description` (completed) or `- [ ] REQ-xxxx: description` (not done)
- REQ-xxxx where x is a numerical digit (0001, 0002, etc.)

## UI/Layout
- [x] REQ-0001: Master volume should be inline with "Audio Tools" title on right side of header
- [x] REQ-0002: "Audio Tools" title should remain centered on the page
- [x] REQ-0003: Add "Request/Bug" button in tab bar, rightmost position

## Spectrum Analyzer
- [x] REQ-0004: Min power selector (-10, -20, -40, -80 dB) on each spectrum analyzer card
- [x] REQ-0005: Min power setting synced globally across all pages
- [x] REQ-0006: Default min power set to -10 dB
- [x] REQ-0007: Tick mark at right end of x-axis (32k label)
- [x] REQ-0008: Tick mark at bottom of y-axis (minDB label)
- [x] REQ-0009: Always show -6 dB tick mark (amplitude = 0.5)

## Audio Tools
- [x] REQ-0010: Favicon displaying correctly (link to icons/favicon.ico)
- [x] REQ-0011: Default tuner target note set to Middle C

## Code Organization
- [x] REQ-0012: CSS segregated to separate styles.css file
- [x] REQ-0013: Each language in separate source files (HTML in .html, CSS in .css, JS in .js)
- [x] REQ-0014: Project planning information stored in .project/ directory (tasks.md, bugs.md, requirements.md)

## User Interaction
- [x] REQ-0015: "Request/Bug" button redirects to GitHub issues page with current page in description
- [ ] REQ-0016: Never commit without explicit user confirmation (documented in AGENTS.md)
