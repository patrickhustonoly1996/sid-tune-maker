/**
 * Library Modal - User tune library UI
 * Manages saved tunes with load, save, delete capabilities
 */

// Built-in example tunes
const EXAMPLE_TUNES = [
  {
    id: 'builtin_tetris',
    name: 'Tetris Theme (Korobeiniki)',
    file: '/tunes/tetris-korobeiniki.json',
    category: 'classic'
  },
  {
    id: 'builtin_frogger',
    name: 'Frogger Theme',
    file: '/tunes/frogger-inu-no-omawarisan.json',
    category: 'classic'
  },
  {
    id: 'builtin_lakers_celtics',
    name: 'Lakers vs Celtics',
    file: '/tunes/lakers-vs-celtics.json',
    category: 'classic'
  },
  {
    id: 'builtin_hoppy_crossing',
    name: 'Hoppy Crossing (Original)',
    file: '/tunes/hoppy-crossing-original.json',
    category: 'original'
  }
];

export class LibraryModal {
  constructor(projectManager, sequencer, engine) {
    this.projectManager = projectManager;
    this.sequencer = sequencer;
    this.engine = engine;

    this.modal = document.getElementById('modal-library');
    this.myTunesList = document.getElementById('my-tunes-list');
    this.examplesList = document.getElementById('example-tunes-list');
    this.emptyMessage = document.getElementById('library-empty');

    this.exampleTunesCache = new Map();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderExampleTunes();
  }

