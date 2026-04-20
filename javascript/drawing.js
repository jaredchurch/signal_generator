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
  const maxAmp=Math.max(...active.map(c=>c.amp));
  const padX=40,padBot=22,padTop=10;
  const MIN_FREQ_LOG = 10;
  active.forEach(c=>{
    const x=padX+(Math.log(c.freq/MIN_FREQ_LOG)/Math.log(MAX_FREQ/MIN_FREQ_LOG))*(W-padX-10);
    const barH=(c.amp/maxAmp)*(H-padTop-padBot);
    const y=H-padBot-barH;
    const grad=ctx.createLinearGradient(0,y,0,H-padBot);
    grad.addColorStop(0,'#6c8aff'); grad.addColorStop(1,'rgba(108,138,255,.15)');
    ctx.fillStyle=grad; ctx.fillRect(x-2,y,4,barH);
    ctx.fillStyle='#94a3b8'; ctx.font='9px Segoe UI'; ctx.textAlign='center';
    ctx.fillText(c.freq>=1000?`${(c.freq/1000).toFixed(1)}k`:`${Math.round(c.freq)}`,x,H-5);
  });
  ctx.strokeStyle='#2e3250'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padX,H-padBot); ctx.lineTo(W,H-padBot); ctx.stroke();
  drawLogFreqLabels(ctx,W,H,padX,padBot);
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
  const maxDisplay = Math.min(MAX_FREQ, nyquist);
  const MIN_FREQ_LOG = 10;
  const padX = 40;
  const padBot = 22;
  const usableW = W - padX - 10;

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
    const barH = (data[bin]/maxVal)*(H-padBot-5);
    const hue = 200+(data[bin]/255)*60;
    ctx.fillStyle=`hsl(${hue},80%,60%)`;
    const barW = Math.max(1, (1/numBars) * usableW - 1);
    ctx.fillRect(x, H-padBot-barH, barW, barH);
  }

  // X axis
  ctx.strokeStyle='#2e3250'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padX,H-padBot); ctx.lineTo(W,H-padBot); ctx.stroke();
  drawLogFreqLabels(ctx,W,H,padX,padBot);
}

function drawLogFreqLabels(ctx,W,H,padX,padBot) {
  ctx.fillStyle='#64748b'; ctx.font='10px Segoe UI'; ctx.textAlign='center';
  [10,20,50,100,200,500,1000,2000,5000,10000,20000].forEach(f=>{
    if(f>MAX_FREQ) return;
    const MIN_FREQ_LOG = 10;
    const x=padX+(Math.log(f/MIN_FREQ_LOG)/Math.log(MAX_FREQ/MIN_FREQ_LOG))*(W-padX-10);
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
  const MIN_FREQ_LOG = 10;
  for(let i=0;i<W;i++){
    const frac = i/(W-1);
    const freq = MIN_FREQ_LOG * Math.pow(MAX_FREQ/MIN_FREQ_LOG, frac);
    const f = freq/MAX_FREQ;
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
