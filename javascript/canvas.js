// ════════════════════════════════════════════════════════
// CANVAS HELPERS
// ════════════════════════════════════════════════════════

function setupCanvas(canvas) {
  const dpr=window.devicePixelRatio||1;
  const W=canvas.clientWidth, H=canvas.clientHeight;
  canvas.width=W*dpr; canvas.height=H*dpr;
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  return ctx;
}
function dims(canvas){ return {W:canvas.clientWidth,H:canvas.clientHeight}; }
function drawGrid(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='#1e2235'; ctx.lineWidth=1;
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,(H/4)*i);ctx.lineTo(W,(H/4)*i);ctx.stroke();}
  for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo((W/6)*i,0);ctx.lineTo((W/6)*i,H);ctx.stroke();}
  ctx.strokeStyle='#2a2f4a'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();
}
function drawNoDataText(ctx,W,H,msg){
  ctx.fillStyle='#2e3250'; ctx.font='13px Segoe UI'; ctx.textAlign='center';
  ctx.fillText(msg,W/2,H/2+5);
}
function drawAxisLabels(ctx,W,H,left,right){
  ctx.fillStyle='#475569'; ctx.font='10px Segoe UI';
  ctx.textAlign='left';  ctx.fillText(left,4,H-4);
  ctx.textAlign='right'; ctx.fillText(right,W-4,H-4);
}
