/**
 * Sequencer - Piano roll style step sequencer
 * Each voice has its own piano roll with multiple pitch rows
 */

// Note definitions for the piano roll (one octave + a few extra)
const NOTES = [
  { name: 'C5', midi: 72, black: false },
  { name: 'B4', midi: 71, black: false },
  { name: 'A#4', midi: 70, black: true },
  { name: 'A4', midi: 69, black: false },
  { name: 'G#4', midi: 68, black: true },
  { name: 'G4', midi: 67, black: false },
  { name: 'F#4', midi: 66, black: true },
  { name: 'F4', midi: 65, black: false },
  { name: 'E4', midi: 64, black: false },
  { name: 'D#4', midi: 63, black: true },
  { name: 'D4', midi: 62, black: false },
  { name: 'C#4', midi: 61, black: true },
  { name: 'C4', midi: 60, black: false },
  { name: 'B3', midi: 59, black: false },
  { name: 'A3', midi: 57, black: false },
  { name: 'G3', midi: 55, black: false },
];

export class Sequencer {
  constructor(engine, transport, state) {
    this.engine = engine;
    this.transport = transport;
    this.state = state;

    // Reference to sound library (set after construction)
    this.soundLibrary = null;

    // Grid configuration
    this.voices = 3;
    this.cols = 64; // 4 bars of 16th notes
    this.notes = NOTES;

    // Grid data: [voice][noteIndex][step] = { length: n } or null
    // length = how many steps the note spans (1 = 16th, 2 = 8th, 4 = quarter, etc)
    this.grid = Array(this.voices).fill(null).map(() =>
      Array(this.notes.length).fill(null).map(() =>
        Array(this.cols).fill(null)
      )
    );

    // For drawing notes by dragging
    this.isDrawing = false;
    this.isRapidMode = false; // Ctrl+drag to place multiple short notes
    this.drawStart = null;
    this.drawLastCol = null;
    this.drawLastCell = null; // For rapid mode diagonal drawing

    // Mobile mode toggles (controlled by toolbar buttons)
    this.mobileSelectMode = false;
    this.mobileRapidMode = false;

    // Long-press for delete
    this.longPressTimer = null;
    this.longPressData = null;

    // DOM elements
    this.pianoKeyEls = document.querySelectorAll('.piano-keys');
    this.pianoGridEls = document.querySelectorAll('.piano-grid');

    // Current playback position
    this.currentStep = 0;

    // Selection state
    this.selection = null; // { voice, startNote, endNote, startCol, endCol }
    this.isSelecting = false;
    this.selectionStart = null;
    this.clipboard = null; // copied notes

    // Initialize
    this.render();
    this.setupEvents();
    this.setupVoiceControls();
    this.setupKeyboardShortcuts();

    // Connect to transport
    this.transport.onBeat = (beat) => this.onBeat(beat);
    this.transport.onStop = () => this.onStop();
  }

  /**
   * Render piano keys and grid for all voices
   */
  render() {
    // Render each voice's piano roll
    for (let voice = 0; voice < this.voices; voice++) {
      this.renderPianoKeys(voice);
      this.renderGrid(voice);
    }
  }

  /**
   * Render piano keys for a voice
   */
  renderPianoKeys(voice) {
    const keysEl = this.pianoKeyEls[voice];
    if (!keysEl) return;

    keysEl.innerHTML = this.notes.map((note, noteIndex) => `
      <div class="piano-key ${note.black ? 'piano-key--black' : ''}"
           data-voice="${voice}"
           data-note="${noteIndex}">
        ${note.name.replace('#', '')}
      </div>
    `).join('');

    // Click on key to preview note
    keysEl.querySelectorAll('.piano-key').forEach(key => {
      key.addEventListener('click', () => {
        const noteIndex = parseInt(key.dataset.note, 10);
        this.previewNote(voice, noteIndex);
      });
    });
  }

