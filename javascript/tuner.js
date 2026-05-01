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
  // Default to Middle C
  setTunerMiddleC();
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

let tunerNoteOsc = null;
let tunerNoteGain = null;
let tunerNotePlaying = false;
let tunerAlternating = false;
let tunerAlternatingInterval = null;
const ALTERNATING_PERIOD = 1000; // 1 second

function togglePlayTargetNote() {
  if (tunerNotePlaying || tunerAlternating) {
    stopTargetNote();
  } else {
    startTargetNote();
  }
}

function playNoteSound() {
  if (!tunerTargetFreq || tunerNotePlaying) return;
  const now = audioCtx.currentTime;
  tunerNoteOsc = audioCtx.createOscillator();
  tunerNoteGain = audioCtx.createGain();
  tunerNoteOsc.type = 'sine';
  tunerNoteOsc.frequency.setValueAtTime(tunerTargetFreq, now);
  tunerNoteGain.gain.setValueAtTime(0, now);
  tunerNoteGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
  tunerNoteOsc.connect(tunerNoteGain);
  tunerNoteGain.connect(getMasterGain());
  tunerNoteOsc.start(now);
  tunerNotePlaying = true;
}

function stopNoteSound() {
  if (tunerNoteOsc) {
    try {
      tunerNoteGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      tunerNoteOsc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
    tunerNoteOsc = null;
    tunerNoteGain = null;
  }
  tunerNotePlaying = false;
}

function startTargetNote() {
  if (!tunerTargetFreq) return;
  ensureAudioCtx();
  stopTargetNote(); // Stop any existing note

  if (tunerActive) {
    // Tuner is active, enter alternating mode
    tunerAlternating = true;
    playNoteSound();

    // Set up timer to alternate every second
    tunerAlternatingInterval = setInterval(() => {
      if (tunerNotePlaying) {
        stopNoteSound();
        document.getElementById('tuner-status').textContent = 'Listening...';
      } else {
        playNoteSound();
        document.getElementById('tuner-status').textContent = 'Note playing...';
      }
    }, ALTERNATING_PERIOD);

    document.getElementById('tuner-play-note-btn').textContent = '⏹ Alternating';
    document.getElementById('tuner-status').textContent = 'Note playing...';
  } else {
    // Normal behavior - just play the note
    playNoteSound();
    document.getElementById('tuner-play-note-btn').textContent = '⏹ Stop Note';
  }
}

function stopTargetNote() {
  // Stop alternating mode if active
  if (tunerAlternating) {
    tunerAlternating = false;
    if (tunerAlternatingInterval) {
      clearInterval(tunerAlternatingInterval);
      tunerAlternatingInterval = null;
    }
  }
  stopNoteSound();
  document.getElementById('tuner-play-note-btn').textContent = '🔊 Play Note';
  if (tunerActive) {
    document.getElementById('tuner-status').textContent = 'Listening...';
  }
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
    // Stop other mic-using features to avoid conflicts and feedback
    if (typeof stopLiveMonitor === 'function') stopLiveMonitor();
    if (typeof stopRecording === 'function') stopRecording();

    const stream = await navigator.mediaDevices.getUserMedia({audio:true, video:false});
    tunerStream = stream;
    
    // Use a separate AudioContext for the tuner mic input.
    // This physically isolates the microphone from the shared audioCtx 
    // that is connected to the speakers, preventing any possibility of feedback.
    tunerAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (tunerAudioCtx.state === 'suspended') await tunerAudioCtx.resume();

    tunerAnalyser = tunerAudioCtx.createAnalyser();
    tunerAnalyser.fftSize = TUNER_FFT_SIZE;
    tunerAnalyser.smoothingTimeConstant = 0.8;
    const source = tunerAudioCtx.createMediaStreamSource(stream);
    source.connect(tunerAnalyser);
    // Analyser is NOT connected to tunerAudioCtx.destination - completely silent

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
      if (!tunerNotePlaying) {
        // Only process and draw when note is not playing (listening phase)
        processTunerData();
        drawLiveTime('tuner-canvas-time', tunerAnalyser);
        drawTunerFreq();
      }
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
  // Close the separate tuner AudioContext
  if (tunerAudioCtx && tunerAudioCtx.state !== 'closed') {
    tunerAudioCtx.close();
  }
  tunerAudioCtx = null;
  tunerAnalyser = null;
  tunerActive = false;
  // Stop alternating mode if active
  if (tunerAlternating) {
    tunerAlternating = false;
    if (tunerAlternatingInterval) {
      clearInterval(tunerAlternatingInterval);
      tunerAlternatingInterval = null;
    }
  }
  stopNoteSound();
  document.getElementById('tuner-start-btn').textContent = '▶ Start Tuner';
  document.getElementById('tuner-play-note-btn').textContent = '🔊 Play Note';
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
  const vbar = document.getElementById('tuner-vbar');
  const barLow = document.getElementById('tuner-bar-low');
  const barMid = document.getElementById('tuner-bar-mid');
  const barHigh = document.getElementById('tuner-bar-high');
  vbar.style.left = '50%';
  barLow.style.background = 'var(--border)';
  barMid.style.background = 'var(--border)';
  barHigh.style.background = 'var(--border)';
  document.getElementById('tuner-display-cents').textContent = '—';
  document.getElementById('tuner-indicator').textContent = 'OFF';
  document.getElementById('tuner-indicator').className = 'tuner-indicator tuner-off';
}

function processTunerData() {
  // Skip pitch detection while reference note is playing to avoid feedback loop
  if (tunerNotePlaying) return;
  if (!tunerAnalyser || !tunerTargetFreq) return;

  const bufLen = tunerAnalyser.frequencyBinCount;
  const data = new Float32Array(bufLen);
  tunerAnalyser.getFloatTimeDomainData(data);

  const sampleRate = tunerAudioCtx ? tunerAudioCtx.sampleRate : 44100;
  // Detect pitch using autocorrelation
  const detectedFreq = detectPitchAutoCorr(data, sampleRate, 50, 2000);
  const centsLabel = document.getElementById('tuner-display-cents');
  const indicator = document.getElementById('tuner-indicator');
  const vbar = document.getElementById('tuner-vbar');
  const barLow = document.getElementById('tuner-bar-low');
  const barMid = document.getElementById('tuner-bar-mid');
  const barHigh = document.getElementById('tuner-bar-high');

  if (!detectedFreq || detectedFreq < 30 || detectedFreq > 5000 || !isStablePitch(data)) {
    centsLabel.textContent = '—';
    indicator.textContent = 'NO pitch';
    indicator.className = 'tuner-indicator tuner-off';
    vbar.style.left = '50%';
    barLow.style.background = 'var(--border)';
    barMid.style.background = 'var(--border)';
    barHigh.style.background = 'var(--border)';
    return;
  }

  const cents = Math.round(1200 * Math.log2(detectedFreq / tunerTargetFreq));
  centsLabel.textContent = (cents > 0 ? '+' : '') + cents + '¢';

  // Update vertical bar position (0% = -50 cents, 100% = +50 cents)
  const pct = Math.max(0, Math.min(100, (cents + 50) * 2));
  vbar.style.left = pct + '%';

  // Update bar colors based on deviation
  if (Math.abs(cents) <= 5) {
    indicator.textContent = 'IN TUNE';
    indicator.className = 'tuner-indicator in-tune';
    barLow.style.background = 'var(--green)';
    barMid.style.background = 'var(--green)';
    barHigh.style.background = 'var(--green)';
  } else if (cents > 0) {
    indicator.textContent = 'TOO HIGH';
    indicator.className = 'tuner-indicator high';
    barLow.style.background = 'var(--red)';
    barMid.style.background = cents > 25 ? 'var(--red)' : 'var(--border)';
    barHigh.style.background = 'var(--red)';
  } else {
    indicator.textContent = 'TOO LOW';
    indicator.className = 'tuner-indicator low';
    barLow.style.background = 'var(--accent)';
    barMid.style.background = cents < -25 ? 'var(--accent)' : 'var(--border)';
    barHigh.style.background = 'var(--accent)';
  }
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

  const freqData = new Uint8Array(tunerAnalyser.frequencyBinCount);
  tunerAnalyser.getByteFrequencyData(freqData);
  const sampleRate = tunerAudioCtx ? tunerAudioCtx.sampleRate : 44100;

  drawGrid(ctx, W, H);

  // Use shared spectrum display function
  drawFreqBars(ctx, W, H, freqData, sampleRate, 'tuner-canvas-freq');

  // Draw target marker if set
  if (tunerTargetFreq) {
    const maxDisplay = 32000; // Fixed max display (spectrum range selector removed)
    const MIN_FREQ_LOG = 10;
    const padX = 40;
    const padBot = 22;
    const usableW = W - padX - 10;

    if (tunerTargetFreq <= maxDisplay) {
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
  }
}