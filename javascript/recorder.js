// ════════════════════════════════════════════════════════
// PAGE 3 — RECORDER
// ════════════════════════════════════════════════════════

let mediaRecorder  = null;
let isRecording    = false;
let isLiveMonitor = false;
let liveStream    = null;
let liveCtx       = null;
let liveAnalyser  = null;
let liveAnim      = null;
let recChunks      = [];
let recCountdown   = null;
let recordedBlob   = null;
let recordedBuffer = null; // decoded AudioBuffer
let pbAudioCtx     = null;
let pbSource       = null;
let pbAnalyser     = null;
let pbGain         = null;
let pbPlaying      = false;
let pbLooping      = false;
let pbStartTime    = 0;
let pbOffset       = 0;
let pbAnim         = null;
let pbLoopStartTime = 0;
let recAnalyser    = null;
let recAnim        = null;

function onRecVolChange() {
  const v=parseFloat(document.getElementById('rec-vol').value);
  document.getElementById('rec-vol-label').textContent=Math.round(v*100)+'%';
  if (pbGain) pbGain.gain.value=v;
}

async function toggleLiveMonitor() {
  if (isLiveMonitor) {
    stopLiveMonitor();
  } else {
    await startLiveMonitor();
  }
}

async function startLiveMonitor() {
  try {
    if (isRecording) stopRecording();
    const stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    liveStream = stream;
    liveCtx = new (window.AudioContext||window.webkitAudioContext)();
    liveAnalyser = liveCtx.createAnalyser();
    liveAnalyser.fftSize = 8192;
    liveAnalyser.smoothingTimeConstant = 0.6;
    const source = liveCtx.createMediaStreamSource(stream);
    source.connect(liveAnalyser);

    isLiveMonitor = true;
    document.getElementById('live-monitor').checked = true;
    document.getElementById('live-status').textContent = 'Monitoring live audio';
    document.getElementById('live-status').classList.add('ok');
    document.getElementById('no-rec-time').style.display='none';
    document.getElementById('no-rec-freq').style.display='none';

    const timeTag = document.getElementById('rec-time-tag');
    const freqTag = document.getElementById('rec-freq-tag');
    timeTag.textContent = 'Live';
    freqTag.textContent = 'Live';
    timeTag.className = 'tag tag-live';
    freqTag.className = 'tag tag-live';

    (function liveLoop() {
      if (!isLiveMonitor) return;
      drawLiveTime('rec-canvas-time', liveAnalyser);
      drawLiveFreq('rec-canvas-freq', liveAnalyser);
      liveAnim = requestAnimationFrame(liveLoop);
    })();
  } catch(e) {
    document.getElementById('live-status').textContent = 'Microphone access denied';
  }
}

function stopLiveMonitor() {
  cancelAnimationFrame(liveAnim);
  if (liveStream) {
    liveStream.getTracks().forEach(t => t.stop());
    liveStream = null;
  }
  if (liveCtx) {
    liveCtx.close();
    liveCtx = null;
  }
  liveAnalyser = null;
  isLiveMonitor = false;
  document.getElementById('live-monitor').checked = false;
  document.getElementById('live-status').textContent = 'Monitor off';
  document.getElementById('live-status').classList.remove('ok');

  const timeTag = document.getElementById('rec-time-tag');
  const freqTag = document.getElementById('rec-freq-tag');
  timeTag.textContent = 'Recorded';
  freqTag.textContent = 'Recorded';
  timeTag.className = 'tag tag-rec';
  freqTag.className = 'tag tag-rec';

  if (!recordedBuffer) {
    document.getElementById('no-rec-time').style.display='flex';
    document.getElementById('no-rec-freq').style.display='flex';
  }
}

