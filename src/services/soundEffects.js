// Web Audio API procedural retro sound generator

class RetroAudioEngine {
  constructor() {
    this.ctx = null;
    this.staticNode = null;
    this.staticGain = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setTargetAtTime(clamped * 0.8, this.ctx.currentTime, 0.05);
  }

  setMuted(muted) {
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  // Heavy mechanical rotary knob clunk
  playKnobClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // 1. Low mechanical thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.04);
    oscGain.gain.setValueAtTime(0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);

    // 2. High metallic click
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(1800, t);
    click.frequency.exponentialRampToValueAtTime(300, t + 0.02);
    clickGain.gain.setValueAtTime(0.4, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    click.connect(clickGain);
    clickGain.connect(this.masterGain);
    click.start(t);
    click.stop(t + 0.02);
  }

  // Toggle switch sound (Power / Modes)
  playSwitch(isOn = true) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isOn ? 220 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(isOn ? 440 : 80, t + 0.035);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Remote control infrared chirp
  playRemoteBeep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.setValueAtTime(3200, t + 0.015);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  // TV channel changing burst / RF flutter
  playChannelZap(duration = 0.35) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // White noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(4500, t + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(800, t + duration);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0.5, t + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  // CRT Degauss / Power On "THUMP-WHIRRR"
  playPowerOn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Degauss coil heavy resonant thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.7);

    // 2. High CRT flyback whistle build-up
    const flyback = this.ctx.createOscillator();
    const flybackGain = this.ctx.createGain();
    flyback.type = 'sine';
    flyback.frequency.setValueAtTime(3000, t + 0.1);
    flyback.frequency.exponentialRampToValueAtTime(14000, t + 0.8);

