/**
 * SID Tune Maker - Main Entry Point
 * Initializes the application and sets up core modules
 */

import { SIDEngine } from './audio/sid-engine.js';
import { Sequencer } from './ui/sequencer.js';
import { SoundLibrary } from './ui/sound-library.js';
import { VoiceEditor } from './ui/voice-editor.js';
import { Transport } from './audio/transport.js';
import { ProjectManager } from './lib/project-manager.js';

// App state
const state = {
  bpm: 120,
  isPlaying: false,
  currentVoice: 0,
  project: null
};

// Core modules (initialized after DOM ready)
let engine = null;
let sequencer = null;
let library = null;
let editor = null;
let transport = null;
let projectManager = null;

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
    editor = new VoiceEditor(engine, state);
    console.log('[SID] UI components ready');

    // Initialize project manager
    projectManager = new ProjectManager(state);
    console.log('[SID] Project manager ready');

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
  // Transport controls
  document.getElementById('btn-play')?.addEventListener('click', () => {
    transport.play();
    state.isPlaying = true;
  });

  document.getElementById('btn-stop')?.addEventListener('click', () => {
    transport.stop();
    state.isPlaying = false;
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

  document.getElementById('btn-save')?.addEventListener('click', () => {
    projectManager.save();
  });

  document.getElementById('btn-open')?.addEventListener('click', () => {
    projectManager.showOpenDialog();
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
function handleKeyboard(e) {
  // Space = play/stop
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    if (state.isPlaying) {
      transport.stop();
      state.isPlaying = false;
    } else {
      transport.play();
      state.isPlaying = true;
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

// Export for debugging
window.SIDTuneMaker = { state, engine, transport, sequencer };