  setupEventListeners() {
    // Close modal
    this.modal.querySelectorAll('[data-close], .modal__backdrop').forEach(el => {
      el.addEventListener('click', () => this.hide());
    });

    // Tab switching
    this.modal.querySelectorAll('.library-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Save current tune
    document.getElementById('btn-save-to-library')?.addEventListener('click', () => {
      this.saveCurrentTune();
    });

    // Library button
    document.getElementById('btn-library')?.addEventListener('click', () => {
      this.show();
    });

    // Handle clicks on tune items
    this.myTunesList?.addEventListener('click', (e) => this.handleMyTuneClick(e));
    this.examplesList?.addEventListener('click', (e) => this.handleExampleClick(e));
  }

  show() {
    this.refreshMyTunes();
    this.modal.classList.add('modal--visible');
  }

  hide() {
    this.modal.classList.remove('modal--visible');
  }

  switchTab(tabName) {
    // Update tab buttons
    this.modal.querySelectorAll('.library-tab').forEach(tab => {
      tab.classList.toggle('library-tab--active', tab.dataset.tab === tabName);
    });

    // Show/hide content
    document.getElementById('library-my-tunes')?.classList.toggle('hidden', tabName !== 'my-tunes');
    document.getElementById('library-examples')?.classList.toggle('hidden', tabName !== 'examples');
  }

  async refreshMyTunes() {
    const projects = await this.projectManager.listAll();

    if (projects.length === 0) {
      this.emptyMessage?.classList.remove('hidden');
      if (this.myTunesList) this.myTunesList.innerHTML = '';
      return;
    }

    this.emptyMessage?.classList.add('hidden');

    if (this.myTunesList) {
      this.myTunesList.innerHTML = projects.map(project => `
        <div class="library-tune" data-id="${project.id}">
          <div class="library-tune__info">
            <span class="library-tune__name">${this.escapeHtml(project.name)}</span>
            <span class="library-tune__meta">${project.bpm} BPM - ${this.formatDate(project.updatedAt)}</span>
          </div>
          <div class="library-tune__actions">
            <button class="library-tune__btn" data-action="load" data-id="${project.id}">LOAD</button>
            <button class="library-tune__btn" data-action="export" data-id="${project.id}">MP3</button>
            <button class="library-tune__btn library-tune__btn--delete" data-action="delete" data-id="${project.id}">DEL</button>
          </div>
        </div>
      `).join('');
    }
  }

  renderExampleTunes() {
    if (this.examplesList) {
      this.examplesList.innerHTML = EXAMPLE_TUNES.map(tune => `
        <div class="library-tune" data-id="${tune.id}">
          <div class="library-tune__info">
            <span class="library-tune__name">${this.escapeHtml(tune.name)}</span>
            <span class="library-tune__meta">${tune.category.toUpperCase()}</span>
          </div>
          <div class="library-tune__actions">
            <button class="library-tune__btn" data-action="load-example" data-id="${tune.id}">LOAD</button>
          </div>
        </div>
      `).join('');
    }
  }

  async handleMyTuneClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'load') {
      await this.loadTune(id);
      this.hide();
    } else if (action === 'export') {
      await this.exportTune(id);
    } else if (action === 'delete') {
      await this.deleteTune(id);
    }
  }

  async handleExampleClick(e) {
    const btn = e.target.closest('[data-action="load-example"]');
    if (!btn) return;

    const id = btn.dataset.id;
    await this.loadExampleTune(id);
    this.hide();
  }

  async loadTune(id) {
    try {
      await this.projectManager.load(id);
      console.log('[LibraryModal] Tune loaded:', id);
    } catch (error) {
      console.error('[LibraryModal] Failed to load tune:', error);
    }
  }

  async loadExampleTune(id) {
    const tuneMeta = EXAMPLE_TUNES.find(t => t.id === id);
    if (!tuneMeta) return;

    try {
      // Check cache
      if (!this.exampleTunesCache.has(id)) {
        const response = await fetch(tuneMeta.file);
        if (!response.ok) throw new Error('Failed to fetch');
        const tuneData = await response.json();
        this.exampleTunesCache.set(id, tuneData);
      }

      const tuneData = this.exampleTunesCache.get(id);
      this.applyTune(tuneData);
      console.log('[LibraryModal] Example tune loaded:', tuneMeta.name);
    } catch (error) {
      console.error('[LibraryModal] Failed to load example:', error);
    }
  }

  applyTune(tuneData) {
    // Set BPM
    if (tuneData.bpm && this.projectManager?.state) {
      this.projectManager.state.bpm = tuneData.bpm;
      const bpmInput = document.getElementById('bpm');
      if (bpmInput) bpmInput.value = tuneData.bpm;

      if (window.SIDTuneMaker?.transport) {
        window.SIDTuneMaker.transport.setBPM(tuneData.bpm);
      }
    }

    // Set voice parameters
    if (tuneData.voices && this.engine) {
      tuneData.voices.forEach((voice, index) => {
        if (index < 3) {
          Object.entries(voice).forEach(([param, value]) => {
            this.engine.setVoiceParam(index, param, value);
          });

          // Update UI waveform buttons
          const track = document.querySelector(`.voice-track[data-voice="${index}"]`);
          if (track) {
            track.querySelectorAll('.wave-btn').forEach(btn => {
              btn.classList.toggle('wave-btn--active', btn.dataset.wave === voice.waveform);
            });
          }
        }
      });
    }

    // Load grid
    if (tuneData.grid && this.sequencer) {
      this.sequencer.load(tuneData.grid);
    }

    // Update project manager
    if (this.projectManager?.currentProject) {
      this.projectManager.currentProject.name = tuneData.name || 'Loaded Tune';
      this.projectManager.currentProject.bpm = tuneData.bpm;
      this.projectManager.currentProject.voices = tuneData.voices;
      this.projectManager.currentProject.grid = tuneData.grid;
    }
  }

  async exportTune(id) {
    // Load the tune first if not current
    const projects = await this.projectManager.listAll();
    const project = projects.find(p => p.id === id);

    if (project && window.SIDTuneMaker?.exportModal) {
      // Load and then export
      await this.projectManager.load(id);
      this.hide();
      window.SIDTuneMaker.exportModal.show();
    }
  }

  async deleteTune(id) {
    if (confirm('Delete this tune permanently?')) {
      await this.projectManager.delete(id);
      this.refreshMyTunes();
    }
  }

  async saveCurrentTune() {
    // Get tune name
    const currentName = this.projectManager.currentProject?.name || 'Untitled';
    const name = prompt('Name your banger:', currentName);

    if (!name) return;

    // Update name and save
    if (this.projectManager.currentProject) {
      this.projectManager.currentProject.name = name;
    }

    await this.projectManager.save();
    this.refreshMyTunes();

    console.log('[LibraryModal] Tune saved:', name);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
