// ════════════════════════════════════════════════════════
// PAGE 6 — SYNTH PADS
// ════════════════════════════════════════════════════════

let padPlaying = false;
let padAudioCtx = null;
let padOscs = [];
let padGain = null;
let padAnalyser = null;
let padAnim = null;
let padKey = 'C';
const PAD_OCTAVE = 4;

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
}

function setPadKey(key) {
  padKey = key;
  document.querySelectorAll('.pad-key-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.key === key);
  });
  if (padPlaying) {
    startPads();
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
  ensureAudioCtx();
  padAudioCtx = audioCtx;
  stopPads();

  const baseFreq = noteToFreq(padKey, PAD_OCTAVE);
  const vol = parseFloat(document.getElementById('pad-volume').value);

  padGain = padAudioCtx.createGain();
  padGain.gain.value = vol;

  padAnalyser = padAudioCtx.createAnalyser();
  padAnalyser.fftSize = 2048;

  // Soft ambient: sine waves with gentle filter
  const notes = [0, 4, 7, 12, 16, 19, 24, 28];

  notes.forEach(semitone => {
    const freq = baseFreq * Math.pow(2, semitone / 12);
    if (freq < 6000) {
      const osc = padAudioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = padAudioCtx.createGain();
      gain.gain.setValueAtTime(0, padAudioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(1 / notes.length, padAudioCtx.currentTime + 0.5);

      // Very gentle low-pass filter
      const filter = padAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      filter.Q.value = 0.5;

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(padGain);
      padGain.connect(padAnalyser);
      padAnalyser.connect(padAudioCtx.destination);
      osc.start();
      padOscs.push({ osc, gain, filter });
    }
  });

  padPlaying = true;
  document.getElementById('pad-play-btn').textContent = '⏹ Stop';

  (function loop() {
    if (!padPlaying) return;
    drawLiveFreq('pad-canvas-freq', padAnalyser);
    padAnim = requestAnimationFrame(loop);
  })();
}

function stopPads() {
  cancelAnimationFrame(padAnim);
  padOscs.forEach(o => {
    try { o.osc.stop(); } catch (e) { }
  });
  padOscs = [];
  padPlaying = false;
  document.getElementById('pad-play-btn').textContent = '▶ Play';
}
