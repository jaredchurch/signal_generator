// ════════════════════════════════════════════════════════
// PAGE 6 — SYNTH PADS
// ════════════════════════════════════════════════════════

let padPlaying = false;
let padPaused = false;
let padAudioCtx = null;
let padOscs = [];
let padGain = null;
let padAnalyser = null;
let padAnim = null;
let padKey = 'C';
let padScale = 'major';
let padChord = 'maj';
let padProgression = 'I-V-vi-IV';
let progIndex = 0;
let padTempo = 120;
let padCycle = 4; // beats per chord
let padWave = 'triangle';
let padDetune = 5; // cents - reduced for smoother sound
let padAttack = 0.5;
let padRelease = 2;
let padLfoRate = 0.25;
let padLfoDepth = 300;
let padReverb = 0.3;
let padReverbNode = null;
let padFilterCutoff = 1200;
let progIntervalTimer = null;
const PAD_OCTAVE = 4;

// Scale definitions (semitone offsets from root)
const SCALES = {
  'major': [0, 2, 4, 5, 7, 9, 11],        // Ionian
  'minor': [0, 2, 3, 5, 7, 8, 10],     // Aeolian
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'harmonic': [0, 2, 3, 5, 7, 8, 11], // Harmonic minor
  'pentatonic_major': [0, 2, 4, 7, 9],
  'pentatonic_minor': [0, 3, 5, 7, 10]
};

// Chord definitions (semitone offsets from root note)
const CHORDS = {
  'maj':  [0, 4, 7],           // Major triad
  'min':  [0, 3, 7],           // Minor triad
  '7':    [0, 4, 7, 10],       // Dominant 7th
  'maj7': [0, 4, 7, 11],       // Major 7th
  'min7': [0, 3, 7, 10],       // Minor 7th
  'sus2': [0, 2, 7],           // Suspended 2nd
  'sus4': [0, 5, 7]            // Suspended 4th
};

// Chord progressions (degree numbers for Major scale: 1=C, 2=D, 3=E, 4=F, 5=G, 6=A, 7=B)
const CHORD_PROGRESSIONS = {
  'I-V-vi-IV': [0, 4, 5, 3],    // C - G - Am - F
  'I-IV-V-I':  [0, 3, 4, 0],    // C - F - G - C
  'vi-IV-I-V': [5, 3, 0, 4],    // Am - F - C - G
  'ii-V-I-V': [1, 4, 0, 4]     // Dm - G - C - G
};

function initPads() {
  const grid = document.getElementById('pad-key-grid');
  NOTE_NAMES.forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'pad-key-btn';
    btn.textContent = n;
    btn.dataset.key = n;
    btn.onclick = () => setPadKey(n);
    grid.appendChild(btn);
  });
  setPadKey('C');
  document.getElementById('pad-prog-display').textContent = '1';
}

function onPadScaleChange() {
  padScale = document.getElementById('pad-scale-select').value;
  if (padPlaying) {
    startPads();
  }
}

function onPadChordChange() {
  padChord = document.getElementById('pad-chord-select').value;
  if (padPlaying) {
    startPads();
  }
}

function onPadWaveChange() {
  padWave = document.getElementById('pad-wave-select').value;
  if (padPlaying) {
    updateOscillators();
  }
}

function onPadDetuneChange() {
  padDetune = parseInt(document.getElementById('pad-detune').value);
  document.getElementById('pad-detune-label').textContent = padDetune;
  if (padPlaying) {
    updateOscillators();
  }
}

function onPadEnvChange() {
  padAttack = parseFloat(document.getElementById('pad-attack').value);
  padRelease = parseFloat(document.getElementById('pad-release').value);
  document.getElementById('pad-attack-label').textContent = padAttack.toFixed(1) + 's';
  document.getElementById('pad-release-label').textContent = padRelease.toFixed(1) + 's';
  if (padPlaying) {
    updateOscillators();
  }
}

function onPadLfoChange() {
  padLfoRate = parseFloat(document.getElementById('pad-lfo-rate').value);
  padLfoDepth = parseInt(document.getElementById('pad-lfo-depth').value);
  document.getElementById('pad-lfo-rate-label').textContent = padLfoRate;
  document.getElementById('pad-lfo-depth-label').textContent = Math.round(padLfoDepth / 10) + '%';
  if (padPlaying) {
    updateLfo();
  }
}

function onPadFilterChange() {
  padFilterCutoff = parseInt(document.getElementById('pad-filter').value);
  document.getElementById('pad-filter-label').textContent = padFilterCutoff;
  // Update all filter frequencies
  padOscs.forEach(o => {
    if (o.filter) o.filter.frequency.value = padFilterCutoff;
  });
}

