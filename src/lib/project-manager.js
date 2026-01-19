/**
 * Project Manager - Save/load projects
 * Handles local storage with IndexedDB
 */

const DB_NAME = 'sid-tune-maker';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export class ProjectManager {
  constructor(state) {
    this.state = state;
    this.db = null;
    this.currentProject = null;

    this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[ProjectManager] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ProjectManager] Database ready');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create projects store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        console.log('[ProjectManager] Database schema created');
      };
    });
  }

  /**
   * Create a new project
   */
  createNew() {
    this.currentProject = {
      id: this.generateId(),
      name: 'Untitled',
      bpm: 120,
      voices: [
        { waveform: 'pulse', pulseWidth: 0.5, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
        { waveform: 'sawtooth', pulseWidth: 0.5, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
        { waveform: 'triangle', pulseWidth: 0.5, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 }
      ],
      grid: Array(3).fill(null).map(() => Array(64).fill(null)),
      filter: { type: 'lowpass', cutoff: 80, resonance: 20 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.state.bpm = this.currentProject.bpm;
    this.state.project = this.currentProject;

    console.log('[ProjectManager] New project created');
    return this.currentProject;
  }

  /**
   * Save current project
   */
  async save() {
    if (!this.currentProject) {
      console.warn('[ProjectManager] No project to save');
      return null;
    }

    // Update timestamp
    this.currentProject.updatedAt = Date.now();

    // Collect current state
    this.currentProject.bpm = this.state.bpm;

    // Get grid data from sequencer (if available)
    if (window.SIDTuneMaker?.sequencer) {
      this.currentProject.grid = window.SIDTuneMaker.sequencer.export();
    }

    // Save to IndexedDB
    try {
      await this.saveToDB(this.currentProject);
      console.log('[ProjectManager] Project saved:', this.currentProject.name);

      // Also save to localStorage as backup
      this.saveToLocalStorage();

      return this.currentProject;
    } catch (error) {
      console.error('[ProjectManager] Save failed:', error);
      return null;
    }
  }

  /**
   * Save to IndexedDB
   */
  async saveToDB(project) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);

      request.onsuccess = () => resolve(project);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save to localStorage (backup)
   */
  saveToLocalStorage() {
    try {
      const data = JSON.stringify(this.currentProject);
      localStorage.setItem('sid-current-project', data);
    } catch (e) {
      console.warn('[ProjectManager] localStorage save failed:', e);
    }
  }

  /**
   * Load a project by ID
   */
  async load(projectId) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(projectId);

      request.onsuccess = () => {
        const project = request.result;
        if (project) {
          this.currentProject = project;
          this.state.project = project;
          this.state.bpm = project.bpm;

          // Load grid into sequencer
          if (window.SIDTuneMaker?.sequencer) {
            window.SIDTuneMaker.sequencer.load(project.grid);
          }

          console.log('[ProjectManager] Project loaded:', project.name);
          resolve(project);
        } else {
          reject(new Error('Project not found'));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List all projects
   */
  async listAll() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.getAll();

      request.onsuccess = () => {
        // Sort by most recent first
        const projects = request.result.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(projects);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a project
   */
  async delete(projectId) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(projectId);

      request.onsuccess = () => {
        console.log('[ProjectManager] Project deleted:', projectId);
        resolve(true);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Show open dialog (simple version)
   */
  async showOpenDialog() {
    const projects = await this.listAll();

    if (projects.length === 0) {
      alert('No saved projects found.');
      return;
    }

    // Simple prompt-based selection (would be nicer as modal)
    const names = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const choice = prompt(`Select a project:\n\n${names}\n\nEnter number:`);

    if (choice) {
      const index = parseInt(choice, 10) - 1;
      if (index >= 0 && index < projects.length) {
        await this.load(projects[index].id);
      }
    }
  }

  /**
   * Export project as JSON file
   */
  exportJSON() {
    if (!this.currentProject) return;

    const data = JSON.stringify(this.currentProject, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentProject.name.replace(/\s+/g, '-')}.sidtune`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('[ProjectManager] Project exported');
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
