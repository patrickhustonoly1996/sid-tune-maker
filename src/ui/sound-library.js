/**
 * Sound Library - Preset sounds and drag/drop
 * Manages the sidebar with sound categories and presets
 */

// Preset sound definitions - short names to fit compact UI
const PRESETS = {
  bass: [
    { name: 'Chunky', note: 'C2', waveform: 'pulse', pulseWidth: 30, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.1 },
    { name: 'Wobble', note: 'C2', waveform: 'sawtooth', attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2 },
    { name: 'Sub', note: 'C1', waveform: 'triangle', attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.3 },
    { name: 'Punch', note: 'C2', waveform: 'pulse', pulseWidth: 50, attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.1 },
  ],
  lead: [
    { name: 'Bright', note: 'C4', waveform: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.8, release: 0.3 },
    { name: 'Dark', note: 'C4', waveform: 'pulse', pulseWidth: 25, attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.2 },
    { name: 'Pluck', note: 'C4', waveform: 'pulse', pulseWidth: 50, attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 },
    { name: 'Soft', note: 'C4', waveform: 'triangle', attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.4 },
  ],
  arp: [
    { name: 'Classic', note: 'C4', waveform: 'pulse', pulseWidth: 50, attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.05 },
    { name: 'Bright', note: 'C4', waveform: 'sawtooth', attack: 0.005, decay: 0.08, sustain: 0.4, release: 0.05 },
    { name: 'Stac', note: 'C4', waveform: 'pulse', pulseWidth: 40, attack: 0.002, decay: 0.05, sustain: 0.2, release: 0.02 },
  ],
  drums: [
    { name: 'Kick', note: 'C1', waveform: 'triangle', attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.1, pitchDecay: true },
    { name: 'Snare', note: 'C3', waveform: 'noise', attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.1 },
    { name: 'HiHat', note: 'C5', waveform: 'noise', attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.02 },
    { name: 'Tom', note: 'G2', waveform: 'triangle', attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 },
  ],
  fx: [
    { name: 'Up', note: 'C3', waveform: 'sawtooth', attack: 0.5, decay: 0.1, sustain: 0.8, release: 0.2 },
    { name: 'Down', note: 'C5', waveform: 'sawtooth', attack: 0.01, decay: 0.5, sustain: 0.0, release: 0.1 },
    { name: 'Blip', note: 'C6', waveform: 'pulse', pulseWidth: 50, attack: 0.001, decay: 0.02, sustain: 0.0, release: 0.01 },
    { name: 'Laser', note: 'C5', waveform: 'sawtooth', attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.1, pitchDecay: true },
  ]
};

// Category display names and colors
const CATEGORY_CONFIG = {
  bass: { label: 'BASS', color: '#FF3300' },
  lead: { label: 'LEAD', color: '#FFFF00' },
  arp: { label: 'ARP', color: '#39FF14' },
  drums: { label: 'DRUMS', color: '#FF1493' },
  fx: { label: 'FX', color: '#00FF66' }
};

export class SoundLibrary {
  constructor(sequencer) {
    this.sequencer = sequencer;
    this.selectedSound = null;
    this.selectedCategory = null;
    this.selectedIndex = null;

    // DOM elements
    this.listEl = document.getElementById('sound-list');

    this.renderAllSounds();
  }

  /**
   * Render all sounds grouped by category
   */
  renderAllSounds() {
    if (!this.listEl) return;

    let html = '';

    // Render each category with its sounds
    for (const [category, sounds] of Object.entries(PRESETS)) {
      const config = CATEGORY_CONFIG[category];

      html += `
        <div class="sound-group" data-category="${category}">
          <div class="sound-group__header" style="color: ${config.color}; border-color: ${config.color}">
            ${config.label}
          </div>
          <div class="sound-group__items">
            ${sounds.map((sound, index) => `
              <div class="sound-item"
                   data-category="${category}"
                   data-index="${index}"
                   draggable="true">
                ${sound.name}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    this.listEl.innerHTML = html;

    // Add event listeners to all sound items
    this.listEl.querySelectorAll('.sound-item').forEach(item => {
      const category = item.dataset.category;
      const index = parseInt(item.dataset.index, 10);

      // Click to select and preview
      item.addEventListener('click', () => {
        this.selectSound(category, index);
      });

      // Drag start
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          category: category,
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
   * Select a sound (and preview it)
   */
  selectSound(category, index) {
    const sound = PRESETS[category]?.[index];
    if (!sound) return;

    this.selectedSound = sound;
    this.selectedCategory = category;
    this.selectedIndex = index;

    // Update visual selection
    this.updateSelectionVisual();

    // Preview the sound
    this.previewSound(category, index);

    // On mobile, close the library panel after selection
    if (window.innerWidth <= 768) {
      document.getElementById('library')?.classList.remove('library--visible');
    }

    console.log(`[Library] Selected: ${sound.name}`);
  }

  /**
   * Update selection visual
   */
  updateSelectionVisual() {
    // Clear all selection
    this.listEl?.querySelectorAll('.sound-item').forEach(item => {
      item.classList.remove('sound-item--selected');
    });

    // Mark selected item
    if (this.selectedCategory && this.selectedIndex !== undefined) {
      const selectedEl = this.listEl?.querySelector(
        `.sound-item[data-category="${this.selectedCategory}"][data-index="${this.selectedIndex}"]`
      );
      if (selectedEl) {
        selectedEl.classList.add('sound-item--selected');
      }
    }
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