  /**
   * Render grid for a voice
   */
  renderGrid(voice) {
    const gridEl = this.pianoGridEls[voice];
    if (!gridEl) return;

    let html = '';

    // Create rows for each note
    for (let noteIndex = 0; noteIndex < this.notes.length; noteIndex++) {
      const note = this.notes[noteIndex];
      html += `<div class="grid-row ${note.black ? 'grid-row--black' : ''}" data-note="${noteIndex}">`;

      // Create cells for each step
      for (let col = 0; col < this.cols; col++) {
        const cellData = this.grid[voice][noteIndex][col];
        const isBar = (col + 1) % 16 === 0;

        // Check if this cell is the start of a note
        const isNoteStart = cellData && cellData.length;
        // Check if this cell is a continuation of a previous note
        const isContinuation = this.isNoteContinuation(voice, noteIndex, col);

        let cellClass = 'grid-cell';
        if (isNoteStart) cellClass += ' grid-cell--active grid-cell--note-start';
        if (isContinuation) cellClass += ' grid-cell--active grid-cell--note-cont';
        if (isBar) cellClass += ' grid-cell--bar';

        html += `
          <div class="${cellClass}"
               data-voice="${voice}"
               data-note="${noteIndex}"
               data-col="${col}">
          </div>
        `;
      }

      html += '</div>';
    }

    gridEl.innerHTML = html;
  }

  /**
   * Check if a cell is a continuation of a note started earlier
   */
  isNoteContinuation(voice, noteIndex, col) {
    // Look backwards to find if there's a note that extends to this cell
    for (let c = col - 1; c >= 0; c--) {
      const cellData = this.grid[voice][noteIndex][c];
      if (cellData && cellData.length) {
        // Found a note start - does it extend to our column?
        return c + cellData.length > col;
      }
      // Stop if we hit a gap
      if (!cellData) {
        // Check if this gap is part of a longer note
        continue;
      }
    }
    return false;
  }

  /**
   * Update a single cell's visual state (without re-rendering)
   */
  updateCellVisual(voice, noteIndex, col) {
    const cell = this.getCellElement(voice, noteIndex, col);
    if (!cell) return;

    const cellData = this.grid[voice][noteIndex][col];

    // Clear old classes
    cell.classList.remove('grid-cell--active', 'grid-cell--note-start', 'grid-cell--note-cont');

    if (cellData && cellData.length) {
      cell.classList.add('grid-cell--active', 'grid-cell--note-start');
    }
  }

  /**
   * Update visual for a note (start + continuation cells)
   */
  updateNoteVisual(voice, noteIndex, startCol, newLength, oldLength) {
    const gridEl = this.pianoGridEls[voice];
    if (!gridEl) return;

    // Clear old continuation cells
    for (let c = startCol; c < startCol + Math.max(newLength, oldLength); c++) {
      const cell = gridEl.querySelector(`.grid-cell[data-note="${noteIndex}"][data-col="${c}"]`);
      if (cell) {
        cell.classList.remove('grid-cell--active', 'grid-cell--note-start', 'grid-cell--note-cont');
      }
    }

    // Set new cells
    for (let c = startCol; c < startCol + newLength; c++) {
      const cell = gridEl.querySelector(`.grid-cell[data-note="${noteIndex}"][data-col="${c}"]`);
      if (cell) {
        cell.classList.add('grid-cell--active');
        if (c === startCol) {
          cell.classList.add('grid-cell--note-start');
        } else {
          cell.classList.add('grid-cell--note-cont');
        }
      }
    }
  }

