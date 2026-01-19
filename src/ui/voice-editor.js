/**
 * Voice Editor - SID voice parameter controls
 * Handles waveform selection, ADSR, filter, and FX
 */

export class VoiceEditor {
  constructor(engine, state) {
    this.engine = engine;
    this.state = state;
    this.currentVoice = 0;

    // Bind elements
    this.elements = {
      // Waveform
      waveBtns: document.querySelectorAll('.wave-btn'),
      pulseWidth: document.getElementById('pulse-width'),
      pulseWidthVal: document.getElementById('pulse-width-val'),

      // ADSR
      attack: document.getElementById('attack'),
      decay: document.getElementById('decay'),
      sustain: document.getElementById('sustain'),
      release: document.getElementById('release'),

      // Filter
      filterBtns: document.querySelectorAll('.filter-btn'),
      filterCutoff: document.getElementById('filter-cutoff'),
      filterRes: document.getElementById('filter-res'),

      // FX
      ringMod: document.getElementById('ring-mod'),
      sync: document.getElementById('sync'),
      reverb: document.getElementById('reverb'),
      delay: document.getElementById('delay')
    };

    this.setupEvents();
  }

  /**
   * Set up event listeners
   */
  setupEvents() {
    // Waveform selection
    this.elements.waveBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectWaveform(btn.dataset.wave);
      });
    });

    // Pulse width
    this.elements.pulseWidth?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      this.setPulseWidth(value);
    });

    // ADSR controls
    this.elements.attack?.addEventListener('input', (e) => {
      this.setADSR('attack', parseInt(e.target.value, 10));
    });

    this.elements.decay?.addEventListener('input', (e) => {
      this.setADSR('decay', parseInt(e.target.value, 10));
    });

    this.elements.sustain?.addEventListener('input', (e) => {
      this.setADSR('sustain', parseInt(e.target.value, 10));
    });

    this.elements.release?.addEventListener('input', (e) => {
      this.setADSR('release', parseInt(e.target.value, 10));
    });

    // Filter type
    this.elements.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectFilterType(btn.dataset.filter);
      });
    });

    // Filter params
    this.elements.filterCutoff?.addEventListener('input', (e) => {
      this.setFilterCutoff(parseInt(e.target.value, 10));
    });

    this.elements.filterRes?.addEventListener('input', (e) => {
      this.setFilterResonance(parseInt(e.target.value, 10));
    });

    // FX toggles
    this.elements.ringMod?.addEventListener('change', (e) => {
      this.setFX('ringMod', e.target.checked);
    });

    this.elements.sync?.addEventListener('change', (e) => {
      this.setFX('sync', e.target.checked);
    });

    this.elements.reverb?.addEventListener('change', (e) => {
      this.setFX('reverb', e.target.checked);
    });

    this.elements.delay?.addEventListener('change', (e) => {
      this.setFX('delay', e.target.checked);
    });
  }

  /**
   * Select waveform
   */
  selectWaveform(waveform) {
    // Update UI
    this.elements.waveBtns.forEach(btn => {
      btn.classList.toggle('wave-btn--active', btn.dataset.wave === waveform);
    });

    // Show/hide pulse width control
    const pwControl = document.querySelector('.pulse-width');
    if (pwControl) {
      pwControl.style.display = waveform === 'pulse' ? 'flex' : 'none';
    }

    // Update engine
    this.engine.setVoiceParam(this.currentVoice, 'waveform', waveform);

    console.log(`[Editor] Waveform: ${waveform}`);
  }

  /**
   * Set pulse width
   */
  setPulseWidth(value) {
    // Update display
    if (this.elements.pulseWidthVal) {
      this.elements.pulseWidthVal.textContent = `${value}%`;
    }

    // Update engine (convert 0-100 to 0-1)
    this.engine.setVoiceParam(this.currentVoice, 'pulseWidth', value / 100);
  }

  /**
   * Set ADSR parameter
   */
  setADSR(param, value) {
    // Map 0-100 to actual time/level values
    let mappedValue;

    switch (param) {
      case 'attack':
        // 0-100 -> 0.001s to 2s (logarithmic)
        mappedValue = 0.001 + (value / 100) * 1.999;
        break;
      case 'decay':
        // 0-100 -> 0.001s to 2s
        mappedValue = 0.001 + (value / 100) * 1.999;
        break;
      case 'sustain':
        // 0-100 -> 0 to 1
        mappedValue = value / 100;
        break;
      case 'release':
        // 0-100 -> 0.001s to 2s
        mappedValue = 0.001 + (value / 100) * 1.999;
        break;
    }

    this.engine.setVoiceParam(this.currentVoice, param, mappedValue);
  }

  /**
   * Select filter type
   */
  selectFilterType(type) {
    // Update UI
    this.elements.filterBtns.forEach(btn => {
      btn.classList.toggle('filter-btn--active', btn.dataset.filter === type);
    });

    // Update engine
    this.engine.setFilterParam('type', type);

    console.log(`[Editor] Filter type: ${type}`);
  }

  /**
   * Set filter cutoff
   */
  setFilterCutoff(value) {
    this.engine.setFilterParam('cutoff', value);
  }

  /**
   * Set filter resonance
   */
  setFilterResonance(value) {
    this.engine.setFilterParam('resonance', value);
  }

  /**
   * Set FX toggle
   */
  setFX(fx, enabled) {
    this.engine.setVoiceParam(this.currentVoice, fx, enabled);
    console.log(`[Editor] ${fx}: ${enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Switch to a different voice
   */
  selectVoice(voiceIndex) {
    if (voiceIndex < 0 || voiceIndex >= 3) return;
    this.currentVoice = voiceIndex;
    this.state.currentVoice = voiceIndex;

    // TODO: Load voice settings into UI

    console.log(`[Editor] Selected voice ${voiceIndex + 1}`);
  }

  /**
   * Load settings from a preset
   */
  loadPreset(preset) {
    if (!preset) return;

    // Update waveform
    if (preset.waveform) {
      this.selectWaveform(preset.waveform);
    }

    // Update pulse width
    if (preset.pulseWidth !== undefined) {
      this.elements.pulseWidth.value = preset.pulseWidth;
      this.setPulseWidth(preset.pulseWidth);
    }

    // Update ADSR
    if (preset.attack !== undefined) {
      const attackVal = Math.round((preset.attack / 2) * 100);
      this.elements.attack.value = attackVal;
      this.setADSR('attack', attackVal);
    }

    if (preset.decay !== undefined) {
      const decayVal = Math.round((preset.decay / 2) * 100);
      this.elements.decay.value = decayVal;
      this.setADSR('decay', decayVal);
    }

    if (preset.sustain !== undefined) {
      const sustainVal = Math.round(preset.sustain * 100);
      this.elements.sustain.value = sustainVal;
      this.setADSR('sustain', sustainVal);
    }

    if (preset.release !== undefined) {
      const releaseVal = Math.round((preset.release / 2) * 100);
      this.elements.release.value = releaseVal;
      this.setADSR('release', releaseVal);
    }
  }
}
