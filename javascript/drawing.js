// ════════════════════════════════════════════════════════
// SHARED DRAWING FUNCTIONS
// ════════════════════════════════════════════════════════

function drawStaticTime(canvasId, components) {
  const canvas=document.getElementById(canvasId);
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  drawGrid(ctx,W,H);
  const active=components.filter(c=>c.freq>0&&c.amp>0);
  if (!active.length){drawNoDataText(ctx,W,H,'Add frequencies');return;}
  const total=active.reduce((s,c)=>s+c.amp,0)||1;
  const minFreq=Math.min(...active.map(c=>c.freq));
  const dur=Math.min(3/minFreq,0.05);
  ctx.beginPath(); ctx.strokeStyle='#6c8aff'; ctx.lineWidth=1.5;
  for(let i=0;i<W;i++){
    const t=(i/W)*dur; let y=0;
    active.forEach(c=>y+=(c.amp/total)*Math.sin(2*Math.PI*c.freq*t));
    const cy=H/2-y*H*0.42;
    i===0?ctx.moveTo(i,cy):ctx.lineTo(i,cy);
  }
  ctx.stroke();
  drawAxisLabels(ctx,W,H,'0',(dur*1000).toFixed(2)+' ms');
}

function drawStaticFreq(canvasId, components) {
  const canvas=document.getElementById(canvasId);
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  drawGrid(ctx,W,H);
  const active=components.filter(c=>c.freq>0&&c.amp>0);
  if (!active.length){drawNoDataText(ctx,W,H,'Add frequencies');return;}

  // Convert component data to frequency spectrum data for drawFreqBars
  const maxDisplay = getSpectrumRange();
  const sampleRate = 44100; // Assume standard sample rate for display
  const nyquist = sampleRate / 2;
  const bufLen = 2048; // Match typical analyser fftSize
  const freqData = new Uint8Array(bufLen);

  // Map components to frequency bins
  const maxAmp = Math.max(...active.map(c=>c.amp));
  active.forEach(c=>{
    if (c.freq > maxDisplay || c.freq > nyquist) return;
    const bin = Math.floor((c.freq / nyquist) * bufLen);
    if (bin < bufLen) {
      // Scale amplitude to 0-255 range
      freqData[bin] = Math.max(freqData[bin], Math.round((c.amp / maxAmp) * 255));
    }
  });

  // Use shared spectrum display function
  drawFreqBars(ctx, W, H, freqData, sampleRate);

  // Draw frequency labels for components
  const padX = 40;
  const padBot = 22;
  ctx.fillStyle='#94a3b8'; ctx.font='9px Segoe UI'; ctx.textAlign='center';
  active.forEach(c=>{
    if (c.freq > maxDisplay) return;
    const MIN_FREQ_LOG = 10;
    const usableW = W - padX - 10;
    const x = padX + (Math.log(c.freq / MIN_FREQ_LOG) / Math.log(maxDisplay / MIN_FREQ_LOG)) * usableW;
    ctx.fillText(c.freq>=1000?`${(c.freq/1000).toFixed(1)}k`:`${Math.round(c.freq)}`,x,H-5);
  });
}

function drawLiveTime(canvasId, analyser) {
  const canvas=document.getElementById(canvasId);
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  const data=new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  drawGrid(ctx,W,H);
  ctx.beginPath(); ctx.strokeStyle='#34d399'; ctx.lineWidth=1.5;
  for(let i=0;i<W;i++){
    const cy=H/2-data[Math.floor(i/W*data.length)]*H*0.42;
    i===0?ctx.moveTo(i,cy):ctx.lineTo(i,cy);
  }
  ctx.stroke();
}

function drawLiveFreq(canvasId, analyser) {
  const canvas=document.getElementById(canvasId);
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  const bufLen=analyser.frequencyBinCount;
  const data=new Uint8Array(bufLen);
  analyser.getByteFrequencyData(data);
  const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
  drawGrid(ctx,W,H);
  drawFreqBars(ctx,W,H,data,sampleRate);
}

function drawFreqBars(ctx, W, H, data, sampleRate) {
  const nyquist = sampleRate/2;
  const maxDisplay = Math.min(getSpectrumRange(), nyquist);
  const MIN_FREQ_LOG = 10;
  const padX = 40;
  const padBot = 22;
  const usableW = W - padX - 10;
  const powerRange = getPowerRange(); // dB range to display

  // Find max value for normalization
  let maxVal = 0;
  for(let i=0;i<data.length;i++) if(data[i]>maxVal) maxVal=data[i];
  if(maxVal===0) maxVal=255;

  // Draw bars at logarithmic positions
  const numBars = 200;
  for(let i=0;i<numBars;i++){
    const frac = i/numBars;
    const freq = MIN_FREQ_LOG * Math.pow(maxDisplay/MIN_FREQ_LOG, frac);
    const bin = Math.floor((freq/nyquist)*data.length);
    if(bin >= data.length) break;
    const x = padX + frac * usableW;
    // Scale bar height based on power range (0 dB = full range, 80 dB = only loudest signals)
    const normalizedVal = data[bin] / maxVal;
    const barH = Math.pow(normalizedVal, powerRange / 40) * (H - padBot - 5);
    const hue = 200+(data[bin]/255)*60;
    ctx.fillStyle=`hsl(${hue},80%,60%)`;
    const barW = Math.max(1, (1/numBars) * usableW - 1);
    ctx.fillRect(x, H-padBot-barH, barW, barH);
  }

  // X axis
  ctx.strokeStyle='#2e3250'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padX,H-padBot); ctx.lineTo(W,H-padBot); ctx.stroke();
  drawLogFreqLabels(ctx,W,H,padX,padBot);

  // Y axis - power labels
  drawPowerAxis(ctx, W, H, padX, padBot, powerRange);
}

