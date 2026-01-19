/**
 * Sequencer - Grid-based step sequencer UI
 * Handles note placement, playback visualization, and drag/drop
 */

export class Sequencer {
  constructor(engine, transport, state) {
    this.engine = engine;
    this.transport = transport;
    this.state = state;

    // Grid configuration
    this.rows = 3; // 3 SID voices
    this.cols = 64; // 4 bars of 16th notes
    this.cellWidth = 32;
    this.cellHeight = 48;

    // Grid data: [voice][step] = { note, velocity, ... } or null
    this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));

    // DOM elements
    this.gridEl = document.getElementById('grid');
    this.timelineEl = document.getElementById('timeline');

    // Current playback position
    this.currentStep = 0;

    // Initialize
    this.render();
    this.setupEvents();

    // Connect to transport
    this.transport.onBeat = (beat) => this.onBeat(beat);
    this.transport.onStop = () => this.onStop();
  }

  /**
   * Render the grid
   */
  render() {
    if (!this.gridEl) return;

    this.gridEl.innerHTML = '';

    // Create rows
    for (let row = 0; row < this.rows; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'grid-row';
      rowEl.dataset.voice = row;

      // Create cells
      for (let col = 0; col < this.cols; col++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Mark bar boundaries
        if ((col + 1) % 16 === 0) {
          cell.classList.add('grid-cell--bar');
        }

        // Mark active cells
        if (this.grid[row][col]) {
          cell.classList.add('grid-cell--active');
        }

        rowEl.appendChild(cell);
      }

      this.gridEl.appendChild(rowEl);
    }

    // Render timeline
    this.renderTimeline();
  }

  /**
   * Render timeline markers
   */
  renderTimeline() {
    if (!this.timelineEl) return;

    this.timelineEl.innerHTML = '';

    for (let col = 0; col < this.cols; col++) {
      const marker = document.createElement('div');
      marker.className = 'beat-marker';

      // Show bar numbers on beat 1 of each bar
      if (col % 16 === 0) {
        marker.classList.add('beat-marker--bar');
        marker.textContent = `${Math.floor(col / 16) + 1}`;
      } else if (col % 4 === 0) {
        // Show beat numbers
        marker.textContent = `${(col % 16) / 4 + 1}`;
      }

      this.timelineEl.appendChild(marker);
    }
  }

  /**
   * Set up event listeners
   */
  setupEvents() {
    if (!this.gridEl) return;

    // Click to toggle note
    this.gridEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.grid-cell');
      if (!cell) return;

      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);

      this.toggleCell(row, col);
    });

    // Right-click to clear
    this.gridEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.grid-cell');
      if (!cell) return;

      const row = parseInt(cell.dataset.row, 10);
      const col = parseInt(cell.dataset.col, 10);

      this.clearCell(row, col);
    });
  }

  /**
   * Toggle a cell on/off
   */
  toggleCell(row, col) {
    if (this.grid[row][col]) {
      this.clearCell(row, col);
    } else {
      this.setCell(row, col, { note: 'C4', velocity: 1 });
    }
  }

  /**
   * Set a cell's note
   */
  setCell(row, col, data) {
    this.grid[row][col] = data;

    // Update visual
    const cell = this.getCellElement(row, col);
    if (cell) {
      cell.classList.add('grid-cell--active');
    }

    // Preview the note
    this.previewNote(row, data.note);
  }

  /**
   * Clear a cell
   */
  clearCell(row, col) {
    this.grid[row][col] = null;

    // Update visual
    const cell = this.getCellElement(row, col);
    if (cell) {
      cell.classList.remove('grid-cell--active');
    }
  }

  /**
   * Get cell DOM element
   */
  getCellElement(row, col) {
    return this.gridEl?.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
  }

  /**
   * Preview a note (play immediately)
   */
  previewNote(voice, note) {
    // Import dynamically to avoid circular deps
    import('../audio/sid-engine.js').then(({ noteToFrequency }) => {
      const freq = noteToFrequency(note);
      this.engine.playNote(voice, freq, 0.2);
    });
  }

  /**
   * Called on each beat during playback
   */
  onBeat(beat) {
    // Update visual position
    this.highlightStep(beat % this.cols);

    // Play notes on this beat
    for (let voice = 0; voice < this.rows; voice++) {
      const cellData = this.grid[voice][beat % this.cols];
      if (cellData) {
        import('../audio/sid-engine.js').then(({ noteToFrequency }) => {
          const freq = noteToFrequency(cellData.note);
          const duration = 60 / this.state.bpm / 4; // 16th note duration
          this.engine.playNote(voice, freq, duration * 0.9);
        });
      }
    }
  }

  /**
   * Highlight the current step
   */
  highlightStep(step) {
    // Clear previous highlight
    const prevHighlight = this.gridEl?.querySelectorAll('.grid-cell--playing');
    prevHighlight?.forEach(el => el.classList.remove('grid-cell--playing'));

    // Highlight current column
    for (let row = 0; row < this.rows; row++) {
      const cell = this.getCellElement(row, step);
      if (cell) {
        cell.classList.add('grid-cell--playing');
      }
    }

    this.currentStep = step;
  }

  /**
   * Called when playback stops
   */
  onStop() {
    // Clear all highlights
    const highlights = this.gridEl?.querySelectorAll('.grid-cell--playing');
    highlights?.forEach(el => el.classList.remove('grid-cell--playing'));
  }

  /**
   * Clear the entire grid
   */
  clearAll() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.grid[row][col] = null;
      }
    }
    this.render();
  }

  /**
   * Load grid data
   */
  load(data) {
    if (!data || !Array.isArray(data)) return;

    this.grid = data.map(row =>
      row.map(cell => cell ? { ...cell } : null)
    );

    this.render();
  }

  /**
   * Export grid data
   */
  export() {
    return this.grid.map(row =>
      row.map(cell => cell ? { ...cell } : null)
    );
  }
}
