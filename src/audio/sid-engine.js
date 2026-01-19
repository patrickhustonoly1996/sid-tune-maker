/**
 * SID Engine - Core audio synthesis
 * Emulates the C64 SID chip using Web Audio API
 */

export class SIDEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.voices = [];
    this.filter = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the audio context and nodes
   */
  async init() {
    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100
    });

    // Master gain (volume control)
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.audioContext.destination);

    // Shared filter (authentic SID had one filter for all voices)
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 8000;
    this.filter.Q.value = 1;
    this.filter.connect(this.masterGain);

    // Initialize 3 voices (authentic SID count)
    for (let i = 0; i < 3; i++) {
      this.voices.push(new SIDVoice(this.audioContext, this.filter, i));
    }

    this.isInitialized = true;
    return this;
  }

  /**
   * Play a note on a specific voice
   */
  playNote(voiceIndex, frequency, duration = 0.5) {
    if (!this.isInitialized || voiceIndex >= this.voices.length) return;
    this.voices[voiceIndex].playNote(frequency, duration);
  }

  /**
   * Stop a voice
   */
  stopVoice(voiceIndex) {
    if (!this.isInitialized || voiceIndex >= this.voices.length) return;
    this.voices[voiceIndex].stop();
  }

  /**
   * Stop all voices
   */
  stopAll() {
    this.voices.forEach(voice => voice.stop());
  }

  /**
   * Set voice parameters
   */
  setVoiceParam(voiceIndex, param, value) {
    if (voiceIndex >= this.voices.length) return;
    this.voices[voiceIndex].setParam(param, value);
  }

  /**
   * Set filter parameters
   */
  setFilterParam(param, value) {
    switch (param) {
      case 'type':
        this.filter.type = value;
        break;
      case 'cutoff':
        // Map 0-100 to 20-20000 Hz (logarithmic)
        const freq = 20 * Math.pow(1000, value / 100);
        this.filter.frequency.value = freq;
        break;
      case 'resonance':
        // Map 0-100 to Q 0.5-20
        this.filter.Q.value = 0.5 + (value / 100) * 19.5;
        break;
    }
  }

  /**
   * Get current time (for scheduling)
   */
  get currentTime() {
    return this.audioContext?.currentTime || 0;
  }
}

/**
 * SID Voice - Single oscillator with ADSR envelope
 */
class SIDVoice {
  constructor(audioContext, outputNode, index) {
    this.audioContext = audioContext;
    this.outputNode = outputNode;
    this.index = index;

    // Voice parameters
    this.params = {
      waveform: 'pulse',
      pulseWidth: 0.5,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.7,
      release: 0.2,
      useFilter: true,
      ringMod: false,
      sync: false
    };

    // Active oscillator/gain (for stopping)
    this.activeOsc = null;
    this.activeGain = null;
  }

  /**
   * Play a note
   */
  playNote(frequency, duration) {
    const now = this.audioContext.currentTime;

    // Stop any currently playing note
    this.stop();

    // Create oscillator
    const osc = this.audioContext.createOscillator();

    // Set waveform
    if (this.params.waveform === 'noise') {
      // Noise requires a different approach - use buffer
      // For now, use white noise via script processor or worklet
      // Placeholder: use square as fallback
      osc.type = 'square';
    } else if (this.params.waveform === 'pulse') {
      // Pulse wave with variable width requires PeriodicWave
      // For now, approximate with square
      osc.type = 'square';
    } else {
      osc.type = this.params.waveform;
    }

    osc.frequency.value = frequency;

    // Create envelope gain
    const envelope = this.audioContext.createGain();
    envelope.gain.value = 0;

    // Connect: osc -> envelope -> (filter or master)
    osc.connect(envelope);
    envelope.connect(this.outputNode);

    // Apply ADSR envelope
    const { attack, decay, sustain, release } = this.params;

    // Attack
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + attack);

    // Decay to sustain
    envelope.gain.linearRampToValueAtTime(sustain, now + attack + decay);

    // Release (at end of duration)
    const releaseTime = now + duration;
    envelope.gain.setValueAtTime(sustain, releaseTime);
    envelope.gain.linearRampToValueAtTime(0, releaseTime + release);

    // Start and schedule stop
    osc.start(now);
    osc.stop(releaseTime + release + 0.1);

    // Store references for manual stop
    this.activeOsc = osc;
    this.activeGain = envelope;
  }

  /**
   * Stop the voice immediately
   */
  stop() {
    const now = this.audioContext.currentTime;

    if (this.activeGain) {
      try {
        this.activeGain.gain.cancelScheduledValues(now);
        this.activeGain.gain.linearRampToValueAtTime(0, now + 0.02);
      } catch (e) {
        // Ignore if already stopped
      }
    }

    if (this.activeOsc) {
      try {
        this.activeOsc.stop(now + 0.03);
      } catch (e) {
        // Ignore if already stopped
      }
    }

    this.activeOsc = null;
    this.activeGain = null;
  }

  /**
   * Set a voice parameter
   */
  setParam(param, value) {
    if (param in this.params) {
      this.params[param] = value;
    }
  }
}

// Note frequency helper
export const NOTE_FREQUENCIES = {
  'C': [16.35, 32.70, 65.41, 130.81, 261.63, 523.25, 1046.50, 2093.00],
  'C#': [17.32, 34.65, 69.30, 138.59, 277.18, 554.37, 1108.73, 2217.46],
  'D': [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66, 2349.32],
  'D#': [19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51, 2489.02],
  'E': [20.60, 41.20, 82.41, 164.81, 329.63, 659.25, 1318.51, 2637.02],
  'F': [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91, 2793.83],
  'F#': [23.12, 46.25, 92.50, 185.00, 369.99, 739.99, 1479.98, 2959.96],
  'G': [24.50, 49.00, 98.00, 196.00, 392.00, 783.99, 1567.98, 3135.96],
  'G#': [25.96, 51.91, 103.83, 207.65, 415.30, 830.61, 1661.22, 3322.44],
  'A': [27.50, 55.00, 110.00, 220.00, 440.00, 880.00, 1760.00, 3520.00],
  'A#': [29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31],
  'B': [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53, 3951.07]
};

/**
 * Convert note name to frequency
 * @param {string} note - e.g., 'C4', 'A#3'
 */
export function noteToFrequency(note) {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440; // Default to A4

  const [, name, octave] = match;
  const octaveNum = parseInt(octave, 10);

  if (NOTE_FREQUENCIES[name] && octaveNum >= 0 && octaveNum <= 7) {
    return NOTE_FREQUENCIES[name][octaveNum];
  }

  return 440;
}