async function toggleRecord() {
  isRecording ? stopRecording() : await startRecording();
}
async function startRecording() {
  try {
    if (isLiveMonitor) stopLiveMonitor();
    const stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    recChunks=[]; recordedBlob=null; recordedBuffer=null;
    document.getElementById('pb-btn').disabled=true;
    document.getElementById('pb-progress').style.width='0%';

    const recCtx = new (window.AudioContext||window.webkitAudioContext)();
    recAnalyser = recCtx.createAnalyser();
    recAnalyser.fftSize = 8192;
    recAnalyser.smoothingTimeConstant = 0.6;
    const micSource = recCtx.createMediaStreamSource(stream);
    micSource.connect(recAnalyser);

    mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>recChunks.push(e.data);
    mediaRecorder.onstop=processRecording;
    mediaRecorder.start();
    isRecording=true;
    document.getElementById('rec-btn').textContent='⏹ Stop';
    document.getElementById('rec-btn').classList.add('recording');
    document.getElementById('no-rec-time').style.display='none';
    document.getElementById('no-rec-freq').style.display='none';
    const timeTag = document.getElementById('rec-time-tag');
    const freqTag = document.getElementById('rec-freq-tag');
    timeTag.textContent = 'Live';
    freqTag.textContent = 'Live';
    timeTag.className = 'tag tag-live';
    freqTag.className = 'tag tag-live';

    let rem=parseInt(document.getElementById('rec-duration').value);
    setRecStatus(`🔴 Recording… ${rem}s remaining`);
    recCountdown=setInterval(()=>{
      rem--;
      if (rem<=0){clearInterval(recCountdown);stopRecording();}
      else setRecStatus(`🔴 Recording… ${rem}s remaining`);
    },1000);

    (function liveLoop() {
      if (!isRecording) return;
      drawLiveTime('rec-canvas-time', recAnalyser);
      drawLiveFreq('rec-canvas-freq', recAnalyser);
      recAnim = requestAnimationFrame(liveLoop);
    })();
  } catch(e) { setRecStatus('⚠️ Microphone access denied'); }
}
function stopRecording() {
  clearInterval(recCountdown);
  cancelAnimationFrame(recAnim);
  if (mediaRecorder&&mediaRecorder.state!=='inactive') mediaRecorder.stop();
  mediaRecorder?.stream?.getTracks().forEach(t=>t.stop());
  isRecording=false;
  recAnalyser = null;
  document.getElementById('rec-btn').textContent='⏺ Record';
  document.getElementById('rec-btn').classList.remove('recording');
  const timeTag = document.getElementById('rec-time-tag');
  const freqTag = document.getElementById('rec-freq-tag');
  timeTag.textContent = 'Recorded';
  freqTag.textContent = 'Recorded';
  timeTag.className = 'tag tag-rec';
  freqTag.className = 'tag tag-rec';
  setRecStatus('Processing…');
}
async function processRecording() {
  recordedBlob = new Blob(recChunks, {type:'audio/webm'});
  const ab = await recordedBlob.arrayBuffer();
  const tmp = new (window.AudioContext||window.webkitAudioContext)();
  try { recordedBuffer = await tmp.decodeAudioData(ab); }
  catch(e){ setRecStatus('⚠️ Could not decode audio'); return; }
  setRecStatus(`✅ ${recordedBuffer.duration.toFixed(2)}s · ${recordedBuffer.sampleRate} Hz — ready`, true);
  document.getElementById('pb-time-dur').textContent = recordedBuffer.duration.toFixed(2)+'s';
  document.getElementById('no-rec-time').style.display='none';
  document.getElementById('no-rec-freq').style.display='none';
  document.getElementById('pb-btn').disabled=false;
  drawRecordedTime(recordedBuffer.getChannelData(0), recordedBuffer.sampleRate);
  drawRecordedFreq(recordedBuffer.getChannelData(0), recordedBuffer.sampleRate);
}

/* Playback */
function togglePlayback() { pbPlaying ? stopPlayback() : startPlayback(); }

