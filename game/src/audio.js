// Procedural WebAudio: engine hum, sirens, gunshots, pickup blips.
// No audio files — everything is oscillators and filtered noise. The context
// only starts on the first user gesture, per browser autoplay rules.
export function createAudio() {
  let ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return false; }
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(ctx.destination);
    engineOsc.start();
    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 700;
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain); sirenGain.connect(ctx.destination);
    sirenOsc.start();
    return true;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1800;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  }

  return {
    unlock() { ensure(); },
    shoot() { noiseBurst(0.09, 0.22, 1400); blip(160, 0.07, 'square', 0.1, 60); },
    hit() { noiseBurst(0.06, 0.12, 700); },
    crash(power) { noiseBurst(0.22, Math.min(0.4, 0.12 + power * 0.02), 320); },
    pickup() { blip(660, 0.09, 'sine', 0.12); setTimeout(() => blip(990, 0.12, 'sine', 0.12), 70); },
    cash() { blip(880, 0.08, 'triangle', 0.12); setTimeout(() => blip(1320, 0.14, 'triangle', 0.12), 80); },
    bust() { blip(300, 0.5, 'sawtooth', 0.12, 90); },
    setEngine(speedRatio, driving) {
      if (!ctx) return;
      const target = driving ? 0.05 + Math.abs(speedRatio) * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + Math.abs(speedRatio) * 130, ctx.currentTime, 0.08);
    },
    setSiren(active, t) {
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(active ? 0.028 : 0, ctx.currentTime, 0.15);
      if (active) sirenOsc.frequency.setTargetAtTime(650 + Math.sin(t * 4.2) * 220, ctx.currentTime, 0.05);
    },
  };
}
