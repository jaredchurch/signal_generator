// ════════════════════════════════════════════════════════
// PAGE 1 — PRESETS & NOTES
// ════════════════════════════════════════════════════════

let p1Components = [];
let p1NoiseType  = 'off';
let p1FundUnit   = 'hz';
let p1RowUnit    = Array.from({length:32}, ()=>'hz');
let p1FundHz     = 220;

// Preset playback nodes
let p1PresetGain    = null;
let p1PresetAnalyser= null;
let p1PresetOscs    = [];
let p1PresetNoise   = null;
let p1PresetPlaying = false;
let p1PresetAnim    = null;

let p1ComponentsCollapsed = true;

function initP1() {
  // Note picker
  const sel = document.getElementById('note-select');
  NOTE_NAMES.forEach(n => { const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
  // Fundamental slider init
  p1FundHz = 220;
  document.getElementById('fundamental-slider').value = fundHzToSlider(p1FundHz);
  updateFundamentalDisplay();
  // init components
  p1Components = Array.from({length:NUM}, ()=>({freq:0,amp:0}));
  renderHarmonicsList();
  applyPreset('sine');
}

/* Fundamental unit */
function setFundUnit(u) {
  p1FundUnit = u;
  document.getElementById('unit-hz').classList.toggle('active', u==='hz');
  document.getElementById('unit-khz').classList.toggle('active', u==='khz');
  updateFundamentalDisplay();
  const active = document.querySelector('.preset-btn.active');
  if (active && active.dataset.preset && active.dataset.preset!=='clear') applyPreset(active.dataset.preset);
}
function getFundHz() {
  const sliderVal = parseInt(document.getElementById('fundamental-slider').value);
  return fundSliderToHz(sliderVal);
}
function onFundamentalSliderChange() {
  p1FundHz = fundSliderToHz(parseInt(document.getElementById('fundamental-slider').value));
  updateFundamentalDisplay();
  const active = document.querySelector('.preset-btn[data-preset].active');
  const presetName = active ? active.dataset.preset : null;
  if (presetName && presetName !== 'clear') {
    const f0 = Math.max(MIN_FUND, p1FundHz);
    p1Components = Array.from({length:NUM}, ()=>({freq:0,amp:0}));
    if (presetName === 'sine') { p1Components[0]={freq:f0,amp:1}; }
    else if (presetName === 'square') { let s=0; for(let n=1;n<=63&&s<NUM;n+=2){ const f=f0*n; if(f>MAX_FREQ)break; p1Components[s++]={freq:f,amp:1/n}; } }
    else if (presetName === 'sawtooth') { for(let n=1;n<=NUM;n++){ const f=f0*n; if(f>MAX_FREQ)break; p1Components[n-1]={freq:f,amp:1/n}; } }
    else if (presetName === 'triangle') { let s=0; for(let n=1;n<=63&&s<NUM;n+=2){ const f=f0*n; if(f>MAX_FREQ)break; p1Components[s++]={freq:f,amp:1/(n*n)}; } }

    if (p1PresetPlaying) {
      updatePresetOscFreqs();
      renderHarmonicsList();
    } else {
      renderHarmonicsList();
      drawP1Graphs();
    }
  }
}
function updateFundamentalDisplay() {
  const hz = p1FundHz;
  const inputVal = p1FundUnit==='khz' ? (hz/1000).toFixed(4) : hz.toFixed(2);
  const active = document.activeElement;
  if (!active || active.id !== 'fundamental-input') {
    document.getElementById('fundamental-input').value = inputVal;
  }
}
function onFundamentalInputChange() {
  const inp = document.getElementById('fundamental-input');
  let v = parseFloat(inp.value);
  if (isNaN(v) || v <= 0) { updateFundamentalDisplay(); return; }
  const hz = p1FundUnit === 'khz' ? v * 1000 : v;
  p1FundHz = Math.max(MIN_FUND, Math.min(hz, MAX_FUND));
  document.getElementById('fundamental-slider').value = fundHzToSlider(p1FundHz);
  updateFundamentalDisplay();
  const active = document.querySelector('.preset-btn[data-preset].active');
  if (active && active.dataset.preset && active.dataset.preset !== 'clear') applyPreset(active.dataset.preset);
}

/* Note picker */
function onNoteSelect() {
  const note = document.getElementById('note-select').value;
  const oct  = document.getElementById('octave-select').value;
  if (!note) { document.getElementById('note-freq-display').textContent=''; return; }
  const f = noteToFreq(note, oct);
  document.getElementById('note-freq-display').textContent = f>=1000 ? `${(f/1000).toFixed(3)} kHz` : `${f.toFixed(2)} Hz`;
}
function setFundamentalFromNote() {
  const note = document.getElementById('note-select').value;
  const oct  = document.getElementById('octave-select').value;
  if (!note) return;
  const f = Math.max(MIN_FUND, Math.min(noteToFreq(note, oct), MAX_FUND));
  p1FundHz = f;
  document.getElementById('fundamental-input').value = p1FundUnit==='khz' ? (f/1000).toFixed(4) : f.toFixed(2);
  document.getElementById('fundamental-slider').value = fundHzToSlider(f);
  const active = document.querySelector('.preset-btn.active');
  if (active && active.dataset.preset && active.dataset.preset!=='clear') applyPreset(active.dataset.preset);
}

function updatePresetOscFreqs() {
  if (!p1PresetPlaying || p1PresetNoise) return;
  const active = p1Components.filter(c=>c.freq>0&&c.amp>0);
  if (!active.length) return;
  const total = active.reduce((s,c)=>s+c.amp,0)||1;
  p1PresetOscs.forEach((item, i) => {
    if (i < active.length) {
      item.osc.frequency.setTargetAtTime(active[i].freq, audioCtx.currentTime, 0.01);
      item.g.gain.setTargetAtTime(active[i].amp/total, audioCtx.currentTime, 0.01);
    }
  });
}

function onP1VolumeChange() {
  const v = parseFloat(document.getElementById('p1-volume').value);
  document.getElementById('p1-vol-label').textContent = Math.round(v*100)+'%';
  if (p1PresetGain) p1PresetGain.gain.value = v;
}

function toggleP1Unified() {
  p1PresetPlaying ? stopP1Unified() : startP1Unified();
}

function startP1Unified() {
  ensureAudioCtx();
  stopP1Unified();
  const vol = parseFloat(document.getElementById('p1-volume').value);

  // ── Preset / noise ──
  p1PresetGain     = audioCtx.createGain();
  p1PresetGain.gain.value = vol;
  p1PresetAnalyser = audioCtx.createAnalyser();
  p1PresetAnalyser.fftSize = 8192;
  p1PresetAnalyser.smoothingTimeConstant = 0.75;
  p1PresetGain.connect(p1PresetAnalyser);
  p1PresetAnalyser.connect(audioCtx.destination);

  if (p1NoiseType !== 'off') {
    startNoiseInto(p1NoiseType, p1PresetGain, nodes => p1PresetNoise=nodes);
  } else {
    const active = p1Components.filter(c=>c.freq>0&&c.amp>0);
    if (!active.length) { stopP1Unified(); return; }
    const total = active.reduce((s,c)=>s+c.amp,0)||1;
    active.forEach(c=>{
      const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
      osc.type='sine'; osc.frequency.value=c.freq; g.gain.value=c.amp/total;
      osc.connect(g); g.connect(p1PresetGain); osc.start();
      p1PresetOscs.push({osc,g});
    });
  }
  p1PresetPlaying = true;
  (function loop(){
    if (!p1PresetPlaying) return;
    drawLiveTime('p1-canvas-time', p1PresetAnalyser);
    drawLiveFreq('p1-canvas-freq', p1PresetAnalyser);
    p1PresetAnim = requestAnimationFrame(loop);
  })();
  document.getElementById('p1-unified-play-btn').textContent = '⏸ Pause';
}

function stopP1Unified() {
  // Stop preset nodes
  p1PresetOscs.forEach(({osc})=>{try{osc.stop();}catch(e){}});
  p1PresetOscs=[];
  if (p1PresetNoise) { try{p1PresetNoise.stop();}catch(e){} p1PresetNoise=null; }
  p1PresetPlaying = false;
  cancelAnimationFrame(p1PresetAnim);
  document.getElementById('p1-unified-play-btn').textContent = '▶ Play';
  drawP1Graphs();
}

function applyPreset(name) {
  if (name !== 'clear') applyNoise('off', true);
  document.querySelectorAll('.preset-btn[data-preset]').forEach(b=>b.classList.remove('active'));
  const btn = document.querySelector(`.preset-btn[data-preset="${name}"]`);
  if (btn) btn.classList.add('active');

  const f0 = Math.max(1, p1FundHz);
  p1Components = Array.from({length:NUM}, ()=>({freq:0,amp:0}));

  if (name==='sine')     { p1Components[0]={freq:f0,amp:1}; }
  else if (name==='square')   { let s=0; for(let n=1;n<=63&&s<NUM;n+=2){ const f=f0*n; if(f>MAX_FREQ)break; p1Components[s++]={freq:f,amp:1/n}; } }
  else if (name==='sawtooth') { for(let n=1;n<=NUM;n++){ const f=f0*n; if(f>MAX_FREQ)break; p1Components[n-1]={freq:f,amp:1/n}; } }
  else if (name==='triangle') { let s=0; for(let n=1;n<=63&&s<NUM;n+=2){ const f=f0*n; if(f>MAX_FREQ)break; p1Components[s++]={freq:f,amp:1/(n*n)}; } }

  if (p1PresetPlaying) { stopP1Unified(); startP1Unified(); }
  renderHarmonicsList();
  drawP1Graphs();
}
function applyNoise(type, silent) {
  p1NoiseType = type;
  document.querySelectorAll('.noise-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`noise-${type==='off'?'off':type}-btn`).classList.add('active');
  const lbl = document.getElementById('p1-noise-label');
  lbl.style.display = type!=='off' ? 'inline-block' : 'none';
  if (type!=='off') lbl.textContent = type.charAt(0).toUpperCase()+type.slice(1)+' Noise';
  if (!silent) { if (p1PresetPlaying) { stopP1Unified(); startP1Unified(); } drawP1Graphs(); }
}

function drawP1Graphs() {
  if (p1PresetPlaying) return;
  if (p1NoiseType!=='off') { drawNoiseTime('p1-canvas-time', p1NoiseType); drawNoiseFreq('p1-canvas-freq', p1NoiseType); }
  else { drawStaticTime('p1-canvas-time', p1Components); drawStaticFreq('p1-canvas-freq', p1Components); }
}

function renderHarmonicsList() {
  const list = document.getElementById('harmonics-list');
  list.innerHTML = '';
  for (let i=0;i<NUM;i++) {
    const row = document.createElement('div');
    row.className = 'harmonic-row';
    const dv = freqDispVal(p1Components[i].freq, p1RowUnit[i]);
    row.innerHTML = `
      <span class="idx">${i+1}</span>
      <div class="freq-input-wrap">
        <input type="text" id="p1freq-${i}" value="${dv||''}" placeholder="${p1RowUnit[i]==='khz'?'kHz':'Hz'}"
          oninput="onP1FreqChange(${i},this.value)"
          class="${p1Components[i].freq>0?'active-freq':''}"/>
        <span class="freq-unit-toggle" id="p1unit-${i}" onclick="toggleP1RowUnit(${i})">${p1RowUnit[i]==='khz'?'kHz':'Hz'}</span>
      </div>
      <input type="range" id="p1amp-${i}" min="0" max="1" step="0.01" value="${p1Components[i].amp}"
        oninput="onP1AmpChange(${i},this.value)"/>
      <span class="amp-val" id="p1ampval-${i}">${Math.round(p1Components[i].amp*100)}%</span>`;
    list.appendChild(row);
  }
}
function toggleComponentsCollapse() {
  const content = document.getElementById('components-content');
  const toggle = document.getElementById('components-toggle');
  p1ComponentsCollapsed = !p1ComponentsCollapsed;
  if (p1ComponentsCollapsed) {
    content.classList.add('collapsed');
    toggle.textContent = '▶';
  } else {
    content.classList.remove('collapsed');
    toggle.textContent = '▼';
  }
}
function freqDispVal(hz, unit) {
  if (!hz||hz<=0) return '';
  return unit==='khz' ? +((hz/1000).toFixed(5)) : +(hz.toFixed(2));
}
function toggleP1RowUnit(i) {
  p1RowUnit[i] = p1RowUnit[i]==='hz'?'khz':'hz';
  const inp = document.getElementById(`p1freq-${i}`);
  inp.placeholder = p1RowUnit[i]==='khz'?'kHz':'Hz';
  inp.value = freqDispVal(p1Components[i].freq, p1RowUnit[i])||'';
  document.getElementById(`p1unit-${i}`).textContent = p1RowUnit[i]==='khz'?'kHz':'Hz';
}
function onP1FreqChange(i, val) {
  const v=parseFloat(val), hz=p1RowUnit[i]==='khz'?v*1000:v;
  p1Components[i].freq = (!isNaN(hz)&&hz>0) ? Math.min(hz,MAX_FREQ) : 0;
  document.getElementById(`p1freq-${i}`).classList.toggle('active-freq', p1Components[i].freq>0);
  // Clear preset selection since user is manually editing
  document.querySelectorAll('.preset-btn[data-preset]').forEach(b=>b.classList.remove('active'));
  if (p1PresetPlaying) updatePresetOscFreqs();
  drawP1Graphs();
}
function onP1AmpChange(i, val) {
  p1Components[i].amp = parseFloat(val);
  document.getElementById(`p1ampval-${i}`).textContent = Math.round(p1Components[i].amp*100)+'%';
  // Clear preset selection since user is manually editing
  document.querySelectorAll('.preset-btn[data-preset]').forEach(b=>b.classList.remove('active'));
  if (p1PresetPlaying) updatePresetOscFreqs();
  drawP1Graphs();
}
