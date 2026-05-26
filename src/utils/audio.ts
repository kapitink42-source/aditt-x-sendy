// Web Audio API Synthesizer for high-tension survival horror atmosphere.
// Uses lazy-initialization to avoid browser autoplay restriction issues.

class SoundManager {
  private ctx: AudioContext | null = null;
  
  // Oscillators and nodes
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private heartbeatNode: AudioNode | null = null;
  private heartbeatInterval: any = null;
  private heartbeatBPM: number = 60;
  private heartbeatGain: GainNode | null = null;
  
  // Static radio noise
  private staticNode: AudioBufferSourceNode | null = null;
  private staticGain: GainNode | null = null;

  // Whispering atmosphere
  private whisperInterval: any = null;

  // General state
  public isMuted: boolean = false;

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // deep low frequency rumble: creepy ambient pad
  public startAmbientDrone() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      this.stopAmbientDrone();

      // Setup a low drone
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(45, this.ctx.currentTime); // very low rumble

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(45.5, this.ctx.currentTime); // detune for beating effect

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime); // filter out high buzz
      filter.Q.setValueAtTime(5, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      // Low frequency oscillator for pulsating tension
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // slowly pulses every 5 seconds
      lfoGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.droneOsc = osc1; // reference one for stopping
      this.droneGain = gain;

      // Start static generator
      this.startRadioStatic();
      
      // Start creepy dynamic whispers
      this.startSpookyWhispers();
    } catch (e) {
      console.warn('Failed to start ambient drone', e);
    }
  }

  public stopAmbientDrone() {
    if (this.droneOsc) {
      try {
        this.droneOsc.stop();
      } catch (e) {}
      this.droneOsc = null;
    }
    this.stopRadioStatic();
    if (this.whisperInterval) {
      clearInterval(this.whisperInterval);
      this.whisperInterval = null;
    }
  }

  // Radio static that grows louder when the Stalker is close
  private startRadioStatic() {
    if (!this.ctx) return;

    try {
      // Create white noise buffer
      const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const staticFilter = this.ctx.createBiquadFilter();
      staticFilter.type = 'bandpass';
      staticFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      staticFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime); // start very low/ambient

      whiteNoise.connect(staticFilter);
      staticFilter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();

      this.staticNode = whiteNoise;
      this.staticGain = gain;
    } catch (e) {}
  }

  private stopRadioStatic() {
    if (this.staticNode) {
      try {
        this.staticNode.stop();
      } catch (e) {}
      this.staticNode = null;
    }
  }

  // Update static volume depending on proximity (0 = far, 1 = extremely close)
  public updateStaticProximity(intensity: number) {
    if (this.isMuted || !this.staticGain || !this.ctx) return;
    // Map intensity (0-1) to static gain (0.01 to 0.4)
    const targetVolume = 0.005 + Math.pow(intensity, 3) * 0.35;
    this.staticGain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.1);
  }

  // Dynamic Heartbeats
  public startHeartbeat() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopHeartbeat();
    
    this.heartbeatGain = this.ctx.createGain();
    this.heartbeatGain.connect(this.ctx.destination);

    const triggerThump = () => {
      if (!this.ctx || !this.heartbeatGain) return;
      try {
        const now = this.ctx.currentTime;
        
        // Double thud: "lub-dub"
        this.playSingleHeartThud(now, 0.15);
        this.playSingleHeartThud(now + 0.18, 0.1);
      } catch (e) {}
    };

    const runLoop = () => {
      triggerThump();
      // Calculate interval based on current BPM
      const intervalMs = (60 / this.heartbeatBPM) * 1000;
      this.heartbeatInterval = setTimeout(runLoop, intervalMs);
    };

    runLoop();
  }

  private playSingleHeartThud(time: number, volume: number) {
    if (!this.ctx || !this.heartbeatGain) return;

    // A low-pass filtered sine wave dropping fast in pitch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume * 1.5, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.heartbeatGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  public updateHeartbeatRate(bpm: number) {
    // Clamp bpm between 50 and 160
    this.heartbeatBPM = Math.max(50, Math.min(160, bpm));
    if (this.heartbeatGain && this.ctx) {
      // heartbeats become heavier as bpm rises
      const baseGain = 0.5 + ((this.heartbeatBPM - 50) / 110) * 0.5;
      this.heartbeatGain.gain.setTargetAtTime(baseGain, this.ctx.currentTime, 0.2);
    }
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearTimeout(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Interactive Click for Flashlight toggling
  public playFlashlightClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscHigh = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.025);

      oscHigh.type = 'triangle';
      oscHigh.frequency.setValueAtTime(4000, now);
      oscHigh.frequency.exponentialRampToValueAtTime(800, now + 0.015);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      oscHigh.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      oscHigh.start(now);
      osc.stop(now + 0.04);
      oscHigh.stop(now + 0.04);
    } catch (e) {}
  }

  // Page reading / item pick up chime
  public playPickupSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const delay = this.ctx.createDelay();
      const delayGain = this.ctx.createGain();
      const mainGain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Spooky disonant chords resolved to standard minor 3rd
      osc1.frequency.setValueAtTime(220, now); // A3
      osc1.frequency.setValueAtTime(330, now + 0.15); // E4
      osc1.frequency.setValueAtTime(440, now + 0.3); // A4

      osc2.frequency.setValueAtTime(261.63, now); // C4 (Spooky dissonance)
      osc2.frequency.setValueAtTime(392, now + 0.2); // G4

      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      // Feedback delay hook for eerie tail echo
      delay.delayTime.setValueAtTime(0.25, now);
      delayGain.gain.setValueAtTime(0.4, now);

      osc1.connect(mainGain);
      osc2.connect(mainGain);
      
      mainGain.connect(this.ctx.destination);
      
      // Delay connection feed
      mainGain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 1.0);
      osc2.stop(now + 1.0);
    } catch (e) {}
  }

  // Heart-stopping Sudden Jumpscare noise
  public playJumpscare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.resume();

      // Stop other background things to make jumpscare striking
      this.updateStaticProximity(0);

      // Web Audio screamer synth
      const numOsc = 5;
      const oscillators: OscillatorNode[] = [];
      const filter = this.ctx.createBiquadFilter();
      const dist = this.ctx.createWaveShaper();
      const gain = this.ctx.createGain();

      filter.type = 'peaking';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.linearRampToValueAtTime(150, now + 1.2);
      filter.Q.setValueAtTime(8, now);

      // Distortion Curve
      const makeDistortionCurve = (amount = 50) => {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
          const x = (i * 2) / n_samples - 1;
          curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
      };
      dist.curve = makeDistortionCurve(100);
      dist.oversample = '4x';

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      // Generates very dissonant tones sliding down
      const freqs = [100, 153, 239, 397, 613];
      for (let i = 0; i < numOsc; i++) {
        const osc = this.ctx.createOscillator();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freqs[i], now);
        osc.frequency.exponentialRampToValueAtTime(freqs[i] / 2.5, now + 1.0);
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + 1.5);
        oscillators.push(osc);
      }

      filter.connect(dist);
      dist.connect(gain);
      gain.connect(this.ctx.destination);

      // Low sub bass drop
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.frequency.setValueAtTime(80, now);
      subOsc.frequency.linearRampToValueAtTime(25, now + 0.8);
      subGain.gain.setValueAtTime(0.8, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.2);

    } catch (e) {
      console.error(e);
    }
  }

  // Panic heavy breath synth
  public playHeavyBreathing(intensity: number) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Synthesize noise-based inhalation/exhalation
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      // Bandpass sweep mimicking breath flow
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      // Sweep frequency up for inhales, or down for exhales
      filter.frequency.exponentialRampToValueAtTime(200, now + 1.2);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08 * intensity, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 1.4);
    } catch (e) {}
  }

  // Tense locker heartbeat holding breath release gasp sound
  public playTenseLockerHoldBreath(intensity: number) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(250, now + 0.4);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.Q.setValueAtTime(2, now);

      gain.gain.setValueAtTime(0.05 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  // Squeaky rustic doors opening or locker exit sound
  public playLockerHidingDoor(isOpen: boolean) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(isOpen ? 600 : 400, now);
      osc.frequency.exponentialRampToValueAtTime(isOpen ? 500 : 150, now + 0.25);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  // Spooky dynamic whispers popping in the ears at irregular intervals
  private startSpookyWhispers() {
    const triggerWhisper = () => {
      if (!this.ctx || this.isMuted) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const delay = this.ctx.createDelay();
        const fbGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        // Ghostly sweep frequencies
        osc.type = 'sine';
        const notes = [666, 888, 1200, 1333, 999];
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        osc.frequency.setValueAtTime(randomNote, now);
        osc.frequency.linearRampToValueAtTime(randomNote - 150, now + 2.0);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.008, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        delay.delayTime.setValueAtTime(0.4, now);
        fbGain.gain.setValueAtTime(0.8, now);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Echo feedback loop
        gain.connect(delay);
        delay.connect(fbGain);
        fbGain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 2.6);
      } catch (e) {}
    };

    this.whisperInterval = setInterval(() => {
      if (Math.random() < 0.4) {
        triggerWhisper();
      }
    }, 8000); // Trigger potentially every 8 seconds
  }
}

export const soundManager = new SoundManager();
