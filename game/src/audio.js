// Synthesized sound for The Velvet Heist: no audio files, just a small
// WebAudio blip machine. Everything is generated, so the game ships no
// samples and makes no network request.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type = 'sine', volume = 0.12, when = 0) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ac.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + when);
    osc.stop(ac.currentTime + when + duration + 0.02);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    loot() { tone(880, 0.09, 'sine', 0.12); tone(1318, 0.12, 'sine', 0.1, 0.07); },
    safe() { tone(523, 0.1, 'triangle', 0.12); tone(784, 0.1, 'triangle', 0.12, 0.09); tone(1046, 0.16, 'triangle', 0.12, 0.18); },
    door() { tone(330, 0.08, 'square', 0.06); tone(392, 0.1, 'square', 0.06, 0.07); },
    coin() { tone(1567, 0.07, 'sine', 0.08); },
    dash() { tone(220, 0.12, 'sawtooth', 0.05); },
    spotted() { tone(220, 0.18, 'sawtooth', 0.14); tone(174, 0.25, 'sawtooth', 0.14, 0.12); },
    caught() { tone(196, 0.3, 'sawtooth', 0.16); tone(147, 0.4, 'sawtooth', 0.16, 0.18); },
    lockdown() { tone(440, 0.15, 'square', 0.1); tone(440, 0.15, 'square', 0.1, 0.2); tone(440, 0.3, 'square', 0.1, 0.4); },
    clear() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.11, i * 0.1)); },
    victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.12, i * 0.12)); },
  };
}
