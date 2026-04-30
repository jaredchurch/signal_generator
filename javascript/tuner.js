// ════════════════════════════════════════════════════════
// PAGE 4 — TUNER
// ════════════════════════════════════════════════════════

let tunerActive = false;
let tunerStream = null;
let tunerAudioCtx = null;
let tunerAnalyser = null;
let tunerAnim = null;
let tunerTargetFreq = 0;
const TUNER_FFT_SIZE = 8192;
const TUNER_SAMPLE_RATE = 44100;

function initTuner() {
  const sel = document.getElementById('tuner-note-select');
  NOTE_NAMES.forEach(n => { const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
}

function onTunerNoteSelect() {
  const note = document.getElementById('tuner-note-select').value;
  const oct  = document.getElementById('tuner-octave-select').value;
  const lblNote = document.getElementById('tuner-display-note');
  const lblFreq = document.getElementById('tuner-display-freq');
  if (!note) {
    tunerTargetFreq = 0;
    lblNote.textContent = '—';
    lblFreq.textContent = '—';
  } else {
    tunerTargetFreq = noteToFreq(note, oct);
    lblNote.textContent = note + oct;
    lblFreq.textContent = tunerTargetFreq >= 1000 ? `${(tunerTargetFreq/1000).toFixed(3)} kHz` : `${tunerTargetFreq.toFixed(1)} Hz`;
  }
}

function setTunerMiddleC() {
  document.getElementById('tuner-note-select').value = 'C';
  document.getElementById('tuner-octave-select').value = '4';
  onTunerNoteSelect();
}

async function toggleTuner() {
  tunerActive ? stopTuner() : await startTuner();
}

async function startTuner() {
  if (!tunerTargetFreq) {
    document.getElementById('tuner-status').textContent = 'Select a target note first';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true, video:false});
    tunerStream = stream;
    tunerAudioCtx = ensureAudioCtx();
    tunerAnalyser = tunerAudioCtx.createAnalyser();
    tunerAnalyser.fftSize = TUNER_FFT_SIZE;
    tunerAnalyser.smoothingTimeConstant = 0.8;
    const source = tunerAudioCtx.createMediaStreamSource(stream);
    source.connect(tunerAnalyser);
    tunerAnalyser.connect(getMasterGain());

    tunerActive = true;
    document.getElementById('tuner-start-btn').textContent = '⏹ Stop Tuner';
    document.getElementById('tuner-status').textContent = 'Listening...';
    document.getElementById('tuner-status').classList.add('ok');
    document.getElementById('tuner-no-time').style.display = 'none';
    document.getElementById('tuner-no-freq').style.display = 'none';
    document.getElementById('tuner-live-tag').style.display = 'inline-block';
    document.getElementById('tuner-time-tag').style.display = 'inline-block';
    document.getElementById('tuner-freq-tag').style.display = 'inline-block';

    (function tunerLoop() {
      if (!tunerActive) return;
      processTunerData();
      drawLiveTime('tuner-canvas-time', tunerAnalyser);
      drawTunerFreq();
      tunerAnim = requestAnimationFrame(tunerLoop);
    })();
  } catch(e) {
    document.getElementById('tuner-status').textContent = 'Microphone access denied';
  }
}

function stopTuner() {
  cancelAnimationFrame(tunerAnim);
  if (tunerStream) {
    tunerStream.getTracks().forEach(t => t.stop());
    tunerStream = null;
  }
  // Don't close shared audioCtx - just disconnect analyser
  tunerAnalyser = null;
  tunerActive = false;
  document.getElementById('tuner-start-btn').textContent = '▶ Start Tuner';
  document.getElementById('tuner-status').textContent = 'Press Start to begin';
  document.getElementById('tuner-status').classList.remove('ok');
  document.getElementById('tuner-live-tag').style.display = 'none';
  document.getElementById('tuner-time-tag').style.display = 'none';
  document.getElementById('tuner-freq-tag').style.display = 'none';
  document.getElementById('tuner-no-time').style.display = 'flex';
  document.getElementById('tuner-no-freq').style.display = 'flex';
  resetTunerDisplay();
}

function resetTunerDisplay() {
  const needle = document.getElementById('tuner-needle');
  needle.style.transform = 'rotate(0deg)';
  needle.classList.remove('shaking');
  document.getElementById('tuner-display-cents').textContent = '—';
  document.getElementById('tuner-indicator').textContent = 'OFF';
  document.getElementById('tuner-indicator').className = 'tuner-indicator tuner-off';
}

