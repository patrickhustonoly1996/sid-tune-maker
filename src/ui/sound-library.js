/**
 * Sound Library - Preset sounds and drag/drop
 * Manages the sidebar with sound categories and presets
 */

// Preset sound definitions
const PRESETS = {
  bass: [
    { name: 'Chunky Bass', note: 'C2', waveform: 'pulse', pulseWidth: 30, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.1 },
    { name: 'Wobble Bass', note: 'C2', waveform: 'sawtooth', attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2 },
    { name: 'Sub Bass', note: 'C1', waveform: 'triangle', attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.3 },
    { name: 'Punchy Bass', note: 'C2', waveform: 'pulse', pulseWidth: 50, attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.1 },
    { name: 'Smooth Bass', note: 'C2', waveform: 'triangle', attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.2 },
  ],
  lead: [
    { name: 'Bright Lead', note: 'C4', waveform: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
    { name: 'Dark Lead', note: 'C4', waveform: 'pulse', pulseWidth: 25, attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.2 },
    { name: 'Plucky Lead', note: 'C4', waveform: 'pulse', pulseWidth: 50, attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 },
    { name: 'Soft Lead', note: 'C4', waveform: 'triangle', attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.4 },
    { name: 'Screamer', note: 'C5', waveform: 'sawtooth', attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.2 },
  ],
  arp: [
    { name: 'Classic Arp', note: 'C4', waveform: 'pulse', pulseWidth: 50, attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.05 },
    { name: 'Bright Arp', note: 'C4', waveform: 'sawtooth', attack: 0.005, decay: 0.08, sustain: 0.4, release: 0.05 },
    { name: 'Soft Arp', note: 'C4', waveform: 'triangle', attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.1 },
    { name: 'Staccato', note: 'C4', waveform: 'pulse', pulseWidth: 40, attack: 0.002, decay: 0.05, sustain: 0.2, release: 0.02 },
  ],
  drums: [
    { name: 'Kick', note: 'C1', waveform: 'triangle', attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.1, pitchDecay: true },
    { name: 'Snare', note: 'C3', waveform: 'noise', attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.1 },
    { name: 'Hi-Hat', note: 'C5', waveform: 'noise', attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.02 },
    { name: 'Open Hat', note: 'C5', waveform: 'noise', attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.1 },
    { name: 'Tom', note: 'G2', waveform: 'triangle', attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 },
  ],
  fx: [
    { name: 'Sweep Up', note: 'C3', waveform: 'sawtooth', attack: 0.5, decay: 0.1, sustain: 0.8, release: 0.2 },
    { name: 'Sweep Down', note: 'C5', waveform: 'sawtooth', attack: 0.01, decay: 0.5, sustain: 0.0, release: 0.1 },
    { name: 'Blip', note: 'C6', waveform: 'pulse', pulseWidth: 50, attack: 0.001, decay: 0.02, sustain: 0.0, release: 0.01 },
    { name: 'Laser', note: 'C5', waveform: 'sawtooth', attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.1, pitchDecay: true },
    { name: 'Noise Burst', note: 'C4', waveform: 'noise', attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.05 },
  ]
};

export class SoundLibrary {
  constructor(sequencer) {
    this.sequencer = sequencer;
    this.currentCategory = 'bass';
    this.selectedSound = null;

    // DOM elements
    this.listEl = document.getElementById('sound-list');
    this.categoryBtns = document.querySelectorAll('.library__cat');

    this.setupEvents();
    this.renderSounds();
  }

  /**
   * Set up event listeners
   */
  setupEvents() {
    // Category buttons
    this.categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectCategory(btn.dataset.category);
      });
    });
  }

  /**
   * Select a category
   */
  selectCategory(category) {
    if (!PRESETS[category]) return;

    this.currentCategory = category;

    // Update button states
    this.categoryBtns.forEach(btn => {
      btn.classList.toggle('library__cat--active', btn.dataset.category === category);
    });

    this.renderSounds();
  }

  /**
   * Render sounds for current category
   */
  renderSounds() {
    if (!this.listEl) return;

    const sounds = PRESETS[this.currentCategory] || [];

    this.listEl.innerHTML = sounds.map((sound, index) => `
      <div class="sound-item"
           data-category="${this.currentCategory}"
           data-index="${index}"
           draggable="true">
        ${sound.name}
      </div>
    `).join('');

    // Add event listeners to sound items
    this.listEl.querySelectorAll('.sound-item').forEach(item => {
      // Click to preview
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index, 10);
        this.previewSound(this.currentCategory, index);
      });

      // Drag start
      item.addEventListener('dragstart', (e) => {
        const index = parseInt(item.dataset.index, 10);
        e.dataTransfer.setData('application/json', JSON.stringify({
          category: this.currentCategory,
          index: index
        }));
        item.classList.add('dragging');
      });

      // Drag end
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
      });
    });
  }

  /**
   * Preview a sound
   */
  previewSound(category, index) {
    const sound = PRESETS[category]?.[index];
    if (!sound) return;

    // Apply sound settings to voice 0 and play
    const engine = this.sequencer.engine;

    // Set voice parameters
    engine.setVoiceParam(0, 'waveform', sound.waveform);
    engine.setVoiceParam(0, 'attack', sound.attack);
    engine.setVoiceParam(0, 'decay', sound.decay);
    engine.setVoiceParam(0, 'sustain', sound.sustain);
    engine.setVoiceParam(0, 'release', sound.release);

    if (sound.pulseWidth !== undefined) {
      engine.setVoiceParam(0, 'pulseWidth', sound.pulseWidth / 100);
    }

    // Play the note
    import('../audio/sid-engine.js').then(({ noteToFrequency }) => {
      const freq = noteToFrequency(sound.note);
      engine.playNote(0, freq, 0.5);
    });

    this.selectedSound = sound;
  }

  /**
   * Get a preset by category and index
   */
  getPreset(category, index) {
    return PRESETS[category]?.[index] || null;
  }

  /**
   * Get all presets
   */
  getAllPresets() {
    return PRESETS;
  }
}