function drawPowerAxis(ctx, W, H, padX, padBot, powerRange) {
  ctx.fillStyle='#64748b';
  ctx.font='10px Segoe UI';
  ctx.textAlign='right';

  const graphH = H - padBot - 5;

  // dB values to display based on power range
  const dbValues = [0];
  const step = powerRange <= 40 ? 10 : 20;
  for (let db = -step; db >= -powerRange; db -= step) {
    dbValues.push(db);
  }

  for (const db of dbValues) {
    // Map dB to y-position using same formula as bar height
    // barH = 10^(dB/20 * powerRange/40) * graphH
    const exponent = (db / 20) * (powerRange / 40);
    const barH = Math.pow(10, exponent) * graphH;
    const y = H - padBot - barH;

    if (y < 5 || y > H - padBot - 2) continue;

    // Draw grid line
    ctx.strokeStyle='#1e2235';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(W, y);
    ctx.stroke();

    // Draw label
    ctx.fillText(`${db} dB`, padX - 5, y + 3);
  }
}

function drawLogFreqLabels(ctx,W,H,padX,padBot) {
  ctx.fillStyle='#64748b'; ctx.font='10px Segoe UI'; ctx.textAlign='center';
  const maxDisplay = getSpectrumRange();
  const MIN_FREQ_LOG = 10;
  [10,20,50,100,200,500,1000,2000,5000,10000,20000].forEach(f=>{
    if(f>maxDisplay) return;
    const x=padX+(Math.log(f/MIN_FREQ_LOG)/Math.log(maxDisplay/MIN_FREQ_LOG))*(W-padX-10);
    ctx.fillText(f>=1000?`${f/1000}k`:f, x, H-5);
  });
}

function drawNoiseTime(canvasId, type) {
  const canvas=document.getElementById(canvasId);
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  drawGrid(ctx,W,H);
  ctx.beginPath(); ctx.strokeStyle='#fbbf24'; ctx.lineWidth=1;
  for(let i=0;i<W;i++){
    const y=H/2+(Math.random()*2-1)*H*0.42;
    i===0?ctx.moveTo(i,y):ctx.lineTo(i,y);
  }
  ctx.stroke();
  ctx.fillStyle='#fbbf24'; ctx.font='11px Segoe UI'; ctx.textAlign='center';
  ctx.fillText(`${type.charAt(0).toUpperCase()+type.slice(1)} Noise — press Play for live view`,W/2,16);
}

function drawNoiseFreq(canvasId, type) {
  const canvas=document.getElementById(canvasId);
  const ctx=setupCanvas(canvas); const {W,H}=dims(canvas);
  drawGrid(ctx,W,H);
  const padBot=22;
  const padX=40;
  const minFreq = 10;
  const maxDisplay = getSpectrumRange();
  const usableW = W - padX - 10;
  for(let i=0;i<W;i++){
    const frac = i/usableW;
    const freq = minFreq * Math.pow(maxDisplay/minFreq, frac);
    const f = freq/maxDisplay;
    let amp;
    if (type==='white') amp=0.85+(Math.random()-.5)*.1;
    else if (type==='pink') amp=(1-f*.7)*(0.85+(Math.random()-.5)*.1);
    else amp=Math.pow(1-f,2)*(0.9+(Math.random()-.5)*.05);
    const barH=amp*(H-padBot-10);
    ctx.fillStyle=type==='white'?'rgba(200,210,255,.5)':type==='pink'?'rgba(251,150,200,.5)':'rgba(180,120,80,.5)';
    ctx.fillRect(i,H-padBot-barH,1,barH);
  }
  ctx.strokeStyle='#2e3250'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padX,H-padBot); ctx.lineTo(W,H-padBot); ctx.stroke();
  drawLogFreqLabels(ctx,W,H,padX,padBot);
}

/* Noise buffer generator */
function startNoiseInto(type, destNode, cb) {
  const SR=audioCtx.sampleRate, len=SR*2;
  const buf=audioCtx.createBuffer(1,len,SR);
  const d=buf.getChannelData(0);
  if (type==='white') {
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  } else if (type==='pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<len;i++){
      const w=Math.random()*2-1;
      b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.96900*b2+w*.1538520;
      b3=.86650*b3+w*.3104856; b4=.55000*b4+w*.5329522; b5=-.7616*b5-w*.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926;
    }
  } else {
    let last=0;
    for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+.02*w)/1.02; d[i]=last*3.5; }
  }
  const src=audioCtx.createBufferSource(); src.buffer=buf; src.loop=true;
  src.connect(destNode); src.start();
  if (cb) cb(src);
  return src;
}
