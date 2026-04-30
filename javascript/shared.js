// ════════════════════════════════════════════════════════
// SHARED STATE & UTILITIES
// ════════════════════════════════════════════════════════

const NUM = 32;
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MAX_FREQ = 32000;

function noteToFreq(name, octave) {
  const idx = NOTE_NAMES.indexOf(name);
  if (idx < 0) return null;
  const midi = (parseInt(octave)+1)*12 + idx;
  return 440 * Math.pow(2, (midi-69)/12);
}

function closestNote(hz) {
  if (!hz || hz <= 0) return '';
  const midi = Math.round(69 + 12*Math.log2(hz/440));
  const note = NOTE_NAMES[((midi%12)+12)%12];
  const oct  = Math.floor(midi/12)-1;
  const exact = 440*Math.pow(2,(midi-69)/12);
  const cents = Math.round(1200*Math.log2(hz/exact));
  return `${note}${oct}${cents===0?'':` ${cents>0?'+':''}${cents}¢`}`;
}

// Linear-scale helpers for fundamental slider (10 Hz – 22000 Hz)
const MIN_FUND = 10, MAX_FUND = 22000;
function fundSliderToHz(v) { return v / 100; }  // 0.01 Hz per unit
function fundHzToSlider(hz) { return Math.round(hz * 100); }

// ── Shared AudioContext ──
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Global master volume (shared across all pages)
let masterGain = null;
function getMasterGain() {
  ensureAudioCtx();
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = parseFloat(document.getElementById('master-volume')?.value || 0.8);
    masterGain.connect(audioCtx.destination);
  }
  return masterGain;
}

function onMasterVolumeChange() {
  const v = parseFloat(document.getElementById('master-volume').value);
  document.getElementById('master-vol-label').textContent = Math.round(v*100)+'%';
  if (masterGain) masterGain.gain.value = v;
}

// Global spectrum range (synced across all instances)
function getSpectrumRange() {
  return parseInt(document.getElementById('spectrum-range')?.value || 32000);
}

function onSpectrumRangeChange() {
  // Redraw all active spectrum displays
  if (typeof drawP1Graphs === 'function' && document.getElementById('page-presets').classList.contains('active')) {
    drawP1Graphs();
  }
  // Force redraw of active tab's spectrum
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    const idx = Array.from(document.querySelectorAll('.tab')).indexOf(activeTab);
    const pages = ['page-presets', 'page-recorder', 'page-tuner', 'page-metronome', 'page-pads'];
    if (pages[idx]) showTab(pages[idx]);
  }
}

// Power range (y-axis) for spectrum analyzer
function getPowerRange() {
  return parseInt(document.getElementById('power-range')?.value || 40);
}

function onPowerRangeChange() {
  // Same redraw logic as spectrum range change
  onSpectrumRangeChange();
}