    flybackGain.gain.setValueAtTime(0.001, t);
    flybackGain.gain.exponentialRampToValueAtTime(0.06, t + 0.4);
    flybackGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    flyback.connect(flybackGain);
    flybackGain.connect(this.masterGain);
    flyback.start(t + 0.1);
    flyback.stop(t + 1.2);
  }

  // CRT Power Off high flyback collapse
  playPowerOff() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(12000, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.4);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  /**
   * A cassette being drawn into a VCR.
   *
   * Three movements, because that is what the machine actually did: the loading
   * motor pulling the carriage down, the clunk of it seating, and then the head
   * drum spinning up to speed behind it. The whole thing runs about 1.4s, which
   * is roughly how long a real deck took.
   */
  playTapeLoad() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Loading motor: filtered noise that slides down as the carriage drops.
    const motorLen = 0.7;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * motorLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * 0.4;
    const motor = this.ctx.createBufferSource();
    motor.buffer = buf;
    const motorFilter = this.ctx.createBiquadFilter();
    motorFilter.type = 'bandpass';
    motorFilter.frequency.setValueAtTime(900, t);
    motorFilter.frequency.exponentialRampToValueAtTime(280, t + motorLen);
    motorFilter.Q.value = 3.5;
    const motorGain = this.ctx.createGain();
    motorGain.gain.setValueAtTime(0.0001, t);
    motorGain.gain.exponentialRampToValueAtTime(0.16, t + 0.09);
    motorGain.gain.setValueAtTime(0.16, t + motorLen - 0.12);
    motorGain.gain.exponentialRampToValueAtTime(0.0001, t + motorLen);
    motor.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(this.masterGain);
    motor.start(t);
    motor.stop(t + motorLen);

    // 2. The clunk of the carriage seating: a short low thud with a click on top.
    const thudAt = t + motorLen - 0.02;
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(150, thudAt);
    thud.frequency.exponentialRampToValueAtTime(42, thudAt + 0.13);
    thudGain.gain.setValueAtTime(0.35, thudAt);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, thudAt + 0.18);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(thudAt);
    thud.stop(thudAt + 0.18);

    // 3. Head drum spinning up, which is what you actually heard last.
    const drumAt = thudAt + 0.06;
    const drum = this.ctx.createOscillator();
    const drumGain = this.ctx.createGain();
    drum.type = 'sawtooth';
    drum.frequency.setValueAtTime(38, drumAt);
    drum.frequency.exponentialRampToValueAtTime(96, drumAt + 0.55);
    const drumFilter = this.ctx.createBiquadFilter();
    drumFilter.type = 'lowpass';
    drumFilter.frequency.value = 420;
    drumGain.gain.setValueAtTime(0.0001, drumAt);
    drumGain.gain.exponentialRampToValueAtTime(0.09, drumAt + 0.2);
    drumGain.gain.exponentialRampToValueAtTime(0.0001, drumAt + 0.7);
    drum.connect(drumFilter);
    drumFilter.connect(drumGain);
    drumGain.connect(this.masterGain);
    drum.start(drumAt);
    drum.stop(drumAt + 0.7);
  }

  /**
   * A disc tray closing, for the sets that would have had one.
   *
   * Quieter and smoother than the VCR on purpose -- the whole character of the
   * optical era was that the mechanism stopped announcing itself. A tray motor,
   * a small latch click, then the spindle winding up to speed.
   */
  playDiscLoad() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const trayLen = 0.85;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * trayLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * 0.3;
    const tray = this.ctx.createBufferSource();
    tray.buffer = buf;
    const trayFilter = this.ctx.createBiquadFilter();
    trayFilter.type = 'bandpass';
    trayFilter.frequency.value = 620;
    trayFilter.Q.value = 6;
    const trayGain = this.ctx.createGain();
    trayGain.gain.setValueAtTime(0.0001, t);
    trayGain.gain.exponentialRampToValueAtTime(0.07, t + 0.12);
    trayGain.gain.setValueAtTime(0.07, t + trayLen - 0.15);
    trayGain.gain.exponentialRampToValueAtTime(0.0001, t + trayLen);
    tray.connect(trayFilter);
    trayFilter.connect(trayGain);
    trayGain.connect(this.masterGain);
    tray.start(t);
    tray.stop(t + trayLen);

    const clickAt = t + trayLen - 0.04;
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(2400, clickAt);
    clickGain.gain.setValueAtTime(0.05, clickAt);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, clickAt + 0.035);
    click.connect(clickGain);
    clickGain.connect(this.masterGain);
    click.start(clickAt);
    click.stop(clickAt + 0.035);

    const spinAt = clickAt + 0.05;
    const spin = this.ctx.createOscillator();
    const spinGain = this.ctx.createGain();
    spin.type = 'sine';
    spin.frequency.setValueAtTime(180, spinAt);
    spin.frequency.exponentialRampToValueAtTime(1150, spinAt + 0.6);
    spinGain.gain.setValueAtTime(0.0001, spinAt);
    spinGain.gain.exponentialRampToValueAtTime(0.035, spinAt + 0.25);
    spinGain.gain.exponentialRampToValueAtTime(0.0001, spinAt + 0.72);
    spin.connect(spinGain);
    spinGain.connect(this.masterGain);
    spin.start(spinAt);
    spin.stop(spinAt + 0.72);
  }

  // Continuous TV snow static (when untuned or antenna weak)
  startStatic(level = 0.25) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.staticNode) {
      this.updateStaticLevel(level);
      return;
    }

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    this.staticNode = this.ctx.createBufferSource();
    this.staticNode.buffer = buffer;
    this.staticNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 1.2;

    this.staticGain = this.ctx.createGain();
    this.staticGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), this.ctx.currentTime);

    this.staticNode.connect(filter);
    filter.connect(this.staticGain);
    this.staticGain.connect(this.masterGain);

    this.staticNode.start();
  }

  updateStaticLevel(level) {
    if (this.staticGain && this.ctx) {
      this.staticGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)), this.ctx.currentTime, 0.05);
    }
  }

  stopStatic() {
    if (this.staticNode) {
      try {
        this.staticNode.stop();
        this.staticNode.disconnect();
      } catch {
        // ignore
      }
      this.staticNode = null;
      this.staticGain = null;
    }
  }
}

export const audio = new RetroAudioEngine();
