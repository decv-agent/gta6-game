// Procedural WebAudio sound: engine hum, police siren, gunshots, pickups, crashes. No audio files.
// Audio starts lazily on the first user gesture (browser autoplay policy).
export function createAudio() {
  let ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, sirenT = 0;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(ctx.destination); engineOsc.start();
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(ctx.destination); sirenOsc.start();
    return ctx;
  }
  function blip(freq, dur, type = 'square', vol = 0.12, slide = 0) {
    if (!ensure()) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol, freq) {
    if (!ensure()) return; const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(ctx.destination); src.start(t);
  }
  return {
    unlock: () => ensure(),
    shot: () => noise(0.12, 0.25, 1800),
    pickup: () => { blip(660, 0.09); setTimeout(() => blip(990, 0.12), 70); },
    cash: () => { blip(880, 0.08, 'square', 0.1); setTimeout(() => blip(1320, 0.14, 'square', 0.1), 80); },
    crash: () => noise(0.25, 0.3, 500),
    hurt: () => blip(160, 0.15, 'sawtooth', 0.15, -80),
    busted: () => blip(392, 0.2, 'triangle', 0.14, -160),
    update(dt, driving, speedRatio, policeNear) {
      if (!ctx) return; sirenT += dt;
      engineGain.gain.value += ((driving ? 0.03 + speedRatio * 0.04 : 0) - engineGain.gain.value) * 0.2;
      if (engineOsc) engineOsc.frequency.value = 50 + speedRatio * 90;
      sirenGain.gain.value += ((policeNear ? 0.018 : 0) - sirenGain.gain.value) * 0.1;
      if (sirenOsc) sirenOsc.frequency.value = 650 + Math.sin(sirenT * 6) * 180;
    },
  };
}