function startPlayback() {
  if (!recordedBuffer) return;
  stopPlayback();

  pbLooping = document.getElementById('pb-loop').checked;
  pbAudioCtx = new (window.AudioContext||window.webkitAudioContext)();
  pbGain     = pbAudioCtx.createGain();
  pbGain.gain.value = parseFloat(document.getElementById('rec-vol').value);
  pbAnalyser = pbAudioCtx.createAnalyser();
  pbAnalyser.fftSize=8192; pbAnalyser.smoothingTimeConstant=0.6;
  pbGain.connect(pbAnalyser); pbAnalyser.connect(pbAudioCtx.destination);

  pbSource = pbAudioCtx.createBufferSource();
  pbSource.buffer = recordedBuffer;
  pbSource.loop = pbLooping;
  pbSource.connect(pbGain);
  pbSource.onended = () => {
    if (pbPlaying && !pbLooping) stopPlayback();
  };
  pbStartTime = pbAudioCtx.currentTime;
  pbOffset    = 0;
  if (pbLooping) pbLoopStartTime = pbAudioCtx.currentTime;
  pbSource.start(0);
  pbPlaying   = true;
  document.getElementById('pb-btn').textContent='■ Stop';

  const dur = recordedBuffer.duration;
  (function loop(){
    if (!pbPlaying) return;
    let elapsed;
    if (pbLooping) {
      elapsed = pbAudioCtx.currentTime - pbLoopStartTime;
      elapsed = elapsed % dur;
    } else {
      elapsed = pbAudioCtx.currentTime - pbStartTime;
    }
    const pct = Math.min(elapsed/dur,1)*100;
    document.getElementById('pb-progress').style.width=pct+'%';
    document.getElementById('pb-time-cur').textContent=elapsed.toFixed(2)+'s';

    // Draw live time & freq from playback analyser
    drawLiveTime('rec-canvas-time', pbAnalyser);
    drawLiveFreq('rec-canvas-freq', pbAnalyser);
    // Draw playback cursor on overlay
    drawPlaybackCursor(elapsed/dur);

    pbAnim=requestAnimationFrame(loop);
  })();
}

function stopPlayback() {
  cancelAnimationFrame(pbAnim);
  if (pbSource) { try{pbSource.stop();}catch(e){} pbSource=null; }
  pbPlaying=false;
  document.getElementById('pb-btn').textContent='▶ Play Recording';
  document.getElementById('pb-progress').style.width='0%';
  document.getElementById('pb-time-cur').textContent='0.00s';
  // Restore static graphs
  if (recordedBuffer) {
    drawRecordedTime(recordedBuffer.getChannelData(0), recordedBuffer.sampleRate);
    drawRecordedFreq(recordedBuffer.getChannelData(0), recordedBuffer.sampleRate);
  }
}

function onLoopToggle() {
  if (pbPlaying) {
    pbLooping = document.getElementById('pb-loop').checked;
    if (pbSource) pbSource.loop = pbLooping;
    if (pbLooping) pbLoopStartTime = pbAudioCtx.currentTime;
  }
}

function drawPlaybackCursor(frac) {
  const canvas = document.getElementById('rec-cursor-time');
  const dpr    = window.devicePixelRatio||1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width!==W*dpr||canvas.height!==H*dpr){ canvas.width=W*dpr; canvas.height=H*dpr; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W*dpr,H*dpr);
  ctx.save(); ctx.scale(dpr,dpr);
  const x = frac*W;
  ctx.strokeStyle='rgba(251,191,36,0.85)'; ctx.lineWidth=2;
  ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
  ctx.restore();
}

function setRecStatus(msg, ok) {
  const el=document.getElementById('rec-status');
  el.textContent=msg;
  el.className='rec-status'+(ok?' ok':'');
}

function drawRecordedTime(data, sampleRate) {
  const canvas=document.getElementById('rec-canvas-time');
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  drawGrid(ctx,W,H);
  ctx.beginPath(); ctx.strokeStyle='#f87171'; ctx.lineWidth=1.2;
  for(let i=0;i<W;i++){
    const cy=H/2 - data[Math.floor(i/W*data.length)]*H*0.42;
    i===0?ctx.moveTo(i,cy):ctx.lineTo(i,cy);
  }
  ctx.stroke();
  drawAxisLabels(ctx,W,H,'0',(data.length/sampleRate).toFixed(2)+'s');
}

function drawRecordedFreq(data, sampleRate) {
  const canvas=document.getElementById('rec-canvas-freq');
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  drawGrid(ctx,W,H);

  const fftSize=Math.min(Math.pow(2,Math.ceil(Math.log2(data.length))),32768);
  const offCtx=new OfflineAudioContext(1,data.length,sampleRate);
  const src=offCtx.createBufferSource();
  const buf=offCtx.createBuffer(1,data.length,sampleRate);
  buf.copyToChannel(data,0); src.buffer=buf;
  const an=offCtx.createAnalyser(); an.fftSize=fftSize; an.smoothingTimeConstant=0;
  src.connect(an); an.connect(offCtx.destination); src.start(0);

  offCtx.startRendering().then(()=>{
    const fd=new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(fd);
    drawFreqBars(ctx,W,H,fd,sampleRate);
  });
}
