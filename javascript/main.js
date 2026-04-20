// ════════════════════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════════════════════

function showTab(pageId) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  const idx = ['page-presets','page-recorder','page-tuner','page-metronome','page-pads'].indexOf(pageId);
  document.querySelectorAll('.tab')[idx].classList.add('active');
  localStorage.setItem('activeTab', pageId);
  // Redraw static graphs for the activated page
  if (pageId==='page-presets' && !p1PresetPlaying) drawP1Graphs();
  if (pageId==='page-recorder' && recordedBuffer && !pbPlaying) {
    drawRecordedTime(recordedBuffer.getChannelData(0),recordedBuffer.sampleRate);
    drawRecordedFreq(recordedBuffer.getChannelData(0),recordedBuffer.sampleRate);
  }
}

// ════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════

window.addEventListener('resize', ()=>{
  if (!p1PresetPlaying) drawP1Graphs();
});

// Restore active tab from localStorage
const savedTab = localStorage.getItem('activeTab');
if (savedTab && ['page-presets','page-recorder','page-tuner','page-metronome','page-pads'].includes(savedTab)) {
  showTab(savedTab);
}

initP1();
initTuner();
initPads();
