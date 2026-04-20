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
