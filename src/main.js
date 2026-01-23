/**
 * SID Tune Maker - Main Entry Point
 * Initializes the application and sets up core modules
 */

import { SIDEngine } from './audio/sid-engine.js';
import { Sequencer } from './ui/sequencer.js';
import { SoundLibrary } from './ui/sound-library.js';
import { Transport } from './audio/transport.js';
import { ProjectManager } from './lib/project-manager.js';
import { LibraryModal } from './ui/library-modal.js';
import { ExportModal } from './ui/export-modal.js';

// App state
const state = {
  bpm: 120,
  isPlaying: false,
  project: null
};

// Core modules (initialized after DOM ready)
let engine = null;
let sequencer = null;
let library = null;
let transport = null;
let projectManager = null;
let libraryModal = null;
let exportModal = null;

/**
 * Initialize the application
 */
async function init() {
  console.log('[SID] Initializing...');

  try {
    // Initialize audio engine
    engine = new SIDEngine();
    await engine.init();
    console.log('[SID] Audio engine ready');

    // Initialize transport (play/stop/timing)
    transport = new Transport(engine, state);
    console.log('[SID] Transport ready');

    // Initialize UI components
    sequencer = new Sequencer(engine, transport, state);
    library = new SoundLibrary(sequencer);
    sequencer.soundLibrary = library; // Connect library to sequencer
    console.log('[SID] UI components ready');

    // Initialize project manager
    projectManager = new ProjectManager(state);
    console.log('[SID] Project manager ready');

    // Initialize library modal (user tunes + examples)
    libraryModal = new LibraryModal(projectManager, sequencer, engine);
    console.log('[SID] Library modal ready');

    // Initialize export modal (MP3/WAV download)
    exportModal = new ExportModal(projectManager, sequencer);
    console.log('[SID] Export modal ready');

    // Set up event listeners
    setupEventListeners();

    // Create default project
    projectManager.createNew();

    // Hide loading screen
    hideLoading();

    console.log('[SID] Initialization complete!');
  } catch (error) {
    console.error('[SID] Initialization failed:', error);
    showError('Failed to initialize audio. Please refresh and try again.');
  }
}

/**
 * Set up DOM event listeners
 */