  /**
   * Set up event listeners for grid cells
   */
  setupEvents() {
    this.pianoGridEls.forEach((gridEl, voiceIndex) => {
      // Mouse down - start drawing note or selection
      gridEl.addEventListener('mousedown', (e) => {
        this.handlePointerDown(e, e.target, e.shiftKey, e.ctrlKey);
      });

      // Mouse move - extend note or place rapid notes
      gridEl.addEventListener('mousemove', (e) => {
        this.handlePointerMove(e, e.target);
      });

      // Mouse up - end drawing or selection
      gridEl.addEventListener('mouseup', () => {
        this.handlePointerUp();
      });

      // Touch start - same as mouse down
      gridEl.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        this.handlePointerDown(e, target, false, this.mobileRapidMode);
      }, { passive: false });

      // Touch move - same as mouse move
      gridEl.addEventListener('touchmove', (e) => {
        if (!this.isDrawing && !this.isSelecting) return;
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        this.handlePointerMove(e, target);
      }, { passive: false });

      // Touch end - same as mouse up
      gridEl.addEventListener('touchend', () => {
        this.handlePointerUp();
        this.clearLongPressTimer();
      });

      gridEl.addEventListener('touchcancel', () => {
        this.handlePointerUp();
        this.clearLongPressTimer();
      });

      // Right-click to clear cell or selection
      gridEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        if (this.selection) {
          this.deleteSelection();
        } else {
          const cell = e.target.closest('.grid-cell');
          if (!cell) return;

          const voice = parseInt(cell.dataset.voice, 10);
          const noteIndex = parseInt(cell.dataset.note, 10);
          const col = parseInt(cell.dataset.col, 10);

          this.deleteNoteAt(voice, noteIndex, col);
        }
      });
    });

    // Global mouse up to end drawing/selection
    document.addEventListener('mouseup', () => {
      this.handlePointerUp();
    });

    document.addEventListener('touchend', () => {
      this.handlePointerUp();
      this.clearLongPressTimer();
    });
  }

  /**
   * Handle pointer down (mouse or touch)
   */
  handlePointerDown(e, target, isShift, isCtrl) {
    const cell = target?.closest('.grid-cell');
    if (!cell) return;

    const voice = parseInt(cell.dataset.voice, 10);
    const noteIndex = parseInt(cell.dataset.note, 10);
    const col = parseInt(cell.dataset.col, 10);

    // Start long-press timer for delete on touch
    if (e.type === 'touchstart') {
      this.startLongPressTimer(voice, noteIndex, col);
    }

    if (isShift || this.mobileSelectMode) {
      // Shift+click or mobile select mode starts selection
      this.startSelection(voice, noteIndex, col);
      e.preventDefault();
    } else if (this.selection && this.isInSelection(voice, noteIndex, col)) {
      // Clicking inside selection - do nothing, allow drag
    } else {
      // Clear selection
      this.clearSelection();

      // Check if clicking on existing note to delete it
      if (this.grid[voice][noteIndex][col] || this.isNoteContinuation(voice, noteIndex, col)) {
        this.deleteNoteAt(voice, noteIndex, col);
      } else {
        // Ctrl+click or mobile rapid mode = rapid note mode (place short notes)
        // Normal click = draw mode (can extend notes)
        this.isDrawing = true;
        this.isRapidMode = isCtrl;
        this.drawStart = { voice, noteIndex, col };
        this.drawLastCol = col;
        // Place initial note (length 1)
        this.grid[voice][noteIndex][col] = { length: 1 };
        this.updateCellVisual(voice, noteIndex, col);
        this.previewNote(voice, noteIndex);
      }
    }
  }

  /**
   * Handle pointer move (mouse or touch)
   */
  handlePointerMove(e, target) {
    if (!this.isDrawing && !this.isSelecting) return;

    // Clear long-press timer on move (user is dragging)
    this.clearLongPressTimer();

    const cell = target?.closest('.grid-cell');
    if (!cell) return;

    const voice = parseInt(cell.dataset.voice, 10);
    const noteIndex = parseInt(cell.dataset.note, 10);
    const col = parseInt(cell.dataset.col, 10);

    // Create a unique key for this cell to avoid duplicates
    const cellKey = `${noteIndex}-${col}`;

    if (this.isSelecting) {
      this.extendSelection(noteIndex, col);
    } else if (this.isDrawing && this.drawStart) {
      if (this.isRapidMode) {
        // Rapid mode: place a new short note on each cell we pass (diagonal OK)
        if (cellKey !== this.drawLastCell) {
          this.drawLastCell = cellKey;
          if (!this.grid[voice][noteIndex][col] && !this.isNoteContinuation(voice, noteIndex, col)) {
            this.grid[voice][noteIndex][col] = { length: 1 };
            this.updateCellVisual(voice, noteIndex, col);
            this.previewNote(voice, noteIndex);
          }
        }
      } else if (col !== this.drawLastCol) {
        // Normal mode: extend the note being drawn (horizontal only)
        this.drawLastCol = col;
        const newLength = Math.max(1, col - this.drawStart.col + 1);
        const { voice: startVoice, noteIndex: startNote, col: startCol } = this.drawStart;
        const oldLength = this.grid[startVoice][startNote][startCol]?.length || 1;

        if (newLength !== oldLength) {
          this.grid[startVoice][startNote][startCol] = { length: newLength };
          this.updateNoteVisual(startVoice, startNote, startCol, newLength, oldLength);
        }
      }
    }
  }

  /**
   * Handle pointer up (mouse or touch)
   */
  handlePointerUp() {
    this.isSelecting = false;
    this.isDrawing = false;
    this.isRapidMode = false;
    this.drawStart = null;
    this.drawLastCol = null;
    this.drawLastCell = null;
  }

  /**
   * Start long-press timer for delete
   */
  startLongPressTimer(voice, noteIndex, col) {
    this.clearLongPressTimer();
    this.longPressData = { voice, noteIndex, col };
    this.longPressTimer = setTimeout(() => {
      // Long press = delete
      if (this.grid[voice][noteIndex][col] || this.isNoteContinuation(voice, noteIndex, col)) {
        this.deleteNoteAt(voice, noteIndex, col);
        // Vibrate for feedback if available
        if (navigator.vibrate) navigator.vibrate(50);
      }
      this.isDrawing = false; // Cancel drawing
    }, 500);
  }

  /**
   * Clear long-press timer
   */
  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressData = null;
  }

  /**
   * Delete a note at a position (finds the note start and removes it)
   */
  deleteNoteAt(voice, noteIndex, col) {
    // If this is a note start, delete it directly
    const cellData = this.grid[voice][noteIndex][col];
    if (cellData && cellData.length) {
      const oldLength = cellData.length;
      this.grid[voice][noteIndex][col] = null;
      this.updateNoteVisual(voice, noteIndex, col, 0, oldLength);
      return;
    }

    // Otherwise find the note that extends to this position
    for (let c = col - 1; c >= 0; c--) {
      const startData = this.grid[voice][noteIndex][c];
      if (startData && startData.length && c + startData.length > col) {
        const oldLength = startData.length;
        this.grid[voice][noteIndex][c] = null;
        this.updateNoteVisual(voice, noteIndex, c, 0, oldLength);
        return;
      }
    }
  }

  /**
   * Set up keyboard shortcuts for copy/paste/transpose
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore if typing in input
      if (e.target.matches('input, textarea')) return;

      // Ctrl+C - copy
      if (e.ctrlKey && e.key === 'c' && this.selection) {
        e.preventDefault();
        this.copySelection();
      }

      // Ctrl+V - paste
      if (e.ctrlKey && e.key === 'v' && this.clipboard) {
        e.preventDefault();
        this.pasteClipboard();
      }

      // Ctrl+D - duplicate selection to the right
      if (e.ctrlKey && e.key === 'd' && this.selection) {
        e.preventDefault();
        this.duplicateSelection();
      }

      // Arrow up - transpose up
      if (e.key === 'ArrowUp' && this.selection) {
        e.preventDefault();
        this.transposeSelection(-1); // -1 = higher pitch (lower index)
      }

      // Arrow down - transpose down
      if (e.key === 'ArrowDown' && this.selection) {
        e.preventDefault();
        this.transposeSelection(1); // 1 = lower pitch (higher index)
      }

      // Arrow left - move selection left
      if (e.key === 'ArrowLeft' && this.selection) {
        e.preventDefault();
        this.moveSelection(-1);
      }

      // Arrow right - move selection right
      if (e.key === 'ArrowRight' && this.selection) {
        e.preventDefault();
        this.moveSelection(1);
      }

      // Delete/Backspace - delete selection
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selection) {
        e.preventDefault();
        this.deleteSelection();
      }

      // Escape - clear selection
      if (e.key === 'Escape') {
        this.clearSelection();
      }
    });
  }

  /**
   * Start a new selection
   */
  startSelection(voice, noteIndex, col) {
    this.isSelecting = true;
    this.selectionStart = { voice, noteIndex, col };
    this.selection = {
      voice,
      startNote: noteIndex,
      endNote: noteIndex,
      startCol: col,
      endCol: col
    };
    this.renderSelection();
  }

  /**
   * Extend selection to new position
   */
  extendSelection(noteIndex, col) {
    if (!this.selection || !this.selectionStart) return;

    this.selection.startNote = Math.min(this.selectionStart.noteIndex, noteIndex);
    this.selection.endNote = Math.max(this.selectionStart.noteIndex, noteIndex);
    this.selection.startCol = Math.min(this.selectionStart.col, col);
    this.selection.endCol = Math.max(this.selectionStart.col, col);

    this.renderSelection();
  }

  /**
   * Check if cell is in current selection
   */
  isInSelection(voice, noteIndex, col) {
    if (!this.selection) return false;
    if (voice !== this.selection.voice) return false;

    return noteIndex >= this.selection.startNote &&
           noteIndex <= this.selection.endNote &&
           col >= this.selection.startCol &&
           col <= this.selection.endCol;
  }

  /**
   * Render selection highlight
   */
  renderSelection() {
    // Clear old selection highlights
    document.querySelectorAll('.grid-cell--selected').forEach(el => {
      el.classList.remove('grid-cell--selected');
    });

    if (!this.selection) return;

    const gridEl = this.pianoGridEls[this.selection.voice];
    if (!gridEl) return;

    for (let n = this.selection.startNote; n <= this.selection.endNote; n++) {
      for (let c = this.selection.startCol; c <= this.selection.endCol; c++) {
        const cell = gridEl.querySelector(`.grid-cell[data-note="${n}"][data-col="${c}"]`);
        if (cell) {
          cell.classList.add('grid-cell--selected');
        }
      }
    }
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.selection = null;
    this.selectionStart = null;
    document.querySelectorAll('.grid-cell--selected').forEach(el => {
      el.classList.remove('grid-cell--selected');
    });
  }

  /**
   * Copy selection to clipboard
   */
  copySelection() {
    if (!this.selection) return;

    const { voice, startNote, endNote, startCol, endCol } = this.selection;
    const notes = [];

    for (let n = startNote; n <= endNote; n++) {
      for (let c = startCol; c <= endCol; c++) {
        const cellData = this.grid[voice][n][c];
        if (cellData && cellData.length) {
          notes.push({
            noteOffset: n - startNote,
            colOffset: c - startCol,
            length: cellData.length
          });
        }
      }
    }

    this.clipboard = {
      notes,
      width: endCol - startCol + 1,
      height: endNote - startNote + 1
    };

    console.log(`[Sequencer] Copied ${notes.length} notes`);
  }

  /**
   * Paste clipboard at selection position
   */
  pasteClipboard() {
    if (!this.clipboard || !this.selection) return;

    const { voice, startNote, startCol } = this.selection;

    // Paste notes
    for (const note of this.clipboard.notes) {
      const n = startNote + note.noteOffset;
      const c = startCol + note.colOffset;

      if (n >= 0 && n < this.notes.length && c >= 0 && c < this.cols) {
        this.grid[voice][n][c] = { length: note.length };
      }
    }

    this.renderGrid(voice);
    console.log(`[Sequencer] Pasted ${this.clipboard.notes.length} notes`);
  }

  /**
   * Duplicate selection to the right
   */
  duplicateSelection() {
    if (!this.selection) return;

    const { voice, startNote, endNote, startCol, endCol } = this.selection;
    const width = endCol - startCol + 1;
    const targetCol = endCol + 1;

    // Copy notes to the right
    for (let n = startNote; n <= endNote; n++) {
      for (let c = startCol; c <= endCol; c++) {
        const cellData = this.grid[voice][n][c];
        if (cellData && cellData.length) {
          const newCol = targetCol + (c - startCol);
          if (newCol < this.cols) {
            this.grid[voice][n][newCol] = { length: cellData.length };
          }
        }
      }
    }

    this.renderGrid(voice);

    // Move selection to duplicated region
    this.selection.startCol = targetCol;
    this.selection.endCol = Math.min(targetCol + width - 1, this.cols - 1);
    this.renderSelection();

    console.log('[Sequencer] Duplicated selection');
  }

  /**
   * Transpose selection up or down
   */
  transposeSelection(direction) {
    if (!this.selection) return;

    const { voice, startNote, endNote, startCol, endCol } = this.selection;

    // Check bounds
    if (direction < 0 && startNote <= 0) return;
    if (direction > 0 && endNote >= this.notes.length - 1) return;

    // Collect active notes with their data
    const activeNotes = [];
    for (let n = startNote; n <= endNote; n++) {
      for (let c = startCol; c <= endCol; c++) {
        const cellData = this.grid[voice][n][c];
        if (cellData && cellData.length) {
          activeNotes.push({ n, c, length: cellData.length });
        }
      }
    }

    // Clear old positions
    for (const { n, c } of activeNotes) {
      this.grid[voice][n][c] = null;
    }

    // Set new positions
    for (const { n, c, length } of activeNotes) {
      this.grid[voice][n + direction][c] = { length };
    }

    this.renderGrid(voice);

    // Update selection bounds
    this.selection.startNote += direction;
    this.selection.endNote += direction;
    this.renderSelection();
  }

  /**
   * Move selection left or right
   */
  moveSelection(direction) {
    if (!this.selection) return;

    const { voice, startNote, endNote, startCol, endCol } = this.selection;

    // Check bounds
    if (direction < 0 && startCol <= 0) return;
    if (direction > 0 && endCol >= this.cols - 1) return;

    // Collect active notes with their data
    const activeNotes = [];
    for (let n = startNote; n <= endNote; n++) {
      for (let c = startCol; c <= endCol; c++) {
        const cellData = this.grid[voice][n][c];
        if (cellData && cellData.length) {
          activeNotes.push({ n, c, length: cellData.length });
        }
      }
    }

    // Clear old positions
    for (const { n, c } of activeNotes) {
      this.grid[voice][n][c] = null;
    }

    // Set new positions
    for (const { n, c, length } of activeNotes) {
      this.grid[voice][n][c + direction] = { length };
    }

    this.renderGrid(voice);

    // Update selection bounds
    this.selection.startCol += direction;
    this.selection.endCol += direction;
    this.renderSelection();
  }

  /**
   * Delete all notes in selection
   */
  deleteSelection() {
    if (!this.selection) return;

    const { voice, startNote, endNote, startCol, endCol } = this.selection;

    for (let n = startNote; n <= endNote; n++) {
      for (let c = startCol; c <= endCol; c++) {
        this.grid[voice][n][c] = null;
      }
    }

    this.renderGrid(voice);
    console.log('[Sequencer] Deleted selection');
  }

  /**
   * Set up voice control event listeners
   */
  setupVoiceControls() {
    // Waveform buttons
    document.querySelectorAll('.voice-track .wave-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const voice = parseInt(btn.dataset.voice, 10);
        const wave = btn.dataset.wave;

        // Update active state
        const track = btn.closest('.voice-track');
        track.querySelectorAll('.wave-btn').forEach(b => {
          b.classList.toggle('wave-btn--active', b.dataset.wave === wave);
        });

        this.engine.setVoiceParam(voice, 'waveform', wave);
      });
    });

    // ADSR sliders
    document.querySelectorAll('.adsr-mini').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const voice = parseInt(slider.dataset.voice, 10);
        const param = slider.dataset.param;
        const value = parseInt(e.target.value, 10);

        let mappedValue;
        if (param === 'sustain') {
          mappedValue = value / 100;
        } else {
          mappedValue = 0.001 + (value / 100) * 1.999;
        }

        this.engine.setVoiceParam(voice, param, mappedValue);
      });
    });
  }

  /**
   * Toggle a cell on/off
   */
  toggleCell(voice, noteIndex, col) {
    const cellData = this.grid[voice][noteIndex][col];

    if (cellData || this.isNoteContinuation(voice, noteIndex, col)) {
      this.deleteNoteAt(voice, noteIndex, col);
    } else {
      this.setCell(voice, noteIndex, col);
    }
  }

  /**
   * Set a cell active with a note
   */
  setCell(voice, noteIndex, col, length = 1) {
    this.grid[voice][noteIndex][col] = { length };
    this.renderGrid(voice);

    // Preview the note
    this.previewNote(voice, noteIndex);
  }

  /**
   * Clear a cell
   */
  clearCell(voice, noteIndex, col) {
    this.grid[voice][noteIndex][col] = null;
    this.renderGrid(voice);
  }

  /**
   * Get cell DOM element
   */
  getCellElement(voice, noteIndex, col) {
    const gridEl = this.pianoGridEls[voice];
    return gridEl?.querySelector(`.grid-cell[data-note="${noteIndex}"][data-col="${col}"]`);
  }

  /**
   * Preview a note
   */
  previewNote(voice, noteIndex) {
    const note = this.notes[noteIndex];
    const freq = 440 * Math.pow(2, (note.midi - 69) / 12);
    this.engine.playNote(voice, freq, 0.2);
  }

  /**
   * Called on each beat during playback
   */
  onBeat(beat) {
    const step = beat % this.cols;

    // Update visual
    this.highlightStep(step);

    // Play notes for each voice
    const stepDuration = 60 / this.state.bpm / 4; // duration of one 16th note

    for (let voice = 0; voice < this.voices; voice++) {
      for (let noteIndex = 0; noteIndex < this.notes.length; noteIndex++) {
        const cellData = this.grid[voice][noteIndex][step];
        if (cellData && cellData.length) {
          const note = this.notes[noteIndex];
          const freq = 440 * Math.pow(2, (note.midi - 69) / 12);
          // Duration based on note length
          const duration = stepDuration * cellData.length * 0.95;
          this.engine.playNote(voice, freq, duration);
        }
      }
    }
  }

  /**
   * Highlight current step column
   */
  highlightStep(step) {
    // Clear previous highlights
    document.querySelectorAll('.grid-cell--playing').forEach(el => {
      el.classList.remove('grid-cell--playing');
    });

    // Highlight current column in all voices
    this.pianoGridEls.forEach(gridEl => {
      gridEl.querySelectorAll(`.grid-cell[data-col="${step}"]`).forEach(cell => {
        cell.classList.add('grid-cell--playing');
      });
    });

    this.currentStep = step;
  }

  /**
   * Called when playback stops
   */
  onStop() {
    document.querySelectorAll('.grid-cell--playing').forEach(el => {
      el.classList.remove('grid-cell--playing');
    });
  }

  /**
   * Clear the entire grid
   */
  clearAll() {
    for (let v = 0; v < this.voices; v++) {
      for (let n = 0; n < this.notes.length; n++) {
        for (let c = 0; c < this.cols; c++) {
          this.grid[v][n][c] = false;
        }
      }
    }
    this.render();
  }

  /**
   * Load grid data
   */
  load(data) {
    if (!data) return;
    this.grid = data;
    this.render();
  }

  /**
   * Export grid data
   */
  export() {
    return this.grid;
  }
}
