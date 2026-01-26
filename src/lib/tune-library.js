/**
 * Tune Library - Manages built-in example tunes
 * Loads tunes from public/tunes for visualization and learning
 */

// Built-in tune manifest
const BUILTIN_TUNES = [
  {
    id: 'builtin_tetris',
    name: 'Tetris Theme (Korobeiniki)',
    file: '/tunes/tetris-korobeiniki.json',
    category: 'classic',
    tags: ['russia', 'puzzle', 'gameboy']
  },
  {
    id: 'builtin_frogger',
    name: 'Frogger Theme',
    file: '/tunes/frogger-inu-no-omawarisan.json',
    category: 'classic',
    tags: ['arcade', 'japan', 'konami']
  },
  {
    id: 'builtin_lakers_celtics',
    name: 'Lakers vs Celtics',
    file: '/tunes/lakers-vs-celtics.json',
    category: 'classic',
    tags: ['sports', 'ea', 'genesis', 'rob-hubbard']
  },
  {
    id: 'builtin_hoppy_crossing',
    name: 'Hoppy Crossing (Original)',
    file: '/tunes/hoppy-crossing-original.json',
    category: 'original',
    tags: ['arcade', 'bouncy', 'cheerful']
  },
  {
    id: 'builtin_pokemon_trance_odyssey',
    name: 'Pokemon Trance Odyssey',
    file: '/tunes/pokemon-trance-odyssey.json',
    category: 'easter-egg',
    tags: ['trance', 'euphoric', 'bicep', 'pokemon', 'epic', 'long-form']
  }
];

export class TuneLibrary {
  constructor(projectManager, sequencer, engine) {
    this.projectManager = projectManager;
    this.sequencer = sequencer;
    this.engine = engine;
    this.tunes = BUILTIN_TUNES;
    this.loadedTunes = new Map();

    this.init();
  }

  /**
   * Initialize the tune library UI
   */
  init() {
    this.createUI();
    this.setupEvents();
  }

  /**
   * Create the tune browser UI
   */
  createUI() {
    // Find or create the tune browser container
    let container = document.getElementById('tune-browser');
    if (!container) {
      // Add to library section if it exists
      const librarySection = document.querySelector('.library');
      if (librarySection) {
        container = document.createElement('div');
        container.id = 'tune-browser';
        container.className = 'tune-browser';
        container.innerHTML = `
          <div class="tune-browser__header">
            <span class="tune-browser__title">EXAMPLE TUNES</span>
          </div>
          <div class="tune-browser__list"></div>
        `;
        librarySection.insertBefore(container, librarySection.firstChild);
      }
    }

    if (container) {
      this.renderTuneList();
    }
  }

  /**
   * Render the list of available tunes
   */
  renderTuneList() {
    const listEl = document.querySelector('.tune-browser__list');
    if (!listEl) return;

    listEl.innerHTML = this.tunes.map(tune => `
      <div class="tune-item" data-tune-id="${tune.id}">
        <span class="tune-item__name">${tune.name}</span>
        <span class="tune-item__category">${tune.category}</span>
      </div>
    `).join('');
  }

  /**
   * Set up event listeners
   */
  setupEvents() {
    // Handle both click and touch for tune items
    const handleTuneSelect = async (e) => {
      const tuneItem = e.target.closest('.tune-item');
      if (tuneItem) {
        e.preventDefault();
        const tuneId = tuneItem.dataset.tuneId;
        await this.loadTune(tuneId);

        // Close library panel on mobile after loading
        if (window.innerWidth <= 768) {
          document.getElementById('library')?.classList.remove('library--visible');
        }
      }
    };

    document.addEventListener('click', handleTuneSelect);

    // Touch support for mobile
    document.addEventListener('touchend', (e) => {
      const tuneItem = e.target.closest('.tune-item');
      if (tuneItem) {
        e.preventDefault();
        handleTuneSelect(e);
      }
    });
  }

  /**
   * Load a tune by ID
   */
  async loadTune(tuneId) {
    const tuneMeta = this.tunes.find(t => t.id === tuneId);
    if (!tuneMeta) {
      console.warn('[TuneLibrary] Tune not found:', tuneId);
      return null;
    }

    try {
      // Check cache first
      if (this.loadedTunes.has(tuneId)) {
        return this.applyTune(this.loadedTunes.get(tuneId));
      }

      // Fetch the tune file
      const response = await fetch(tuneMeta.file);
      if (!response.ok) throw new Error(`Failed to load: ${response.status}`);

      const tuneData = await response.json();

      // Cache it
      this.loadedTunes.set(tuneId, tuneData);

      // Apply it
      return this.applyTune(tuneData);
    } catch (error) {
      console.error('[TuneLibrary] Failed to load tune:', error);
      return null;
    }
  }

  /**
   * Apply a loaded tune to the sequencer
   */
  applyTune(tuneData) {
    // Set BPM
    if (tuneData.bpm && this.projectManager?.state) {
      this.projectManager.state.bpm = tuneData.bpm;
      const bpmInput = document.getElementById('bpm');
      if (bpmInput) bpmInput.value = tuneData.bpm;

      // Update transport if available
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
          const track = document.querySelector(`.voice-track[data-voice="${index}"]`) ||
                       document.querySelectorAll('.voice-track')[index];
          if (track) {
            track.querySelectorAll('.wave-btn').forEach(btn => {
              btn.classList.toggle('wave-btn--active', btn.dataset.wave === voice.waveform);
            });
          }
        }
      });
    }

    // Load grid data
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

    console.log('[TuneLibrary] Loaded tune:', tuneData.name);
    return tuneData;
  }

  /**
   * Get list of available tunes
   */
  getAvailableTunes() {
    return this.tunes;
  }

  /**
   * Filter tunes by category
   */
  getTunesByCategory(category) {
    return this.tunes.filter(t => t.category === category);
  }

  /**
   * Filter tunes by tag
   */
  getTunesByTag(tag) {
    return this.tunes.filter(t => t.tags.includes(tag));
  }
}
