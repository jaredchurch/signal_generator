# Synth Pads Improvements - Task List

## Phase 1: Musical Context (Foundation)
- [x] Add key selector UI (C-B, 12 buttons)
- [x] Add scale selector (Major only)
- [x] Add tempo/BPM control (40-200 range)
- [x] Implement scale quantization logic (map any note to nearest scale note)
- [x] Connect metronome tempo to synth pads

## Phase 2: Chord System
- [x] Add chord selector UI (triads, 7ths, sus2, sus4)
- [x] Add chord progression builder (I-V-vi-IV style)
- [x] Implement multi-octave voicing (3-6 notes per chord)
- [x] Implement smooth chord transitions (crossfade, no hard retrigger)
- [x] Prevent single-note output (always require chord)
- [x] Auto-cycle through progression based on tempo

## Phase 3: Audio Architecture
- [x] Add scale/mode selector (Minor, Dorian, Mixolydian, Lydian, Phrygian, Harmonic Minor, Pentatonic)
- [x] Refactor oscillators: 2+ per voice with detune (±3-15 cents)
- [x] Add waveform selection (sawtooth, triangle, sine)
- [x] Add slow random drift to detune
- [x] Implement ADSR envelope (Attack 0.5-5s, Decay 1-6s, Sustain 0.6-1.0, Release 2-10s)
- [x] Add per-voice lowpass filter (cutoff 300-2500Hz, Q 0.2-2)

## Phase 4: Modulation
- [x] Add LFO for filter cutoff modulation
- [x] Add LFO for oscillator detune (subtle)
- [x] Add tempo-synced modulation options (whole, half, quarter, eighth notes)
- [x] Connect LFO rate to BPM when sync enabled

## Phase 5: Effects
- [x] Add global chorus effect (stereo widening, 10-30ms delays)
- [x] Add global reverb (long decay 3-10s, high wet mix)

## Phase 6: UI/UX
- [x] Add oscillator mix control
- [x] Add detune amount control
- [x] Add filter cutoff/resonance controls
- [x] Add ADSR controls (Attack, Release, Sustain sliders)
- [x] Add LFO rate/depth controls
- [x] Add tempo sync toggle
- [x] Improve key/scale/chord selectors

## Phase 7: Transport & Polyphony
- [x] Implement Play/Stop/Pause transport controls
- [x] Add chord quantization options (immediate, beat, bar)
- [x] Add configurable polyphony (8-16 chords)
- [x] Implement voice stealing logic

## Phase 8: UAT Feedback 1
- [x] BUG-1: there should not be a silent period between chords - added crossfade/choke
- [x] BUG-2: there should be a setting for beats per chord - changed to beats setting
- [x] BUG-3: control layout means that page has to scroll - added filter section
- [x] BUG-4: chords have jarring sound - reduced detune, changed default to triangle
- [x] BUG-5: The stop button seems broken - fixed with cancelValueAtTime
- [x] BUG-6: Pause button is unnecessary remove it - removed
- [x] BUG-7: Chord progression - fixed timing and status display
- [x] BUG-8: Ensure that the stop button causes all sounds to stop - stops master gain immediately
- [x] BUG-9: default to first chord progression (I-V-vi-IV) - default changed
- [x] BUG-10: Play/Stop button - single toggle button that switches
- [x] BUG-11: Single button - removed separate stop button
- [x] BUG-12: All sounds stop - verified stopPads stops everything
- [x] BUG-13: stop button resets chord progression to 1
- [x] BUG-14: chord progression now changes sound - rebuilt to stop old before starting new
- [x] BUG-15: duration setting honoured - now uses beats (ms per beat * beats)
- [x] BUG-16: release setting fades out old chord - added release-based fade
- [x] BUG-17: tooltips added to controls
- [x] BUG-18: the start button does nothing - added error handling
- [x] BUG-19: old chord never actually stops - added delayed stop after release
- [x] BUG-20: when chord 2 starts, chord 1 should fade out - changeChordSmooth saves old oscillators to fade
- [x] BUG-21: BUG-20 fixed - changed to exponentialRamp, shorter default release
- [x] BUG-22: tooltips visibility - added CSS tooltip styling
- [x] BUG-23: tooltips - added info icons, also can you explain in the tooltips what LFO is? there should be one tooltip per control box that explains the whole box - can you do this as an information icon in top right corner of the box?
- [x] BUG-24: fade out uses actual release time (it is working) but it should fade all the way smoothly to 0 in the release time, at the moment it starts to fade and then cuts out harshly.

## Implementation Order
1. First, add basic key/scale/tempo selectors to existing synthpads.js
2. Replace single-oscillator logic with chord-based system
3. Add ADSR envelopes and filters
4. Add LFOs and modulation
5. Add effects (chorus, reverb)
6. Polish UI controls