function onPadFxChange() {
  padReverb = parseFloat(document.getElementById('pad-reverb').value);
  document.getElementById('pad-reverb-label').textContent = Math.round(padReverb * 100) + '%';
  if (padReverbNode) {
    padReverbNode.wetGain.linearRampToValueAtTime(padReverb, padAudioCtx.currentTime + 0.1);
  }
}

// Create reverb impulse response
function createReverbImpulse(duration, decay) {
  const length = padAudioCtx.sampleRate * duration;
  const impulse = padAudioCtx.createBuffer(2, length, padAudioCtx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function onPadProgressionChange() {
  padProgression = document.getElementById('pad-prog-select').value;
  padCycle = parseFloat(document.getElementById('pad-cycle-select').value);
  progIndex = 0;
  document.getElementById('pad-prog-display').textContent = padProgression === 'none' ? '—' : '1';
  if (padPlaying) {
    if (padProgression === 'none') {
      clearInterval(progIntervalTimer);
    } else {
      startProgressionTimer();
    }
  }
}

function padProgressionPrev() {
  if (padProgression === 'none') return;
  const prog = CHORD_PROGRESSIONS[padProgression];
  progIndex = (progIndex - 1 + prog.length) % prog.length;
  document.getElementById('pad-prog-display').textContent = progIndex + 1;
  if (padPlaying) {
    startPads();
  }
}

function padProgressionNext() {
  if (padProgression === 'none') return;
  const prog = CHORD_PROGRESSIONS[padProgression];
  progIndex = (progIndex + 1) % prog.length;
  document.getElementById('pad-prog-display').textContent = progIndex + 1;
  if (padPlaying) {
    startPads();
  }
}

function onPadCycleChange() {
  padCycle = parseFloat(document.getElementById('pad-cycle-select').value);
  if (padPlaying && padProgression !== 'none') {
    clearInterval(progIntervalTimer);
    startProgressionTimer();
  }
}

function advanceProgression() {
  if (padProgression === 'none' || !padPlaying) return;
  const prog = CHORD_PROGRESSIONS[padProgression];
  progIndex = (progIndex + 1) % prog.length;
  document.getElementById('pad-prog-display').textContent = progIndex + 1;
  changeChordSmooth();
}

function startProgressionTimer() {
  if (padProgression === 'none') return;
  clearInterval(progIntervalTimer);
  // Calculate ms per beat (not per bar)
  const msPerBeat = 60000 / padTempo;
  const intervalMs = msPerBeat * padCycle;
  console.log('Timer: ' + padTempo + ' BPM, ' + padCycle + ' beats = ' + intervalMs + 'ms');
  progIntervalTimer = setInterval(advanceProgression, intervalMs);
}

function onPadTempoChange() {
  padTempo = parseInt(document.getElementById('pad-tempo').value);
  document.getElementById('pad-tempo-label').textContent = padTempo;
}

// Sync pad tempo with metronome (call from metronome when it changes)
function syncPadTempoFromMetronome(bpm) {
  document.getElementById('pad-tempo').value = bpm;
  document.getElementById('pad-tempo-label').textContent = bpm;
  padTempo = bpm;
}

// Convert semitone offset to frequency for a given root and octave
function scaleNoteToFreq(rootNote, octave, semitoneOffset) {
  const midi = (parseInt(octave) + 1) * 12 + NOTE_NAMES.indexOf(rootNote) + semitoneOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Quantize a semitone to the nearest scale note
function quantizeToScale(semitone, scale) {
  const scaleNotes = SCALES[scale];
  const octave = Math.floor(semitone / 12);
  const noteInOctave = semitone % 12;

  let closest = scaleNotes[0];
  let minDist = Math.abs(noteInOctave - scaleNotes[0]);

  for (let i = 1; i < scaleNotes.length; i++) {
    const dist = Math.abs(noteInOctave - scaleNotes[i]);
    if (dist < minDist) {
      minDist = dist;
      closest = scaleNotes[i];
    }
  }

  return octave * 12 + closest;
}

function setPadKey(key) {
  padKey = key;
  document.querySelectorAll('.pad-key-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.key === key);
  });
  if (padPlaying) {
    stopPads();
    startPads();
  }
}

function updateStatus() {
  if (!padPlaying) {
    document.getElementById('pad-status').textContent = 'Ready';
  } else if (padProgression !== 'none') {
    document.getElementById('pad-status').textContent = 'Chord ' + (progIndex + 1) + ' of ' + CHORD_PROGRESSIONS[padProgression].length;
  } else {
    document.getElementById('pad-status').textContent = 'Playing';
  }
}

function onPadVolumeChange() {
  const v = parseFloat(document.getElementById('pad-volume').value);
  document.getElementById('pad-vol-label').textContent = Math.round(v * 100) + '%';
  if (padGain) padGain.gain.value = v;
}

function togglePad() {
  padPlaying ? stopPads() : startPads();
}

function startPads() {
  try {
    ensureAudioCtx();
    padAudioCtx = audioCtx;
  } catch(e) {
    console.error('Failed to create AudioContext:', e);
    document.getElementById('pad-status').textContent = 'Error: ' + e.message;
    return;
  }

  // Clear any existing audio first
  if (padOscs && padOscs.length > 0) {
    padOscs.forEach(o => { try { o.osc.stop(); o.osc.disconnect(); } catch(e) {} });
  }
  if (padGain) { try { padGain.disconnect(); padGain = null; } catch(e) {} }
  if (padAnalyser) { try { padAnalyser.disconnect(); padAnalyser = null; } catch(e) {} }
  padOscs = [];

  const vol = parseFloat(document.getElementById('pad-volume').value);
  padTempo = parseInt(document.getElementById('pad-tempo').value);

  padGain = padAudioCtx.createGain();
  padGain.gain.value = vol;

  padAnalyser = padAudioCtx.createAnalyser();
  padAnalyser.fftSize = 2048;

  // Create reverb
  const convolver = padAudioCtx.createConvolver();
  convolver.buffer = createReverbImpulse(3, 2);
  const reverbDry = padAudioCtx.createGain();
  const reverbWet = padAudioCtx.createGain();
  reverbDry.gain.value = 1 - padReverb;
  reverbWet.gain.value = padReverb;
  padReverbNode = { convolver, reverbWet, wetGain: reverbWet };

  // Determine root note offset from progression
  let rootOffset = 0;
  if (padProgression !== 'none') {
    const prog = CHORD_PROGRESSIONS[padProgression];
    rootOffset = prog[progIndex] * 12;
  }

  // Get chord intervals from CHORDS definition
  const chordIntervals = CHORDS[padChord];

  // Build notes list: spread chord across multiple octaves (3-6 notes per chord as per spec)
  const notes = [];
  const octaves = [0, 1, 2]; // Spread across 3 octaves

  octaves.forEach(octave => {
    chordIntervals.forEach(interval => {
      const semitone = rootOffset + interval + (octave * 12);
      const quantized = quantizeToScale(semitone, padScale);
      const freq = scaleNoteToFreq(padKey, PAD_OCTAVE, semitone - 12);
      if (freq > 50 && freq < 6000 && !notes.find(n => n.freq === freq)) {
        notes.push({ semitone, freq });
      }
    });
  });

  // Sort by frequency
  notes.sort((a, b) => a.freq - b.freq);

  // Create master LFO for filter modulation
  const lfo = padAudioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = padLfoRate;
  const lfoGain = padAudioCtx.createGain();
  lfoGain.gain.value = padLfoDepth;
  lfo.connect(lfoGain);
  lfo.start();

  notes.forEach(note => {
    // Create 2 oscillators per note with detune
    for (let i = 0; i < 2; i++) {
      const osc = padAudioCtx.createOscillator();
      osc.type = padWave;
      osc.frequency.value = note.freq;
      osc.detune.value = i === 0 ? -padDetune : padDetune;

      const gain = padAudioCtx.createGain();
      gain.gain.setValueAtTime(0, padAudioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(1 / (notes.length * 2), padAudioCtx.currentTime + padAttack);

      // Low-pass filter
      const filter = padAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      filter.Q.value = 0.5;

      // Connect LFO to filter frequency
      lfoGain.connect(filter.frequency);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(padGain);
      // Connect to both dry and wet (reverb) paths
      padGain.connect(padAnalyser);
      padGain.connect(convolver);
      convolver.connect(reverbWet);
      reverbDry.connect(padAnalyser);
      padReverbNode = { convolver, reverbWet, wetGain: reverbWet };
      padAnalyser.connect(padAudioCtx.destination);
      osc.start();
      padOscs.push({ osc, gain, filter });
    }
  });

  padOscs.lfo = lfo;
  padOscs.lfoGain = lfoGain;

  padPlaying = true;
  padPaused = false;
  document.getElementById('pad-play-btn').textContent = '⏹ Stop';
  document.getElementById('pad-status').textContent = padProgression !== 'none' ? 'Playing: chord ' + (progIndex + 1) : 'Playing';

  // Start progression timer
  startProgressionTimer();

  (function loop() {
    if (!padPlaying) return;
    drawLiveFreq('pad-canvas-freq', padAnalyser);
    padAnim = requestAnimationFrame(loop);
  })();
}

function stopPads() {
  cancelAnimationFrame(padAnim);
  clearInterval(progIntervalTimer);
  progIntervalTimer = null;

  // Stop all oscillators in padOscs
  if (padOscs && padOscs.length > 0) {
    padOscs.forEach(o => {
      try {
        o.osc.disconnect();
        o.gain.disconnect();
        o.filter.disconnect();
        o.osc.stop();
        o.osc = null;
      } catch (e) { }
    });
  }

  // Stop LFO
  if (padOscs && padOscs.lfo) {
    try {
      padOscs.lfo.disconnect();
      padOscs.lfo.stop();
      padOscs.lfo = null;
    } catch (e) { }
  }

  // Disconnect and stop master gain
  if (padGain) {
    try {
      padGain.disconnect();
      padGain = null;
    } catch (e) { }
  }

  // Disconnect analyser
  if (padAnalyser) {
    try {
      padAnalyser.disconnect();
      padAnalyser = null;
    } catch (e) { }
  }

  padOscs = [];
  padPlaying = false;
  padPaused = false;
  progIndex = 0;
  document.getElementById('pad-prog-display').textContent = '1';
  document.getElementById('pad-play-btn').textContent = '▶ Play';
  document.getElementById('pad-status').textContent = 'Stopped';
}

function updateOscillators() {
  if (!padPlaying) return;
  const vol = parseFloat(document.getElementById('pad-volume').value);
  if (padGain) {
    // Fade out
    padGain.gain.linearRampToValueAtTime(0, padAudioCtx.currentTime + 0.1);
    setTimeout(() => {
      startPads();
    }, 150);
  }
}

function updateLfo() {
  if (padOscs.lfo) {
    padOscs.lfo.frequency.value = padLfoRate;
  }
  if (padOscs.lfoGain) {
    padOscs.lfoGain.gain.value = padLfoDepth;
  }
}

function changeChordSmooth() {
  if (!padPlaying || padPaused) return;
  if (!padAudioCtx) return;

  const now = padAudioCtx.currentTime;
  const fadeOutTime = Math.max(padRelease, 0.5); // Use the release setting for fade out
  const fadeInTime = 0.3;

  // Get old oscillators before creating new ones
  const oldOscs = padOscs || [];

  // Start fresh array for new oscillators
  padOscs = [];

  // Get current progression index
  const prog = CHORD_PROGRESSIONS[padProgression];
  const rootOffset = prog[progIndex] * 12;
  const chordIntervals = CHORDS[padChord];

  // Build new notes
  const notes = [];
  const octaves = [0, 1, 2];
  octaves.forEach(octave => {
    chordIntervals.forEach(interval => {
      const semitone = rootOffset + interval + (octave * 12);
      const quantized = quantizeToScale(semitone, padScale);
      const freq = scaleNoteToFreq(padKey, PAD_OCTAVE, semitone - 12);
      if (freq > 50 && freq < 6000 && !notes.find(n => n.freq === freq)) {
        notes.push({ semitone, freq });
      }
    });
  });
  notes.sort((a, b) => a.freq - b.freq);

  // Create LFO
  const lfo = padAudioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = padLfoRate;
  lfo.start();

  const lfoGain = padAudioCtx.createGain();
  lfoGain.gain.value = padLfoDepth;
  lfo.connect(lfoGain);

  // Create new oscillators and ensure they have initial volume
  notes.forEach(note => {
    for (let i = 0; i < 2; i++) {
      const osc = padAudioCtx.createOscillator();
      osc.type = padWave;
      osc.frequency.value = note.freq;
      osc.detune.value = i === 0 ? -padDetune : padDetune;

      const gain = padAudioCtx.createGain();
      // Start at full volume immediately for new chord
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.15, now + fadeInTime);

      const filter = padAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = padFilterCutoff;
      filter.Q.value = 0.5;

      lfoGain.connect(filter.frequency);
      osc.connect(gain);
      gain.connect(filter);
      filter.connect(padGain);
      padGain.connect(padAnalyser);
      padAnalyser.connect(padAudioCtx.destination);
      osc.start();
      padOscs.push({ osc, gain, filter });
    }
  });

  padOscs.lfo = lfo;
  padOscs.lfoGain = lfoGain;

  // Now fade out old oscillators - using the actual release time
  if (oldOscs.length > 0) {
    oldOscs.forEach(o => {
      try {
        if (o.gain && o.gain.gain) {
          // Start from whatever the current volume is
          let curVal = 0.1;
          try { curVal = o.gain.gain.value || 0.1; } catch(e) {}
          o.gain.gain.cancelValueAtTime(now);
          o.gain.gain.setValueAtTime(curVal, now);
          // Smooth exponential fade using actual release time
          o.gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutTime);
        }
      } catch(e) {}
    });

    // Stop and disconnect after fade completes
    setTimeout(() => {
      oldOscs.forEach(o => {
        try {
          if (o.osc) { o.osc.stop(); o.osc.disconnect(); }
          if (o.gain) { o.gain.disconnect(); }
          if (o.filter) { o.filter.disconnect(); }
        } catch(e) {}
      });
    }, fadeOutTime * 1000 + 200);
  }

  // Update status
  document.getElementById('pad-status').textContent = 'Chord ' + (progIndex + 1) + ' of ' + prog.length;
}