function processTunerData() {
  if (!tunerAnalyser || !tunerTargetFreq) return;

  const bufLen = tunerAnalyser.frequencyBinCount;
  const data = new Float32Array(bufLen);
  tunerAnalyser.getFloatTimeDomainData(data);

  // Detect pitch using autocorrelation
  const detectedFreq = detectPitchAutoCorr(data, TUNER_SAMPLE_RATE, 50, 2000);
  const centsLabel = document.getElementById('tuner-display-cents');
  const indicator = document.getElementById('tuner-indicator');
  const needle = document.getElementById('tuner-needle');

  if (!detectedFreq || detectedFreq < 30 || detectedFreq > 5000 || !isStablePitch(data)) {
    centsLabel.textContent = '—';
    indicator.textContent = 'NO pitch';
    indicator.className = 'tuner-indicator tuner-off';
    needle.style.transform = 'rotate(0deg)';
    needle.classList.add('shaking');
    return;
  }

  const cents = Math.round(1200 * Math.log2(detectedFreq / tunerTargetFreq));
  centsLabel.textContent = (cents > 0 ? '+' : '') + cents + '¢';

  if (Math.abs(cents) <= 5) {
    indicator.textContent = 'IN TUNE';
    indicator.className = 'tuner-indicator in-tune';
  } else if (cents > 0) {
    indicator.textContent = 'TOO HIGH';
    indicator.className = 'tuner-indicator high';
  } else {
    indicator.textContent = 'TOO LOW';
    indicator.className = 'tuner-indicator low';
  }

  const angle = Math.max(-50, Math.min(50, cents));
  needle.style.transform = `rotate(${angle}deg)`;
  needle.classList.remove('shaking');
}

function detectPitchAutoCorr(data, sampleRate, minFreq, maxFreq) {
  const n = data.length;
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);

  let bestCorr = 0;
  let bestLag = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let norm = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += data[i] * data[i + lag];
      norm += data[i] * data[i + lag] + data[i + lag] * data[i + lag];
    }
    if (norm === 0) continue;
    corr /= norm / 2;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestCorr < 0.1 || bestLag === 0) return 0;
  return sampleRate / bestLag;
}

function isStablePitch(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
  return (sum / data.length) > 0.01;
}

function drawTunerFreq() {
  if (!tunerAnalyser) return;
  const canvas = document.getElementById('tuner-canvas-freq');
  const ctx = setupCanvas(canvas);
  const {W, H} = dims(canvas);

  const bufLen = tunerAnalyser.frequencyBinCount;
  const freqData = new Uint8Array(bufLen);
  tunerAnalyser.getByteFrequencyData(freqData);
  const sampleRate = TUNER_SAMPLE_RATE;

  drawGrid(ctx, W, H);

  const maxDisplay = 8000;
  const MIN_FREQ_LOG = 20;
  const padX = 40;
  const padBot = 22;
  const usableW = W - padX - 10;

  let maxVal = 0;
  for (let i = 0; i < freqData.length; i++) if (freqData[i] > maxVal) maxVal = freqData[i];
  if (maxVal === 0) maxVal = 255;

  const numBars = 200;
  for (let i = 0; i < numBars; i++) {
    const frac = i / numBars;
    const freq = MIN_FREQ_LOG * Math.pow(maxDisplay / MIN_FREQ_LOG, frac);
    const bin = Math.floor((freq / (sampleRate / 2)) * freqData.length);
    if (bin >= freqData.length) break;
    const x = padX + frac * usableW;
    const barH = (freqData[bin] / maxVal) * (H - padBot - 5);
    const isTargetBin = tunerTargetFreq && Math.abs(freq - tunerTargetFreq) < maxDisplay * 0.03;
    const hue = isTargetBin ? 140 : 200 + (freqData[bin] / 255) * 60;
    ctx.fillStyle = isTargetBin ? `rgba(52, 211, 153, .8)` : `hsl(${hue}, 80%, 60%)`;
    const barW = Math.max(1, (1 / numBars) * usableW - 1);
    ctx.fillRect(x, H - padBot - barH, barW, barH);
  }

  // Draw target marker if set
  if (tunerTargetFreq && tunerTargetFreq <= maxDisplay) {
    const targetFrac = Math.log(tunerTargetFreq / MIN_FREQ_LOG) / Math.log(maxDisplay / MIN_FREQ_LOG);
    const targetX = padX + targetFrac * usableW;
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(targetX, 0);
    ctx.lineTo(targetX, H - padBot);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = '#2e3250';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, H - padBot);
  ctx.lineTo(W, H - padBot);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '10px Segoe UI';
  ctx.textAlign = 'center';
  [50, 100, 200, 500, 1000, 2000, 4000, 8000].forEach(f => {
    if (f > maxDisplay) return;
    const x = padX + (Math.log(f / MIN_FREQ_LOG) / Math.log(maxDisplay / MIN_FREQ_LOG)) * usableW;
    ctx.fillText(f >= 1000 ? `${f/1000}k` : f, x, H - 5);
  });
}