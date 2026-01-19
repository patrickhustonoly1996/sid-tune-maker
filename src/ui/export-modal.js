/**
 * Export Modal - Audio export UI
 * Handles MP3 and WAV export with progress feedback
 */

import { AudioExporter } from '../audio/audio-exporter.js';

export class ExportModal {
  constructor(projectManager, sequencer) {
    this.projectManager = projectManager;
    this.sequencer = sequencer;
    this.exporter = new AudioExporter();

    this.modal = document.getElementById('modal-export');
    this.progressEl = document.getElementById('export-progress');
    this.progressFill = this.modal?.querySelector('.export-progress__fill');
    this.progressText = this.modal?.querySelector('.export-progress__text');
    this.exportButtons = this.modal?.querySelector('.export-buttons');

    this.isExporting = false;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupProgressCallback();
  }

  setupEventListeners() {
    // Close modal
    this.modal?.querySelectorAll('[data-close], .modal__backdrop').forEach(el => {
      el.addEventListener('click', () => {
        if (!this.isExporting) this.hide();
      });
    });

    // Export button in toolbar
    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.show();
    });

    // MP3 export
    document.getElementById('btn-export-mp3')?.addEventListener('click', () => {
      this.exportMP3();
    });

    // WAV export
    document.getElementById('btn-export-wav')?.addEventListener('click', () => {
      this.exportWAV();
    });
  }

  setupProgressCallback() {
    this.exporter.onProgress = (progress) => {
      this.updateProgress(progress);
    };
  }

  show() {
    this.resetUI();
    this.modal?.classList.add('modal--visible');
  }

  hide() {
    this.modal?.classList.remove('modal--visible');
  }

  resetUI() {
    this.progressEl?.classList.add('hidden');
    this.exportButtons?.classList.remove('hidden');
    if (this.progressFill) this.progressFill.style.width = '0%';
    if (this.progressText) this.progressText.textContent = 'Rendering...';
  }

  showProgress() {
    this.exportButtons?.classList.add('hidden');
    this.progressEl?.classList.remove('hidden');
  }

  updateProgress(progress) {
    const percent = Math.round(progress * 100);
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
    }
  }

  getProjectData() {
    // Collect current project data
    const project = this.projectManager.currentProject || {};

    // Get fresh grid data from sequencer
    if (this.sequencer) {
      project.grid = this.sequencer.export();
    }

    // Get voice parameters from engine (already in proper units)
    if (window.SIDTuneMaker?.engine) {
      const engine = window.SIDTuneMaker.engine;
      project.voices = engine.voices.map(voice => ({
        waveform: voice.params.waveform,
        attack: voice.params.attack,    // seconds
        decay: voice.params.decay,      // seconds
        sustain: voice.params.sustain,  // 0-1 level
        release: voice.params.release   // seconds
      }));
    }

    // Get BPM
    project.bpm = this.projectManager.state?.bpm || 120;

    return project;
  }

  async exportMP3() {
    if (this.isExporting) return;

    this.isExporting = true;
    this.showProgress();

    try {
      const project = this.getProjectData();
      const filename = `${(project.name || 'banger').replace(/\s+/g, '-')}.mp3`;

      if (this.progressText) this.progressText.textContent = 'Rendering audio...';

      await this.exporter.exportMP3(project, filename);

      if (this.progressText) this.progressText.textContent = 'Download complete!';

      // Auto-close after success
      setTimeout(() => this.hide(), 1500);

    } catch (error) {
      console.error('[ExportModal] MP3 export failed:', error);

      if (this.progressText) {
        this.progressText.textContent = 'Export failed. Try WAV instead.';
        this.progressText.style.color = '#FF3300';
      }

      // Show buttons again after error
      setTimeout(() => {
        this.resetUI();
        if (this.progressText) this.progressText.style.color = '';
      }, 2000);
    } finally {
      this.isExporting = false;
    }
  }

  async exportWAV() {
    if (this.isExporting) return;

    this.isExporting = true;
    this.showProgress();

    try {
      const project = this.getProjectData();
      const filename = `${(project.name || 'banger').replace(/\s+/g, '-')}.wav`;

      if (this.progressText) this.progressText.textContent = 'Rendering audio...';

      await this.exporter.exportWAV(project, filename);

      if (this.progressText) this.progressText.textContent = 'Download complete!';

      // Auto-close after success
      setTimeout(() => this.hide(), 1500);

    } catch (error) {
      console.error('[ExportModal] WAV export failed:', error);

      if (this.progressText) {
        this.progressText.textContent = 'Export failed. Please try again.';
        this.progressText.style.color = '#FF3300';
      }

      setTimeout(() => {
        this.resetUI();
        if (this.progressText) this.progressText.style.color = '';
      }, 2000);
    } finally {
      this.isExporting = false;
    }
  }
}