function setupEventListeners() {
  // Transport controls - single play/pause toggle
  const playPauseBtn = document.getElementById('btn-play-pause');
  playPauseBtn?.addEventListener('click', async () => {
    // Always try to resume audio context on mobile
    if (engine?.audioContext?.state === 'suspended') {
      await engine.audioContext.resume();
    }

    if (state.isPlaying) {
      transport.stop();
      state.isPlaying = false;
      playPauseBtn.textContent = 'PLAY';
      playPauseBtn.classList.remove('btn--playing');
    } else {
      transport.play();
      state.isPlaying = true;
      playPauseBtn.textContent = 'PAUSE';
      playPauseBtn.classList.add('btn--playing');
    }
  });

  // BPM control
  document.getElementById('bpm')?.addEventListener('change', (e) => {
    const bpm = parseInt(e.target.value, 10);
    if (bpm >= 60 && bpm <= 200) {
      state.bpm = bpm;
      transport.setBPM(bpm);
    }
  });

  // Project controls
  document.getElementById('btn-new')?.addEventListener('click', () => {
    if (confirm('Start a new project? Unsaved changes will be lost.')) {
      projectManager.createNew();
    }
  });

  document.getElementById('btn-save')?.addEventListener('click', async () => {
    // Prompt for name if untitled
    if (projectManager.currentProject?.name === 'Untitled') {
      const name = prompt('Name your banger:', 'Untitled');
      if (name) {
        projectManager.currentProject.name = name;
      }
    }
    await projectManager.save();
  });

  // Loop region
  document.getElementById('loop-start')?.addEventListener('change', (e) => {
    transport.setLoopStart(parseInt(e.target.value, 10));
  });

  document.getElementById('loop-end')?.addEventListener('change', (e) => {
    transport.setLoopEnd(parseInt(e.target.value, 10));
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Handle audio context resume on user interaction
  document.addEventListener('click', resumeAudioContext, { once: true });
  document.addEventListener('keydown', resumeAudioContext, { once: true });

  // Mobile toolbar
  setupMobileToolbar();
}

/**
 * Set up mobile toolbar event listeners
 */
function setupMobileToolbar() {
  const libraryEl = document.getElementById('library');
  const selectBtn = document.getElementById('mobile-select');
  const rapidBtn = document.getElementById('mobile-rapid');

  // Sounds button - toggle sound library
  document.getElementById('mobile-sounds')?.addEventListener('click', () => {
    libraryEl?.classList.toggle('library--visible');
  });

  // Close library button
  document.getElementById('library-close')?.addEventListener('click', () => {
    libraryEl?.classList.remove('library--visible');
  });

  // Select mode toggle
  selectBtn?.addEventListener('click', () => {
    sequencer.mobileSelectMode = !sequencer.mobileSelectMode;
    selectBtn.classList.toggle('mobile-btn--active', sequencer.mobileSelectMode);
    // Turn off rapid mode if select is on
    if (sequencer.mobileSelectMode) {
      sequencer.mobileRapidMode = false;
      rapidBtn?.classList.remove('mobile-btn--active');
    }
  });

  // Rapid mode toggle
  rapidBtn?.addEventListener('click', () => {
    sequencer.mobileRapidMode = !sequencer.mobileRapidMode;
    rapidBtn.classList.toggle('mobile-btn--active', sequencer.mobileRapidMode);
    // Turn off select mode if rapid is on
    if (sequencer.mobileRapidMode) {
      sequencer.mobileSelectMode = false;
      selectBtn?.classList.remove('mobile-btn--active');
    }
  });

  // Copy
  document.getElementById('mobile-copy')?.addEventListener('click', () => {
    if (sequencer.selection) {
      sequencer.copySelection();
    }
  });

  // Paste
  document.getElementById('mobile-paste')?.addEventListener('click', () => {
    if (sequencer.clipboard) {
      sequencer.pasteClipboard();
    }
  });

  // Delete
  document.getElementById('mobile-delete')?.addEventListener('click', () => {
    if (sequencer.selection) {
      sequencer.deleteSelection();
    }
  });

  // Undo - real undo functionality
  document.getElementById('mobile-undo')?.addEventListener('click', () => {
    if (!sequencer.undo()) {
      // Nothing to undo - optionally show feedback
      console.log('Nothing to undo');
    }
  });
}

/**
 * Resume audio context (required by browsers)
 */
function resumeAudioContext() {
  if (engine?.audioContext?.state === 'suspended') {
    engine.audioContext.resume();
  }
}

/**
 * Handle keyboard shortcuts
 */
async function handleKeyboard(e) {
  // Space = play/pause toggle
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();

    // Resume audio context if suspended
    if (engine?.audioContext?.state === 'suspended') {
      await engine.audioContext.resume();
    }

    const playPauseBtn = document.getElementById('btn-play-pause');
    if (state.isPlaying) {
      transport.stop();
      state.isPlaying = false;
      if (playPauseBtn) {
        playPauseBtn.textContent = 'PLAY';
        playPauseBtn.classList.remove('btn--playing');
      }
    } else {
      transport.play();
      state.isPlaying = true;
      if (playPauseBtn) {
        playPauseBtn.textContent = 'PAUSE';
        playPauseBtn.classList.add('btn--playing');
      }
    }
  }

  // Ctrl+S = save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    projectManager.save();
  }

  // Ctrl+N = new
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    if (confirm('Start a new project?')) {
      projectManager.createNew();
    }
  }
}

/**
 * Hide the loading screen
 */
function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('loading--hidden');
    setTimeout(() => loading.remove(), 300);
  }
}

/**
 * Show error message
 */
function showError(message) {
  const loading = document.getElementById('loading');
  if (loading) {
    const text = loading.querySelector('.loading__text');
    if (text) {
      text.textContent = message;
      text.style.color = '#FF6600';
    }
  }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging and cross-module access
window.SIDTuneMaker = { state, engine, transport, sequencer, library, libraryModal, exportModal, projectManager };
