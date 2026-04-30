// ════════════════════════════════════════════════════════
// PAGE 5 — METRONOME
// ════════════════════════════════════════════════════════

let metroPlaying = false;
let metroAudioCtx = null;
let metroOsc = null;
let metroGain = null;
let metroInterval = null;
let metroBpm = 120;
let metroPulseDir = 1;
let metroStartTime = 0;
let metroBeatCount = 0;
const CLICK_FREQ = 1000;
const CLICK_DUR = 0.03;
const BEAT1_FREQ = 1200; // Higher pitch for beat 1

function onMetroBpmChange() {
  metroBpm = parseInt(document.getElementById('metro-bpm').value);
  document.getElementById('metro-bpm-display').textContent = metroBpm;
  updateMetroInterval();
  // Sync synth pads tempo
  if (typeof syncPadTempoFromMetronome === 'function') {
    syncPadTempoFromMetronome(metroBpm);
  }
}

function onMetroBeatsChange() {
  metroBeatCount = 0; // Reset beat counter when beats per bar changes
}

function onMetroVolumeChange() {
  const v = parseFloat(document.getElementById('metro-volume').value);
  document.getElementById('metro-vol-label').textContent = Math.round(v*100)+'%';
  if (metroGain) metroGain.gain.value = v;
}

function setMetroPreset(bpm) {
  document.getElementById('metro-bpm').value = bpm;
  onMetroBpmChange();
  document.querySelectorAll('.presets .preset-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === bpm);
  });
}

function updateMetroInterval() {
  if (!metroPlaying) return;
  clearInterval(metroInterval);
  const intervalMs = 60000 / metroBpm;
  metroLastTick = performance.now();
  metroInterval = setInterval(metroTick, intervalMs);
}

function toggleMetronome() {
  metroPlaying ? stopMetronome() : startMetronome();
}

function startMetronome() {
  ensureAudioCtx();
  metroAudioCtx = audioCtx;
  metroGain = metroAudioCtx.createGain();
  metroGain.gain.value = parseFloat(document.getElementById('metro-volume')?.value || 0.3);
  metroGain.connect(getMasterGain());

  metroPlaying = true;
  metroStartTime = performance.now();
  document.getElementById('metro-play-btn').textContent = '⏹ Stop';
  updateMetroInterval();
  animatePendulum();
  animateLevel();
}

function stopMetronome() {
  clearInterval(metroInterval);
  metroPlaying = false;
  document.getElementById('metro-play-btn').textContent = '▶ Start';
  resetMetroVisuals();
}

function playClick(isBeatOne) {
  const now = metroAudioCtx.currentTime;
  const highlightOn = document.getElementById('metro-highlight')?.checked ?? true;
  const isHighlighted = isBeatOne && highlightOn;
  const baseFreq = isHighlighted ? BEAT1_FREQ : CLICK_FREQ;
  const baseGainVal = parseFloat(document.getElementById('metro-volume')?.value || 0.7) * (isHighlighted ? 1.2 : 0.85);

  // Use two oscillators for beat 1 (when highlighted) or single for others
  const osc1 = metroAudioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = baseFreq;

  const g = metroAudioCtx.createGain();
  g.gain.setValueAtTime(baseGainVal, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + CLICK_DUR);

  osc1.connect(g);

  if (isHighlighted) {
    const osc2 = metroAudioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 1.5; // Add a harmonic 5th for richer sound
    osc2.connect(g);
    osc2.start(now);
    osc2.stop(now + CLICK_DUR);
  }

  g.connect(metroGain);
  osc1.start(now);
  osc1.stop(now + CLICK_DUR);
}

function onMetroHighlightChange() {
  // Just toggles the checkbox, no other action needed
}

function metroTick() {
  const beatsPerBar = parseInt(document.getElementById('metro-beats')?.value || 4);
  metroBeatCount = (metroBeatCount + 1) % beatsPerBar;
  playClick(metroBeatCount === 0);
}

let intervalMs = 0;

let metroPendulumStart = 0;
let metroPendulumAnimId = null;

function animatePendulum() {
  cancelAnimationFrame(metroPendulumAnimId);
  const pendulum = document.getElementById('metro-pendulum');
  const maxAngle = 35;

  function tick(now) {
    if (!metroPlaying) return;
    const intervalMs = 60000 / metroBpm;
    const elapsed = now - metroStartTime;
    const swing = Math.floor(elapsed / intervalMs);
    const frac = (elapsed % intervalMs) / intervalMs;
    const goingRight = swing % 2 === 0;
    const angle = goingRight
      ? -maxAngle + frac * maxAngle * 2
      : maxAngle - frac * maxAngle * 2;
    pendulum.style.transform = 'rotate(' + angle + 'deg)';
    metroPendulumAnimId = requestAnimationFrame(tick);
  }

  metroPendulumAnimId = requestAnimationFrame(tick);
}

let metroLevelAnimId = null;

function animateLevel() {
  cancelAnimationFrame(metroLevelAnimId);
  const leds = document.querySelectorAll('.metro-led');
  const maxLeds = leds.length;

  function tick(now) {
    if (!metroPlaying) return;
    const intervalMs = 60000 / metroBpm;
    const elapsed = now - metroStartTime;
    const progress = elapsed % intervalMs;
    let level;
    if (progress < 30) {
      level = maxLeds;
    } else {
      level = maxLeds * Math.exp(-(progress - 30) / (intervalMs * 0.4));
    }

    leds.forEach(function(led, i) {
      led.classList.remove('on', 'green', 'yellow', 'red');
      if (i < level) {
        let color = 'green';
        if (i >= leds.length * 0.8) color = 'red';
        else if (i >= leds.length * 0.6) color = 'yellow';
        led.classList.add('on', color);
      }
    });

    metroLevelAnimId = requestAnimationFrame(tick);
  }

  metroLevelAnimId = requestAnimationFrame(tick);
}

function resetMetroVisuals() {
  const pendulum = document.getElementById('metro-pendulum');
  cancelAnimationFrame(metroPendulumAnimId);
  cancelAnimationFrame(metroLevelAnimId);
  pendulum.style.transform = 'rotate(0deg)';
  document.querySelectorAll('.metro-led').forEach(led => {
    led.classList.remove('on', 'green', 'yellow', 'red');
  });
  metroPulseDir = 1;
}
